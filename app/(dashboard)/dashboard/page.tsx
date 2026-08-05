"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/api-client";
import { GardenStats } from "@/types";
import { GardenSelector } from "@/components/dashboard/garden-selector";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { StatusBreakdownChart } from "@/components/dashboard/status-breakdown-chart";
import { WeeklyTrendChart } from "@/components/dashboard/weekly-trend-chart";
import { ZoneStatsChart } from "@/components/dashboard/zone-stats-chart";
import { EarlyWarningsList } from "@/components/dashboard/early-warnings-list";
import { AiSummaryCard } from "@/components/dashboard/ai-summary-card";
import { Loader2, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const [gardenId, setGardenId] = useState<string>("");

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["gardens", gardenId, "stats"],
    queryFn: () =>
      api.get(`api/gardens/${gardenId}/stats`).json<GardenStats>(),
    enabled: !!gardenId,
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Garden analytics and AI-powered insights
          </p>
        </div>
        <GardenSelector value={gardenId} onChange={setGardenId} />
      </div>

      {!gardenId ? (
        <div className="flex h-[400px] items-center justify-center text-muted-foreground border rounded-xl border-dashed">
          Please select a garden to view statistics
        </div>
      ) : isLoading ? (
        <div className="flex h-[400px] flex-col items-center justify-center text-muted-foreground border rounded-xl border-dashed gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading analytics...</p>
        </div>
      ) : error ? (
        <div className="flex h-[400px] flex-col items-center justify-center text-red-500 border rounded-xl border-dashed border-red-200 bg-red-50 gap-2">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p className="font-medium">Failed to load statistics</p>
          <p className="text-sm opacity-80">Please check your connection and try again</p>
        </div>
      ) : stats ? (
        <>
          <StatsCards stats={stats} />
          
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <StatusBreakdownChart stats={stats} />
            </div>
            <div className="lg:col-span-2">
              <WeeklyTrendChart stats={stats} />
            </div>
          </div>

          <div className="w-full">
            <ZoneStatsChart stats={stats} />
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <div className="h-[400px]">
              <EarlyWarningsList stats={stats} />
            </div>
            <div className="h-[400px]">
              <AiSummaryCard gardenId={gardenId} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
