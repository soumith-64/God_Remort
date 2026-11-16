"use client";

import React, { useState } from "react";
import { useOmniStore, NavigationTab } from "@/stores/useOmniStore";
import { 
  Home, 
  Monitor, 
  LayoutGrid, 
  FolderTree, 
  MoreHorizontal,
  Code2,
  Terminal,
  Sliders,
  Zap,
  ShieldCheck,
  Settings,
  X,
  Mic
} from "lucide-react";

export function BottomNav() {
  const { activeTab, setActiveTab, setVoiceModalOpen } = useOmniStore();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainTabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "desktop", label: "Desktop", icon: Monitor },
    { id: "apps", label: "Apps", icon: LayoutGrid },
    { id: "files", label: "Files", icon: FolderTree },
  ];

  const moreItems: { id: NavigationTab; label: string; icon: any; color: string }[] = [
    { id: "dev", label: "Developer Centre", icon: Code2, color: "text-omni-cyan" },
    { id: "terminal", label: "PowerShell Terminal", icon: Terminal, color: "text-emerald-400" },
    { id: "system", label: "System & Power", icon: Sliders, color: "text-amber-400" },
    { id: "wol", label: "Wake-on-LAN", icon: Zap, color: "text-indigo-400" },
    { id: "security", label: "Security & Audit", icon: ShieldCheck, color: "text-omni-rose" },
    { id: "settings", label: "Settings", icon: Settings, color: "text-gray-300" },
  ];

  const isMoreActive = ["dev", "terminal", "system", "wol", "security", "settings"].includes(activeTab);

  return (
    <>
      {/* More Options Drawer Modal */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end md:hidden animate-fade-in">
          <div className="bg-omni-surface border-t border-omni-border rounded-t-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-omni-border mb-4">
              <span className="font-semibold text-sm text-white">GOD REMORT Tools</span>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-full bg-omni-card text-omni-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Voice Assistant Banner */}
            <button
              onClick={() => {
                setShowMoreMenu(false);
                setVoiceModalOpen(true);
              }}
              className="w-full mb-3 flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-cyan-950 to-blue-950 border border-cyan-500/30 text-left transition hover:border-cyan-400"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
                  <Mic className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    Voice Assistant
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">Live</span>
                  </div>
                  <div className="text-[11px] text-slate-400">Speak commands to control laptop</div>
                </div>
              </div>
              <span className="text-xs text-cyan-400 font-semibold px-2">Tap & Speak →</span>
            </button>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setShowMoreMenu(false);
                    }}
                    className={`flex items-center space-x-3 p-3 rounded-2xl border text-left transition-all ${
                      active
                        ? "bg-omni-card border-cyan-500/50 shadow-md"
                        : "bg-omni-card/60 border-omni-border hover:bg-omni-card"
                    }`}
                  >
                    <div className={`p-2 rounded-xl bg-omni-dark/80 ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-white">{item.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-omni-border md:hidden px-2 sm:px-4 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-around">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as NavigationTab)}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 relative ${
                  active ? "text-omni-cyan font-medium" : "text-omni-muted hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${active ? "scale-110" : ""}`} />
                <span className="text-[10px] mt-1">{tab.label}</span>
                {active && (
                  <span className="absolute bottom-0 w-8 h-0.5 bg-omni-cyan rounded-full glow-cyan" />
                )}
              </button>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 relative ${
              isMoreActive ? "text-omni-cyan font-medium" : "text-omni-muted hover:text-white"
            }`}
          >
            <MoreHorizontal className={`w-5 h-5 transition-transform ${isMoreActive ? "scale-110" : ""}`} />
            <span className="text-[10px] mt-1">More</span>
            {isMoreActive && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-omni-cyan rounded-full glow-cyan" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
