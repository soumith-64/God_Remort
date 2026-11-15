"use client";

import React, { useState, useEffect } from "react";
import { useOmniStore } from "@/stores/useOmniStore";
import { api } from "@/lib/api";
import { formatUptime, formatBytes } from "@/lib/utils";
import { 
  Sliders, 
  Volume2, 
  VolumeX, 
  Sun, 
  Lock, 
  Moon, 
  RotateCcw, 
  Power, 
  XOctagon, 
  BatteryCharging, 
  Battery, 
  Cpu, 
  HardDrive, 
  Activity, 
  Laptop, 
  CheckCircle2, 
  AlertTriangle 
} from "lucide-react";

export function SystemView() {
  const { telemetry, addNotification } = useOmniStore();

  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [brightness, setBrightness] = useState(80);
  const [audioSupported, setAudioSupported] = useState(true);
  const [brightnessSupported, setBrightnessSupported] = useState(true);

  // Power confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    action: "restart" | "shutdown" | null;
    title: string;
    description: string;
  }>({ open: false, action: null, title: "", description: "" });

  const fetchAudioAndBrightness = async () => {
    try {
      const audio = await api.system.getAudio();
      if (audio.available) {
        setVolume(audio.volume_percent);
        setIsMuted(audio.is_muted);
      } else {
        setAudioSupported(false);
      }
    } catch (_) {}

    try {
      const bright = await api.system.getBrightness();
      if (bright.available) {
        setBrightness(bright.brightness_percent);
      } else {
        setBrightnessSupported(false);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchAudioAndBrightness();
  }, []);

  const handleVolumeChange = async (newVal: number) => {
    setVolume(newVal);
    try {
      await api.system.setAudio(newVal);
    } catch (e: any) {
      addNotification({ title: "Volume Error", message: e.message, type: "error" });
    }
  };

  const handleToggleMute = async () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    try {
      await api.system.setAudio(volume, nextMute);
    } catch (e: any) {
      addNotification({ title: "Mute Error", message: e.message, type: "error" });
    }
  };

  const handleBrightnessChange = async (newVal: number) => {
    setBrightness(newVal);
    try {
      await api.system.setBrightness(newVal);
    } catch (e: any) {
      addNotification({ title: "Brightness Error", message: e.message, type: "error" });
    }
  };

  const handlePowerAction = async (action: "lock" | "sleep" | "cancel") => {
    try {
      await api.system.power(action);
      addNotification({
        title: "Power Action Executed",
        message: `Dispatched '${action}' command to laptop.`,
        type: "success"
      });
    } catch (e: any) {
      addNotification({ title: "Power Action Failed", message: e.message, type: "error" });
    }
  };

  const executeConfirmedPower = async () => {
    if (!confirmModal.action) return;
    try {
      await api.system.power(confirmModal.action);
      addNotification({
        title: `${confirmModal.title} Dispatched`,
        message: "Command sent to host laptop.",
        type: "warning"
      });
      setConfirmModal({ open: false, action: null, title: "", description: "" });
    } catch (e: any) {
      addNotification({ title: "Power Failed", message: e.message, type: "error" });
    }
  };

  const sys = telemetry?.system;
  const cpu = telemetry?.cpu;
  const mem = telemetry?.memory;
  const disks = telemetry?.disk?.disks || [];

  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-fade-in">
      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-omni-surface border border-omni-border rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-white">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-omni-muted">{confirmModal.description}</p>
            <div className="flex space-x-2">
              <button
                onClick={() => setConfirmModal({ open: false, action: null, title: "", description: "" })}
                className="flex-1 py-2.5 rounded-xl bg-omni-card text-xs text-white"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedPower}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-semibold text-xs text-white"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2">
          <Sliders className="w-6 h-6 text-amber-400" />
          <span>System & Hardware Control</span>
        </h1>
        <p className="text-xs text-omni-muted">Windows Core Audio, display brightness, and hardware power</p>
      </div>

      {/* Hardware Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Audio Volume Card */}
        <div className="p-5 rounded-3xl bg-omni-surface border border-omni-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-500/30 text-omni-cyan">
                {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Master Audio Volume</h3>
                <p className="text-[10px] text-omni-muted">Windows Core Audio Endpoint</p>
              </div>
            </div>
            <button
              onClick={handleToggleMute}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                isMuted ? "bg-rose-950/60 border-rose-500/30 text-rose-300" : "bg-omni-card border-omni-border text-white"
              }`}
            >
              {isMuted ? "Unmute" : "Mute"}
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-omni-muted">Level</span>
              <span className="font-mono font-bold text-white">{isMuted ? "Muted" : `${volume}%`}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-omni-dark rounded-lg"
            />
          </div>
        </div>

        {/* Display Brightness Card */}
        <div className="p-5 rounded-3xl bg-omni-surface border border-omni-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-2xl bg-amber-950/80 border border-amber-500/30 text-amber-400">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Display Brightness</h3>
                <p className="text-[10px] text-omni-muted">
                  {brightnessSupported ? "WMI Internal Laptop Display" : "External display (DDC/CI not supported)"}
                </p>
              </div>
            </div>
            <span className="font-mono font-bold text-white text-xs">{brightness}%</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-omni-muted">Brightness</span>
              <span className="text-omni-muted text-[10px]">0 - 100%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              disabled={!brightnessSupported}
              value={brightness}
              onChange={(e) => handleBrightnessChange(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-2 bg-omni-dark rounded-lg disabled:opacity-40"
            />
          </div>
        </div>
      </div>

      {/* Power Operations Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-omni-muted px-1">
          Workstation Power Controls
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={() => handlePowerAction("lock")}
            className="p-4 rounded-2xl bg-omni-surface hover:bg-omni-card border border-omni-border flex flex-col items-center justify-center text-center space-y-2 transition-all"
          >
            <div className="p-2.5 rounded-xl bg-omni-card text-omni-cyan">
              <Lock className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-white">Lock Workstation</div>
            <div className="text-[10px] text-omni-muted">Win + L</div>
          </button>

          <button
            onClick={() => handlePowerAction("sleep")}
            className="p-4 rounded-2xl bg-omni-surface hover:bg-omni-card border border-omni-border flex flex-col items-center justify-center text-center space-y-2 transition-all"
          >
            <div className="p-2.5 rounded-xl bg-omni-card text-indigo-400">
              <Moon className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-white">Standby / Sleep</div>
            <div className="text-[10px] text-omni-muted">ACPI S3 Standby</div>
          </button>

          <button
            onClick={() => setConfirmModal({
              open: true,
              action: "restart",
              title: "Restart Laptop?",
              description: "This will restart your Windows PC immediately. Agent will resume upon login."
            })}
            className="p-4 rounded-2xl bg-omni-surface hover:bg-omni-card border border-omni-border flex flex-col items-center justify-center text-center space-y-2 transition-all"
          >
            <div className="p-2.5 rounded-xl bg-omni-card text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-white">Restart</div>
            <div className="text-[10px] text-omni-muted">shutdown /r</div>
          </button>

          <button
            onClick={() => setConfirmModal({
              open: true,
              action: "shutdown",
              title: "Shut Down Laptop?",
              description: "This will power off your laptop completely. You will need WOL or physical access to turn it on."
            })}
            className="p-4 rounded-2xl bg-omni-surface hover:bg-omni-card border border-omni-border flex flex-col items-center justify-center text-center space-y-2 transition-all"
          >
            <div className="p-2.5 rounded-xl bg-omni-card text-rose-400">
              <Power className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-white">Shut Down</div>
            <div className="text-[10px] text-omni-muted">shutdown /s</div>
          </button>

          <button
            onClick={() => handlePowerAction("cancel")}
            className="p-4 rounded-2xl bg-omni-surface hover:bg-omni-card border border-omni-border flex flex-col items-center justify-center text-center space-y-2 transition-all col-span-2 sm:col-span-1"
          >
            <div className="p-2.5 rounded-xl bg-omni-card text-emerald-400">
              <XOctagon className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-white">Cancel Shutdown</div>
            <div className="text-[10px] text-omni-muted">shutdown /a</div>
          </button>
        </div>
      </div>

      {/* Disks Partition Details */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-omni-muted px-1">
          Mounted Storage Partitions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {disks.map((d, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-omni-surface border border-omni-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span>{d.mountpoint} ({d.fstype || "NTFS"})</span>
                </span>
                <span className="font-mono text-xs font-bold text-white">{d.percent}%</span>
              </div>
              <div className="w-full bg-omni-dark rounded-full h-2 overflow-hidden border border-omni-border">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${d.percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-omni-muted">
                <span>{d.used_gb} GB used</span>
                <span>{d.free_gb} GB free of {d.total_gb} GB</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
