"use client";

import React, { useState, useEffect } from "react";
import { useOmniStore } from "@/stores/useOmniStore";
import { api } from "@/lib/api";
import { 
  ShieldCheck, 
  QrCode, 
  KeyRound, 
  Globe, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Copy,
  Laptop
} from "lucide-react";

export function PairingModal() {
  const { 
    isPairingModalOpen, 
    setPairingModalOpen, 
    agentUrl, 
    setAgentUrl, 
    setAuth, 
    setConnectionStatus,
    deviceName,
    addNotification
  } = useOmniStore();

  const [tab, setTab] = useState<"pin" | "qr" | "network">("pin");
  const [pin, setPin] = useState("");
  const [devName, setDevName] = useState(deviceName || "Mobile Device");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [currentPin, setCurrentPin] = useState<string | null>(null);
  const [interfaces, setInterfaces] = useState<any[]>([]);

  // Fetch pairing session details when opening QR tab
  const fetchSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.auth.initiatePairing();
      setQrCodeData(res.qr_code);
      setCurrentPin(res.pin);
      setInterfaces(res.network_interfaces || []);
    } catch (e: any) {
      setError(e.message || "Failed to contact laptop agent");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPairingModalOpen && (tab === "qr" || tab === "network")) {
      fetchSession();
    }
  }, [isPairingModalOpen, tab]);

  if (!isPairingModalOpen) return null;

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      setError("Please enter a valid 6-digit PIN");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.auth.verifyPairing(pin, devName);
      setAuth(res.token, res.device_id);
      setConnectionStatus("CONNECTED");
      addNotification({
        title: "Device Paired Successfully",
        message: `Paired as '${devName}' with full administrative scope.`,
        type: "success"
      });
      setPairingModalOpen(false);
    } catch (e: any) {
      setError(e.message || "Invalid PIN or pairing expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="w-full max-w-md max-h-[92dvh] overflow-y-auto bg-omni-surface border border-omni-border rounded-3xl p-5 sm:p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={() => setPairingModalOpen(false)}
          className="absolute top-4 sm:top-5 right-4 sm:right-5 p-1.5 rounded-full bg-omni-card text-omni-muted hover:text-white active:scale-95 transition-transform"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-500/30 text-omni-cyan">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Device Pairing & Network</h3>
            <p className="text-xs text-omni-muted">Establish encrypted connection to laptop</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-omni-dark/80 p-1 rounded-2xl mb-5 border border-omni-border">
          <button
            onClick={() => setTab("pin")}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-medium transition-all ${
              tab === "pin" ? "bg-omni-card text-white shadow" : "text-omni-muted hover:text-white"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Enter PIN</span>
          </button>
          <button
            onClick={() => setTab("qr")}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-medium transition-all ${
              tab === "qr" ? "bg-omni-card text-white shadow" : "text-omni-muted hover:text-white"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Laptop QR</span>
          </button>
          <button
            onClick={() => setTab("network")}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-medium transition-all ${
              tab === "network" ? "bg-omni-card text-white shadow" : "text-omni-muted hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Host IP</span>
          </button>
        </div>

        {/* Tab 1: Enter PIN */}
        {tab === "pin" && (
          <form onSubmit={handlePair} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-omni-muted mb-1.5">
                Device Name
              </label>
              <input
                type="text"
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                placeholder="e.g. My Phone"
                className="w-full px-3.5 py-2.5 rounded-xl bg-omni-card border border-omni-border text-white text-sm focus:outline-none focus:border-omni-cyan"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-omni-muted mb-1.5">
                6-Digit Laptop Pairing PIN
              </label>
              <input
                type="text"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full text-center tracking-widest font-mono text-2xl py-3 rounded-xl bg-omni-card border border-omni-border text-omni-cyan focus:outline-none focus:border-omni-cyan"
              />
              <p className="text-[11px] text-omni-muted mt-1 text-center">
                Check the laptop console or QR tab for the current PIN.
              </p>
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="w-full py-3 rounded-xl font-semibold text-xs tracking-wider uppercase text-black bg-gradient-to-r from-omni-cyan to-indigo-400 hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
            >
              {loading ? "Verifying..." : "Verify & Pair Device"}
            </button>
          </form>
        )}

        {/* Tab 2: Laptop QR Code */}
        {tab === "qr" && (
          <div className="flex flex-col items-center text-center space-y-4">
            {loading ? (
              <div className="p-12">
                <RefreshCw className="w-8 h-8 text-omni-cyan animate-spin" />
              </div>
            ) : qrCodeData ? (
              <>
                <div className="p-3 bg-omni-card rounded-2xl border border-omni-border">
                  <img src={qrCodeData} alt="Pairing QR Code" className="w-48 h-48 rounded-xl" />
                </div>
                <div>
                  <div className="text-xs text-omni-muted">Active Pairing PIN:</div>
                  <div className="text-2xl font-mono font-bold text-omni-cyan tracking-widest mt-0.5">
                    {currentPin}
                  </div>
                  <p className="text-[11px] text-omni-muted mt-1">
                    Valid for 5 minutes. Enter this PIN in the "Enter PIN" tab.
                  </p>
                </div>
              </>
            ) : (
              <div className="text-xs text-rose-400">{error || "Could not load QR code"}</div>
            )}
          </div>
        )}

        {/* Tab 3: Host Network Configuration */}
        {tab === "network" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-omni-muted mb-1.5">
                Laptop Agent Base URL
              </label>
              <input
                type="text"
                value={agentUrl}
                onChange={(e) => setAgentUrl(e.target.value)}
                placeholder="http://192.168.1.7:8000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-omni-card border border-omni-border text-white text-xs font-mono focus:outline-none focus:border-omni-cyan"
              />
              <p className="text-[11px] text-omni-muted mt-1">
                When accessing from a phone on the same Wi-Fi, enter your laptop's local Wi-Fi IP address.
              </p>
            </div>

            {interfaces.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-omni-muted mb-2">
                  Discovered Laptop Network Interfaces:
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {interfaces.map((iface, idx) => (
                    <div
                      key={idx}
                      onClick={() => setAgentUrl(`http://${iface.ip}:8000`)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-omni-card hover:bg-omni-cardHover border border-omni-border cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Laptop className="w-3.5 h-3.5 text-omni-cyan" />
                        <div>
                          <div className="text-xs text-white font-mono">{iface.ip}</div>
                          <div className="text-[10px] text-omni-muted">{iface.name} ({iface.type})</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-cyan-400">Use IP</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
