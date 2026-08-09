"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { GardenDetail, GardenBoundary, Zone, Plant } from "@/types";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Map as MapIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ZonesPanel } from "./zones-panel";
import { PlantsPanel } from "./plants-panel";
import { useTranslation } from "@/components/i18n-provider";

// Load GardenMap dynamically to avoid SSR issues with Leaflet
const GardenMap = dynamic(() => import("@/components/garden-map"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[500px] w-full rounded-xl border bg-muted/20">
      <p className="text-muted-foreground flex items-center">
        <MapIcon className="mr-2 h-4 w-4 animate-pulse" />
        Map...
      </p>
    </div>
  ),
});

export default function GardenDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [activePlantId, setActivePlantId] = useState<string | null>(null);

  const { data: garden, isLoading } = useQuery<GardenDetail>({
    queryKey: queryKeys.gardenDetail(id),
    queryFn: () => api.get(`api/gardens/${id}`).json(),
  });

  const { data: zones } = useQuery<Zone[]>({
    queryKey: queryKeys.zones(id),
    queryFn: () => api.get(`api/gardens/${id}/zones`).json(),
  });

  const { data: plantsData } = useQuery<{ items: Plant[] }>({
    queryKey: ["plants_grid", id],
    queryFn: () => api.get(`api/gardens/${id}/plants?limit=100`).json(),
  });

  const updateBoundaryMutation = useMutation({
    mutationFn: (boundary: GardenBoundary) =>
      api.put(`api/gardens/${id}/boundary`, { json: boundary }).json<GardenDetail>(),
    onSuccess: (data) => {
      // Invalidate both detail and list to update area_m2 everywhere
      queryClient.setQueryData(queryKeys.gardenDetail(id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.gardens() });
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: async (zoneId: string) => {
      await api.delete(`api/zones/${zoneId}`);
      return zoneId;
    },
    onSuccess: (deletedZoneId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.zones(id) });
      queryClient.invalidateQueries({ queryKey: ["plants_grid", id] });
      setActiveZoneId(null);

      // Clean up localStorage boundary data for deleted zone
      const storageKey = `zone_boundaries_${id}`;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const data = JSON.parse(raw);
          delete data[deletedZoneId];
          localStorage.setItem(storageKey, JSON.stringify(data));
        }
      } catch (e) {
        console.error("Storage error:", e);
      }
    },
  });

  const updatePlantPositionMutation = useMutation({
    mutationFn: async ({ plantId, grid_x, grid_y, zone_id }: { plantId: string; grid_x: number; grid_y: number; zone_id?: string | null }) => {
      const targetPlant = plantsData?.items.find((p) => p.id === plantId);
      if (!targetPlant) throw new Error("Plant not found");
      const finalZoneId = zone_id !== undefined ? zone_id : targetPlant.zone_id;
      return api.put(`api/plants/${plantId}`, {
        json: {
          code: targetPlant.code,
          status: targetPlant.status,
          zone_id: finalZoneId,
          grid_x: grid_x,
          grid_y: grid_y,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plants_grid", id] });
      queryClient.invalidateQueries({ queryKey: queryKeys.plants(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.zones(id) });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {t("gardenDetail.loadingDetails")}
      </div>
    );
  }

  if (!garden) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">{t("gardenDetail.notFound")}</p>
        <Button variant="outline" onClick={() => router.push("/gardens")}>
          {t("gardenDetail.backToGardens")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/gardens" className={buttonVariants({ variant: "ghost", size: "icon" })}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{garden.name}</h1>
            <p className="text-sm text-muted-foreground">
              {garden.address} • {garden.plant_type}
              {garden.area_m2 && ` • ${garden.area_m2.toFixed(2)} m²`}
            </p>
          </div>
        </div>
      </div>

      {/* Boundary Map & Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">{t("gardenDetail.boundaryMap")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("gardenDetail.boundaryMapDesc")}
            </p>
          </div>
          <GardenMap
            gardenId={id}
            initialBoundary={garden.boundary}
            onSave={(boundary) => updateBoundaryMutation.mutate(boundary)}
            isSaving={updateBoundaryMutation.isPending}
            zones={zones}
            plants={plantsData?.items}
            activeZoneId={activeZoneId}
            activePlantId={activePlantId}
            onDeleteZone={(zId) => deleteZoneMutation.mutate(zId)}
            onUpdatePlantPosition={(plantId, lat, lng, zoneId) => 
              updatePlantPositionMutation.mutate({ plantId, grid_x: lng, grid_y: lat, zone_id: zoneId })
            }
          />
        </div>

        <div className="lg:col-span-1">
          <Tabs defaultValue="plants" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="plants">Cây trồng ({plantsData?.items?.length || 0})</TabsTrigger>
              <TabsTrigger value="zones">{t("gardenDetail.tabZones")}</TabsTrigger>
            </TabsList>
            <TabsContent value="plants" className="mt-4">
              <PlantsPanel
                gardenId={id}
                plants={plantsData?.items}
                zones={zones}
                activePlantId={activePlantId}
                onSelectPlant={(pId) => setActivePlantId(pId)}
                onRefetchPlants={() => queryClient.invalidateQueries({ queryKey: ["plants_grid", id] })}
              />
            </TabsContent>
            <TabsContent value="zones" className="mt-4">
              <ZonesPanel
                gardenId={id}
                activeZoneId={activeZoneId}
                onSelectZone={(zoneId) => setActiveZoneId(zoneId)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

    </div>
  );
}
