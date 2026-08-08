"use client";

import { GardenStats } from "@/types";
import { PLANT_STATUS_COLORS } from "@/components/plant-status-badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useTranslation } from "@/components/i18n-provider";
import { TranslationKey } from "@/lib/i18n/translations";

interface StatusBreakdownChartProps {
  stats: GardenStats;
}

export function StatusBreakdownChart({ stats }: StatusBreakdownChartProps) {
  const { t } = useTranslation();

  const statusKeyMap: Record<string, TranslationKey> = {
    HEALTHY: "status.healthy",
    WATCHING: "status.watching",
    SICK: "status.sick",
    DEAD: "status.dead",
    UNKNOWN: "status.unknown",
  };

  const data = Object.entries(stats.by_status)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: t(statusKeyMap[status] || "status.unknown"),
      value: count,
      fill: PLANT_STATUS_COLORS[status]?.hex || PLANT_STATUS_COLORS.UNKNOWN.hex,
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground rounded-xl border bg-card">
        {t("chart.noStatusData")}
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col">
      <h3 className="font-semibold leading-none tracking-tight mb-6">{t("chart.statusBreakdown")}</h3>
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
              itemStyle={{ color: "#0f172a", fontSize: "14px", fontWeight: 500 }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
