import { TrendingUp, Droplets, SunMedium, AlertCircle, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RecentUpdatesList() {
  return (
    <Card className="shadow-sm border-0 bg-white h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-zinc-900">Recent Updates</CardTitle>
        <button className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center transition-colors">
          See all <ChevronRight className="h-3 w-3 ml-1" />
        </button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="mt-4 space-y-6">
          {/* Update 1 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-lime-100 flex items-center justify-center text-lime-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-900">Growth rate: 5%</h4>
                <div className="text-xs text-zinc-500 mt-1">Nov 12, 2024</div>
              </div>
            </div>
            <button className="text-xs font-semibold text-lime-600 flex items-center hover:text-lime-700">
              Growth <ChevronRight className="h-3 w-3 ml-1" />
            </button>
          </div>

          {/* Update 2 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
                <Droplets className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-900">Watering cycle complete</h4>
                <div className="text-xs text-zinc-500 mt-1">Nov 12, 2024</div>
              </div>
            </div>
            <button className="text-xs font-semibold text-sky-600 flex items-center hover:text-sky-700">
              Watering <ChevronRight className="h-3 w-3 ml-1" />
            </button>
          </div>

          {/* Update 3 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <SunMedium className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-900">Light intensity adjusted</h4>
                <div className="text-xs text-zinc-500 mt-1">Nov 12, 2024</div>
              </div>
            </div>
            <button className="text-xs font-semibold text-amber-600 flex items-center hover:text-amber-700">
              Light <ChevronRight className="h-3 w-3 ml-1" />
            </button>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="mt-8 bg-amber-50 border border-amber-200/50 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-zinc-900">Signal issue since 08:02 AM</h4>
              <p className="text-xs text-zinc-600 mt-1">Sensor connectivity degraded • Check network</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-white text-xs font-semibold rounded-full transition-colors shrink-0">
            Resolve
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
