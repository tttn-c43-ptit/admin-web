"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "@geoman-io/leaflet-geoman-free";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { GardenBoundary, Plant, Zone } from "@/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Save, Search, MapPin, Loader2, X, Layers, Check, Undo2 } from "lucide-react";
import { PLANT_STATUS_COLORS } from "./plant-status-badge";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n-provider";

// Fix missing marker icons in Next.js/Leaflet
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ZONE_COLORS = [
  { fill: "#3b82f6", stroke: "#1d4ed8" }, // Blue
  { fill: "#10b981", stroke: "#047857" }, // Emerald
  { fill: "#8b5cf6", stroke: "#6d28d9" }, // Purple
  { fill: "#f59e0b", stroke: "#b45309" }, // Amber
  { fill: "#ec4899", stroke: "#be185d" }, // Pink
  { fill: "#06b6d4", stroke: "#0e7490" }, // Cyan
];

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface GardenMapProps {
  gardenId?: string;
  initialBoundary: GardenBoundary | null;
  onSave?: (boundary: GardenBoundary) => void;
  isSaving?: boolean;
  plants?: Plant[];
  zones?: Zone[];
  activeZoneId?: string | null;
  readOnly?: boolean;
  onDeleteZone?: (zoneId: string) => void;
}

// Generate default initial zone polygon points if user hasn't saved custom boundary yet
function generateZonePolygonPoints(
  gardenLatLngs: [number, number][],
  zoneIndex: number,
  totalZones: number
): [number, number][] {
  if (!gardenLatLngs || gardenLatLngs.length === 0) return [];

  let centerLat = 0;
  let centerLng = 0;
  gardenLatLngs.forEach(([lat, lng]) => {
    centerLat += lat;
    centerLng += lng;
  });
  centerLat /= gardenLatLngs.length;
  centerLng /= gardenLatLngs.length;

  if (totalZones <= 1) {
    return gardenLatLngs.map(([lat, lng]) => [
      centerLat + (lat - centerLat) * 0.92,
      centerLng + (lng - centerLng) * 0.92,
    ]);
  }

  const bounds = L.polygon(gardenLatLngs).getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const numCols = totalZones > 3 ? 2 : 1;
  const numRows = Math.ceil(totalZones / numCols);

  const r = Math.floor(zoneIndex / numCols);
  const c = zoneIndex % numCols;

  const latSpan = (ne.lat - sw.lat) / numRows;
  const lngSpan = (ne.lng - sw.lng) / numCols;

  const minLat = ne.lat - (r + 1) * latSpan;
  const maxLat = ne.lat - r * latSpan;
  const minLng = sw.lng + c * lngSpan;
  const maxLng = sw.lng + (c + 1) * lngSpan;

  return gardenLatLngs.map(([lat, lng]) => {
    const clampedLat = Math.max(minLat, Math.min(maxLat, lat));
    const clampedLng = Math.max(minLng, Math.min(maxLng, lng));
    return [
      centerLat + (clampedLat - centerLat) * 0.94,
      centerLng + (clampedLng - centerLng) * 0.94,
    ] as [number, number];
  });
}

