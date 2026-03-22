import { useState } from "react";
import { AlertBanners } from "@/components/AlertBanner";
import { SearchCity } from "@/components/SearchCity";
import { WeatherDashboard } from "@/components/WeatherDashboard";
import { WarningControlPanel } from "@/components/WarningControlPanel";
import { CloudRainWind } from "lucide-react";

export interface Location {
  lat: number;
  lon: number;
  name: string;
}

export function Home() {
  const [location, setLocation] = useState<Location>({
    lat: 40.1737,
    lon: -80.2465,
    name: "Washington, PA"
  });

  return (
    <div className="min-h-screen relative font-sans flex flex-col">
      <div 
        className="fixed inset-0 z-[-1] bg-cover bg-center bg-no-repeat opacity-40 mix-blend-screen"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/weather-bg.png)` }}
      />
      
      <AlertBanners location={location} />

      <main className="flex-1 container mx-auto px-4 pt-24 pb-12 flex flex-col gap-8 md:gap-12 relative z-10">
        
        <header className="flex flex-col md:flex-row items-center justify-between gap-6 w-full max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <CloudRainWind className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight leading-none text-white">Tech Weather</h1>
              <span className="text-xs font-medium text-primary uppercase tracking-widest">Washington, PA Only · See Other Services For Elsewhere</span>
            </div>
          </div>

          <SearchCity onSelect={setLocation} />
        </header>

        <WeatherDashboard location={location} />

      </main>

      <WarningControlPanel location={location} />
    </div>
  );
}
