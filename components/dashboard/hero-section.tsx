import { Sun, Droplets, Wind } from "lucide-react";

export function HeroSection() {
  return (
    <div className="relative w-full h-[400px] rounded-3xl overflow-hidden shadow-lg animate-in fade-in duration-700">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/farm_hero_bg.png"
          alt="Farm Hero"
          className="w-full h-full object-cover rounded-3xl"
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30 rounded-3xl" />
      </div>

      {/* Top Left Glass Widgets */}
      <div className="absolute top-6 left-6 flex gap-4">
        {/* Current Conditions (Temperature) */}
        <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-2xl p-4 w-[160px] flex flex-col justify-between shadow-sm">
          <div className="flex flex-col">
            <Sun className="h-6 w-6 text-yellow-300 mb-2 drop-shadow-md" />
            <span className="text-xs font-medium text-white/90">Current Conditions</span>
          </div>
          <div className="mt-4">
            <h2 className="text-4xl font-bold tracking-tight drop-shadow-md">24°C</h2>
            <p className="text-xs mt-1 text-white/80">Sunny • H:46% • L:52%</p>
          </div>
        </div>

        {/* Soil Moisture */}
        <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-2xl p-4 w-[130px] flex flex-col justify-between shadow-sm">
          <Droplets className="h-6 w-6 text-blue-300 mb-2 drop-shadow-md" />
          <div className="mt-8">
            <h2 className="text-3xl font-bold tracking-tight drop-shadow-md">65%</h2>
            <p className="text-xs mt-1 text-white/90 font-medium">Soil Moisture</p>
          </div>
        </div>

        {/* Wind Speed */}
        <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-2xl p-4 w-[130px] flex flex-col justify-between shadow-sm">
          <Wind className="h-6 w-6 text-teal-200 mb-2 drop-shadow-md" />
          <div className="mt-8">
            <h2 className="text-3xl font-bold tracking-tight drop-shadow-md">2 m/s</h2>
            <p className="text-xs mt-1 text-white/90 font-medium">Wind Speed</p>
          </div>
        </div>
      </div>

      {/* Bottom Full-width Banner */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="bg-black/30 backdrop-blur-md border border-white/20 text-white rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between shadow-md">
          
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white/80 uppercase tracking-wider mb-1">Golden Harvest</span>
            <h1 className="text-3xl font-bold tracking-tight mb-1 drop-shadow-md">Sector PL-02J</h1>
            <p className="text-sm text-white/70">Area: 200 m² • Soil Type: Nitrogen-Content</p>
          </div>

          <div className="flex gap-12 mt-4 md:mt-0 px-4">
            <div className="flex flex-col">
              <span className="text-xs text-white/70 font-medium mb-1">pH Level</span>
              <span className="text-2xl font-bold drop-shadow-md">7.6</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-white/70 font-medium mb-1">Phosphorus</span>
              <span className="text-2xl font-bold drop-shadow-md">High</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-white/70 font-medium mb-1">Potassium</span>
              <span className="text-2xl font-bold drop-shadow-md">Adequate</span>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
