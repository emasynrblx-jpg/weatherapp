import { Router, type IRouter } from "express";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const router: IRouter = Router();

export const CARRIERS: Record<string, { name: string; domain: string }> = {
  att:          { name: "AT&T",                domain: "txt.att.net" },
  verizon:      { name: "Verizon",             domain: "vtext.com" },
  tmobile:      { name: "T-Mobile",            domain: "tmomail.net" },
  sprint:       { name: "Sprint",              domain: "messaging.sprintpcs.com" },
  boost:        { name: "Boost Mobile",        domain: "sms.myboostmobile.com" },
  cricket:      { name: "Cricket Wireless",    domain: "sms.cricketwireless.net" },
  metro:        { name: "Metro by T-Mobile",   domain: "mymetropcs.com" },
  uscellular:   { name: "US Cellular",         domain: "email.uscc.net" },
  googlefi:     { name: "Google Fi",           domain: "msg.fi.google.com" },
  consumer:     { name: "Consumer Cellular",   domain: "mailmymobile.net" },
};

export interface Subscription {
  id: string;
  phone: string;
  carrier: string;
  subscribedAt: string;
}

const DATA_FILE = join(process.cwd(), "data", "subscriptions.json");

export function loadSubscriptions(): Subscription[] {
  try {
    if (!existsSync(DATA_FILE)) return [];
    return JSON.parse(readFileSync(DATA_FILE, "utf8")) as Subscription[];
  } catch {
    return [];
  }
}

function saveSubscriptions(subs: Subscription[]): void {
  writeFileSync(DATA_FILE, JSON.stringify(subs, null, 2), "utf8");
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

router.get("/subscriptions/count", (_req, res) => {
  res.json({ count: loadSubscriptions().length });
});

router.post("/subscriptions", (req, res) => {
  const { phone, carrier } = req.body as { phone?: string; carrier?: string };
  if (!phone || !carrier || !CARRIERS[carrier]) {
    res.status(400).json({ error: "Valid phone and carrier required" });
    return;
  }
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) {
    res.status(400).json({ error: "Phone must be a 10-digit US number" });
    return;
  }
  const subs = loadSubscriptions();
  const existing = subs.find(s => s.phone === normalized);
  if (existing) {
    existing.carrier = carrier;
    saveSubscriptions(subs);
    res.json({ message: "Subscription updated", id: existing.id });
    return;
  }
  const sub: Subscription = {
    id: randomUUID(),
    phone: normalized,
    carrier,
    subscribedAt: new Date().toISOString(),
  };
  subs.push(sub);
  saveSubscriptions(subs);
  res.status(201).json({ message: "Subscribed successfully", id: sub.id });
});

router.delete("/subscriptions", (req, res) => {
  const { phone } = req.body as { phone?: string };
  if (!phone) {
    res.status(400).json({ error: "Phone required" });
    return;
  }
  const normalized = normalizePhone(phone);
  const subs = loadSubscriptions();
  const idx = subs.findIndex(s => s.phone === normalized);
  if (idx === -1) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }
  subs.splice(idx, 1);
  saveSubscriptions(subs);
  res.json({ message: "Unsubscribed successfully" });
});

export default router;
