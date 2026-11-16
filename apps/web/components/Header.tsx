"use client";

import React, { useState } from "react";
import { useOmniStore } from "@/stores/useOmniStore";
import { 
  Laptop, 
  Battery, 
  BatteryCharging, 
  ShieldCheck, 
  ShieldAlert, 
  Settings, 
  Radio, 
  ChevronDown,
  Plus,
  Server,
  Trash2,
  Check,
  Mic
} from "lucide-react";

export function Header() {
  const { 
    telemetry, 
    connectionStatus, 
    latencyMs, 
    setPairingModalOpen, 
    setVoiceModalOpen,
    setActiveTab,
    systems,
    activeSystemId,
    switchSystem,
    addSystem,
    removeSystem
  } = useOmniStore();

  const [showSystemMenu, setShowSystemMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSysName, setNewSysName] = useState("");
  const [newSysUrl, setNewSysUrl] = useState("");

  const isConnected = connectionStatus === "CONNECTED";
  const battery = telemetry?.battery;
  const sys = telemetry?.system;

  const activeSystem = systems.find((s) => s.id === activeSystemId) || systems[0];

  const handleAddSystem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSysUrl.trim()) return;
    addSystem(newSysName || newSysUrl, newSysUrl);
    setNewSysName("");
    setNewSysUrl("");
    setShowAddModal(false);
    setShowSystemMenu(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-omni-border pt-[max(0.6rem,env(safe-area-inset-top))] px-2.5 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
        {/* Brand & System Switcher */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="flex items-center space-x-1.5 sm:space-x-2 cursor-pointer shrink-0" onClick={() => setActiveTab("home")}>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 active:scale-95 transition-transform">
              <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white animate-pulse-slow" />
            </div>
            <div className="flex items-center space-x-1">
              <span className="font-bold text-xs sm:text-sm tracking-wider text-white hidden xs:inline">GOD REMORT</span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-950 text-omni-cyan border border-cyan-800/50">
                PRO
              </span>
            </div>
          </div>

          {/* Multiple System Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSystemMenu(!showSystemMenu)}
              className="flex items-center space-x-1 px-2 py-1 rounded-xl bg-omni-surface hover:bg-omni-card border border-omni-border text-xs text-omni-muted hover:text-white transition-all active:scale-95"
            >
              <Server className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-omni-cyan shrink-0" />
              <span className="truncate max-w-[65px] xs:max-w-[100px] sm:max-w-[140px] font-medium text-white text-[11px] sm:text-xs">
                {activeSystem?.name || sys?.hostname || "System"}
              </span>
              <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-omni-muted shrink-0" />
            </button>

            {/* System Dropdown Popover */}
            {showSystemMenu && (
              <div className="absolute top-10 left-0 w-64 bg-omni-surface border border-omni-border rounded-2xl p-2 shadow-2xl z-50 animate-fade-in space-y-1">
                <div className="text-[10px] uppercase font-bold text-omni-muted px-2 py-1">
                  Connected Systems
                </div>
                {systems.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-omni-card cursor-pointer group"
                  >
                    <div
                      onClick={() => {
                        switchSystem(s.id);
                        setShowSystemMenu(false);
                      }}
                      className="flex items-center space-x-2 flex-1 min-w-0"
                    >
                      <Laptop className="w-3.5 h-3.5 text-omni-muted group-hover:text-omni-cyan" />
                      <div className="min-w-0">
                        <div className="text-xs text-white font-medium truncate">{s.name}</div>
                        <div className="text-[10px] font-mono text-omni-muted truncate">{s.url}</div>
                      </div>
                    </div>
                    {s.id === activeSystemId ? (
                      <Check className="w-3.5 h-3.5 text-omni-cyan shrink-0" />
                    ) : systems.length > 1 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSystem(s.id);
                        }}
                        className="p-1 text-omni-muted hover:text-rose-400 opacity-0 group-hover:opacity-100"
                        title="Remove System"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    ) : null}
                  </div>
                ))}

                <button
                  onClick={() => {
                    setShowAddModal(true);
                    setShowSystemMenu(false);
                  }}
                  className="w-full mt-2 flex items-center justify-center space-x-1.5 py-1.5 rounded-xl bg-omni-card hover:bg-omni-cardHover text-xs text-omni-cyan font-medium border border-omni-border"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Remote System</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Controls: Connection, Battery, Pairing, Settings */}
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          {/* Connection Status Pill */}
          <button
            onClick={() => setPairingModalOpen(true)}
            className={`px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium border flex items-center space-x-1 sm:space-x-1.5 transition-all active:scale-95 ${
              isConnected
                ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-400"
                : connectionStatus === "AUTH_REQUIRED"
                ? "bg-amber-950/60 border-amber-500/30 text-amber-400 animate-pulse"
                : "bg-rose-950/60 border-rose-500/30 text-rose-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                isConnected
                  ? "bg-emerald-400 shadow-sm shadow-emerald-400"
                  : connectionStatus === "AUTH_REQUIRED"
                  ? "bg-amber-400"
                  : "bg-rose-500"
              }`}
            />
            <span className="hidden sm:inline">
              {isConnected ? `Online (${latencyMs}ms)` : connectionStatus}
            </span>
            <span className="sm:hidden font-mono">
              {isConnected ? `${latencyMs}ms` : "Offline"}
            </span>
          </button>

          {/* Battery Indicator */}
          {battery?.available && (
            <div className="flex items-center space-x-1 text-xs px-2 py-1 rounded-lg bg-omni-surface border border-omni-border text-omni-muted hidden xs:flex">
              {battery.power_plugged ? (
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Battery className="w-3.5 h-3.5 text-omni-muted" />
              )}
              <span className="font-mono text-white text-[11px]">{battery.percent}%</span>
            </div>
          )}

          {/* Voice Assistant Button */}
          <button
            onClick={() => setVoiceModalOpen(true)}
            className="p-1.5 sm:p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 active:scale-95 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 transition-all flex items-center space-x-1"
            title="Voice Commands (Speak to Laptop)"
          >
            <Mic className="w-4 h-4 animate-pulse-slow" />
            <span className="hidden md:inline text-xs font-semibold">Voice</span>
          </button>

          {/* Pair / Security Button */}
          <button
            onClick={() => setPairingModalOpen(true)}
            className="p-1.5 sm:p-2 rounded-lg bg-omni-surface hover:bg-omni-card active:scale-95 border border-omni-border text-omni-muted hover:text-white transition-all"
            title="Device Pairing & Networking"
          >
            {isConnected ? (
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* Settings button */}
          <button
            onClick={() => setActiveTab("settings")}
            className="p-1.5 sm:p-2 rounded-lg bg-omni-surface hover:bg-omni-card active:scale-95 border border-omni-border text-omni-muted hover:text-white transition-all"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Add System Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddSystem} className="w-full max-w-sm bg-omni-surface border border-omni-border rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-white">Add Remote Machine</h3>
            <div>
              <label className="text-xs text-omni-muted mb-1 block">Machine Name</label>
              <input
                type="text"
                value={newSysName}
                onChange={(e) => setNewSysName(e.target.value)}
                placeholder="e.g. Office PC / Home Laptop"
                className="w-full px-3.5 py-2.5 rounded-xl bg-omni-card border border-omni-border text-xs text-white focus:outline-none focus:border-omni-cyan"
              />
            </div>
            <div>
              <label className="text-xs text-omni-muted mb-1 block">IP Address or Domain URL</label>
              <input
                type="text"
                required
                value={newSysUrl}
                onChange={(e) => setNewSysUrl(e.target.value)}
                placeholder="http://192.168.1.50:8000 or http://100.x.y.z:8000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-omni-card border border-omni-border text-xs font-mono text-white focus:outline-none focus:border-omni-cyan"
              />
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 rounded-xl bg-omni-card text-xs text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-omni-cyan text-black font-semibold text-xs"
              >
                Add System
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
