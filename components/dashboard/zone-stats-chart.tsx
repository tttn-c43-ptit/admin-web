"use client";

import { GardenStats } from "@/types";
import { PLANT_STATUS_COLORS } from "@/components/plant-status-badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ZoneStatsChartProps {
  stats: GardenStats;
}

export function ZoneStatsChart({ stats }: ZoneStatsChartProps) {
  if (stats.by_zone.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground rounded-xl border bg-card">
        No zone statistics available
      </div>
    );
  }

  // Format data for the stacked bar chart
  const data = stats.by_zone.map((zone) => {
    return {
      name: zone.zone_name,
      HEALTHY: zone.by_status["HEALTHY"] || 0,
      WATCHING: zone.by_status["WATCHING"] || 0,
      SICK: zone.by_status["SICK"] || 0,
      UNKNOWN: zone.by_status["UNKNOWN"] || 0,
      DEAD: zone.by_status["DEAD"] || 0,
    };
  });

  // Only show legend items for statuses that actually have data across all zones
  const hasStatusData = {
    HEALTHY: data.some((d) => d.HEALTHY > 0),
    WATCHING: data.some((d) => d.WATCHING > 0),
    SICK: data.some((d) => d.SICK > 0),
    UNKNOWN: data.some((d) => d.UNKNOWN > 0),
    DEAD: data.some((d) => d.DEAD > 0),
  };

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col h-full">
      <h3 className="font-semibold leading-none tracking-tight mb-6">Zone Statistics</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748b" }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748b" }}
            />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
              itemStyle={{ fontSize: "14px", fontWeight: 500 }}
              labelStyle={{ color: "#64748b", marginBottom: "4px" }}
              cursor={{ fill: "#f8fafc" }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            
            {hasStatusData.HEALTHY && (
              <Bar dataKey="HEALTHY" name="Healthy" stackId="a" fill={PLANT_STATUS_COLORS.HEALTHY.hex} />
            )}
            {hasStatusData.WATCHING && (
              <Bar dataKey="WATCHING" name="Watching" stackId="a" fill={PLANT_STATUS_COLORS.WATCHING.hex} />
            )}
            {hasStatusData.SICK && (
              <Bar dataKey="SICK" name="Sick" stackId="a" fill={PLANT_STATUS_COLORS.SICK.hex} />
            )}
            {hasStatusData.UNKNOWN && (
              <Bar dataKey="UNKNOWN" name="Unknown" stackId="a" fill={PLANT_STATUS_COLORS.UNKNOWN.hex} />
            )}
            {hasStatusData.DEAD && (
              <Bar dataKey="DEAD" name="Dead" stackId="a" fill={PLANT_STATUS_COLORS.DEAD.hex} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
