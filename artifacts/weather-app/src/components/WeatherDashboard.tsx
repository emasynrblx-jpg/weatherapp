import { format, parseISO } from "date-fns";
import { Wind, Droplets, Sun, Eye, Gauge, CloudRain } from "lucide-react";
import { useGetWeather } from "@workspace/api-client-react";
import { cn, getWeatherDetails } from "@/lib/utils";
import { motion } from "framer-motion";

interface WeatherDashboardProps {
  location: {
    lat: number;
    lon: number;
    name: string;
  };
}

export function WeatherDashboard({ location }: WeatherDashboardProps) {
  const { data: weather, isLoading, isError } = useGetWeather(
    { lat: location.lat, lon: location.lon, city: location.name },
    { query: { refetchInterval: 300000 } } // Refresh every 5 mins
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-lg text-muted-foreground animate-pulse font-medium">Gathering atmospheric data...</p>
      </div>
    );
  }

  if (isError || !weather) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="glass-panel p-8 rounded-3xl text-center max-w-md">
          <div className="text-destructive mb-4 text-5xl">⚠️</div>
          <h2 className="text-2xl font-display mb-2">Weather Unavailable</h2>
          <p className="text-muted-foreground">We couldn't reach the meteorological servers. Please check your connection or try again later.</p>
        </div>
      </div>
    );
  }

  const currentDetails = getWeatherDetails(weather.weatherCode, weather.isDay);

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto pb-20">
      
      {/* Header & Main Current Conditions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8 relative z-10">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-display tracking-tight mb-2 text-white">
              {location.name.split(',')[0]}
            </h1>
            <p className="text-muted-foreground text-lg mb-8">
              {location.name.includes(',') ? location.name.split(',').slice(1).join(',').trim() : "Current Conditions"}
            </p>
            
            <div className="flex items-center justify-center md:justify-start gap-6">
              <span className="text-8xl md:text-9xl drop-shadow-2xl filter leading-none">
                {currentDetails.emoji}
              </span>
              <div className="flex flex-col">
                <span className="text-7xl md:text-8xl font-display font-light text-white tracking-tighter">
                  {Math.round(weather.temperature)}°
                </span>
                <span className="text-2xl text-primary font-medium mt-1">
                  {currentDetails.description}
                </span>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto min-w-[300px]">
            <MetricCard icon={<Wind />} label="Wind" value={`${weather.windSpeed} km/h`} />
            <MetricCard icon={<Droplets />} label="Humidity" value={`${weather.humidity}%`} />
            <MetricCard icon={<CloudRain />} label="Precip" value={`${weather.precipitationProbability}%`} />
            <MetricCard icon={<Sun />} label="UV Index" value={`${weather.uvIndex}`} />
            <MetricCard icon={<Eye />} label="Visibility" value={`${(weather.visibility / 1000).toFixed(1)} km`} />
            <MetricCard icon={<Gauge />} label="Pressure" value={`${weather.pressure} hPa`} />
          </div>
        </div>
      </motion.div>

      {/* Hourly Forecast Strip */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-xl font-display mb-4 px-2">Today's Forecast</h3>
        <div className="flex overflow-x-auto gap-4 pb-4 px-2 snap-x snap-mandatory">
          {weather.hourlyForecast.slice(0, 24).map((hour, i) => {
            const time = parseISO(hour.time);
            const isNow = i === 0;
            const details = getWeatherDetails(hour.weatherCode, true); // Simplified day/night

            return (
              <div 
                key={hour.time}
                className={cn(
                  "flex flex-col items-center min-w-[90px] p-4 rounded-3xl snap-start transition-all",
                  isNow 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105" 
                    : "glass-panel hover:bg-white/5"
                )}
              >
                <span className="text-sm font-medium mb-3 opacity-80">
                  {isNow ? "Now" : format(time, "h a")}
                </span>
                <span className="text-3xl mb-3">{details.emoji}</span>
                <span className="text-xl font-bold font-display">{Math.round(hour.temperature)}°</span>
                <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
                  <CloudRain className="w-3 h-3" />
                  <span>{hour.precipitationProbability}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* 7-Day Forecast */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel rounded-[2rem] p-6 md:p-8"
      >
        <h3 className="text-xl font-display mb-6">7-Day Outlook</h3>
        <div className="flex flex-col gap-2">
          {weather.dailyForecast.map((day, i) => {
            const date = parseISO(day.date);
            const isToday = i === 0;
            const details = getWeatherDetails(day.weatherCode, true);

            return (
              <div 
                key={day.date}
                className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group"
              >
                <div className="w-24 md:w-32 font-medium">
                  {isToday ? "Today" : format(date, "EEEE")}
                </div>
                <div className="flex items-center gap-3 w-1/3 justify-center">
                  <span className="text-2xl group-hover:scale-110 transition-transform">{details.emoji}</span>
                  <span className="hidden md:inline-block text-sm text-muted-foreground w-24 truncate">
                    {details.description}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-4 w-32">
                  <span className="text-muted-foreground w-8 text-right">{Math.round(day.minTemp)}°</span>
                  <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-red-400 opacity-80" />
                  </div>
                  <span className="font-bold w-8 text-right">{Math.round(day.maxTemp)}°</span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
  return (
    <div className="flex items-center gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
      <div className="text-primary/80">
        {icon}
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
        <div className="font-semibold">{value}</div>
      </div>
    </div>
  );
}
