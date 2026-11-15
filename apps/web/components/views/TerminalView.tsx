"use client";

import React, { useState, useEffect, useRef } from "react";
import { useOmniStore } from "@/stores/useOmniStore";
import { 
  Terminal as TerminalIcon, 
  Play, 
  XOctagon, 
  Trash2, 
  CornerDownLeft, 
  ChevronRight,
  Radio
} from "lucide-react";

export function TerminalView() {
  const { agentUrl, token, addNotification } = useOmniStore();

  const [outputLines, setOutputLines] = useState<string[]>([
    "OMNICONTROL PowerShell Interactive Terminal [Version 1.0]",
    "Connected to host workstation shell session.",
    "Type commands below or use quick action snippets.\n"
  ]);
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [connected, setConnected] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let base = agentUrl ? agentUrl.replace(/\/$/, "") : "";
    if (typeof window !== "undefined") {
      if (window.location.protocol === "https:" && (!base || base.startsWith("http://localhost") || base.startsWith("http://127.0.0.1"))) {
        base = window.location.origin;
      } else if (!base) {
        base = window.location.origin;
      }
    } else if (!base) {
      base = "http://localhost:8000";
    }

    const wsProtocol = base.startsWith("https") ? "wss:" : "ws:";
    const hostPart = base.replace(/^https?:\/\//, "");
    const wsUrl = `${wsProtocol}//${hostPart}/ws/terminal?token=${token || ""}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "output" && payload.data) {
          setOutputLines((prev) => [...prev, payload.data]);
        }
      } catch (_) {}
    };

    ws.onclose = () => {
      setConnected(false);
      setOutputLines((prev) => [...prev, "\r\n[Terminal session disconnected]\r\n"]);
    };

    return () => {
      ws.close();
    };
  }, [agentUrl, token]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [outputLines]);

  const handleSendCommand = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!command.trim() || !wsRef.current) return;

    const toSend = command.trim() + "\r\n";
    wsRef.current.send(JSON.stringify({ type: "input", data: toSend }));

    setHistory((prev) => [...prev, command.trim()]);
    setHistoryIndex(-1);
    setCommand("");
  };

  const handleInterrupt = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "interrupt" }));
      addNotification({ title: "Interrupt Sent", message: "Sent ^C to terminal session.", type: "info" });
    }
  };

  const handleClear = () => {
    setOutputLines([]);
  };

  const handleQuickCommand = (cmd: string) => {
    setCommand(cmd);
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "input", data: cmd + "\r\n" }));
      setHistory((prev) => [...prev, cmd]);
    }
  };

  const quickSnippets = [
    { label: "IP Info", cmd: "Get-NetIPAddress -AddressFamily IPv4 | Select-Object InterfaceAlias, IPAddress" },
    { label: "Top Processes", cmd: "Get-Process | Sort-Object CPU -Descending | Select-Object -First 8 Name, CPU, WorkingSet" },
    { label: "Python Check", cmd: "python --version; python -m pip --version" },
    { label: "Git Status", cmd: "git status" },
    { label: "Disk Volumes", cmd: "Get-PSDrive -PSProvider FileSystem" },
  ];

  return (
    <div className="space-y-4 pb-20 md:pb-6 animate-fade-in flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-90px)]">
      {/* Header and Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2">
            <TerminalIcon className="w-6 h-6 text-emerald-400" />
            <span>PowerShell Terminal</span>
          </h1>
          <p className="text-xs text-omni-muted">Direct interactive shell execution on laptop</p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-omni-surface border border-omni-border text-xs">
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
            <span className="font-mono text-[11px] text-omni-muted">{connected ? "ACTIVE" : "OFFLINE"}</span>
          </div>
          <button
            onClick={handleInterrupt}
            className="p-2 rounded-xl bg-amber-950/60 hover:bg-amber-900 border border-amber-500/30 text-amber-300"
            title="Interrupt (Ctrl+C)"
          >
            <XOctagon className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            className="p-2 rounded-xl bg-omni-surface hover:bg-omni-card border border-omni-border text-omni-muted hover:text-white"
            title="Clear Terminal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Snippet Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 shrink-0">
        {quickSnippets.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleQuickCommand(q.cmd)}
            className="px-3 py-1.5 rounded-xl bg-omni-surface hover:bg-omni-card border border-omni-border text-xs font-mono text-emerald-400 whitespace-nowrap transition-colors flex items-center space-x-1"
          >
            <ChevronRight className="w-3 h-3 text-omni-muted" />
            <span>{q.label}</span>
          </button>
        ))}
      </div>

      {/* Terminal Viewport */}
      <div className="flex-1 bg-[#050608] border border-omni-border rounded-3xl p-4 overflow-y-auto font-mono text-xs text-gray-200 space-y-1 shadow-2xl select-text">
        {outputLines.map((line, idx) => (
          <div key={idx} className="whitespace-pre-wrap leading-relaxed">
            {line}
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      {/* Command Input Bar */}
      <form onSubmit={handleSendCommand} className="flex space-x-2 shrink-0">
        <div className="relative flex-1">
          <ChevronRight className="w-4 h-4 absolute left-3 top-3 text-emerald-400" />
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Enter PowerShell command..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-omni-surface border border-omni-border text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
          />
        </div>
        <button
          type="submit"
          disabled={!command.trim() || !connected}
          className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-semibold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20"
        >
          <CornerDownLeft className="w-4 h-4" />
          <span>Execute</span>
        </button>
      </form>
    </div>
  );
}
