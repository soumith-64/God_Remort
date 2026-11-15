"use client";

import React, { useState } from "react";
import { useOmniStore } from "@/stores/useOmniStore";
import { api } from "@/lib/api";
import { formatUptime, formatBytes } from "@/lib/utils";
import { 
  Cpu, 
  HardDrive, 
  Activity, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Lock, 
  Moon, 
  RotateCcw, 
  Power, 
  Monitor, 
  Code2, 
  Sparkles, 
  Terminal, 
  FolderTree, 
  BatteryCharging, 
  Battery, 
  AlertTriangle,
  CheckCircle2,
  X
} from "lucide-react";

export function DashboardView() {
  const { telemetry, setActiveTab, addNotification } = useOmniStore();

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    action: "sleep" | "restart" | "shutdown" | null;
    title: string;
    description: string;
  }>({ open: false, action: null, title: "", description: "" });

  const [actionLoading, setActionLoading] = useState(false);

  const sys = telemetry?.system;
  const cpu = telemetry?.cpu;
  const mem = telemetry?.memory;
  const disk = telemetry?.disk?.primary;
  const net = telemetry?.network;
  const battery = telemetry?.battery;

  const handleLaunchApp = async (appId: string, name: string) => {
    try {
      await api.apps.launch(appId);
      addNotification({
        title: `${name} Launched`,
        message: `Successfully requested launch of ${name} on laptop.`,
        type: "success"
      });
    } catch (e: any) {
      addNotification({
        title: `Launch Failed`,
        message: e.message || `Could not launch ${name}`,
        type: "error"
      });
    }
  };

  const handleLock = async () => {
    try {
      await api.system.power("lock");
      addNotification({
        title: "Workstation Locked",
        message: "Windows session locked successfully.",
        type: "info"
      });
    } catch (e: any) {
      addNotification({ title: "Lock Failed", message: e.message, type: "error" });
    }
  };

  const openConfirmPower = (action: "sleep" | "restart" | "shutdown") => {
    if (action === "sleep") {
      setConfirmModal({
        open: true,
        action: "sleep",
        title: "Put Laptop to Sleep?",
        description: "The laptop will enter low-power standby mode. Wake-on-LAN may be required to wake it."
      });
    } else if (action === "restart") {
      setConfirmModal({
        open: true,
        action: "restart",
        title: "Restart Laptop?",
        description: "All unsaved work may be lost. The agent will automatically recover on Windows reboot."
      });
    } else if (action === "shutdown") {
      setConfirmModal({
        open: true,
        action: "shutdown",
        title: "Shut Down Laptop?",
        description: "The laptop will power down completely. You will need physical access or configured Wake-on-LAN to power it back on."
      });
    }
  };

  const executeConfirmedPower = async () => {
    if (!confirmModal.action) return;
    try {
      setActionLoading(true);
      await api.system.power(confirmModal.action);
      addNotification({
        title: "Power Operation Dispatched",
        message: `${confirmModal.title} dispatched to laptop host.`,
        type: "warning"
      });
      setConfirmModal({ open: false, action: null, title: "", description: "" });
    } catch (e: any) {
      addNotification({ title: "Operation Failed", message: e.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-fade-in">
      {/* Power Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-omni-surface border border-omni-border rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-amber-950/80 border border-amber-500/30 text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-white">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-omni-muted leading-relaxed">
              {confirmModal.description}
            </p>
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setConfirmModal({ open: false, action: null, title: "", description: "" })}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-omni-card hover:bg-omni-cardHover text-white border border-omni-border"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedPower}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-lg shadow-rose-600/30"
              >
                {actionLoading ? "Executing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Host Status Banner Card */}
      <div className="p-5 rounded-3xl glass-panel relative overflow-hidden border border-omni-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-omni-cyan">
              <span className="w-2 h-2 rounded-full bg-omni-cyan animate-pulse" />
              <span>SYSTEM READY</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
              {sys?.hostname || "Personal Workstation"}
            </h1>
            <p className="text-xs text-omni-muted mt-0.5">
              {sys?.os} {sys?.os_release} (Build {sys?.os_version}) • {sys?.architecture}
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {sys?.uptime_seconds && (
              <div className="px-3 py-2 rounded-2xl bg-omni-card/80 border border-omni-border">
                <div className="text-[10px] text-omni-muted uppercase">Uptime</div>
                <div className="font-mono text-white font-medium">{formatUptime(sys.uptime_seconds)}</div>
              </div>
            )}
            {battery?.available && (
              <div className="px-3 py-2 rounded-2xl bg-omni-card/80 border border-omni-border">
                <div className="text-[10px] text-omni-muted uppercase">Power</div>
                <div className="flex items-center space-x-1.5 font-medium text-white">
                  {battery.power_plugged ? <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" /> : <Battery className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{battery.percent}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Telemetry Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* CPU Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-omni-surface border border-omni-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-omni-muted flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-omni-cyan" />
              <span>CPU Load</span>
            </span>
            <span className="font-mono text-sm font-bold text-white">
              {cpu?.overall_percent ?? 0}%
            </span>
          </div>
          <div className="w-full bg-omni-dark rounded-full h-2 overflow-hidden border border-omni-border">
            <div
              className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(2, cpu?.overall_percent ?? 0))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-omni-muted pt-1">
            <span>{cpu?.core_count_logical ?? 0} Cores</span>
            <span>{cpu?.freq_current_mhz ? `${Math.round(cpu.freq_current_mhz)} MHz` : "Active"}</span>
          </div>
        </div>

        {/* RAM Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-omni-surface border border-omni-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-omni-muted flex items-center space-x-1.5">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>RAM Memory</span>
            </span>
            <span className="font-mono text-sm font-bold text-white">
              {mem?.percent ?? 0}%
            </span>
          </div>
          <div className="w-full bg-omni-dark rounded-full h-2 overflow-hidden border border-omni-border">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(2, mem?.percent ?? 0))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-omni-muted pt-1">
            <span>{mem?.used_gb ?? 0} GB used</span>
            <span>{mem?.total_gb ?? 0} GB total</span>
          </div>
        </div>

        {/* Primary Storage Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-omni-surface border border-omni-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-omni-muted flex items-center space-x-1.5">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>Storage ({disk?.mountpoint || "C:"})</span>
            </span>
            <span className="font-mono text-sm font-bold text-white">
              {disk?.percent ?? 0}%
            </span>
          </div>
          <div className="w-full bg-omni-dark rounded-full h-2 overflow-hidden border border-omni-border">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(2, disk?.percent ?? 0))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-omni-muted pt-1">
            <span>{disk?.free_gb ?? 0} GB free</span>
            <span>{disk?.total_gb ?? 0} GB total</span>
          </div>
        </div>

        {/* Network I/O Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-omni-surface border border-omni-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-omni-muted flex items-center space-x-1.5">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Network Traffic</span>
            </span>
            <span className="text-[10px] text-omni-muted">LAN / VPN</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="p-2 rounded-xl bg-omni-card border border-omni-border">
              <div className="flex items-center space-x-1 text-[10px] text-omni-muted">
                <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                <span>DOWN</span>
              </div>
              <div className="font-mono text-xs font-bold text-white mt-0.5">
                {net?.download_kbs ?? 0} <span className="text-[9px] font-normal text-omni-muted">KB/s</span>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-omni-card border border-omni-border">
              <div className="flex items-center space-x-1 text-[10px] text-omni-muted">
                <ArrowUpRight className="w-3 h-3 text-omni-cyan" />
                <span>UP</span>
              </div>
              <div className="font-mono text-xs font-bold text-white mt-0.5">
                {net?.upload_kbs ?? 0} <span className="text-[9px] font-normal text-omni-muted">KB/s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Panel */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-omni-muted px-1">
          Quick Actions & Launchers
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Remote Desktop */}
          <button
            onClick={() => setActiveTab("desktop")}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-omni-surface hover:bg-omni-card border border-omni-border hover:border-omni-cyan/50 transition-all group shadow-sm text-center"
          >
            <div className="p-3 rounded-2xl bg-cyan-950/80 text-omni-cyan border border-cyan-800/50 mb-2 group-hover:scale-110 transition-transform">
              <Monitor className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-white">Remote Desktop</div>
            <div className="text-[10px] text-omni-muted mt-0.5">Live screen & touch</div>
          </button>

          {/* VS Code */}
          <button
            onClick={() => handleLaunchApp("vscode", "VS Code")}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-omni-surface hover:bg-omni-card border border-omni-border hover:border-indigo-500/50 transition-all group shadow-sm text-center"
          >
            <div className="p-3 rounded-2xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/50 mb-2 group-hover:scale-110 transition-transform">
              <Code2 className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-white">Open VS Code</div>
            <div className="text-[10px] text-omni-muted mt-0.5">Code workspace</div>
          </button>

          {/* Antigravity */}
          <button
            onClick={() => handleLaunchApp("antigravity", "Antigravity")}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-omni-surface hover:bg-omni-card border border-omni-border hover:border-cyan-400/50 transition-all group shadow-sm text-center"
          >
            <div className="p-3 rounded-2xl bg-cyan-950/80 text-omni-cyan border border-cyan-800/50 mb-2 group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-white">Open Antigravity</div>
            <div className="text-[10px] text-omni-muted mt-0.5">AI development IDE</div>
          </button>

          {/* Terminal */}
          <button
            onClick={() => setActiveTab("terminal")}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-omni-surface hover:bg-omni-card border border-omni-border hover:border-emerald-500/50 transition-all group shadow-sm text-center"
          >
            <div className="p-3 rounded-2xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 mb-2 group-hover:scale-110 transition-transform">
              <Terminal className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-white">Terminal</div>
            <div className="text-[10px] text-omni-muted mt-0.5">PowerShell interactive</div>
          </button>

          {/* File Manager */}
          <button
            onClick={() => setActiveTab("files")}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-omni-surface hover:bg-omni-card border border-omni-border hover:border-amber-500/50 transition-all group shadow-sm text-center"
          >
            <div className="p-3 rounded-2xl bg-amber-950/80 text-amber-400 border border-amber-800/50 mb-2 group-hover:scale-110 transition-transform">
              <FolderTree className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-white">File Manager</div>
            <div className="text-[10px] text-omni-muted mt-0.5">Browse, upload, download</div>
          </button>
        </div>
      </div>

      {/* Power Control Row */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-omni-muted px-1">
          Workstation Power Controls
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Lock */}
          <button
            onClick={handleLock}
            className="flex items-center space-x-3 p-3.5 rounded-2xl bg-omni-surface hover:bg-omni-card border border-omni-border transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-omni-card text-omni-muted group-hover:text-white transition-colors">
              <Lock className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white">Lock Screen</div>
              <div className="text-[10px] text-omni-muted">Win + L</div>
            </div>
          </button>

          {/* Sleep */}
          <button
            onClick={() => openConfirmPower("sleep")}
            className="flex items-center space-x-3 p-3.5 rounded-2xl bg-omni-surface hover:bg-omni-card border border-omni-border transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-omni-card text-indigo-400 group-hover:scale-110 transition-transform">
              <Moon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white">Sleep</div>
              <div className="text-[10px] text-omni-muted">Standby ACPI S3</div>
            </div>
          </button>

          {/* Restart */}
          <button
            onClick={() => openConfirmPower("restart")}
            className="flex items-center space-x-3 p-3.5 rounded-2xl bg-omni-surface hover:bg-omni-card border border-omni-border transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-omni-card text-amber-400 group-hover:scale-110 transition-transform">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white">Restart</div>
              <div className="text-[10px] text-omni-muted">Reboot laptop</div>
            </div>
          </button>

          {/* Shutdown */}
          <button
            onClick={() => openConfirmPower("shutdown")}
            className="flex items-center space-x-3 p-3.5 rounded-2xl bg-omni-surface hover:bg-omni-card border border-omni-border transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-omni-card text-rose-400 group-hover:scale-110 transition-transform">
              <Power className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white">Shut Down</div>
              <div className="text-[10px] text-omni-muted">Power off ACPI S5</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
