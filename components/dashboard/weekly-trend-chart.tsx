"use client";

import { GardenStats } from "@/types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { useTranslation } from "@/components/i18n-provider";

interface WeeklyTrendChartProps {
  stats: GardenStats;
}

export function WeeklyTrendChart({ stats }: WeeklyTrendChartProps) {
  const { t } = useTranslation();

  const data = stats.weekly_trend.map(point => ({
    ...point,
    displayDate: format(parseISO(point.week_start), "MMM d"),
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground rounded-xl border bg-card">
        {t("chart.noWeeklyData")}
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col h-full">
      <h3 className="font-semibold leading-none tracking-tight mb-6">{t("chart.weeklyReportTrend")}</h3>
      <div className="h-[250px] w-full mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="displayDate" 
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
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            <Area 
              type="monotone" 
              dataKey="reports" 
              name={t("chart.totalReports")}
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorReports)" 
            />
            <Area 
              type="monotone" 
              dataKey="sick" 
              name={t("chart.sickPlants")}
              stroke="#ef4444" 
              strokeWidth={2}
              fillOpacity={0} 
              fill="transparent" 
            />
            <Area 
              type="monotone" 
              dataKey="watching" 
              name={t("chart.watching")}
              stroke="#f59e0b" 
              strokeWidth={2}
              fillOpacity={0} 
              fill="transparent" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
