"use client";

import React, { useState, useEffect } from "react";
import { useOmniStore } from "@/stores/useOmniStore";
import { api } from "@/lib/api";
import { 
  LayoutGrid, 
  AppWindow, 
  Code2, 
  Sparkles, 
  Terminal, 
  FolderTree, 
  Globe, 
  Activity, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  Minimize2, 
  Maximize2, 
  X, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Calculator,
  Settings,
  MessageSquare,
  Video,
  Send,
  Layers,
  ArrowRight
} from "lucide-react";

export function AppsView() {
  const { setActiveTab, addNotification } = useOmniStore();

  const [activeSubTab, setActiveSubTab] = useState<"shortcuts" | "running" | "installed">("shortcuts");
  const [runningApps, setRunningApps] = useState<any[]>([]);
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [installedApps, setInstalledApps] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickLaunchQuery, setQuickLaunchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [launchingApp, setLaunchingApp] = useState<string | null>(null);

  const fetchRunning = async () => {
    try {
      setLoading(true);
      const res = await api.apps.getRunning();
      setRunningApps(res);
    } catch (e: any) {
      addNotification({ title: "Fetch Failed", message: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchShortcuts = async () => {
    try {
      setLoading(true);
      const res = await api.apps.getShortcuts();
      setShortcuts(res);
    } catch (e: any) {
      addNotification({ title: "Shortcuts Error", message: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchInstalled = async (refresh = false) => {
    try {
      setLoading(true);
      const res = await api.apps.getInstalled(refresh);
      setInstalledApps(res);
    } catch (e: any) {
      addNotification({ title: "Installed Apps Error", message: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "running") fetchRunning();
    else if (activeSubTab === "shortcuts") fetchShortcuts();
    else if (activeSubTab === "installed" && installedApps.length === 0) fetchInstalled();
  }, [activeSubTab]);

  const handleLaunch = async (appIdOrPath: string, name: string) => {
    try {
      setLaunchingApp(name);
      await api.apps.launch(appIdOrPath);
      addNotification({
        title: "Application Launched",
        message: `${name} is now running on your laptop. You can switch to Desktop view to control it.`,
        type: "success"
      });
      fetchRunning();
    } catch (e: any) {
      addNotification({ title: "Launch Failed", message: e.message, type: "error" });
    } finally {
      setLaunchingApp(null);
    }
  };

  const handleControlWindow = async (hwnd: number, action: "focus" | "minimize" | "maximize" | "close", title: string) => {
    try {
      await api.apps.controlWindow(hwnd, action);
      addNotification({
        title: "Window Action",
        message: `${action.toUpperCase()} sent to '${title.slice(0, 30)}...'`,
        type: "info"
      });
      if (action === "focus") {
        setActiveTab("desktop"); // Switch straight to remote desktop to interact with it!
      } else {
        fetchRunning();
      }
    } catch (e: any) {
      addNotification({ title: "Action Failed", message: e.message, type: "error" });
    }
  };

  const filteredInstalled = installedApps.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.publisher && a.publisher.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getAppIcon = (iconName: string) => {
    switch (iconName) {
      case "code": return <Code2 className="w-5 h-5" />;
      case "sparkles": return <Sparkles className="w-5 h-5 text-cyan-400" />;
      case "terminal": return <Terminal className="w-5 h-5 text-emerald-400" />;
      case "folder": return <FolderTree className="w-5 h-5 text-amber-400" />;
      case "globe": return <Globe className="w-5 h-5 text-blue-400" />;
      case "file-text": return <FileText className="w-5 h-5 text-indigo-400" />;
      case "calculator": return <Calculator className="w-5 h-5 text-purple-400" />;
      case "settings": return <Settings className="w-5 h-5 text-slate-400" />;
      case "message-square": return <MessageSquare className="w-5 h-5 text-indigo-400" />;
      case "video": return <Video className="w-5 h-5 text-blue-400" />;
      case "activity": return <Activity className="w-5 h-5 text-rose-400" />;
      default: return <AppWindow className="w-5 h-5 text-omni-cyan" />;
    }
  };

  return (
    <div className="space-y-5 pb-20 md:pb-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2">
            <span>App Manager</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Remote Launcher
            </span>
          </h1>
          <p className="text-xs text-omni-muted">Launch and manage any application on your laptop from mobile</p>
        </div>

        {/* Sub-Tabs Switcher */}
        <div className="flex items-center space-x-1 bg-omni-surface p-1 rounded-2xl border border-omni-border overflow-x-auto no-scrollbar w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab("shortcuts")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-1 sm:flex-initial text-center transition-all active:scale-95 ${
              activeSubTab === "shortcuts" ? "bg-omni-card text-omni-cyan shadow font-semibold" : "text-omni-muted hover:text-white"
            }`}
          >
            Launchers ({shortcuts.length})
          </button>
          <button
            onClick={() => setActiveSubTab("running")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-1 sm:flex-initial text-center transition-all active:scale-95 ${
              activeSubTab === "running" ? "bg-omni-card text-omni-cyan shadow font-semibold" : "text-omni-muted hover:text-white"
            }`}
          >
            Running ({runningApps.length})
          </button>
          <button
            onClick={() => setActiveSubTab("installed")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-1 sm:flex-initial text-center transition-all active:scale-95 ${
              activeSubTab === "installed" ? "bg-omni-card text-omni-cyan shadow font-semibold" : "text-omni-muted hover:text-white"
            }`}
          >
            All Software ({installedApps.length || "170+"})
          </button>
        </div>
      </div>

      {/* Universal Quick Launch Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-omni-surface border border-omni-border shadow-lg flex flex-col sm:flex-row items-center gap-2.5">
        <div className="flex items-center space-x-2 text-cyan-400 shrink-0 self-start sm:self-center">
          <Sparkles className="w-4 h-4 animate-pulse-slow" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Quick Open</span>
        </div>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (quickLaunchQuery.trim()) {
              handleLaunch(quickLaunchQuery.trim(), quickLaunchQuery.trim());
              setQuickLaunchQuery("");
            }
          }}
          className="flex-1 w-full flex items-center space-x-2"
        >
          <input
            type="text"
            value={quickLaunchQuery}
            onChange={(e) => setQuickLaunchQuery(e.target.value)}
            placeholder="Type any app to open (e.g. discord, notepad, calc, word, chrome, settings)..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-omni-dark border border-omni-border text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={!quickLaunchQuery.trim() || !!launchingApp}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-all active:scale-95 disabled:opacity-40 shrink-0 shadow-md shadow-cyan-500/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Open</span>
          </button>
        </form>
      </div>

      {/* Tab 1: Popular Launchers & Shortcuts */}
      {activeSubTab === "shortcuts" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {shortcuts.map((sc) => (
              <div
                key={sc.id}
                className="p-3.5 rounded-2xl bg-omni-surface border border-omni-border flex items-center justify-between hover:border-cyan-500/30 transition-all"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className="p-2 rounded-xl bg-omni-card border border-omni-border shrink-0">
                    {getAppIcon(sc.icon)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{sc.name}</div>
                    <div className="text-[10px] text-omni-muted uppercase tracking-wider font-mono">
                      {sc.category || "Application"}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleLaunch(sc.id, sc.name)}
                  disabled={launchingApp === sc.name}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 active:scale-95 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center space-x-1 shrink-0"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Launch</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Running Windows */}
      {activeSubTab === "running" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-omni-muted">
              {runningApps.length} active window{runningApps.length === 1 ? "" : "s"} detected
            </span>
            <button
              onClick={fetchRunning}
              className="p-2 rounded-xl bg-omni-surface hover:bg-omni-card border border-omni-border text-omni-muted hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {runningApps.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-omni-surface border border-omni-border text-omni-muted text-xs">
              No visible application windows detected.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {runningApps.map((app) => (
                <div
                  key={`${app.hwnd}-${app.pid}`}
                  className="p-3.5 rounded-2xl bg-omni-surface border border-omni-border flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between min-w-0">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-omni-card border border-omni-border text-omni-cyan shrink-0">
                        <AppWindow className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate" title={app.title}>
                          {app.title}
                        </div>
                        <div className="text-[10px] text-omni-muted flex items-center space-x-2 font-mono">
                          <span>{app.process_name}</span>
                          <span>•</span>
                          <span>{app.memory_mb} MB</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Window Control Buttons */}
                  <div className="flex items-center space-x-1.5 pt-2 border-t border-omni-border/50">
                    <button
                      onClick={() => handleControlWindow(app.hwnd, "focus", app.title)}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 active:scale-95 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-center space-x-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Bring to Front</span>
                    </button>
                    <button
                      onClick={() => handleControlWindow(app.hwnd, "minimize", app.title)}
                      className="p-2 rounded-xl bg-omni-card hover:bg-omni-cardHover active:scale-95 border border-omni-border text-omni-muted hover:text-white"
                      title="Minimize"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleControlWindow(app.hwnd, "maximize", app.title)}
                      className="p-2 rounded-xl bg-omni-card hover:bg-omni-cardHover active:scale-95 border border-omni-border text-omni-muted hover:text-white"
                      title="Maximize"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleControlWindow(app.hwnd, "close", app.title)}
                      className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 active:scale-95 border border-rose-500/30 text-rose-300"
                      title="Close Window"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: All Installed Software & Start Menu */}
      {activeSubTab === "installed" && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-omni-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any software (Discord, Chrome, Office, GTA, Steam)..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-omni-surface border border-omni-border text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <button
              onClick={() => fetchInstalled(true)}
              className="p-2 rounded-xl bg-omni-surface hover:bg-omni-card border border-omni-border text-omni-muted hover:text-white active:scale-95"
              title="Rescan Applications"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[65vh] overflow-y-auto pr-1">
            {filteredInstalled.slice(0, 150).map((app, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-omni-surface border border-omni-border flex items-center justify-between hover:border-cyan-500/30 transition-all"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-white truncate">{app.name}</div>
                  <div className="text-[10px] text-omni-muted truncate">
                    {app.publisher || "Installed Application"} {app.version ? `v${app.version}` : ""}
                  </div>
                </div>

                <button
                  onClick={() => handleLaunch(app.install_location || app.name, app.name)}
                  disabled={launchingApp === app.name}
                  className="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 active:scale-95 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center space-x-1 shrink-0"
                  title={`Launch ${app.name}`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Launch</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
