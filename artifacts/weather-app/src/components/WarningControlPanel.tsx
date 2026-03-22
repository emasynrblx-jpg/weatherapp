import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertTriangle, 
  Wind, 
  CloudLightning, 
  Clock, 
  Trash2, 
  Settings2,
  X,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  CloudSun,
} from "lucide-react";
import { useGetWarnings, CreateWarningRequestType } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import type { Location } from "@/pages/Home";

const STORAGE_KEY = "weather_admin_secret";
const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

interface WarningControlPanelProps {
  location: Location;
}

export function WarningControlPanel({ location }: WarningControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [adminSecret, setAdminSecret] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });
  const [showPasswordGate, setShowPasswordGate] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const isAuthenticated = !!adminSecret;

  const { data: warnings, refetch: refetchWarnings } = useGetWarnings(
    { lat: location.lat, lon: location.lon },
    { query: { refetchInterval: 10000, enabled: isAuthenticated && isOpen } }
  );

  const [selectedType, setSelectedType] = useState<CreateWarningRequestType>(CreateWarningRequestType.tornado_watch);
  const [expiry, setExpiry] = useState<number>(60);
  const [customDuration, setCustomDuration] = useState("");
  const [customMsg, setCustomMsg] = useState("");

  const effectiveExpiry = customDuration !== "" ? Math.max(1, parseInt(customDuration) || 1) : expiry;

  useEffect(() => {
    if (isOpen && !isAuthenticated) {
      setShowPasswordGate(true);
    }
  }, [isOpen, isAuthenticated]);

  const handleOpen = () => {
    setIsOpen(true);
    if (!isAuthenticated) {
      setShowPasswordGate(true);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setAuthError("");

    try {
      const res = await fetch(`${BASE_PATH}/api/admin/verify`, {
        headers: { "x-admin-secret": passwordInput },
      });

      if (res.status === 401) {
        setAuthError("Incorrect password. Please try again.");
      } else if (res.ok) {
        localStorage.setItem(STORAGE_KEY, passwordInput);
        setAdminSecret(passwordInput);
        setShowPasswordGate(false);
        setPasswordInput("");
        refetchWarnings();
      } else {
        setAuthError("Unable to verify. Please try again.");
      }
    } catch {
      setAuthError("Connection error. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAdminSecret(null);
    setIsOpen(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSecret) return;
    setIsCreating(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/warnings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({
          type: selectedType,
          expiresInMinutes: effectiveExpiry,
          message: customMsg || `Active ${selectedType.replace(/_/g, ' ')} for ${location.name}.`,
          lat: location.lat,
          lon: location.lon,
          city: location.name,
        }),
      });
      if (res.status === 401) {
        localStorage.removeItem(STORAGE_KEY);
        setAdminSecret(null);
        setShowPasswordGate(true);
      } else if (res.ok) {
        setCustomMsg("");
        refetchWarnings();
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!adminSecret) return;
    setIsDeletingId(id);
    try {
      const res = await fetch(`${BASE_PATH}/api/warnings/${id}`, {
        method: "DELETE",
        headers: { "x-admin-secret": adminSecret },
      });
      if (res.status === 401) {
        localStorage.removeItem(STORAGE_KEY);
        setAdminSecret(null);
        setShowPasswordGate(true);
      } else {
        refetchWarnings();
      }
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-40 bg-card border border-white/10 p-4 rounded-full shadow-2xl shadow-black/50 hover:bg-white/5 hover:scale-105 active:scale-95 transition-all group"
        title="Warning Controls"
      >
        <Settings2 className="w-6 h-6 text-muted-foreground group-hover:text-white transition-colors" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
            />
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full md:w-[450px] bg-[#0d1117] border-l border-white/10 z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <h2 className="font-bold text-xl flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    Warning Controls
                  </h2>
                  {isAuthenticated && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">Admin access</span>
                      <span className="mx-1">·</span>
                      <MapPin className="w-3 h-3" />
                      {location.name}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Password Gate */}
              <AnimatePresence mode="wait">
                {showPasswordGate ? (
                  <motion.div
                    key="gate"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex-1 flex flex-col items-center justify-center p-8 gap-6"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Lock className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-bold">Admin Access Required</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Enter your admin password to issue weather warnings
                      </p>
                    </div>

                    <form onSubmit={handleVerifyPassword} className="w-full space-y-4">
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={passwordInput}
                          onChange={(e) => { setPasswordInput(e.target.value); setAuthError(""); }}
                          placeholder="Admin password"
                          autoFocus
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {authError && (
                        <p className="text-sm text-red-400 text-center">{authError}</p>
                      )}

                      <button
                        type="submit"
                        disabled={isVerifying || !passwordInput}
                        className="w-full py-3 rounded-xl font-bold bg-white text-black hover:bg-white/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isVerifying ? (
                          <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Verifying...</>
                        ) : (
                          <><Lock className="w-4 h-4" />Unlock</>
                        )}
                      </button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="controls"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 overflow-y-auto p-6 space-y-8"
                  >
                    {/* Create Warning Form */}
                    <form onSubmit={handleCreate} className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Alert Type</label>
                        <div className="grid grid-cols-2 gap-3">
                          <TypeButton
                            active={selectedType === 'tornado_warning'}
                            onClick={() => setSelectedType('tornado_warning')}
                            label="Tornado Warning"
                            colorClass="border-red-500/50 hover:bg-red-500/20 data-[active=true]:bg-red-600 data-[active=true]:border-red-600 data-[active=true]:text-white"
                            icon={<Wind className="w-4 h-4" />}
                          />
                          <TypeButton
                            active={selectedType === 'severe_thunderstorm_warning'}
                            onClick={() => setSelectedType('severe_thunderstorm_warning')}
                            label="Storm Warning"
                            colorClass="border-red-500/50 hover:bg-red-500/20 data-[active=true]:bg-red-600 data-[active=true]:border-red-600 data-[active=true]:text-white"
                            icon={<CloudLightning className="w-4 h-4" />}
                          />
                          <TypeButton
                            active={selectedType === 'tornado_watch'}
                            onClick={() => setSelectedType('tornado_watch')}
                            label="Tornado Watch"
                            colorClass="border-yellow-500/50 hover:bg-yellow-500/20 data-[active=true]:bg-yellow-500 data-[active=true]:border-yellow-500 data-[active=true]:text-yellow-950"
                            icon={<Wind className="w-4 h-4" />}
                          />
                          <TypeButton
                            active={selectedType === 'severe_thunderstorm_watch'}
                            onClick={() => setSelectedType('severe_thunderstorm_watch')}
                            label="Storm Watch"
                            colorClass="border-blue-500/50 hover:bg-blue-500/20 data-[active=true]:bg-blue-600 data-[active=true]:border-blue-600 data-[active=true]:text-white"
                            icon={<CloudLightning className="w-4 h-4" />}
                          />
                          <TypeButton
                            active={selectedType === 'forecast_statement'}
                            onClick={() => setSelectedType('forecast_statement')}
                            label="Forecast"
                            colorClass="border-slate-500/50 hover:bg-slate-500/20 data-[active=true]:bg-slate-600 data-[active=true]:border-slate-600 data-[active=true]:text-white"
                            icon={<CloudSun className="w-4 h-4" />}
                          />
                          <TypeButton
                            active={selectedType === 'warning_update'}
                            onClick={() => setSelectedType('warning_update')}
                            label="Update"
                            colorClass="border-orange-500/50 hover:bg-orange-500/20 data-[active=true]:bg-orange-500 data-[active=true]:border-orange-500 data-[active=true]:text-white"
                            icon={<RefreshCw className="w-4 h-4" />}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                          Duration
                          {customDuration !== "" && (
                            <span className="ml-2 text-primary normal-case tracking-normal font-normal">
                              — {effectiveExpiry} min
                            </span>
                          )}
                        </label>
                        <div className="flex gap-2 bg-black/30 p-1.5 rounded-xl border border-white/5">
                          {[15, 30, 60, 120].map((min) => (
                            <button
                              key={min}
                              type="button"
                              onClick={() => { setExpiry(min); setCustomDuration(""); }}
                              className={cn(
                                "flex-1 py-2 text-sm rounded-lg transition-all font-medium",
                                expiry === min && customDuration === ""
                                  ? "bg-primary text-primary-foreground shadow-md"
                                  : "text-muted-foreground hover:bg-white/5"
                              )}
                            >
                              {min < 60 ? `${min}m` : `${min / 60}h`}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="1440"
                            value={customDuration}
                            onChange={(e) => setCustomDuration(e.target.value)}
                            placeholder="Custom (minutes)"
                            className={cn(
                              "flex-1 bg-black/30 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50",
                              customDuration !== "" ? "border-primary/50 text-foreground" : "border-white/10 text-muted-foreground"
                            )}
                          />
                          {customDuration !== "" && (
                            <button
                              type="button"
                              onClick={() => setCustomDuration("")}
                              className="text-muted-foreground hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Custom Message</label>
                        <textarea
                          value={customMsg}
                          onChange={(e) => setCustomMsg(e.target.value)}
                          placeholder={`Enter specific warning details for ${location.name}...`}
                          className="w-full h-24 bg-black/30 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isCreating}
                        className="w-full py-4 rounded-xl font-bold uppercase tracking-wider bg-white text-black hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isCreating ? (
                          <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Issuing Alert...</>
                        ) : (
                          `Issue Alert for ${location.name}`
                        )}
                      </button>
                    </form>

                    <hr className="border-white/10" />

                    {/* Active Warnings List */}
                    <div className="space-y-4">
                      <h3 className="font-medium flex items-center justify-between">
                        Active Alerts for {location.name}
                        <span className="bg-white/10 text-xs px-2 py-1 rounded-md">{warnings?.length || 0}</span>
                      </h3>

                      {(!warnings || warnings.length === 0) ? (
                        <div className="text-center p-6 border border-dashed border-white/10 rounded-2xl text-muted-foreground text-sm">
                          No active warnings for this location.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {warnings.map((w) => (
                            <div key={w.id} className="bg-black/40 border border-white/5 p-4 rounded-xl">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1 min-w-0">
                                  <span className={cn(
                                    "text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm",
                                    w.type.includes('warning') ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
                                  )}>
                                    {w.title}
                                  </span>
                                  <p className="text-sm text-foreground/90 line-clamp-2">{w.message}</p>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      Expires {new Date(w.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {w.city}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDelete(w.id)}
                                  disabled={isDeletingId === w.id}
                                  className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
                                  title="Dismiss Alert"
                                >
                                  {isDeletingId === w.id
                                    ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin block" />
                                    : <Trash2 className="w-4 h-4" />
                                  }
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Sign Out */}
                    <button
                      onClick={handleSignOut}
                      className="w-full py-2.5 rounded-xl text-sm text-muted-foreground border border-white/10 hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      Lock Panel
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function TypeButton({
  active,
  onClick,
  label,
  icon,
  colorClass
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
}) {
  return (
    <button
      type="button"
      data-active={active}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-xl border bg-black/30 transition-all text-sm gap-2 text-muted-foreground",
        colorClass
      )}
    >
      {icon}
      <span className="font-semibold text-center leading-tight">{label}</span>
    </button>
  );
}
