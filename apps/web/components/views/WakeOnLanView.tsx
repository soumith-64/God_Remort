"use client";

import React, { useState, useEffect } from "react";
import { useOmniStore } from "@/stores/useOmniStore";
import { api } from "@/lib/api";
import { 
  Zap, 
  Radio, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Wifi, 
  Cpu, 
  Laptop,
  Check
} from "lucide-react";

export function WakeOnLanView() {
  const { agentUrl, addNotification } = useOmniStore();

  const [adapters, setAdapters] = useState<any[]>([]);
  const [selectedMac, setSelectedMac] = useState("");
  const [broadcastIp, setBroadcastIp] = useState("255.255.255.255");
  const [port, setPort] = useState(9);
  const [loading, setLoading] = useState(false);
  const [wakeStatus, setWakeStatus] = useState<string | null>(null);
  const [checkingReachability, setCheckingReachability] = useState(false);
  const [isReachable, setIsReachable] = useState<boolean | null>(null);

  const fetchAdapters = async () => {
    try {
      setLoading(true);
      const res = await api.wol.getAdapters();
      setAdapters(res);
      if (res.length > 0) {
        setSelectedMac(res[0].mac_address);
      }
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdapters();
  }, []);

  const handleSendWake = async () => {
    if (!selectedMac) {
      addNotification({ title: "No MAC Selected", message: "Please select a network adapter MAC address.", type: "error" });
      return;
    }

    try {
      setLoading(true);
      setWakeStatus(null);
      await api.wol.wake(selectedMac, broadcastIp, port);
      setWakeStatus("Magic packet broadcasted successfully!");
      addNotification({
        title: "Wake Packet Dispatched",
        message: `UDP magic packet sent to ${selectedMac} on port ${port}.`,
        type: "success"
      });
    } catch (e: any) {
      addNotification({ title: "Wake Error", message: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckReachability = async () => {
    try {
      setCheckingReachability(true);
      const host = agentUrl.replace(/^https?:\/\//, "").split(":")[0];
      const res = await api.wol.check(host, 8000);
      setIsReachable(res.reachable);
      addNotification({
        title: res.reachable ? "Laptop Reachable!" : "Laptop Offline",
        message: res.reachable ? `Laptop at ${host} is responding.` : "Target host did not respond.",
        type: res.reachable ? "success" : "warning"
      });
    } catch (_) {
      setIsReachable(false);
    } finally {
      setCheckingReachability(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2">
          <Zap className="w-6 h-6 text-indigo-400" />
          <span>Wake-on-LAN (WOL) Management</span>
        </h1>
        <p className="text-xs text-omni-muted">
          Broadcast ACPI magic packets to wake sleeping or powered-off laptops
        </p>
      </div>

      {/* Main Wake Dispatcher Card */}
      <div className="p-5 rounded-3xl bg-omni-surface border border-omni-border space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          Target Laptop Network Hardware
        </h3>

        {/* Adapter Selector */}
        <div className="space-y-2">
          <label className="text-xs text-omni-muted">Target Network Adapter & MAC Address</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {adapters.map((ad, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedMac(ad.mac_address)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedMac === ad.mac_address
                    ? "bg-gradient-to-r from-indigo-950/70 to-cyan-950/70 border-indigo-500 shadow-md"
                    : "bg-omni-card border-omni-border hover:bg-omni-cardHover"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white">{ad.interface}</div>
                  {selectedMac === ad.mac_address && <Check className="w-4 h-4 text-omni-cyan" />}
                </div>
                <div className="font-mono text-xs text-omni-cyan mt-1">{ad.mac_address}</div>
                <div className="text-[10px] text-omni-muted mt-0.5">IP: {ad.ip_address || "DHCP Assigned"}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Manual MAC input override */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="space-y-1">
            <label className="text-[11px] text-omni-muted">MAC Address</label>
            <input
              type="text"
              value={selectedMac}
              onChange={(e) => setSelectedMac(e.target.value)}
              placeholder="00:11:22:33:44:55"
              className="w-full px-3 py-2 rounded-xl bg-omni-card border border-omni-border text-xs font-mono text-white focus:outline-none focus:border-omni-cyan"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-omni-muted">Broadcast IP Address</label>
            <input
              type="text"
              value={broadcastIp}
              onChange={(e) => setBroadcastIp(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-omni-card border border-omni-border text-xs font-mono text-white focus:outline-none focus:border-omni-cyan"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-omni-muted">UDP Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-omni-card border border-omni-border text-xs font-mono text-white focus:outline-none focus:border-omni-cyan"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={handleSendWake}
            disabled={loading || !selectedMac}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/20 hover:opacity-90 disabled:opacity-40"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>{loading ? "Broadcasting..." : "Dispatch Wake Magic Packet"}</span>
          </button>
          <button
            onClick={handleCheckReachability}
            disabled={checkingReachability}
            className="px-4 py-3 rounded-xl bg-omni-card hover:bg-omni-cardHover border border-omni-border text-xs text-white flex items-center space-x-1.5"
          >
            <Radio className={`w-4 h-4 text-emerald-400 ${checkingReachability ? "animate-pulse" : ""}`} />
            <span>Check Host Online</span>
          </button>
        </div>

        {wakeStatus && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{wakeStatus}</span>
          </div>
        )}
      </div>

      {/* Hardware & Network Wake Setup Wizard */}
      <div className="p-5 rounded-3xl bg-omni-surface border border-omni-border space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <HelpCircle className="w-4 h-4 text-omni-cyan" />
          <span>Wake-on-LAN Setup & Hardware Requirements</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-omni-card border border-omni-border space-y-2">
            <div className="font-bold text-white flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-cyan-950 text-omni-cyan border border-cyan-800 flex items-center justify-center text-[10px]">1</span>
              <span>BIOS / UEFI ACPI Settings</span>
            </div>
            <p className="text-omni-muted leading-relaxed text-[11px]">
              Restart laptop and press F2/Del. Enable <strong>Wake on LAN</strong>, <strong>Power On by PCI-E</strong>, and optional <strong>AC Power Recovery</strong> (Power on when plugged into charger).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-omni-card border border-omni-border space-y-2">
            <div className="font-bold text-white flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center text-[10px]">2</span>
              <span>Windows Adapter Properties</span>
            </div>
            <p className="text-omni-muted leading-relaxed text-[11px]">
              Open Device Manager &gt; Network Adapters &gt; Properties &gt; Power Management. Check <strong>"Allow this device to wake the computer"</strong> and <strong>"Only allow a magic packet to wake the computer"</strong>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-omni-card border border-omni-border space-y-2">
            <div className="font-bold text-white flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 flex items-center justify-center text-[10px]">3</span>
              <span>Remote / Cellular Wake Gateway</span>
            </div>
            <p className="text-omni-muted leading-relaxed text-[11px]">
              Routers drop broadcast packets across the internet. When waking from outside your home Wi-Fi, the wake request can be dispatched from an always-on LAN node (e.g. Raspberry Pi) or a router VPN.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
