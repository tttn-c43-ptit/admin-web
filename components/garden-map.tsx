"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "@geoman-io/leaflet-geoman-free";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { GardenBoundary } from "@/types";
import { Button } from "./ui/button";
import { Save } from "lucide-react";

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
  onSave: (boundary: GardenBoundary) => void;
  isSaving?: boolean;
}

export default function GardenMap({ initialBoundary, onSave, isSaving }: GardenMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const drawnItems = useRef<L.FeatureGroup | null>(null);
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

    const featureGroup = L.featureGroup().addTo(map);
    drawnItems.current = featureGroup;

    // Handle initial boundary
    if (initialBoundary && initialBoundary.coordinates && initialBoundary.coordinates.length > 0) {
      try {
        // GeoJSON coordinates are [lng, lat], Leaflet wants [lat, lng]
        const latLngs = initialBoundary.coordinates[0].map((coord) => [
          coord[1],
          coord[0],
        ] as [number, number]);
        
        const polygon = L.polygon(latLngs);
        featureGroup.addLayer(polygon);
        map.fitBounds(polygon.getBounds());
      } catch (e) {
        console.error("Failed to parse initial boundary", e);
      }
    }

    // Geoman event listeners
    map.on("pm:create", (e) => {
      // Only allow 1 polygon
      featureGroup.clearLayers();
      featureGroup.addLayer(e.layer);
      setHasUnsavedChanges(true);
      
      e.layer.on('pm:edit', () => {
         setHasUnsavedChanges(true);
      });
    });

    map.on('pm:remove', () => {
      setHasUnsavedChanges(true);
    });

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, [initialBoundary]);

  const handleSave = () => {
    if (!drawnItems.current) return;
    
    const layers = drawnItems.current.getLayers();
    if (layers.length === 0) {
      // If user deleted the boundary, we could pass null or an empty polygon
      // For now, let's just pass empty coordinates or reject
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
      <div ref={mapRef} className="h-full w-full z-0" />
    </div>
  );
}
