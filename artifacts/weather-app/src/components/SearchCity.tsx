import { useState, useRef, useEffect } from "react";
import { Search, MapPin } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useGeocodeCity } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface SearchCityProps {
  onSelect: (location: { lat: number; lon: number; name: string }) => void;
}

export function SearchCity({ onSelect }: SearchCityProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 400);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useGeocodeCity(
    { q: debouncedQuery },
    { query: { enabled: debouncedQuery.length > 2 } }
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-md z-40" ref={wrapperRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="City, state, or zip code..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-12 pr-4 py-3 bg-card/40 backdrop-blur-md border border-white/10 rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
        />
      </div>

      {isOpen && debouncedQuery.length > 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 p-2 glass-panel rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-primary/50 border-t-primary rounded-full animate-spin" />
              Searching atmosphere...
            </div>
          ) : data?.results && data.results.length > 0 ? (
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
              {data.results.map((result, idx) => (
                <button
                  key={`${result.lat}-${result.lon}-${idx}`}
                  onClick={() => {
                    onSelect({
                      lat: result.lat,
                      lon: result.lon,
                      name: `${result.name}, ${result.admin1 ? result.admin1 + ', ' : ''}${result.country}`,
                    });
                    setQuery("");
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/10 flex items-center gap-3 transition-colors group"
                >
                  <MapPin className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div>
                    <div className="font-semibold text-foreground">{result.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {result.admin1 ? `${result.admin1}, ` : ""}{result.country}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No cities found matching "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
