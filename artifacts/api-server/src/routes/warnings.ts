import { Router, type IRouter } from "express";
import { CreateWarningBody, DeleteWarningParams } from "@workspace/api-zod";
import { randomUUID } from "crypto";
import { sendSmsAlerts } from "../emailSender.js";

const router: IRouter = Router();

interface Warning {
  id: string;
  type: "tornado_warning" | "severe_thunderstorm_warning" | "tornado_watch" | "severe_thunderstorm_watch";
  title: string;
  message: string;
  issuedAt: string;
  expiresAt: string;
  lat: number;
  lon: number;
  city: string;
}

const warningTitles: Record<string, string> = {
  tornado_warning: "TORNADO WARNING",
  severe_thunderstorm_warning: "SEVERE THUNDERSTORM WARNING",
  tornado_watch: "TORNADO WATCH",
  severe_thunderstorm_watch: "SEVERE THUNDERSTORM WATCH",
  forecast_statement: "FORECAST STATEMENT",
  warning_update: "WARNING UPDATE",
};

const warnings: Map<string, Warning> = new Map();

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const WARNING_RADIUS_KM = 150;

function getActiveWarnings(lat?: number, lon?: number): Warning[] {
  const now = new Date();
  const active: Warning[] = [];
  for (const [id, w] of warnings) {
    if (new Date(w.expiresAt) <= now) {
      warnings.delete(id);
      continue;
    }
    if (lat !== undefined && lon !== undefined) {
      const dist = haversineKm(lat, lon, w.lat, w.lon);
      if (dist > WARNING_RADIUS_KM) continue;
    }
    active.push(w);
  }
  return active;
}

router.get("/warnings", (req, res) => {
  const lat = req.query.lat !== undefined ? parseFloat(req.query.lat as string) : undefined;
  const lon = req.query.lon !== undefined ? parseFloat(req.query.lon as string) : undefined;
  res.json(getActiveWarnings(lat, lon));
});

function requireAdmin(req: import("express").Request, res: import("express").Response): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    res.status(503).json({ error: "Admin access not configured" });
    return false;
  }
  const provided = req.headers["x-admin-secret"];
  if (!provided || provided !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

const warningColors: Record<string, number> = {
  tornado_warning: 0xdc2626,
  severe_thunderstorm_warning: 0xdc2626,
  tornado_watch: 0xeab308,
  severe_thunderstorm_watch: 0x2563eb,
  forecast_statement: 0x64748b,
  warning_update: 0xf97316,
};

async function postDiscordAlert(warning: Warning, imageBase64?: string): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const tz = "America/New_York";
  const fmtOpts: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZoneName: "short",
  };
  const issuedTime = new Date(warning.issuedAt).toLocaleString("en-US", fmtOpts);
  const expiresTime = new Date(warning.expiresAt).toLocaleString("en-US", fmtOpts);

  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: "📍 Location", value: warning.city, inline: true },
    { name: "🕐 Issued", value: issuedTime, inline: true },
    { name: "⏰ Expires", value: expiresTime, inline: true },
  ];

  const embed: Record<string, unknown> = {
    title: `⚠️ ${warning.title}`,
    color: warningColors[warning.type] ?? 0x64748b,
    fields,
    footer: {
      text: "⚠️ UNOFFICIAL ALERT · Issued by Tech Weather, not the NWS · Visit weather.gov for official information",
    },
    timestamp: warning.issuedAt,
  };

  if (warning.message && warning.message.trim().length > 0) {
    embed.description = warning.message;
  }

  const payload = {
    username: `Tech Weather — ${warning.city}`,
    embeds: [embed],
  };

  try {
    if (imageBase64) {
      const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
      const imgBuffer = Buffer.from(base64Data, "base64");
      const formData = new FormData();
      formData.append("payload_json", JSON.stringify(payload));
      formData.append("files[0]", new Blob([imgBuffer], { type: "image/png" }), "screenshot.png");
      await fetch(webhookUrl, { method: "POST", body: formData });
    } else {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
  } catch {
    // Non-fatal — warning is still created even if Discord post fails
  }
}

router.get("/admin/verify", (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json({ ok: true });
});

router.post("/warnings", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const imageBase64: string | undefined =
    typeof req.body.imageBase64 === "string" ? req.body.imageBase64 : undefined;

  const parse = CreateWarningBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { type, message, expiresInMinutes, lat, lon, city } = parse.data;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);
  const warning: Warning = {
    id: randomUUID(),
    type,
    title: warningTitles[type] || type,
    message,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lat,
    lon,
    city,
  };
  warnings.set(warning.id, warning);

  // Fire-and-forget — don't block the response
  postDiscordAlert(warning, imageBase64).catch(() => {});
  sendSmsAlerts({
    title: warning.title,
    message: warning.message,
    city: warning.city,
    expiresAt: warning.expiresAt,
  }).catch(() => {});

  res.status(201).json(warning);
});

router.delete("/warnings/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;

  const parse = DeleteWarningParams.safeParse(req.params);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const { id } = parse.data;
  if (!warnings.has(id)) {
    res.status(404).json({ error: "Warning not found" });
    return;
  }
  warnings.delete(id);
  res.status(204).send();
});

export default router;
