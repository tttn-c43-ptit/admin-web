"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { GardenDetail, GardenBoundary } from "@/types";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Map as MapIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ZonesPanel } from "./zones-panel";
import { SchedulesPanel } from "@/components/schedules/schedules-panel";
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

  const { data: garden, isLoading } = useQuery<GardenDetail>({
    queryKey: queryKeys.gardenDetail(id),
    queryFn: () => api.get(`api/gardens/${id}`).json(),
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
    <div className="space-y-6">
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
        <div className="flex items-center space-x-2">
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">{t("gardenDetail.boundaryMap")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("gardenDetail.boundaryMapDesc")}
            </p>
          </div>
          <GardenMap
            initialBoundary={garden.boundary}
            onSave={(boundary) => updateBoundaryMutation.mutate(boundary)}
            isSaving={updateBoundaryMutation.isPending}
          />
        </div>

        <div className="lg:col-span-1">
          <Tabs defaultValue="zones" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="zones">{t("gardenDetail.tabZones")}</TabsTrigger>
              <TabsTrigger value="schedules">{t("gardenDetail.tabSchedules")}</TabsTrigger>
            </TabsList>
            <TabsContent value="zones" className="mt-4">
              <ZonesPanel gardenId={id} />
            </TabsContent>
            <TabsContent value="schedules" className="mt-4">
              <SchedulesPanel gardenId={id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
