"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/api-client";
import { PaginatedResponse, Garden } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/components/i18n-provider";

interface GardenSelectorProps {
  value: string;
  onChange: (gardenId: string) => void;
}

export function GardenSelector({ value, onChange }: GardenSelectorProps) {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery({
    queryKey: ["gardens", "list"],
    queryFn: () =>
      api.get("api/gardens?limit=50&offset=0").json<PaginatedResponse<Garden>>(),
  });

  const gardens = data?.items || [];

  // Auto-select first garden if none is selected
  useEffect(() => {
    if (!value && gardens.length > 0) {
      onChange(gardens[0].id);
    }
  }, [value, gardens, onChange]);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t("dashboard.loadingGardens")}</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-500">{t("dashboard.failedGardens")}</div>;
  }

  if (gardens.length === 0) {
    return <div className="text-sm text-muted-foreground">{t("dashboard.noGardensPrompt")}</div>;
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">{t("dashboard.gardenLabel")}</span>
      <Select value={value} onValueChange={(val) => { if (val) onChange(val); }}>
        <SelectTrigger className="w-[240px] sm:w-[280px]">
          <SelectValue placeholder={t("dashboard.selectGardenPlaceholder")}>
            {gardens.find((g) => g.id === value)?.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {gardens.map((garden) => (
            <SelectItem key={garden.id} value={garden.id}>
              {garden.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
