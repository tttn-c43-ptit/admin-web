"use client";

import { TrendingUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const data = [
  { time: "00:00", value: 1.0 },
  { time: "04:00", value: 1.2 },
  { time: "08:00", value: 1.5 },
  { time: "12:00", value: 1.4 },
  { time: "16:00", value: 1.8 },
  { time: "20:00", value: 2.1 },
  { time: "24:00", value: 2.2 },
];

export function SoilIntelligenceChart() {
  return (
    <Card className="shadow-sm border-0 bg-white">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-semibold text-zinc-900">Soil Intelligence</CardTitle>
          <CardDescription className="text-xs text-zinc-500">Optimal N-level maintenance</CardDescription>
        </div>
        <div className="h-8 w-8 rounded-full border border-zinc-100 flex items-center justify-center bg-zinc-50 text-zinc-400">
          <TrendingUp className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#84cc16" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#84cc16" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis
                domain={[0, 3]}
                hide={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#a1a1aa" }}
                orientation="right"
                tickFormatter={(val) => `${val.toFixed(1)}°C`}
                width={30}
              />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                labelStyle={{ display: "none" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#84cc16"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorValue)"
                activeDot={{ r: 6, fill: "#84cc16", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 mt-6 pt-4 border-t border-zinc-100">
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 mb-1">pH Level</span>
            <span className="text-lg font-bold text-zinc-900">7.6</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 mb-1">N-Level</span>
            <span className="text-lg font-bold text-zinc-900">98%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 mb-1">Moisture</span>
            <span className="text-lg font-bold text-zinc-900">65%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
