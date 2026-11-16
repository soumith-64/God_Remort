"use client";

import React, { useState } from "react";
import { useOmniStore } from "@/stores/useOmniStore";
import { api } from "@/lib/api";
import { resolveLaptopUrl } from "@/lib/discovery";
import { 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Globe, 
  X,
  Laptop
} from "lucide-react";

export function AuthGate() {
  const { 
    agentUrl, 
    setAgentUrl, 
    setAuth, 
    setConnectionStatus, 
    deviceName, 
    addNotification 
  } = useOmniStore();

  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [devName, setDevName] = useState(deviceName || "Mobile Device");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim().replace(/\D/g, "");
    if (!cleanPin || cleanPin.length < 4) {
      setError("Please enter your 6-digit Master PIN / Key.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Locate laptop across the cloud using zero-config discovery
      setStatusText("Locating workstation across cloud...");
      const discovered = await resolveLaptopUrl(cleanPin);
      if (discovered) {
        setAgentUrl(discovered);
      } else {
        const isVercel = typeof window !== "undefined" && window.location.hostname.endsWith("vercel.app");
        const activeHost = agentUrl ? agentUrl.trim() : "";
        if (isVercel && (!activeHost || activeHost.includes("localhost"))) {
          throw new Error("Could not locate workstation for this PIN. Ensure your laptop's tunnel/agent is running.");
        }
      }

      setStatusText("Verifying Master PIN...");
      const res = await api.auth.verifyPairing(cleanPin, devName);
      setAuth(res.token, res.device_id);
      setConnectionStatus("CONNECTED");
      addNotification({
        title: "Workstation Unlocked",
        message: `Authenticated successfully as '${devName}'.`,
        type: "success"
      });
    } catch (err: any) {
      setError(err.message || "Access Denied: Invalid Master PIN or laptop is offline.");
    } finally {
      setLoading(false);
      setStatusText(null);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-omni-dark relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Locked Card */}
      <div className="w-full max-w-md bg-omni-surface/90 backdrop-blur-xl border border-cyan-500/25 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/40 relative z-10 animate-fade-in">
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <div className="w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-omni-cyan shadow-lg shadow-cyan-500/20">
              <Lock className="w-8 h-8" />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-black border border-cyan-500/50 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          
          <div className="inline-block px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono uppercase tracking-widest text-cyan-400 mb-2">
            Encrypted Gateway
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
            GOD REMORT
          </h1>
          <p className="text-xs text-omni-muted mt-1 max-w-xs">
            Workstation is locked. Enter your 6-digit Master PIN to unlock remote control.
          </p>
        </div>

        {/* PIN Input Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-omni-cyan uppercase tracking-wider mb-2 text-center">
              Master System PIN
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                autoFocus
                className="w-full text-center tracking-widest font-mono text-3xl py-3.5 px-10 rounded-2xl bg-omni-card border-2 border-cyan-500/40 text-omni-cyan focus:outline-none focus:border-omni-cyan shadow-lg shadow-cyan-500/10 transition-all placeholder:text-zinc-600"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-omni-muted hover:text-white transition-colors"
                title={showPin ? "Hide PIN" : "Show PIN"}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-omni-muted mt-2 text-center">
              Enter your private Master PIN to establish encrypted access.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-omni-muted mb-1.5">
              Client Device Name
            </label>
            <input
              type="text"
              value={devName}
              onChange={(e) => setDevName(e.target.value)}
              placeholder="e.g. My Phone"
              className="w-full px-3.5 py-2.5 rounded-xl bg-omni-card border border-omni-border text-white text-xs focus:outline-none focus:border-omni-cyan"
            />
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase text-black bg-gradient-to-r from-omni-cyan via-teal-300 to-indigo-400 hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25 active:scale-98 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>{statusText || "Authenticating..."}</span>
              </>
            ) : (
              <span>Unlock Workstation</span>
            )}
          </button>

          {/* Advanced Direct Host Toggle */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] text-omni-muted hover:text-white transition-colors"
            >
              {showAdvanced ? "▲ Hide Direct Host Settings" : "▼ Advanced: Direct Host / IP"}
            </button>
          </div>

          {showAdvanced && (
            <div className="p-3.5 rounded-2xl bg-black/40 border border-omni-border space-y-2 animate-fade-in text-left">
              <label className="text-[11px] text-omni-muted flex items-center space-x-1">
                <Globe className="w-3 h-3 text-omni-cyan" />
                <span>Direct Laptop Agent URL (Optional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={agentUrl}
                  onChange={(e) => setAgentUrl(e.target.value)}
                  placeholder="https://your-tunnel.trycloudflare.com or http://192.168.1.100:8000"
                  className="w-full px-3 py-2 rounded-xl bg-omni-card border border-omni-border text-white text-xs font-mono pr-7"
                />
                {agentUrl && (
                  <button
                    type="button"
                    onClick={() => setAgentUrl("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-omni-muted hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-omni-muted">
                Leave empty to use 1-Number Cloud Discovery automatically.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
