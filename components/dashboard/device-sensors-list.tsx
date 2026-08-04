import { Droplets, Thermometer, Wind, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function DeviceSensorsList() {
  return (
    <Card className="shadow-sm border-0 bg-white h-full">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-semibold text-zinc-900">Device Sensors</CardTitle>
          <CardDescription className="text-xs text-zinc-500">Real-time monitoring • 5 Sensors • 2 Cameras</CardDescription>
        </div>
        <button className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center transition-colors">
          View All <ChevronRight className="h-3 w-3 ml-1" />
        </button>
      </CardHeader>
      <CardContent>
        <div className="mt-4 space-y-6">
          {/* Soil Moisture */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500">
                <Droplets className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-lime-500" />
                  <h4 className="text-sm font-semibold text-zinc-900">Soil Moisture</h4>
                </div>
                <div className="text-xs text-zinc-500 mt-1">Ref. 9248-P</div>
                <div className="text-xs text-zinc-400">Smart Farm 01 • Sensor • Libellium</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold text-zinc-900">65%</span>
              <span className="px-2 py-1 rounded-md bg-lime-100/50 text-lime-700 text-xs font-semibold">Optimal</span>
            </div>
          </div>

          {/* Temperature */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-lime-100 flex items-center justify-center text-lime-600">
                <Thermometer className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-lime-500" />
                  <h4 className="text-sm font-semibold text-zinc-900">Temperature</h4>
                </div>
                <div className="text-xs text-zinc-500 mt-1">PH000 Probe - Ref. 9255-P</div>
                <div className="text-xs text-zinc-400">Smart Farm 01 • Sensor • Libellium</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold text-zinc-900">19°C</span>
              <span className="px-2 py-1 rounded-md bg-sky-100/50 text-sky-700 text-xs font-semibold">Good</span>
            </div>
          </div>

          {/* Air Quality */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
                <Wind className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-lime-500" />
                  <h4 className="text-sm font-semibold text-zinc-900">Air Quality</h4>
                </div>
                <div className="text-xs text-zinc-500 mt-1">VL-CM40KT</div>
                <div className="text-xs text-zinc-400">Sensor • Sensor • Libellium</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold text-zinc-900">94%</span>
              <span className="px-2 py-1 rounded-md bg-sky-100/50 text-sky-700 text-xs font-semibold">Good</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
