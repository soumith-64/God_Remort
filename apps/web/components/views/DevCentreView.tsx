"use client";

import React, { useState, useEffect } from "react";
import { useOmniStore } from "@/stores/useOmniStore";
import { api } from "@/lib/api";
import { 
  Code2, 
  Sparkles, 
  Terminal, 
  FolderGit2, 
  Play, 
  ExternalLink, 
  RefreshCw, 
  Radio, 
  CheckCircle2, 
  Square,
  Activity
} from "lucide-react";

export function DevCentreView() {
  const { setActiveTab, addNotification } = useOmniStore();

  const [workspacePath, setWorkspacePath] = useState(
    "C:\\Users\\soumi\\OneDrive\\Documents\\hackathon\\webph"
  );
  const [runningApps, setRunningApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const predefinedProjects = [
    { name: "OMNICONTROL (Current Workspace)", path: "C:\\Users\\soumi\\OneDrive\\Documents\\hackathon\\webph" },
    { name: "Documents Directory", path: "C:\\Users\\soumi\\OneDrive\\Documents" },
    { name: "Downloads Directory", path: "C:\\Users\\soumi\\Downloads" },
  ];

  const fetchRunning = async () => {
    try {
      setLoading(true);
      const res = await api.apps.getRunning();
      setRunningApps(res);
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRunning();
  }, []);

  const handleLaunchVsCode = async (folder?: string) => {
    const target = folder || workspacePath;
    try {
      await api.apps.launch("vscode", target ? [target] : undefined);
      addNotification({
        title: "VS Code Launched",
        message: `Opened workspace: ${target}`,
        type: "success"
      });
      // Switch straight to desktop view so user can code!
      setTimeout(() => setActiveTab("desktop"), 600);
    } catch (e: any) {
      addNotification({ title: "Launch Failed", message: e.message, type: "error" });
    }
  };

  const handleLaunchAntigravity = async (folder?: string) => {
    const target = folder || workspacePath;
    try {
      await api.apps.launch("antigravity", target ? [target] : undefined);
      addNotification({
        title: "Antigravity Launched",
        message: `Opened workspace in Antigravity IDE: ${target}`,
        type: "success"
      });
      setTimeout(() => setActiveTab("desktop"), 600);
    } catch (e: any) {
      addNotification({ title: "Launch Failed", message: e.message, type: "error" });
    }
  };

  // Filter dev processes (e.g. node, python, code, antigravity, git)
  const devProcesses = runningApps.filter((a) => {
    const name = a.process_name.toLowerCase();
    const title = a.title.toLowerCase();
    return (
      name.includes("code") ||
      name.includes("antigravity") ||
      name.includes("node") ||
      name.includes("python") ||
      name.includes("terminal") ||
      title.includes("visual studio code") ||
      title.includes("antigravity")
    );
  });

  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2">
          <Code2 className="w-6 h-6 text-omni-cyan" />
          <span>Developer Centre</span>
        </h1>
        <p className="text-xs text-omni-muted">
          Launch and orchestrate developer environments, IDEs, and active toolchains
        </p>
      </div>

      {/* Main IDE Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Visual Studio Code Card */}
        <div className="p-5 rounded-3xl bg-omni-surface border border-omni-border hover:border-indigo-500/40 transition-all space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-indigo-950/80 border border-indigo-800/50 text-indigo-400">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Visual Studio Code</h3>
              <p className="text-[11px] text-omni-muted">Launch with configured project directory</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-omni-muted">Workspace Directory</label>
            <input
              type="text"
              value={workspacePath}
              onChange={(e) => setWorkspacePath(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-omni-card border border-omni-border text-xs font-mono text-white focus:outline-none focus:border-omni-cyan"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleLaunchVsCode()}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-lg shadow-indigo-600/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch VS Code</span>
            </button>
            <button
              onClick={() => setActiveTab("desktop")}
              className="px-4 py-2.5 rounded-xl bg-omni-card hover:bg-omni-cardHover border border-omni-border text-xs text-omni-muted hover:text-white"
            >
              View Desktop
            </button>
          </div>
        </div>

        {/* Antigravity IDE Card */}
        <div className="p-5 rounded-3xl bg-omni-surface border border-omni-border hover:border-cyan-500/40 transition-all space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-cyan-950/80 border border-cyan-800/50 text-omni-cyan">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Google Antigravity</h3>
              <p className="text-[11px] text-omni-muted">AI-powered developer IDE and agent environment</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-omni-muted">Workspace Directory</label>
            <input
              type="text"
              value={workspacePath}
              onChange={(e) => setWorkspacePath(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-omni-card border border-omni-border text-xs font-mono text-white focus:outline-none focus:border-omni-cyan"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleLaunchAntigravity()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-omni-cyan to-indigo-500 text-black font-semibold text-xs flex items-center justify-center space-x-1.5 transition-opacity hover:opacity-90 shadow-lg shadow-cyan-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Antigravity</span>
            </button>
            <button
              onClick={() => setActiveTab("desktop")}
              className="px-4 py-2.5 rounded-xl bg-omni-card hover:bg-omni-cardHover border border-omni-border text-xs text-omni-muted hover:text-white"
            >
              View Desktop
            </button>
          </div>
        </div>
      </div>

      {/* Predefined Project Shortcuts */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-omni-muted px-1">
          Quick Project Shortcuts
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {predefinedProjects.map((p, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-omni-surface border border-omni-border space-y-2"
            >
              <div className="flex items-center space-x-2">
                <FolderGit2 className="w-4 h-4 text-omni-cyan shrink-0" />
                <span className="text-xs font-bold text-white truncate">{p.name}</span>
              </div>
              <div className="text-[10px] font-mono text-omni-muted truncate">{p.path}</div>
              <div className="flex space-x-2 pt-1">
                <button
                  onClick={() => handleLaunchVsCode(p.path)}
                  className="flex-1 py-1 rounded-lg bg-omni-card hover:bg-omni-cardHover border border-omni-border text-[11px] text-indigo-400"
                >
                  VS Code
                </button>
                <button
                  onClick={() => handleLaunchAntigravity(p.path)}
                  className="flex-1 py-1 rounded-lg bg-omni-card hover:bg-omni-cardHover border border-omni-border text-[11px] text-omni-cyan"
                >
                  Antigravity
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Running Development Processes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-omni-muted px-1">
            Active Development Processes & Windows
          </h3>
          <button
            onClick={fetchRunning}
            className="flex items-center space-x-1 text-xs text-omni-muted hover:text-white"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {devProcesses.length === 0 ? (
          <div className="p-6 rounded-2xl bg-omni-surface border border-omni-border text-center text-xs text-omni-muted">
            No active development IDEs or servers detected in top-level windows.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {devProcesses.map((proc) => (
              <div
                key={proc.hwnd}
                className="p-3.5 rounded-2xl bg-omni-surface border border-omni-border flex items-center justify-between"
              >
                <div className="min-w-0 pr-3">
                  <div className="text-xs font-bold text-white truncate">{proc.title}</div>
                  <div className="text-[10px] font-mono text-omni-muted">
                    {proc.process_name} • PID {proc.pid} • {proc.memory_mb} MB
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await api.apps.controlWindow(proc.hwnd, "focus");
                    setActiveTab("desktop");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-omni-card hover:bg-omni-cardHover border border-omni-border text-omni-cyan text-xs font-medium flex items-center space-x-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Switch Window</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
