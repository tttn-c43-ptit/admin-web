import { Video, Maximize2, MoreVertical, Wifi } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CameraFeed() {
  return (
    <Card className="shadow-sm border-0 bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-zinc-700" />
          <CardTitle className="text-lg font-semibold text-zinc-900">Camera 1</CardTitle>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-600">
          <div className="h-2 w-2 rounded-full bg-lime-500 animate-pulse" />
          Live
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-[180px] rounded-2xl overflow-hidden shadow-inner">
          <img
            src="/images/camera_feed_plant.png"
            alt="Camera Feed"
            className="object-cover w-full h-full"
          />
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">Resolution</span>
            <span className="font-medium text-zinc-900">1920x1080</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">Location</span>
            <span className="font-medium text-zinc-900">Sector PL-02J</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">Status</span>
            <span className="font-medium text-lime-600">Recording</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
