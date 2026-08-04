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
import { ZonesPanel } from "./zones-panel";

// Load GardenMap dynamically to avoid SSR issues with Leaflet
const GardenMap = dynamic(() => import("@/components/garden-map"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[500px] w-full rounded-xl border bg-muted/20">
      <p className="text-muted-foreground flex items-center">
        <MapIcon className="mr-2 h-4 w-4 animate-pulse" />
        Loading map...
      </p>
    </div>
  ),
});

export default function GardenDetailPage() {
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
        Loading garden details...
      </div>
    );
  }

  if (!garden) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Garden not found.</p>
        <Button variant="outline" onClick={() => router.push("/gardens")}>
          Back to Gardens
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Boundary Map</h2>
            <p className="text-xs text-muted-foreground">
              Use the tools on the left of the map to draw the garden boundary.
            </p>
          </div>
          <GardenMap
            initialBoundary={garden.boundary}
            onSave={(boundary) => updateBoundaryMutation.mutate(boundary)}
            isSaving={updateBoundaryMutation.isPending}
          />
        </div>

        <div className="lg:col-span-1">
          <ZonesPanel gardenId={id} />
        </div>
      </div>
    </div>
  );
}