export default function GardenMap({
  gardenId,
  initialBoundary,
  onSave,
  isSaving,
  plants,
  zones,
  activeZoneId,
  readOnly = false,
  onDeleteZone,
}: GardenMapProps) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const drawnItems = useRef<L.FeatureGroup | null>(null);
  const zonesGroup = useRef<L.FeatureGroup | null>(null);
  const plantsGroup = useRef<L.FeatureGroup | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const zonePolyMapRef = useRef<Map<string, L.Polygon>>(new Map());

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasUnsavedZoneChanges, setHasUnsavedZoneChanges] = useState(false);

  // Zone position Undo history
  const [zoneHistory, setZoneHistory] = useState<Record<string, [number, number][]>[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Snapshot current zone polygon coordinates
  const snapshotZoneState = (): Record<string, [number, number][]> => {
    const data: Record<string, [number, number][]> = {};
    zonePolyMapRef.current.forEach((poly, zId) => {
      const latLngs = poly.getLatLngs()[0] as L.LatLng[];
      if (latLngs) {
        data[zId] = latLngs.map((ll) => [ll.lat, ll.lng]);
      }
    });
    return data;
  };

  const isUndoingRef = useRef(false);

  const handleUndoMapZoneEdit = () => {
    if (zoneHistory.length === 0) return;
    const lastSnapshot = zoneHistory[zoneHistory.length - 1];
    setZoneHistory((prev) => prev.slice(0, prev.length - 1));

    isUndoingRef.current = true;
    try {
      Object.entries(lastSnapshot).forEach(([zId, coords]) => {
        const poly = zonePolyMapRef.current.get(zId);
        if (poly && coords && coords.length > 0) {
          if (poly.pm && poly.pm.enabled()) {
            poly.pm.disable();
          }
          poly.setLatLngs(coords.map(([lat, lng]) => L.latLng(lat, lng)));
          poly.redraw();
          if (!readOnly && poly.pm) {
            poly.pm.enable({ allowSelfIntersection: false });
          }
        }
      });
    } finally {
      isUndoingRef.current = false;
    }

    if (zoneHistory.length <= 1) {
      setHasUnsavedZoneChanges(false);
    }
    toast.success(t("map.undoZoneEdit"));
  };

  // Listen for Ctrl + Z on Map
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (modifier && e.key.toLowerCase() === "z" && !e.shiftKey) {
        if (zoneHistory.length > 0) {
          e.preventDefault();
          handleUndoMapZoneEdit();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoneHistory]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (leafletMap.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([10.762622, 106.660172], 13); // Default to HCMC

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);

    if (!readOnly) {
      map.pm.addControls({
        position: "topleft",
        drawMarker: false,
        drawCircleMarker: false,
        drawPolyline: false,
        drawRectangle: false,
        drawCircle: false,
        drawText: false,
        editControls: true,
        drawPolygon: true,
        cutPolygon: false,
      });
    }

    const featureGroup = L.featureGroup().addTo(map);
    drawnItems.current = featureGroup;

    const zGroup = L.featureGroup().addTo(map);
    zonesGroup.current = zGroup;

    const pGroup = L.featureGroup().addTo(map);
    plantsGroup.current = pGroup;

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, [readOnly]);

  // Handle location search via OpenStreetMap Nominatim Geocoding API
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowDropdown(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&limit=5`
      );
      const data: SearchResult[] = await response.json();
      setSearchResults(data);

      if (data.length > 0) {
        selectLocation(data[0]);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Fly to selected location and add marker
  const selectLocation = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    if (leafletMap.current) {
      leafletMap.current.flyTo([lat, lon], 16, { duration: 1.5 });

      if (searchMarkerRef.current) {
        leafletMap.current.removeLayer(searchMarkerRef.current);
      }

      const marker = L.marker([lat, lon]).addTo(leafletMap.current);
      marker
        .bindPopup(
          `<div class="p-1 font-sans">
            <strong class="text-sm font-bold text-slate-800">${t("map.searchFound")}</strong>
            <p class="text-xs text-slate-600 mt-1">${result.display_name}</p>
            <p class="text-[11px] text-emerald-600 font-medium mt-1">${t("map.drawGuide")}</p>
          </div>`
        )
        .openPopup();

      searchMarkerRef.current = marker;
    }
    setShowDropdown(false);
  };

  // Handle boundary, zones, and plants when they change
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    if (drawnItems.current) {
      drawnItems.current.clearLayers();
    }
    if (zonesGroup.current) {
      zonesGroup.current.clearLayers();
    }
    if (plantsGroup.current) {
      plantsGroup.current.clearLayers();
    }
    zonePolyMapRef.current.clear();

    let polygon: L.Polygon | null = null;
    let gardenLatLngs: [number, number][] = [];

    if (initialBoundary && initialBoundary.coordinates && initialBoundary.coordinates.length > 0) {
      try {
        gardenLatLngs = initialBoundary.coordinates[0].map((coord) => [coord[1], coord[0]] as [number, number]);

        polygon = L.polygon(gardenLatLngs, {
          color: "#059669",
          weight: 3,
          fillColor: "#10b981",
          fillOpacity: 0.15,
        });

        if (!readOnly) {
          polygon.pm.enable({
            allowSelfIntersection: false,
          });
          polygon.on("pm:edit", () => {
            setHasUnsavedChanges(true);
          });
        }

        if (drawnItems.current) {
          drawnItems.current.addLayer(polygon);
        }
        map.fitBounds(polygon.getBounds(), { padding: [30, 30] });
      } catch (e) {
        console.error("Failed to parse initial boundary", e);
      }
    }

    // Load custom saved zone boundaries from localStorage if available
    const storageKey = gardenId ? `zone_boundaries_${gardenId}` : null;
    let savedZoneBoundaries: Record<string, [number, number][]> = {};
    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) savedZoneBoundaries = JSON.parse(raw);
      } catch (e) {
        console.error("Failed to load saved zone boundaries", e);
      }
    }

    // Render Sub-Zones
    if (zones && zones.length > 0 && gardenLatLngs.length > 0 && zonesGroup.current) {
      zones.forEach((zone, idx) => {
        const savedPoints = savedZoneBoundaries[zone.id];
        const zonePoints = savedPoints && savedPoints.length > 0
          ? savedPoints
          : generateZonePolygonPoints(gardenLatLngs, idx, zones.length);

        const colorScheme = ZONE_COLORS[idx % ZONE_COLORS.length];
        const isSelected = activeZoneId === zone.id;

        const zonePoly = L.polygon(zonePoints, {
          color: isSelected ? "#ef4444" : colorScheme.stroke,
          weight: isSelected ? 3.5 : 2.5,
          fillColor: isSelected ? "#ef4444" : colorScheme.fill,
          fillOpacity: isSelected ? 0.4 : 0.25,
          dashArray: "6, 6",
        });

        zonePolyMapRef.current.set(zone.id, zonePoly);

        // Enable Geoman Dragging & Vertex Reshaping
        if (!readOnly) {
          zonePoly.pm.enable({
            allowSelfIntersection: false,
          });

          zonePoly.on("pm:edit", () => {
            if (isUndoingRef.current) return;
            const snap = snapshotZoneState();
            setZoneHistory((prev) => [...prev, snap]);
            setHasUnsavedZoneChanges(true);
          });

          zonePoly.on("pm:remove", () => {
            if (onDeleteZone) {
              onDeleteZone(zone.id);
            }
          });
        }

        const zonePlantsCount = plants ? plants.filter((p) => p.zone_id === zone.id).length : 0;
        const countText = t("map.zonePlantCount", { count: zonePlantsCount.toString() });
        const dragGuideText = t("map.dragNodesGuide");

        const tooltipContent = `
          <div class="px-2 py-1 font-sans text-xs">
            <strong class="text-sm font-bold text-slate-900">${zone.name}</strong>
            <div class="text-slate-600 mt-0.5">${countText}</div>
            <div class="text-[10px] text-emerald-600 italic mt-0.5">${dragGuideText}</div>
          </div>
        `;

        zonePoly.bindTooltip(tooltipContent, {
          permanent: false,
          sticky: true,
          direction: "top",
          className: "bg-white/95 border border-slate-300 rounded shadow-md text-center font-sans pointer-events-none",
        });

        zonesGroup.current?.addLayer(zonePoly);
      });
    }

    // Render Individual Plants
    if (plants && plants.length > 0 && plantsGroup.current && polygon) {
      const bounds = polygon.getBounds();
      const nw = bounds.getNorthWest();

      plants.forEach((plant) => {
        const latOffset = (plant.grid_y || 0) * 0.00005;
        const lngOffset = (plant.grid_x || 0) * 0.00005;

        const pLat = nw.lat - latOffset;
        const pLng = nw.lng + lngOffset;

        const color = PLANT_STATUS_COLORS[plant.status]?.hex || PLANT_STATUS_COLORS.UNKNOWN.hex;

        const marker = L.circleMarker([pLat, pLng], {
          radius: 7,
          fillColor: color,
          color: "#fff",
          weight: 2,
          fillOpacity: 1,
        });

        const popupHtml = `
          <div class="p-1 min-w-[150px] font-sans">
            <div class="font-bold text-sm mb-1">${plant.code}</div>
            <div class="text-xs mb-1 font-medium">Status: ${plant.status}</div>
            <div class="text-xs text-gray-500 mb-2">Planted: ${plant.planted_at || "N/A"}</div>
            <a href="/plants/${plant.id}" class="text-xs text-blue-600 hover:underline">View Details →</a>
          </div>
        `;

        marker.bindPopup(popupHtml);
        plantsGroup.current?.addLayer(marker);
      });
    }

    // Geoman event listeners for garden boundary
    if (!readOnly) {
      map.on("pm:create", (e) => {
        if (drawnItems.current) {
          drawnItems.current.clearLayers();
          drawnItems.current.addLayer(e.layer);
        }
        setHasUnsavedChanges(true);

        e.layer.on("pm:edit", () => {
          setHasUnsavedChanges(true);
        });
      });

      map.on("pm:edit", (e) => {
        if (drawnItems.current && drawnItems.current.hasLayer(e.layer)) {
          setHasUnsavedChanges(true);
        }
      });

      map.on("pm:remove", () => {
        setHasUnsavedChanges(true);
      });
    }
  }, [gardenId, initialBoundary, plants, zones, activeZoneId, readOnly, t]);

  const handleSaveBoundary = () => {
    if (!drawnItems.current || !onSave) return;

    const layers = drawnItems.current.getLayers();
    if (layers.length === 0) {
      return;
    }

    const layer = layers[0] as L.Polygon;
    const geoJson = layer.toGeoJSON();

    if (geoJson.geometry.type === "Polygon") {
      onSave(geoJson.geometry as GardenBoundary);
      setHasUnsavedChanges(false);
      toast.success(t("map.saveBoundary"));
    }
  };

  // Save customized zone positions permanently
  const handleSaveZoneBoundaries = () => {
    if (!gardenId) return;
    const storageKey = `zone_boundaries_${gardenId}`;
    const zoneBoundariesData: Record<string, [number, number][]> = {};

    zonePolyMapRef.current.forEach((poly, zId) => {
      const latLngs = poly.getLatLngs()[0] as L.LatLng[];
      if (latLngs && latLngs.length > 0) {
        zoneBoundariesData[zId] = latLngs.map((ll) => [ll.lat, ll.lng]);
      }
    });

    localStorage.setItem(storageKey, JSON.stringify(zoneBoundariesData));
    setHasUnsavedZoneChanges(false);
    toast.success(t("map.savedZonePositions"));
  };

  return (
    <div className="relative flex flex-col h-[520px] w-full rounded-xl overflow-hidden border shadow-sm">
      {/* Unified Overlay Top Bar */}
      {!readOnly && (
        <div className="absolute top-3 left-14 right-3 z-[400] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          {/* Left: Search Bar */}
          <div className="pointer-events-auto w-56 sm:w-64 md:w-80">
            <form onSubmit={handleSearch} className="relative flex items-center shadow-lg rounded-lg bg-white border">
              <Input
                type="text"
                placeholder={t("map.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 border-0 focus-visible:ring-0 text-xs pr-8 pl-3 rounded-lg"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setShowDropdown(false);
                  }}
                  className="absolute right-9 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                disabled={isSearching}
                className="h-9 px-2.5 border-l rounded-r-lg text-emerald-600 hover:bg-emerald-50"
              >
                {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              </Button>
            </form>

            {/* Search suggestions dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="mt-1 bg-white border rounded-lg shadow-xl overflow-hidden text-xs max-h-60 overflow-y-auto divide-y">
                {searchResults.map((res) => (
                  <div
                    key={res.place_id}
                    onClick={() => selectLocation(res)}
                    className="p-2.5 hover:bg-emerald-50 cursor-pointer flex items-start gap-2 text-slate-700 transition-colors"
                  >
                    <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 leading-snug">{res.display_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Save & Undo Toolbar */}
          <div className="pointer-events-auto flex items-center gap-2 shrink-0">
            {/* Map Undo Button */}
            {zoneHistory.length > 0 && (
              <Button
                onClick={handleUndoMapZoneEdit}
                variant="outline"
                title="Ctrl + Z"
                className="shadow-md bg-white hover:bg-slate-50 text-slate-700 text-xs h-9 gap-1"
              >
                <Undo2 className="h-3.5 w-3.5 text-blue-600" />
                <span>Undo</span>
              </Button>
            )}

            {zones && zones.length > 0 && (
              <Button
                onClick={handleSaveZoneBoundaries}
                disabled={!hasUnsavedZoneChanges}
                variant="secondary"
                className={`shadow-md transition-all font-medium text-xs gap-1.5 h-9 ${
                  hasUnsavedZoneChanges
                    ? "bg-blue-600 hover:bg-blue-700 text-white opacity-100"
                    : "bg-slate-200 text-slate-500 opacity-70 cursor-not-allowed"
                }`}
              >
                {hasUnsavedZoneChanges ? (
                  <>
                    <Layers className="h-3.5 w-3.5" />
                    {t("map.saveZonePositions")}
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    {t("map.savedZonePositions")}
                  </>
                )}
              </Button>
            )}

            {onSave && (
              <Button onClick={handleSaveBoundary} disabled={!hasUnsavedChanges || isSaving} className="shadow-md text-xs h-9">
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {isSaving ? t("map.savingBoundary") : t("map.saveBoundary")}
              </Button>
            )}
          </div>
        </div>
      )}

      <div ref={mapRef} className="h-full w-full z-0" />
    </div>
  );
}
