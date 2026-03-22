import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, X, Phone, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

const CARRIERS = [
  { value: "att",        label: "AT&T" },
  { value: "verizon",    label: "Verizon" },
  { value: "tmobile",    label: "T-Mobile" },
  { value: "sprint",     label: "Sprint" },
  { value: "boost",      label: "Boost Mobile" },
  { value: "cricket",    label: "Cricket Wireless" },
  { value: "metro",      label: "Metro by T-Mobile" },
  { value: "uscellular", label: "US Cellular" },
  { value: "googlefi",   label: "Google Fi" },
  { value: "consumer",   label: "Consumer Cellular" },
];

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function SubscribeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"subscribe" | "unsubscribe">("subscribe");
  const [phone, setPhone] = useState("");
  const [carrier, setCarrier] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch(`${BASE_PATH}/api/subscriptions/count`)
      .then(r => r.json())
      .then(d => setCount(d.count))
      .catch(() => {});
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setResult({ ok: false, message: "Please enter a valid 10-digit US phone number." });
      setLoading(false);
      return;
    }
    try {
      if (tab === "subscribe") {
        if (!carrier) {
          setResult({ ok: false, message: "Please select your carrier." });
          setLoading(false);
          return;
        }
        const res = await fetch(`${BASE_PATH}/api/subscriptions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: digits, carrier }),
        });
        const data = await res.json();
        if (res.ok) {
          setResult({ ok: true, message: "You're signed up! You'll get a text whenever an alert is issued for this area." });
          setCount(c => (c ?? 0) + 1);
          setPhone("");
          setCarrier("");
        } else {
          setResult({ ok: false, message: data.error || "Something went wrong." });
        }
      } else {
        const res = await fetch(`${BASE_PATH}/api/subscriptions`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: digits }),
        });
        const data = await res.json();
        if (res.ok) {
          setResult({ ok: true, message: "You've been unsubscribed from text alerts." });
          setCount(c => Math.max(0, (c ?? 1) - 1));
          setPhone("");
        } else {
          setResult({ ok: false, message: data.error || "Number not found." });
        }
      }
    } catch {
      setResult({ ok: false, message: "Connection error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => { setIsOpen(true); setResult(null); }}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card/40 backdrop-blur-md border border-white/10 text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
      >
        <Bell className="w-4 h-4" />
        Text Alerts
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0d1117] border border-white/10 rounded-3xl shadow-2xl z-50 p-6 flex flex-col gap-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Free Text Alerts
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get a text message when a weather alert is issued.
                    {count !== null && (
                      <span className="ml-1 text-primary font-medium">{count} {count === 1 ? "person" : "people"} subscribed.</span>
                    )}
                  </p>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex bg-black/30 p-1 rounded-xl border border-white/5">
                <button
                  onClick={() => { setTab("subscribe"); setResult(null); }}
                  className={cn("flex-1 py-2 text-sm rounded-lg font-medium transition-all", tab === "subscribe" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white")}
                >
                  Subscribe
                </button>
                <button
                  onClick={() => { setTab("unsubscribe"); setResult(null); }}
                  className={cn("flex-1 py-2 text-sm rounded-lg font-medium transition-all flex items-center justify-center gap-1.5", tab === "unsubscribe" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white")}
                >
                  <BellOff className="w-3.5 h-3.5" />
                  Unsubscribe
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(formatPhone(e.target.value))}
                    placeholder="(555) 867-5309"
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {tab === "subscribe" && (
                  <select
                    value={carrier}
                    onChange={e => setCarrier(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-muted-foreground"
                  >
                    <option value="">Select your carrier...</option>
                    {CARRIERS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                )}

                {result && (
                  <div className={cn(
                    "flex items-start gap-2 p-3 rounded-xl text-sm",
                    result.ok ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"
                  )}>
                    {result.ok && <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                    {result.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !phone}
                  className="w-full py-3 rounded-xl font-bold bg-white text-black hover:bg-white/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Working...</>
                  ) : tab === "subscribe" ? (
                    <><Bell className="w-4 h-4" />Sign Me Up</>
                  ) : (
                    <><BellOff className="w-4 h-4" />Unsubscribe</>
                  )}
                </button>

                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  Uses your carrier's free email-to-SMS gateway. Standard message rates from your carrier may apply. No app or account needed.
                </p>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
