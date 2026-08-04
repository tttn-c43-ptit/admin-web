"use client";

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const data = [
  { time: "Mon", value: 30 },
  { time: "Tue", value: 32 },
  { time: "Wed", value: 35 },
  { time: "Thu", value: 40 },
  { time: "Fri", value: 55 },
  { time: "Sat", value: 70 },
];

export function ClimateIQChart() {
  return (
    <Card className="shadow-sm border-0 bg-white">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-semibold text-zinc-900">ClimateIQ</CardTitle>
          <CardDescription className="text-xs text-zinc-500">Temperature & climate trends</CardDescription>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-500">Avg. Temp</div>
          <div className="text-lg font-bold text-zinc-900">19°C</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="#f4f4f5" />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#a1a1aa" }}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                labelStyle={{ display: "none" }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#a3e635"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: "#a3e635", stroke: "#fff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 mt-6 pt-4 border-t border-zinc-100 gap-2">
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 mb-1">25% Hood</span>
            <span className="text-sm font-semibold text-zinc-900">Good</span>
          </div>
          <div className="flex flex-col bg-lime-100/50 rounded-lg p-2 -my-2 border border-lime-200/50">
            <span className="text-xs text-lime-700 mb-1">Up to 40%</span>
            <span className="text-sm font-semibold text-lime-900">Optimal</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-zinc-500 mb-1">30% Reduced</span>
            <span className="text-sm font-semibold text-zinc-900">Warning</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
