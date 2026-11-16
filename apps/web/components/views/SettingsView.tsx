"use client";

import React, { useState } from "react";
import { useOmniStore } from "@/stores/useOmniStore";
import { api } from "@/lib/api";
import { 
  Settings as SettingsIcon, 
  Globe, 
  Monitor, 
  KeyRound, 
  Server, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  CheckCircle2, 
  RefreshCw 
} from "lucide-react";

export function SettingsView() {
  const { 
    agentUrl, 
    setAgentUrl, 
    desktopQuality, 
    desktopScale, 
    setDesktopSettings, 
    setAuth, 
    setConnectionStatus,
    systems,
    activeSystemId,
    switchSystem,
    addSystem,
    removeSystem,
    addNotification 
  } = useOmniStore();

  const [inputUrl, setInputUrl] = useState(agentUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Custom PIN state
  const [customPinInput, setCustomPinInput] = useState("");
  const [savingPin, setSavingPin] = useState(false);

  // Add system state
  const [newSysName, setNewSysName] = useState("");
  const [newSysUrl, setNewSysUrl] = useState("");
  const [restartingAgent, setRestartingAgent] = useState(false);

  const handleRestartAgent = async () => {
    try {
      setRestartingAgent(true);
      await api.system.restartAgent();
      addNotification({
        title: "Agent Restart Initiated",
        message: "GOD REMORT Agent is restarting in the background. Reconnecting in 3 seconds...",
        type: "info"
      });
      setTimeout(() => {
        handleTestConnection();
        setRestartingAgent(false);
      }, 3500);
    } catch (e: any) {
      addNotification({ title: "Restart Failed", message: e.message, type: "error" });
      setRestartingAgent(false);
    }
  };

  const handleSaveUrl = () => {
    setAgentUrl(inputUrl);
    addNotification({ title: "Agent URL Updated", message: `Connecting to ${inputUrl}...`, type: "info" });
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await api.health();
      setTestResult(`Success! Agent v${res.version} is online on ${res.interfaces.length} network interfaces.`);
      setConnectionStatus("CONNECTED");
    } catch (e: any) {
      setTestResult(`Failed to connect: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSetCustomPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPinInput.trim() || customPinInput.trim().length < 4) {
      addNotification({ title: "Invalid PIN", message: "PIN must be at least 4 digits.", type: "error" });
      return;
    }

    try {
      setSavingPin(true);
      await api.auth.setCustomPin(customPinInput.trim());
      addNotification({
        title: "Permanent PIN Saved",
        message: `Your custom PIN is now active. You can use '${customPinInput.trim()}' to pair any device!`,
        type: "success"
      });
      setCustomPinInput("");
    } catch (e: any) {
      addNotification({ title: "Failed to Save PIN", message: e.message, type: "error" });
    } finally {
      setSavingPin(false);
    }
  };

  const handleAddSystem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSysUrl.trim()) return;
    addSystem(newSysName || newSysUrl, newSysUrl);
    setNewSysName("");
    setNewSysUrl("");
    addNotification({ title: "System Added", message: `Added ${newSysName || newSysUrl}`, type: "success" });
  };

  const handleResetAuth = () => {
    setAuth(null, null);
    setConnectionStatus("AUTH_REQUIRED");
    addNotification({ title: "Session Cleared", message: "You have un-paired this device.", type: "warning" });
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2">
          <SettingsIcon className="w-6 h-6 text-omni-cyan" />
          <span>System Settings & Preferences</span>
        </h1>
        <p className="text-xs text-omni-muted">Configure permanent PIN, multi-system connections, and streaming speeds</p>
      </div>

      {/* 1. Custom Permanent PIN Setup */}
      <div className="p-5 rounded-3xl bg-omni-surface border border-omni-border space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-500/30 text-omni-cyan">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Setup Your Own Permanent PIN
            </h3>
            <p className="text-[11px] text-omni-muted">
              Choose your own PIN (e.g. 1234 or 123456) so you never need to check random codes again.
            </p>
          </div>
        </div>

        <form onSubmit={handleSetCustomPin} className="space-y-3">
          <div className="flex space-x-2">
            <input
              type="text"
              value={customPinInput}
              onChange={(e) => setCustomPinInput(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter your new permanent PIN (e.g. 123456)"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-omni-card border border-omni-border text-xs font-mono text-white focus:outline-none focus:border-omni-cyan text-center tracking-widest text-base"
            />
            <button
              type="submit"
              disabled={savingPin || customPinInput.length < 4}
              className="px-5 py-2.5 rounded-xl bg-omni-cyan text-black font-semibold text-xs hover:opacity-90 disabled:opacity-40 shadow-md shadow-cyan-500/20"
            >
              {savingPin ? "Saving..." : "Save PIN"}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Multiple Systems & Workstations */}
      <div className="p-5 rounded-3xl bg-omni-surface border border-omni-border space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Manage Multiple Systems
            </h3>
            <p className="text-[11px] text-omni-muted">
              Connect to multiple laptops, home PCs, or office workstations and switch with 1 tap.
            </p>
          </div>
        </div>

        {/* Existing Systems List */}
        <div className="space-y-2">
          {systems.map((s) => (
            <div
              key={s.id}
              className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                s.id === activeSystemId
                  ? "bg-gradient-to-r from-cyan-950/60 to-indigo-950/60 border-cyan-500/40 shadow-md"
                  : "bg-omni-card border-omni-border"
              }`}
            >
              <div
                onClick={() => switchSystem(s.id)}
                className="flex-1 cursor-pointer"
              >
                <div className="text-xs font-bold text-white flex items-center space-x-2">
                  <span>{s.name}</span>
                  {s.id === activeSystemId && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-900 text-cyan-300">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-omni-muted">{s.url}</div>
              </div>
              {systems.length > 1 && (
                <button
                  onClick={() => removeSystem(s.id)}
                  className="p-1.5 rounded-lg text-omni-muted hover:text-rose-400"
                  title="Remove System"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add System Form */}
        <form onSubmit={handleAddSystem} className="p-3 rounded-2xl bg-omni-card/60 border border-omni-border space-y-2">
          <div className="text-xs font-semibold text-white">Add Another Machine</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={newSysName}
              onChange={(e) => setNewSysName(e.target.value)}
              placeholder="Machine Name (e.g. Office PC)"
              className="px-3 py-2 rounded-xl bg-omni-dark border border-omni-border text-xs text-white focus:outline-none"
            />
            <input
              type="text"
              required
              value={newSysUrl}
              onChange={(e) => setNewSysUrl(e.target.value)}
              placeholder="http://192.168.1.50:8000"
              className="px-3 py-2 rounded-xl bg-omni-dark border border-omni-border text-xs font-mono text-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded-xl bg-omni-card hover:bg-omni-cardHover text-xs font-medium text-omni-cyan border border-omni-border flex items-center justify-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Workstation</span>
          </button>
        </form>
      </div>

      {/* 3. Streaming Performance & Latency Modes */}
      <div className="p-5 rounded-3xl bg-omni-surface border border-omni-border space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Monitor className="w-4 h-4 text-indigo-400" />
          <span>Remote Desktop Latency Mode</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Ultra Fast (Zero Latency) */}
          <div
            onClick={() => setDesktopSettings(45, 0.55)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              desktopQuality <= 50
                ? "bg-gradient-to-r from-indigo-950 to-cyan-950 border-cyan-500 shadow-md"
                : "bg-omni-card border-omni-border hover:bg-omni-cardHover"
            }`}
          >
            <div className="text-xs font-bold text-white">Ultra Fast (Zero Latency)</div>
            <div className="text-[10px] text-omni-muted mt-1">45% Q • 0.55x Scale</div>
            <div className="text-[10px] text-emerald-400 mt-2">Instantaneous reaction on cellular / ngrok</div>
          </div>

          {/* Balanced */}
          <div
            onClick={() => setDesktopSettings(60, 0.70)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              desktopQuality > 50 && desktopQuality <= 75
                ? "bg-gradient-to-r from-indigo-950 to-cyan-950 border-cyan-500 shadow-md"
                : "bg-omni-card border-omni-border hover:bg-omni-cardHover"
            }`}
          >
            <div className="text-xs font-bold text-white">Balanced (Default)</div>
            <div className="text-[10px] text-omni-muted mt-1">60% Q • 0.70x Scale</div>
            <div className="text-[10px] text-omni-cyan mt-2">Smooth 30 FPS on Wi-Fi/Tailscale</div>
          </div>

          {/* High Quality */}
          <div
            onClick={() => setDesktopSettings(80, 0.85)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              desktopQuality > 75
                ? "bg-gradient-to-r from-indigo-950 to-cyan-950 border-cyan-500 shadow-md"
                : "bg-omni-card border-omni-border hover:bg-omni-cardHover"
            }`}
          >
            <div className="text-xs font-bold text-white">High Definition</div>
            <div className="text-[10px] text-omni-muted mt-1">80% Q • 0.85x Scale</div>
            <div className="text-[10px] text-amber-400 mt-2">Crisp code on high-speed LAN</div>
          </div>
        </div>
      </div>

      {/* 4. Connection Diagnostics */}
      <div className="p-5 rounded-3xl bg-omni-surface border border-omni-border space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Globe className="w-4 h-4 text-omni-cyan" />
          <span>Active Connection Route</span>
        </h3>

        <div className="space-y-2">
          <label className="text-xs text-omni-muted">Target Host URL</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="http://192.168.1.7:8000"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-omni-card border border-omni-border text-xs font-mono text-white focus:outline-none focus:border-omni-cyan"
            />
            <button
              onClick={handleSaveUrl}
              className="px-4 py-2.5 rounded-xl bg-omni-cyan text-black font-semibold text-xs hover:opacity-90"
            >
              Save
            </button>
          </div>
        </div>

        <div className="pt-2 flex items-center space-x-3">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="px-4 py-2 rounded-xl bg-omni-card hover:bg-omni-cardHover border border-omni-border text-xs text-white flex items-center space-x-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
            <span>Test Connection</span>
          </button>
          <button
            onClick={handleResetAuth}
            className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-xs"
          >
            Clear Token & Re-Pair
          </button>
        </div>
        {testResult && (
          <p className={`text-xs mt-1 font-mono ${testResult.startsWith("Success") ? "text-emerald-400" : "text-rose-400"}`}>
            {testResult}
          </p>
        )}
      </div>

      {/* 5. 24/7 Background Agent Administration */}
      <div className="p-5 rounded-3xl bg-omni-surface border border-omni-border space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Server className="w-4 h-4 text-omni-cyan" />
          <span>Workstation Agent Management</span>
        </h3>
        <p className="text-xs text-omni-muted leading-relaxed">
          Need to refresh the backend without accessing your laptop? Tap below to restart the background agent cleanly.
        </p>
        <button
          onClick={handleRestartAgent}
          disabled={restartingAgent}
          className="px-4 py-2.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-semibold flex items-center space-x-2 transition-all active:scale-95 shadow-lg shadow-cyan-950/30"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${restartingAgent ? "animate-spin" : ""}`} />
          <span>{restartingAgent ? "Restarting Agent..." : "Restart GOD REMORT Agent"}</span>
        </button>
      </div>
    </div>
  );
}
