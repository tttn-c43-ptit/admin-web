"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "@geoman-io/leaflet-geoman-free";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { GardenBoundary, Plant, Zone } from "@/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Save, Search, MapPin, Loader2, X, Layers, Check, Undo2, Grid, Map as MapIcon } from "lucide-react";
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
  activePlantId?: string | null;
  readOnly?: boolean;
  onDeleteZone?: (zoneId: string) => void;
  onUpdatePlantPosition?: (plantId: string, lat: number, lng: number, zoneId?: string | null) => void;
}

// Ray-casting point in polygon algorithm for GIS bounds validation
function isPointInPolygonLatLng(lat: number, lng: number, points: L.LatLng[]): boolean {
  if (!points || points.length < 3) return false;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].lat, yi = points[i].lng;
    const xj = points[j].lat, yj = points[j].lng;
    
    const intersect = ((yi > lng) !== (yj > lng))
        && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
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
  activePlantId,
  readOnly = false,
  onDeleteZone,
  onUpdatePlantPosition,
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
  const [mapMode, setMapMode] = useState<"blueprint" | "street" | "satellite">("blueprint");
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);
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

    // Initialize map with maxZoom 22 for deep zoom capability
    const map = L.map(mapRef.current, { maxZoom: 22 }).setView([10.762622, 106.660172], 18);

    leafletMap.current = map;

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

  // Switch TileLayers dynamically based on mapMode
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }

    if (mapMode === "satellite") {
      activeTileLayerRef.current = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 22,
        maxNativeZoom: 19,
        attribution: "© Esri World Imagery",
      }).addTo(map);
    } else if (mapMode === "blueprint") {
      const svgGrid = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%23f8fafc"/><path d="M 64 0 L 0 0 0 64" fill="none" stroke="%23cbd5e1" stroke-width="0.8"/><path d="M 32 0 L 32 64 M 0 32 L 64 32" fill="none" stroke="%23f1f5f9" stroke-width="0.4"/></svg>`;
      activeTileLayerRef.current = L.tileLayer(svgGrid, {
        maxZoom: 22,
        tileSize: 64,
        attribution: "Sơ đồ Phẳng 2D Kiến Trúc",
      }).addTo(map);
    } else {
      activeTileLayerRef.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 22,
        maxNativeZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);
    }
  }, [mapMode]);

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
        let pLat, pLng;
        const zonePoly = plant.zone_id ? zonePolyMapRef.current.get(plant.zone_id) : null;
        
        if (plant.grid_x != null && plant.grid_y != null && plant.grid_x > 100 && plant.grid_y > 8) {
          pLat = plant.grid_y;
          pLng = plant.grid_x;
        } 
        else if (zonePoly) {
          const zBounds = zonePoly.getBounds();
          const center = zBounds.getCenter();
          pLat = center.lat + (Math.random() - 0.5) * 0.0001;
          pLng = center.lng + (Math.random() - 0.5) * 0.0001;
        } else {
          const center = bounds.getCenter();
          pLat = center.lat + (Math.random() - 0.5) * 0.0001;
          pLng = center.lng + (Math.random() - 0.5) * 0.0001;
        }

        const color = PLANT_STATUS_COLORS[plant.status]?.hex || PLANT_STATUS_COLORS.UNKNOWN.hex;
        const isActive = activePlantId === plant.id;
        const radius = isActive ? 22 : 16;

        let customIcon: L.DivIcon;

        if (mapMode === "blueprint") {
          customIcon = L.divIcon({
            className: "bg-transparent border-0",
            html: `<div style="
              display: flex;
              align-items: center;
              gap: 5px;
              padding: 3px 8px;
              background-color: ${isActive ? '#fef2f2' : '#ffffff'};
              border: 2px solid ${isActive ? '#ef4444' : color};
              border-radius: 20px;
              box-shadow: 0 3px 8px rgba(0,0,0,0.18);
              white-space: nowrap;
              font-family: inherit;
              font-size: 11px;
              font-weight: 700;
              color: #0f172a;
              transform: scale(${isActive ? 1.15 : 1});
              transition: transform 0.15s ease;
            ">
              <span style="
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background-color: ${color};
                display: inline-block;
                box-shadow: inset 0 0 2px rgba(0,0,0,0.2);
              "></span>
              <span>${plant.code}</span>
            </div>`,
            iconSize: [80, 26],
            iconAnchor: [40, 13],
            popupAnchor: [0, -13],
          });
        } else {
          customIcon = L.divIcon({
            className: "bg-transparent border-0",
            html: `<div style="
              width: ${radius}px; 
              height: ${radius}px; 
              background-color: ${color}; 
              border: ${isActive ? '3px' : '2px'} solid ${isActive ? '#ef4444' : '#ffffff'}; 
              border-radius: 50%;
              box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [radius, radius],
            iconAnchor: [radius / 2, radius / 2],
            popupAnchor: [0, -radius / 2],
          });
        }

        const marker = L.marker([pLat, pLng], {
          icon: customIcon,
          draggable: !readOnly,
        });

        if (!readOnly && onUpdatePlantPosition) {
          marker.on("dragend", (e) => {
            const markerObj = e.target;
            const newPos = markerObj.getLatLng();
            const newLat = newPos.lat;
            const newLng = newPos.lng;

            // 1. Check if new position is inside outer Garden Boundary
            let isInsideGarden = true;
            const gardenPolyLayers: L.Polygon[] = [];
            if (drawnItems.current) {
              drawnItems.current.eachLayer((layer) => {
                if (layer instanceof L.Polygon) {
                  gardenPolyLayers.push(layer);
                }
              });
            }

            if (gardenPolyLayers.length > 0) {
              isInsideGarden = gardenPolyLayers.some((poly) => {
                const raw = poly.getLatLngs();
                const pts = Array.isArray(raw[0]) ? (raw[0] as L.LatLng[]) : (raw as L.LatLng[]);
                return isPointInPolygonLatLng(newLat, newLng, pts);
              });
            }

            // If outside garden boundary -> Reject drag & Revert position
            if (!isInsideGarden) {
              toast.error(`Vị trí không hợp lệ! Cây ${plant.code} phải nằm trong ranh giới khu vườn.`, { duration: 5000 });
              markerObj.setLatLng([pLat, pLng]);
              return;
            }

            // 2. Check which Zone polygon contains the new location
            let matchedZoneId: string | null = null;
            let matchedZoneName: string | null = null;

            zonePolyMapRef.current.forEach((poly, zId) => {
              const raw = poly.getLatLngs();
              const pts = Array.isArray(raw[0]) ? (raw[0] as L.LatLng[]) : (raw as L.LatLng[]);
              if (isPointInPolygonLatLng(newLat, newLng, pts)) {
                matchedZoneId = zId;
                const zoneObj = zones?.find((z) => z.id === zId);
                matchedZoneName = zoneObj?.name || "Phân khu";
              }
            });

            // 3. Perform position & zone update
            const oldZoneId = plant.zone_id;
            onUpdatePlantPosition(plant.id, newLat, newLng, matchedZoneId);

            if (matchedZoneId !== oldZoneId) {
              if (matchedZoneId) {
                toast.success(`Đã chuyển cây ${plant.code} sang ${matchedZoneName}!`, { duration: 4000 });
              } else {
                toast.info(`Đã cập nhật vị trí cây ${plant.code} (Không thuộc phân khu nào).`, { duration: 4000 });
              }
            } else {
              toast.success(`Đã cập nhật vị trí cây ${plant.code}`);
            }
          });
        }

        const statusKey = `status.${(plant.status || "unknown").toLowerCase()}` as any;
        const statusLabel = t(statusKey, plant.status || "Unknown");
        const zoneName = zones?.find(z => z.id === plant.zone_id)?.name || "N/A";
        const isGis = plant.grid_x != null && plant.grid_x > 100;
        const displayLat = isGis ? plant.grid_y : "?";
        const displayLng = isGis ? plant.grid_x : "?";

        const popupHtml = `
          <div class="p-2 min-w-[180px] font-sans">
            <div class="flex items-center justify-between gap-2 mb-1">
              <strong class="font-bold text-sm text-slate-900">${plant.code}</strong>
              <span class="text-[10px] px-1.5 py-0.5 rounded font-semibold text-white" style="background-color: ${color};">
                ${statusLabel}
              </span>
            </div>
            <div class="text-xs text-slate-600 mb-0.5"><strong>Phân khu:</strong> ${zoneName}</div>
            <div class="text-[11px] text-slate-500 mb-2 font-mono">
              <div class="truncate">Vĩ độ: ${displayLat}</div>
              <div class="truncate">Kinh độ: ${displayLng}</div>
            </div>
            <a href="/plants/${plant.id}" class="inline-flex items-center text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">
              Xem nhật ký & chi tiết →
            </a>
          </div>
        `;

        marker.bindPopup(popupHtml);
        plantsGroup.current?.addLayer(marker);

        if (isActive) {
          map.flyTo([pLat, pLng], Math.max(map.getZoom(), 18), { animate: true, duration: 0.8 });
          setTimeout(() => {
            marker.openPopup();
          }, 300);
        }
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

      {/* View Mode Switcher Toolbar (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-[400] pointer-events-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={() => setMapMode("blueprint")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            mapMode === "blueprint"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Grid className="h-3.5 w-3.5" />
          <span>📐 Sơ đồ Phẳng 2D</span>
        </button>
        <button
          type="button"
          onClick={() => setMapMode("street")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            mapMode === "street"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <MapIcon className="h-3.5 w-3.5" />
          <span>🌐 Địa lý (OSM)</span>
        </button>
        <button
          type="button"
          onClick={() => setMapMode("satellite")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            mapMode === "satellite"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>🛰️ Ảnh Vệ tinh</span>
        </button>
      </div>

      <div ref={mapRef} className="h-full w-full z-0" />
    </div>
  );
}
