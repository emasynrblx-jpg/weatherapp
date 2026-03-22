import { motion } from "framer-motion";
import { AlertTriangle, Info, X } from "lucide-react";
import { useGetWarnings, type WeatherWarning } from "@workspace/api-client-react";
import { useState, useRef, useEffect } from "react";
import type { Location } from "@/pages/Home";

const SCROLL_SPEED_PX_PER_SEC = 80;

const getWarningStyles = (type: string) => {
  switch (type) {
    case "tornado_warning":
    case "severe_thunderstorm_warning":
      return "bg-red-600 text-white";
    case "tornado_watch":
      return "bg-yellow-500 text-yellow-950";
    case "severe_thunderstorm_watch":
      return "bg-blue-600 text-white";
    case "forecast_statement":
      return "bg-slate-700 text-white";
    case "warning_update":
      return "bg-orange-500 text-white";
    default:
      return "bg-slate-800 text-white";
  }
};

const getWarningIcon = (type: string) => {
  switch (type) {
    case "tornado_warning":
    case "severe_thunderstorm_warning":
      return <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-pulse" />;
    default:
      return <Info className="w-5 h-5 flex-shrink-0" />;
  }
};

function MarqueeText({ warning }: { warning: WeatherWarning }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<{ from: number; to: number; duration: number } | null>(null);

  useEffect(() => {
    const measure = () => {
      if (!contentRef.current || !containerRef.current) return;
      const contentWidth = contentRef.current.scrollWidth;
      const containerWidth = containerRef.current.offsetWidth;
      const from = containerWidth;
      const to = -contentWidth;
      const totalDistance = contentWidth + containerWidth;
      const duration = totalDistance / SCROLL_SPEED_PX_PER_SEC;
      setMetrics({ from, to, duration });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [warning.message, warning.city, warning.expiresAt]);

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden relative h-6">
      <motion.div
        ref={contentRef}
        className="absolute whitespace-nowrap font-medium flex gap-8 items-center"
        animate={metrics ? { x: [metrics.from, metrics.to] } : false}
        transition={metrics ? {
          repeat: Infinity,
          duration: metrics.duration,
          ease: "linear",
          repeatType: "loop",
        } : undefined}
        style={{ willChange: "transform", x: metrics?.from ?? 0 }}
      >
        <span>{warning.message}</span>
        <span className="opacity-50">•</span>
        <span>{warning.city}</span>
        <span className="opacity-50">•</span>
        <span>Expires at {new Date(warning.expiresAt).toLocaleTimeString()}</span>
        <span className="opacity-50">•</span>
        <span>{warning.message}</span>
      </motion.div>
    </div>
  );
}

interface AlertBannersProps {
  location: Location;
}

export function AlertBanners({ location }: AlertBannersProps) {
  const { data: warnings } = useGetWarnings(
    { lat: location.lat, lon: location.lon },
    { query: { refetchInterval: 15000 } },
  );

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (!warnings || warnings.length === 0) return null;

  const activeWarnings = warnings.filter(w => !dismissed.has(w.id));

  if (activeWarnings.length === 0) return null;

  return (
    <div className="w-full flex flex-col z-50 fixed top-0 left-0 right-0 shadow-2xl">
      {activeWarnings.map((warning) => (
        <motion.div
          key={warning.id}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className={`${getWarningStyles(warning.type)} flex items-center px-4 py-3 relative overflow-hidden`}
        >
          <div className="flex items-center gap-3 z-10 font-bold tracking-widest uppercase whitespace-nowrap bg-inherit pr-4">
            {getWarningIcon(warning.type)}
            <span>{warning.title}</span>
          </div>

          <MarqueeText warning={warning} />

          <button
            onClick={() => setDismissed(prev => new Set(prev).add(warning.id))}
            className="z-10 p-1 hover:bg-black/20 rounded-full transition-colors ml-4"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      ))}
    </div>
  );
}
