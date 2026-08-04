"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "@geoman-io/leaflet-geoman-free";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { GardenBoundary, Plant } from "@/types";
import { Button } from "./ui/button";
import { Save } from "lucide-react";
import { PLANT_STATUS_COLORS } from "./plant-status-badge";

// Fix missing marker icons in Next.js/Leaflet
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface GardenMapProps {
  initialBoundary: GardenBoundary | null;
  onSave?: (boundary: GardenBoundary) => void;
  isSaving?: boolean;
  plants?: Plant[];
  readOnly?: boolean;
}

export default function GardenMap({ initialBoundary, onSave, isSaving, plants, readOnly = false }: GardenMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const drawnItems = useRef<L.FeatureGroup | null>(null);
  const plantsGroup = useRef<L.FeatureGroup | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;
    if (leafletMap.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([10.762622, 106.660172], 13); // Default to HCMC
    
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map);

    if (!readOnly) {
      // Add Geoman controls
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

    const pGroup = L.featureGroup().addTo(map);
    plantsGroup.current = pGroup;

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, [readOnly]);

  // Handle boundary and plants when they change
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    if (drawnItems.current) {
      drawnItems.current.clearLayers();
    }
    if (plantsGroup.current) {
      plantsGroup.current.clearLayers();
    }

    let polygon: L.Polygon | null = null;

    if (initialBoundary && initialBoundary.coordinates && initialBoundary.coordinates.length > 0) {
      try {
        // GeoJSON coordinates are [lng, lat], Leaflet wants [lat, lng]
        const latLngs = initialBoundary.coordinates[0].map((coord) => [
          coord[1],
          coord[0],
        ] as [number, number]);
        
        polygon = L.polygon(latLngs);
        if (drawnItems.current) {
          drawnItems.current.addLayer(polygon);
        }
        map.fitBounds(polygon.getBounds());
      } catch (e) {
        console.error("Failed to parse initial boundary", e);
      }
    }

    // Render Plants relative to boundary if available
    if (plants && plants.length > 0 && plantsGroup.current && polygon) {
      const bounds = polygon.getBounds();
      const nw = bounds.getNorthWest();
      
      plants.forEach(plant => {
        // Grid spacing factor (~5 meters per unit)
        const latOffset = (plant.grid_y || 0) * 0.00005;
        const lngOffset = (plant.grid_x || 0) * 0.00005;
        
        const pLat = nw.lat - latOffset;
        const pLng = nw.lng + lngOffset;
        
        const color = PLANT_STATUS_COLORS[plant.status]?.hex || PLANT_STATUS_COLORS.UNKNOWN.hex;
        
        const marker = L.circleMarker([pLat, pLng], {
          radius: 8,
          fillColor: color,
          color: "#fff",
          weight: 2,
          fillOpacity: 1
        });

        const popupHtml = `
          <div class="p-1 min-w-[150px] font-sans">
            <div class="font-bold text-sm mb-1">${plant.code}</div>
            <div class="text-xs mb-1 font-medium">Status: ${plant.status}</div>
            <div class="text-xs text-gray-500 mb-2">Planted: ${plant.planted_at || 'Unknown'}</div>
            <a href="/plants/${plant.id}" class="text-xs text-blue-600 hover:underline">View Details →</a>
          </div>
        `;
        
        marker.bindPopup(popupHtml);
        plantsGroup.current?.addLayer(marker);
      });
    }

    // Geoman event listeners (only if not readonly)
    if (!readOnly) {
      map.on("pm:create", (e) => {
        // Only allow 1 polygon
        if (drawnItems.current) {
          drawnItems.current.clearLayers();
          drawnItems.current.addLayer(e.layer);
        }
        setHasUnsavedChanges(true);
        
        e.layer.on('pm:edit', () => {
           setHasUnsavedChanges(true);
        });
      });

      map.on('pm:remove', () => {
        setHasUnsavedChanges(true);
      });
    }

  }, [initialBoundary, plants, readOnly]);

  const handleSave = () => {
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
    }
  };

  return (
    <div className="relative flex flex-col h-[500px] w-full rounded-xl overflow-hidden border">
      {!readOnly && onSave && (
        <div className="absolute top-4 right-4 z-[400]">
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className="shadow-md"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Boundary"}
          </Button>
        </div>
      )}
      <div ref={mapRef} className="h-full w-full z-0" />
    </div>
  );
}
