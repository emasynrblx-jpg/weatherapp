import { Router, type IRouter } from "express";
import { GetWeatherQueryParams, GeocodeCityQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

function getWeatherDescription(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 55) return "Drizzle";
  if (code <= 65) return "Rain";
  if (code <= 75) return "Snow";
  if (code === 77) return "Snow grains";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code <= 99) return "Thunderstorm with hail";
  return "Unknown";
}

router.get("/weather", async (req, res) => {
  const parse = GetWeatherQueryParams.safeParse(req.query);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const { lat, lon, city } = parse.data;

  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day,precipitation_probability,visibility,uv_index,surface_pressure&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&wind_speed_unit=mph&temperature_unit=fahrenheit&forecast_days=7&timezone=auto`;

    const weatherResp = await fetch(weatherUrl);
    if (!weatherResp.ok) {
      res.status(502).json({ error: "Failed to fetch weather data" });
      return;
    }
    const weatherJson = await weatherResp.json() as any;

    const current = weatherJson.current;
    const hourly = weatherJson.hourly;
    const daily = weatherJson.daily;

    const now = new Date();
    // Open-Meteo returns local time strings (no timezone suffix). Comparing them
    // with new Date() incorrectly treats them as UTC. Instead, use the UTC offset
    // supplied by Open-Meteo to shift `now` into the location's local time, then
    // compare as strings — ISO strings sort lexicographically so this is exact.
    const utcOffsetSec: number = weatherJson.utc_offset_seconds ?? 0;
    const localNow = new Date(now.getTime() + utcOffsetSec * 1000);
    const localNowHour = localNow.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
    const currentHourIndex = hourly.time.findIndex((t: string) => t.slice(0, 13) >= localNowHour);
    const startIdx = Math.max(0, currentHourIndex === -1 ? 0 : currentHourIndex);
    const hourlyForecast = hourly.time.slice(startIdx, startIdx + 24).map((time: string, i: number) => ({
      time,
      temperature: hourly.temperature_2m[startIdx + i],
      weatherCode: hourly.weather_code[startIdx + i],
      precipitationProbability: hourly.precipitation_probability[startIdx + i] ?? 0,
    }));

    const dailyForecast = daily.time.map((date: string, i: number) => ({
      date,
      maxTemp: daily.temperature_2m_max[i],
      minTemp: daily.temperature_2m_min[i],
      weatherCode: daily.weather_code[i],
      precipitationSum: daily.precipitation_sum[i] ?? 0,
      windSpeedMax: daily.wind_speed_10m_max[i] ?? 0,
    }));

    let cityName = city || "Unknown";
    let countryName = "";

    if (!city) {
      try {
        const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
        const geoResp = await fetch(geoUrl, { headers: { "User-Agent": "WeatherApp/1.0" } });
        if (geoResp.ok) {
          const geoJson = await geoResp.json() as any;
          cityName = geoJson.address?.city || geoJson.address?.town || geoJson.address?.village || geoJson.address?.county || "Unknown";
          countryName = geoJson.address?.country || "";
        }
      } catch {
      }
    }

    res.json({
      city: cityName,
      country: countryName,
      lat,
      lon,
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      weatherCode: current.weather_code,
      weatherDescription: getWeatherDescription(current.weather_code),
      isDay: current.is_day === 1,
      precipitationProbability: current.precipitation_probability ?? 0,
      visibility: current.visibility ?? 0,
      uvIndex: current.uv_index ?? 0,
      pressure: current.surface_pressure ?? 0,
      hourlyForecast,
      dailyForecast,
    });
  } catch (err) {
    req.log.error(err, "Weather fetch error");
    res.status(500).json({ error: "Internal server error" });
  }
});

const US_STATE_ABBR: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

const US_STATE_NAME_TO_ABBR: Record<string, string> = Object.fromEntries(
  Object.entries(US_STATE_ABBR).map(([abbr, name]) => [name.toLowerCase(), abbr])
);

interface ParsedQuery {
  city: string;
  stateFilter?: string; // full state name e.g. "Pennsylvania"
}

function parseQuery(q: string): ParsedQuery {
  const trimmed = q.trim();

  // "City, ST" — two-letter state abbreviation
  const abbrMatch = trimmed.match(/^(.+),\s*([A-Za-z]{2})$/);
  if (abbrMatch) {
    const city = abbrMatch[1].trim();
    const abbr = abbrMatch[2].toUpperCase();
    if (US_STATE_ABBR[abbr]) {
      return { city, stateFilter: US_STATE_ABBR[abbr] };
    }
  }

  // "City, Full State Name" — e.g. "Houston, Pennsylvania"
  const fullMatch = trimmed.match(/^(.+),\s*(.+)$/);
  if (fullMatch) {
    const city = fullMatch[1].trim();
    const statePart = fullMatch[2].trim().toLowerCase();
    if (US_STATE_NAME_TO_ABBR[statePart]) {
      return { city, stateFilter: fullMatch[2].trim() };
    }
  }

  return { city: trimmed };
}

router.get("/geocode", async (req, res) => {
  const parse = GeocodeCityQueryParams.safeParse(req.query);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const { q } = parse.data;

  try {
    const trimmed = q.trim();

    // --- ZIP CODE lookup via Zippopotam.us ---
    if (/^\d{5}$/.test(trimmed)) {
      const zipResp = await fetch(`https://api.zippopotam.us/us/${trimmed}`);
      if (zipResp.ok) {
        const zipJson = await zipResp.json() as any;
        const place = zipJson.places?.[0];
        if (place) {
          res.json({
            results: [{
              name: place["place name"],
              admin1: place.state,
              country: "United States",
              lat: parseFloat(place.latitude),
              lon: parseFloat(place.longitude),
            }],
          });
          return;
        }
      }
      res.json({ results: [] });
      return;
    }

    // --- CITY / STATE search via Open-Meteo ---
    const { city, stateFilter } = parseQuery(q);
    const omUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=en&format=json`;
    const omResp = await fetch(omUrl);
    if (!omResp.ok) {
      res.json({ results: [] });
      return;
    }
    const omJson = await omResp.json() as any;
    let results = (omJson.results || []).map((r: any) => ({
      name: r.name,
      country: r.country || "",
      admin1: r.admin1 || "",
      lat: r.latitude,
      lon: r.longitude,
    }));

    // Filter by state when user specified one
    if (stateFilter) {
      const filtered = results.filter((r: any) =>
        r.admin1.toLowerCase() === stateFilter.toLowerCase()
      );
      // Only apply filter if it produces results; otherwise return unfiltered
      if (filtered.length > 0) results = filtered;
    }

    res.json({ results: results.slice(0, 5) });
  } catch (err) {
    req.log.error(err, "Geocode fetch error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
