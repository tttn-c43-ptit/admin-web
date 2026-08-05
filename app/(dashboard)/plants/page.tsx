"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { Garden, PaginatedResponse } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlantsDataTable } from "@/components/plants/plants-data-table";
import { Card, CardContent } from "@/components/ui/card";

export default function PlantsPage() {
  const [selectedGardenId, setSelectedGardenId] = useState<string>("");

  const { data: gardensData, isLoading: isLoadingGardens } = useQuery<PaginatedResponse<Garden>>({
    queryKey: [...queryKeys.gardens(), 0, 100], // Fetch up to 100 gardens for the dropdown
    queryFn: () => api.get("api/gardens?limit=100&offset=0").json(),
  });

  // Default to first garden if none selected and data is available
  if (!selectedGardenId && gardensData?.items && gardensData.items.length > 0) {
    setSelectedGardenId(gardensData.items[0].id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Plants Management</h1>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Select Garden:</span>
          <Select
            value={selectedGardenId}
            onValueChange={(val) => val && setSelectedGardenId(val)}
            disabled={isLoadingGardens || !gardensData?.items.length}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a garden">
                {gardensData?.items.find((g) => g.id === selectedGardenId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {gardensData?.items.map((garden) => (
                <SelectItem key={garden.id} value={garden.id}>
                  {garden.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!gardensData?.items.length && !isLoadingGardens ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <p className="text-muted-foreground mb-4">No gardens found. You need to create a garden first to manage plants.</p>
          </CardContent>
        </Card>
      ) : selectedGardenId ? (
        <PlantsDataTable gardenId={selectedGardenId} />
      ) : (
        <div className="p-8 text-center text-muted-foreground">
          Loading...
        </div>
      )}
    </div>
  );
}
