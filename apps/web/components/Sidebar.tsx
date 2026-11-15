"use client";

import React from "react";
import { useOmniStore, NavigationTab } from "@/stores/useOmniStore";
import { 
  Home, 
  Monitor, 
  LayoutGrid, 
  FolderTree, 
  Code2, 
  Terminal, 
  Sliders, 
  Zap, 
  ShieldCheck, 
  Settings,
  ChevronRight,
  Radio
} from "lucide-react";

export function Sidebar() {
  const { activeTab, setActiveTab, telemetry, connectionStatus } = useOmniStore();

  const navGroups = [
    {
      title: "CORE CONTROL",
      items: [
        { id: "home", label: "Dashboard", icon: Home },
        { id: "desktop", label: "Remote Desktop", icon: Monitor, badge: "Live" },
        { id: "apps", label: "Applications", icon: LayoutGrid },
        { id: "files", label: "File Manager", icon: FolderTree },
      ]
    },
    {
      title: "DEVELOPER WORKSPACE",
      items: [
        { id: "dev", label: "Developer Centre", icon: Code2 },
        { id: "terminal", label: "PowerShell Terminal", icon: Terminal },
      ]
    },
    {
      title: "SYSTEM & HARDWARE",
      items: [
        { id: "system", label: "System & Power", icon: Sliders },
        { id: "wol", label: "Wake-on-LAN", icon: Zap },
      ]
    },
    {
      title: "SECURITY & SETTINGS",
      items: [
        { id: "security", label: "Security & Audit", icon: ShieldCheck },
        { id: "settings", label: "Configuration", icon: Settings },
      ]
    }
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-[calc(100vh-61px)] glass-panel border-r border-omni-border p-4 sticky top-[61px] select-none">
      <div className="flex-1 space-y-6 overflow-y-auto pr-1">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <div className="text-[10px] font-semibold tracking-wider text-omni-muted uppercase px-3 mb-2">
              {group.title}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as NavigationTab)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-950/80 to-indigo-950/50 text-omni-cyan border border-cyan-500/30 shadow-md"
                      : "text-omni-muted hover:text-white hover:bg-omni-card/60"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-omni-cyan" : "text-omni-muted"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Host Status Footer */}
      <div className="pt-4 border-t border-omni-border mt-auto">
        <div className="flex items-center space-x-2.5 px-3 py-2 rounded-xl bg-omni-surface border border-omni-border">
          <div className="relative">
            <Radio className="w-4 h-4 text-omni-cyan animate-pulse-slow" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">
              {telemetry?.system?.hostname || "Host Connected"}
            </div>
            <div className="text-[10px] text-omni-muted truncate">
              {telemetry?.system?.os} {telemetry?.system?.os_release}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
