"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useOmniStore } from "@/stores/useOmniStore";
import { 
  Keyboard as KeyboardIcon, 
  MousePointer, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  X, 
  CornerDownLeft, 
  Delete, 
  Radio,
  Mouse,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  Mic,
  Sliders,
  Move,
  Volume1,
  Volume2
} from "lucide-react";
import { api } from "@/lib/api";

export function DesktopView() {
  const { 
    agentUrl, 
    token, 
    desktopQuality, 
    desktopScale, 
    setDesktopSettings,
    setVoiceModalOpen,
    addNotification 
  } = useOmniStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [fps, setFps] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showTrackpad, setShowTrackpad] = useState(false);
  const [isCompactMouse, setIsCompactMouse] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [rightClickArmed, setRightClickArmed] = useState(false);
  const [textInput, setTextInput] = useState("");

  // Virtual Mouse / Trackpad States
  const [sensitivity, setSensitivity] = useState(1.5);
  const [isDragLocked, setIsDragLocked] = useState(false);
  const trackpadTouchRef = useRef<{ x: number; y: number } | null>(null);
  const scrollTouchRef = useRef<number | null>(null);

  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(Date.now());
  const lastMoveSentRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number; touches: number }>({ x: 0, y: 0, time: 0, touches: 1 });

  // Connect WebSocket for Desktop Streaming
  useEffect(() => {
    let isMounted = true;
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
    const wsUrl = `${wsProtocol}//${hostPart}/ws/desktop?token=${token || ""}`;

    const ws = new WebSocket(wsUrl);
    ws.binaryType = "blob";
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "set_quality",
        quality: desktopQuality,
        scale: desktopScale
      }));
    };

    ws.onmessage = async (event) => {
      if (!isMounted) return;
      if (event.data instanceof Blob) {
        frameCountRef.current++;
        const now = Date.now();
        if (now - lastFpsTimeRef.current >= 1000) {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
          lastFpsTimeRef.current = now;
        }

        // Hardware-accelerated GPU decoding via createImageBitmap (0-2ms vs 40ms DOM Image)
        try {
          const bitmap = await createImageBitmap(event.data);
          const canvas = canvasRef.current;
          if (canvas) {
            if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
              canvas.width = bitmap.width;
              canvas.height = bitmap.height;
            }
            const ctx = canvas.getContext("2d", { alpha: false });
            ctx?.drawImage(bitmap, 0, 0);
          }
          bitmap.close();
          // Leaky-bucket flow control: ACK frame received to request the next frame immediately with zero buffer accumulation
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "frame_ack" }));
          }
        } catch (_) {}
      }
    };

    return () => {
      isMounted = false;
      ws.close();
    };
  }, [agentUrl, token, desktopQuality, desktopScale]);

  // Send input helper
  const sendInput = useCallback((payload: Record<string, any>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  // Calculate normalized coordinate from mouse/touch event on canvas
  const getNormalizedCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
  };

  // Direct canvas touch handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (showTrackpad) return; // In trackpad mode, ignore canvas touch to avoid accidental jumps
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
        touches: 1
      };
      const coords = getNormalizedCoords(touch.clientX, touch.clientY);
      sendInput({ type: "mouse_move", x: coords.x, y: coords.y });
    } else if (e.touches.length === 2) {
      touchStartRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        time: Date.now(),
        touches: 2
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (showTrackpad) return;
    const now = Date.now();
    if (e.touches.length === 1) {
      if (now - lastMoveSentRef.current > 30) {
        lastMoveSentRef.current = now;
        const touch = e.touches[0];
        const coords = getNormalizedCoords(touch.clientX, touch.clientY);
        sendInput({ type: "mouse_move", x: coords.x, y: coords.y });
      }
    } else if (e.touches.length === 2) {
      if (now - lastMoveSentRef.current > 40) {
        lastMoveSentRef.current = now;
        const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const deltaY = (currentY - touchStartRef.current.y) * 2;
        sendInput({ type: "mouse_scroll", dx: 0, dy: deltaY });
        touchStartRef.current.y = currentY;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (showTrackpad) return;
    const elapsed = Date.now() - touchStartRef.current.time;
    if (touchStartRef.current.touches === 1) {
      const coords = getNormalizedCoords(touchStartRef.current.x, touchStartRef.current.y);
      if (elapsed < 300) {
        const btn = rightClickArmed ? "right" : "left";
        sendInput({ type: "mouse_click", button: btn, x: coords.x, y: coords.y });
        if (rightClickArmed) setRightClickArmed(false);
      }
    } else if (touchStartRef.current.touches === 2 && elapsed < 350) {
      const coords = getNormalizedCoords(touchStartRef.current.x, touchStartRef.current.y);
      sendInput({ type: "mouse_click", button: "right", x: coords.x, y: coords.y });
    }
  };

  // Mouse Handlers for tablet/desktop pointer
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const now = Date.now();
    if (now - lastMoveSentRef.current > 30) {
      lastMoveSentRef.current = now;
      const coords = getNormalizedCoords(e.clientX, e.clientY);
      sendInput({ type: "mouse_move", x: coords.x, y: coords.y });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getNormalizedCoords(e.clientX, e.clientY);
    const button = e.button === 2 || rightClickArmed ? "right" : "left";
    sendInput({ type: "mouse_click", button, x: coords.x, y: coords.y });
    if (rightClickArmed) setRightClickArmed(false);
  };

  // ----------------- Virtual Trackpad Handlers -----------------
  const handleTrackpadTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.touches.length > 0) {
      trackpadTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTrackpadTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!trackpadTouchRef.current || e.touches.length === 0) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    const dx = (currentX - trackpadTouchRef.current.x) * sensitivity;
    const dy = (currentY - trackpadTouchRef.current.y) * sensitivity;

    if (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4) {
      sendInput({ type: "mouse_move_relative", dx, dy });
      trackpadTouchRef.current = { x: currentX, y: currentY };
    }
  };

  const handleTrackpadTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    trackpadTouchRef.current = null;
  };

  // Scroll Strip Handlers
  const handleScrollTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.touches.length > 0) {
      scrollTouchRef.current = e.touches[0].clientY;
    }
  };

  const handleScrollTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (scrollTouchRef.current === null || e.touches.length === 0) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - scrollTouchRef.current;
    if (Math.abs(diff) > 12) {
      const scrollClicks = diff > 0 ? -3 : 3;
      sendInput({ type: "mouse_scroll", dx: 0, dy: scrollClicks });
      scrollTouchRef.current = currentY;
    }
  };

  const handleScrollTouchEnd = () => {
    scrollTouchRef.current = null;
  };

  // Nudge Cursor (Pixel-perfect aiming for small Windows buttons)
  const handleNudge = (dx: number, dy: number) => {
    sendInput({ type: "mouse_nudge", dx, dy });
  };

  const handleLeftClick = () => {
    sendInput({ type: "mouse_click", button: rightClickArmed ? "right" : "left" });
    if (rightClickArmed) setRightClickArmed(false);
  };

  const handleRightClick = () => {
    sendInput({ type: "mouse_click", button: "right" });
  };

  const handleDoubleClick = () => {
    sendInput({ type: "mouse_click", button: "left", double: true });
  };

  const toggleDragLock = () => {
    if (isDragLocked) {
      sendInput({ type: "mouse_up", button: "left" });
      setIsDragLocked(false);
      addNotification({ type: "info", title: "Drag Released", message: "Left mouse button unheld." });
    } else {
      sendInput({ type: "mouse_down", button: "left" });
      setIsDragLocked(true);
      addNotification({ type: "info", title: "Drag Locked", message: "Left mouse held down. Move pointer to drag." });
    }
  };

  const handleShortcut = (keys: string[]) => {
    sendInput({ type: "hotkey", keys });
  };

  const handleKeyPress = (key: string) => {
    sendInput({ type: "key_press", key });
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput) {
      sendInput({ type: "type_text", text: textInput });
      setTextInput("");
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-[calc(100dvh-120px)] md:h-[calc(100dvh-85px)] bg-black rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col items-center justify-center border border-omni-border shadow-2xl ${
        isFullscreen ? "h-screen w-screen rounded-none" : ""
      }`}
    >
      {/* Floating Header HUD */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1 rounded-full bg-omni-dark/90 backdrop-blur-md border border-omni-border text-[11px] sm:text-xs pointer-events-auto shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-emerald-400 font-medium">{fps} FPS</span>
          <span className="text-omni-border">|</span>
          <span className="font-mono text-omni-muted">{desktopQuality}% Q</span>
          <span className="text-omni-border">|</span>
          <span className="font-mono text-omni-cyan">{Math.round(zoomLevel * 100)}%</span>
        </div>

        {/* HUD Controls */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 pointer-events-auto">
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
            className="p-1.5 sm:p-2 rounded-xl bg-omni-dark/90 backdrop-blur-md border border-omni-border text-omni-muted hover:text-white active:scale-95 transition-transform"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
            className="p-1.5 sm:p-2 rounded-xl bg-omni-dark/90 backdrop-blur-md border border-omni-border text-omni-muted hover:text-white active:scale-95 transition-transform"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1.0)}
            className="p-1.5 sm:p-2 rounded-xl bg-omni-dark/90 backdrop-blur-md border border-omni-border text-omni-muted hover:text-white active:scale-95 transition-transform"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 rounded-xl bg-omni-dark/90 backdrop-blur-md border border-omni-border text-omni-muted hover:text-white active:scale-95 transition-transform"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        </div>
      </div>

      {/* Canvas Viewport — Fully Responsive with ZERO Overlap */}
      <div 
        className="relative flex-1 min-h-0 w-full flex items-center justify-center overflow-auto cursor-crosshair select-none bg-black/40"
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas
          ref={canvasRef}
          className="canvas-desktop max-w-full max-h-full object-contain transition-transform duration-75"
          style={{ transform: `scale(${zoomLevel})` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      {/* Floating Mobile Control Toolbar (Only when neither panel is docked) */}
      {!showTrackpad && !showKeyboard && (
        <div className="absolute bottom-2.5 sm:bottom-4 z-30 flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl glass-panel border border-omni-border shadow-2xl max-w-[96vw] overflow-x-auto no-scrollbar left-1/2 -translate-x-1/2">
          {/* Dedicated Virtual Mouse / Trackpad Toggle */}
          <button
            onClick={() => {
              setShowTrackpad(true);
              setShowKeyboard(false);
            }}
            className="flex items-center space-x-1 sm:space-x-1.5 px-3 py-1.5 sm:py-2 rounded-xl border text-[11px] sm:text-xs font-semibold transition-all active:scale-95 shrink-0 bg-cyan-950/70 border-cyan-500/50 text-cyan-300 hover:text-white shadow-lg shadow-cyan-500/10"
            title="Open Dedicated Virtual Mouse & Trackpad"
          >
            <Mouse className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
            <span>Mouse Panel</span>
          </button>

          {/* Keyboard Toggle */}
          <button
            onClick={() => {
              setShowKeyboard(true);
              setShowTrackpad(false);
            }}
            className="p-2 sm:p-2.5 rounded-xl border transition-all active:scale-95 shrink-0 bg-omni-surface border-omni-border text-omni-muted hover:text-white"
            title="On-Screen Keyboard & Hotkeys"
          >
            <KeyboardIcon className="w-4 h-4" />
          </button>

          {/* Voice Assistant Direct Button */}
          <button
            onClick={() => setVoiceModalOpen(true)}
            className="p-2 sm:p-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 active:scale-95 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 transition-all shrink-0"
            title="Voice Command Assistant"
          >
            <Mic className="w-4 h-4 animate-pulse-slow" />
          </button>

          {/* Quick Volume Controls */}
          <button
            onClick={async () => {
              try {
                const current = await api.system.getAudio();
                const next = Math.max(0, current.volume_percent - 10);
                await api.system.setAudio(next);
                addNotification({ title: "Volume", message: `${next}%`, type: "info" });
              } catch (_) {}
            }}
            className="p-2 sm:p-2.5 rounded-xl bg-omni-surface border border-omni-border text-omni-muted hover:text-white active:scale-95 transition-all shrink-0"
            title="Volume Down (-10%)"
          >
            <Volume1 className="w-4 h-4" />
          </button>

          <button
            onClick={async () => {
              try {
                const current = await api.system.getAudio();
                const next = Math.min(100, current.volume_percent + 10);
                await api.system.setAudio(next);
                addNotification({ title: "Volume", message: `${next}%`, type: "info" });
              } catch (_) {}
            }}
            className="p-2 sm:p-2.5 rounded-xl bg-omni-surface border border-omni-border text-omni-muted hover:text-white active:scale-95 transition-all shrink-0"
            title="Volume Up (+10%)"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* Right Click Armed Toggle */}
          <button
            onClick={() => setRightClickArmed(!rightClickArmed)}
            className={`px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold border transition-all active:scale-95 shrink-0 ${
              rightClickArmed
                ? "bg-amber-950 border-amber-500 text-amber-400 animate-pulse"
                : "bg-omni-surface border-omni-border text-omni-muted hover:text-white"
            }`}
            title="Arm Right Click for Next Tap"
          >
            R-Click
          </button>

          {/* Quick Win+D */}
          <button
            onClick={() => handleShortcut(["win", "d"])}
            className="px-2.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-mono bg-omni-surface hover:bg-omni-card active:scale-95 border border-omni-border text-omni-muted hover:text-white hidden sm:block shrink-0"
            title="Show Desktop (Win+D)"
          >
            Win+D
          </button>

          {/* Quick Alt+Tab */}
          <button
            onClick={() => handleShortcut(["alt", "tab"])}
            className="px-2.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-mono bg-omni-surface hover:bg-omni-card active:scale-95 border border-omni-border text-omni-muted hover:text-white hidden sm:block shrink-0"
            title="Switch App (Alt+Tab)"
          >
            Alt+Tab
          </button>
        </div>
      )}

      {/* ----------------- DEDICATED ZERO-OVERLAP VIRTUAL MOUSE & TRACKPAD DOCK ----------------- */}
      {showTrackpad && (
        <div className="w-full shrink-0 z-30 bg-omni-surface/95 backdrop-blur-2xl border-t border-omni-border shadow-2xl flex flex-col p-2.5 sm:p-3 space-y-2 animate-fade-in max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-omni-border">
            <div className="flex items-center space-x-2">
              <Mouse className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">Precision Mouse</span>
              {isDragLocked && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                  DRAG LOCKED
                </span>
              )}
              {rightClickArmed && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  R-ARMED
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5">
              {/* Sensitivity selector */}
              <div className="flex items-center space-x-1 bg-omni-dark px-1.5 py-0.5 rounded-lg border border-omni-border text-[10px]">
                <span className="text-omni-muted">Sens:</span>
                {[1, 1.5, 2.2].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSensitivity(s)}
                    className={`px-1.5 py-0.5 rounded font-mono ${
                      sensitivity === s ? "bg-cyan-500 text-black font-bold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* Compact / Full Toggle */}
              <button
                onClick={() => setIsCompactMouse(!isCompactMouse)}
                className="px-2 py-1 rounded-lg border border-omni-border bg-omni-card text-[10px] font-medium text-slate-300 hover:text-white active:scale-95"
                title={isCompactMouse ? "Expand full trackpad" : "Minimize to 1-row dock"}
              >
                {isCompactMouse ? "Expand" : "Compact"}
              </button>

              {/* Switch to Keyboard */}
              <button
                onClick={() => {
                  setShowTrackpad(false);
                  setShowKeyboard(true);
                }}
                className="p-1.5 rounded-lg border border-omni-border bg-omni-card text-omni-muted hover:text-white active:scale-95"
                title="Switch to Keyboard"
              >
                <KeyboardIcon className="w-3.5 h-3.5" />
              </button>

              {/* Voice Assistant */}
              <button
                onClick={() => setVoiceModalOpen(true)}
                className="p-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:text-cyan-300 active:scale-95"
                title="Voice Command Assistant"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>

              {/* Close Button */}
              <button
                onClick={() => setShowTrackpad(false)}
                className="p-1 rounded-full text-omni-muted hover:text-white active:scale-95"
                title="Close Mouse Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Compact View Mode */}
          {isCompactMouse ? (
            <div className="flex items-center space-x-2 pt-0.5">
              <button
                onClick={handleLeftClick}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1 shadow-md shadow-cyan-500/20"
              >
                <MousePointer className="w-3.5 h-3.5" />
                <span>Left Click</span>
              </button>

              <div className="flex items-center space-x-1 bg-omni-dark px-1.5 py-1 rounded-xl border border-omni-border">
                <button onClick={() => handleNudge(-3, 0)} className="p-1.5 rounded bg-omni-card text-white hover:bg-omni-cardHover active:scale-95">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleNudge(0, -3)} className="p-1.5 rounded bg-omni-card text-white hover:bg-omni-cardHover active:scale-95">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleNudge(0, 3)} className="p-1.5 rounded bg-omni-card text-white hover:bg-omni-cardHover active:scale-95">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleNudge(3, 0)} className="p-1.5 rounded bg-omni-card text-white hover:bg-omni-cardHover active:scale-95">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleRightClick}
                className="py-2.5 px-3 rounded-xl bg-omni-card hover:bg-omni-cardHover active:scale-95 border border-omni-border text-white text-xs font-semibold"
              >
                R-Click
              </button>

              <button
                onClick={toggleDragLock}
                className={`p-2.5 rounded-xl border text-xs font-semibold active:scale-95 ${
                  isDragLocked ? "bg-amber-950 border-amber-500 text-amber-300" : "bg-omni-card border-omni-border text-omni-muted"
                }`}
                title="Toggle Drag Lock"
              >
                {isDragLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : (
            /* Full Trackpad Mode */
            <>
              {/* Middle Layout: Trackpad + Scroll Strip + Nudge D-Pad */}
              <div className="flex items-stretch space-x-2">
                {/* Precision Nudge D-Pad */}
                <div className="flex flex-col items-center justify-center p-1.5 rounded-2xl bg-omni-dark/80 border border-omni-border shrink-0">
                  <span className="text-[9px] uppercase font-bold text-omni-muted mb-0.5">Nudge</span>
                  <button
                    onClick={() => handleNudge(0, -3)}
                    className="p-1.5 sm:p-2 rounded-lg bg-omni-card hover:bg-omni-cardHover active:scale-95 text-white"
                    title="Nudge Up 3px"
                  >
                    <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <div className="flex space-x-1 my-1">
                    <button
                      onClick={() => handleNudge(-3, 0)}
                      className="p-1.5 sm:p-2 rounded-lg bg-omni-card hover:bg-omni-cardHover active:scale-95 text-white"
                      title="Nudge Left 3px"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={handleLeftClick}
                      className="p-1.5 sm:p-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 active:scale-95 text-cyan-300 font-bold text-[10px]"
                      title="Click Here"
                    >
                      OK
                    </button>
                    <button
                      onClick={() => handleNudge(3, 0)}
                      className="p-1.5 sm:p-2 rounded-lg bg-omni-card hover:bg-omni-cardHover active:scale-95 text-white"
                      title="Nudge Right 3px"
                    >
                      <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleNudge(0, 3)}
                    className="p-1.5 sm:p-2 rounded-lg bg-omni-card hover:bg-omni-cardHover active:scale-95 text-white"
                    title="Nudge Down 3px"
                  >
                    <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>

                {/* Smooth Trackpad Surface */}
                <div
                  onTouchStart={handleTrackpadTouchStart}
                  onTouchMove={handleTrackpadTouchMove}
                  onTouchEnd={handleTrackpadTouchEnd}
                  onClick={handleLeftClick}
                  className="flex-1 h-28 sm:h-36 bg-gradient-to-br from-[#121624] to-[#0a0d16] border border-cyan-500/30 rounded-2xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none relative overflow-hidden shadow-inner group touch-none"
                >
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    <Move className="w-10 h-10 text-cyan-400 animate-pulse" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200 pointer-events-none z-10">
                    Virtual Trackpad
                  </span>
                  <span className="text-[10px] text-cyan-400/80 pointer-events-none z-10 mt-0.5">
                    Swipe to move cursor • Tap to click
                  </span>
                </div>

                {/* Vertical Scroll Wheel Strip */}
                <div
                  onTouchStart={handleScrollTouchStart}
                  onTouchMove={handleScrollTouchMove}
                  onTouchEnd={handleScrollTouchEnd}
                  className="w-9 sm:w-10 h-28 sm:h-36 rounded-2xl bg-omni-dark/90 border border-omni-border flex flex-col items-center justify-between py-1.5 cursor-ns-resize select-none shrink-0 touch-none"
                  title="Swipe up/down to scroll"
                >
                  <button
                    onClick={() => sendInput({ type: "mouse_scroll", dx: 0, dy: 3 })}
                    className="p-1 rounded text-omni-muted hover:text-white"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex flex-col items-center space-y-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="text-[8px] uppercase font-mono text-omni-muted -rotate-90 my-1">Scroll</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  </div>
                  <button
                    onClick={() => sendInput({ type: "mouse_scroll", dx: 0, dy: -3 })}
                    className="p-1 rounded text-omni-muted hover:text-white"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Big Tactile Mouse Buttons Row */}
              <div className="grid grid-cols-4 gap-2 pt-0.5">
                <button
                  onClick={handleLeftClick}
                  className="col-span-2 py-2.5 sm:py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-cyan-500/20"
                >
                  <MousePointer className="w-4 h-4" />
                  <span>Left Click</span>
                </button>

                <button
                  onClick={handleDoubleClick}
                  className="py-2.5 sm:py-3 rounded-2xl bg-omni-card hover:bg-omni-cardHover active:scale-95 border border-omni-border text-white text-xs font-semibold flex items-center justify-center space-x-1"
                >
                  <span>2× Click</span>
                </button>

                <button
                  onClick={handleRightClick}
                  className="py-2.5 sm:py-3 rounded-2xl bg-omni-card hover:bg-omni-cardHover active:scale-95 border border-omni-border text-white text-xs font-semibold flex items-center justify-center space-x-1"
                >
                  <span>R-Click</span>
                </button>
              </div>

              {/* Drag Lock & Quick Shortcuts */}
              <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-omni-border">
                <button
                  onClick={toggleDragLock}
                  className={`py-1.5 sm:py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 border transition-all active:scale-95 ${
                    isDragLocked
                      ? "bg-amber-950 border-amber-500 text-amber-300 animate-pulse"
                      : "bg-omni-card border-omni-border text-omni-muted hover:text-white"
                  }`}
                  title="Click and drag without holding finger down"
                >
                  {isDragLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{isDragLocked ? "Locked" : "Drag Lock"}</span>
                </button>

                <button
                  onClick={() => handleShortcut(["ctrl", "c"])}
                  className="py-1.5 sm:py-2 rounded-xl bg-omni-card hover:bg-omni-cardHover active:scale-95 border border-omni-border text-xs font-mono text-cyan-300"
                >
                  Copy
                </button>
                <button
                  onClick={() => handleShortcut(["ctrl", "v"])}
                  className="py-1.5 sm:py-2 rounded-xl bg-omni-card hover:bg-omni-cardHover active:scale-95 border border-omni-border text-xs font-mono text-cyan-300"
                >
                  Paste
                </button>
                <button
                  onClick={() => handleKeyPress("enter")}
                  className="py-1.5 sm:py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-bold active:scale-95"
                >
                  Enter
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* On-Screen Mobile Keyboard & Hotkeys Dock (Zero-Overlap) */}
      {showKeyboard && (
        <div className="w-full shrink-0 z-30 max-w-2xl mx-auto bg-omni-surface/95 backdrop-blur-xl border-t border-omni-border p-3 space-y-2.5 animate-fade-in shadow-2xl">
          <div className="flex items-center justify-between pb-1.5 border-b border-omni-border">
            <span className="text-xs font-bold text-white flex items-center space-x-1.5">
              <KeyboardIcon className="w-4 h-4 text-omni-cyan" />
              <span>Remote Input & Shortcuts</span>
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => {
                  setShowKeyboard(false);
                  setShowTrackpad(true);
                }}
                className="px-2 py-1 rounded-lg border border-omni-border bg-omni-card text-[10px] text-cyan-400 hover:text-white flex items-center space-x-1 active:scale-95"
              >
                <Mouse className="w-3 h-3" />
                <span>Mouse</span>
              </button>
              <button
                onClick={() => setShowKeyboard(false)}
                className="p-1 rounded-full text-omni-muted hover:text-white active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Direct Text Typer */}
          <form onSubmit={handleSendText} className="flex space-x-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type text and press Send..."
              className="flex-1 px-3 py-2 rounded-xl bg-omni-dark border border-omni-border text-white text-xs focus:outline-none focus:border-omni-cyan"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-omni-cyan text-black font-semibold text-xs hover:opacity-90 active:scale-95"
            >
              Send
            </button>
          </form>

          {/* Special Keys Rows */}
          <div className="grid grid-cols-6 gap-1.5">
            {["esc", "tab", "win", "ctrl", "alt", "shift"].map((k) => (
              <button
                key={k}
                onClick={() => handleKeyPress(k)}
                className="py-1.5 sm:py-2 rounded-lg bg-omni-card hover:bg-omni-cardHover active:scale-95 border border-omni-border text-[11px] font-mono text-white text-center uppercase"
              >
                {k}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            <button
              onClick={() => handleShortcut(["ctrl", "c"])}
              className="py-1.5 sm:py-2 rounded-lg bg-omni-card hover:bg-omni-cardHover active:scale-95 border border-omni-border text-[11px] font-mono text-omni-cyan text-center"
            >
              Ctrl+C
            </button>
            <button
              onClick={() => handleShortcut(["ctrl", "v"])}
              className="py-1.5 sm:py-2 rounded-lg bg-omni-card hover:bg-omni-cardHover active:scale-95 border border-omni-border text-[11px] font-mono text-omni-cyan text-center"
            >
              Ctrl+V
            </button>
            <button
              onClick={() => handleShortcut(["ctrl", "z"])}
              className="py-1.5 sm:py-2 rounded-lg bg-omni-card hover:bg-omni-cardHover active:scale-95 border border-omni-border text-[11px] font-mono text-omni-cyan text-center"
            >
              Ctrl+Z
            </button>
            <button
              onClick={() => handleShortcut(["ctrl", "shift", "esc"])}
              className="py-1.5 sm:py-2 rounded-lg bg-omni-card hover:bg-omni-cardHover active:scale-95 border border-omni-border text-[11px] font-mono text-amber-400 text-center"
            >
              TaskMgr
            </button>
            <button
              onClick={() => handleShortcut(["win", "l"])}
              className="py-1.5 sm:py-2 rounded-lg bg-omni-card hover:bg-omni-cardHover active:scale-95 border border-omni-border text-[11px] font-mono text-rose-400 text-center"
            >
              Win+L
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => handleKeyPress("up")}
              className="py-1.5 sm:py-2 rounded-lg bg-omni-card hover:bg-omni-cardHover active:scale-95 border border-omni-border text-xs text-white"
            >
              ▲
            </button>
            <button
              onClick={() => handleKeyPress("down")}
              className="py-1.5 sm:py-2 rounded-lg bg-omni-card hover:bg-omni-cardHover active:scale-95 border border-omni-border text-xs text-white"
            >
              ▼
            </button>
            <button
              onClick={() => handleKeyPress("backspace")}
              className="py-1.5 sm:py-2 rounded-lg bg-omni-card hover:bg-omni-cardHover active:scale-95 border border-omni-border text-[11px] text-white flex items-center justify-center space-x-1"
            >
              <Delete className="w-3.5 h-3.5" />
              <span>Bksp</span>
            </button>
            <button
              onClick={() => handleKeyPress("enter")}
              className="py-1.5 sm:py-2 rounded-lg bg-emerald-950 border border-emerald-500/50 text-[11px] text-emerald-400 font-bold flex items-center justify-center space-x-1 active:scale-95"
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
              <span>Enter</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
