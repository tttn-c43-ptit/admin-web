import { HeroSection } from "@/components/dashboard/hero-section";
import { SoilIntelligenceChart } from "@/components/dashboard/soil-intelligence-chart";
import { ClimateIQChart } from "@/components/dashboard/climate-iq-chart";
import { CameraFeed } from "@/components/dashboard/camera-feed";
import { DeviceSensorsList } from "@/components/dashboard/device-sensors-list";
import { RecentUpdatesList } from "@/components/dashboard/recent-updates-list";

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 animate-in fade-in duration-500 pb-12">
      {/* Top Banner */}
      <HeroSection />

      {/* Middle Tier: Charts & Camera */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <SoilIntelligenceChart />
        <ClimateIQChart />
        <CameraFeed />
      </div>

      {/* Bottom Tier: Lists */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <DeviceSensorsList />
        </div>
        <div className="lg:col-span-2">
          <RecentUpdatesList />
        </div>
      </div>
    </div>
  );
}
