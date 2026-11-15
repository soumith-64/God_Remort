"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, 
  MicOff, 
  Send, 
  X, 
  Volume2, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  KeyRound, 
  ShieldCheck, 
  Loader2 
} from "lucide-react";
import { useOmniStore } from "@/stores/useOmniStore";
import { api } from "@/lib/api";

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export function VoiceCommandModal() {
  const { 
    isVoiceModalOpen, 
    setVoiceModalOpen, 
    token, 
    setAuth, 
    deviceName, 
    addNotification 
  } = useOmniStore();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [typedCommand, setTypedCommand] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{ status: string; message: string; spoken?: string } | null>(null);
  const [enableTTS, setEnableTTS] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(true);

  // PIN Authorization States
  const [pinInput, setPinInput] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition once
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setLastResult(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          addNotification({
            type: "warning",
            title: "Microphone Access Denied",
            message: "Please allow microphone access in your mobile browser, or tap any quick suggestion below."
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }
  }, [addNotification]);

  // Handle voice transcript auto-submit when user finishes speaking
  useEffect(() => {
    if (!isListening && transcript.trim().length > 1 && !isProcessing && token) {
      submitCommand(transcript.trim());
    }
  }, [isListening, transcript, token]);

  const toggleListening = () => {
    if (!token) {
      setPinError("Please enter your PIN first to pair your device.");
      return;
    }

    if (!recognitionRef.current) {
      addNotification({
        type: "info",
        title: "Voice Dictation",
        message: "Web Speech requires HTTPS on mobile. Use your keyboard dictation or tap any quick suggestion below."
      });
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setIsListening(false);
    } else {
      setTranscript("");
      setLastResult(null);
      try {
        recognitionRef.current.start();
      } catch (e: any) {
        console.warn("Speech start error:", e);
        addNotification({
          type: "warning",
          title: "Microphone Inactive",
          message: "Please tap allow on browser microphone prompt, or type your command below."
        });
      }
    }
  };

  const speakResponse = (text: string) => {
    if (!enableTTS || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  };

  const handleAuthorizePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    setPinLoading(true);
    setPinError(null);

    try {
      const res = await api.auth.verifyPairing(pinInput.trim(), deviceName || "Mobile Device");
      setAuth(res.token, res.device_id);
      addNotification({
        type: "success",
        title: "Device Paired",
        message: "PIN verified! Voice Assistant and remote actions are now unlocked."
      });
      setPinInput("");
    } catch (err: any) {
      setPinError(err.message || "Invalid PIN. Default PIN is 123456.");
    } finally {
      setPinLoading(false);
    }
  };

  const submitCommand = async (cmdText: string) => {
    if (!cmdText.trim()) return;

    if (!token) {
      setPinError("Please enter your PIN first to authorize actions.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await api.voice.sendCommand(cmdText);
      setLastResult({
        status: res.status,
        message: res.message,
        spoken: res.spoken_response
      });

      if (res.spoken_response) {
        speakResponse(res.spoken_response);
      }

      addNotification({
        type: res.status === "error" ? "error" : "success",
        title: "Voice Command",
        message: res.message
      });
    } catch (err: any) {
      setLastResult({
        status: "error",
        message: err.message || "Execution failed",
        spoken: "Command failed"
      });
      speakResponse("Command failed");
    } finally {
      setIsProcessing(false);
      setTypedCommand("");
    }
  };

  if (!isVoiceModalOpen) return null;

  const quickCommands = [
    { label: "VS Code", cmd: "open vs code", desc: "Launch IDE" },
    { label: "Antigravity", cmd: "open antigravity", desc: "Launch Agent" },
    { label: "Volume +", cmd: "volume up", desc: "Increase +15%" },
    { label: "Volume -", cmd: "volume down", desc: "Decrease -15%" },
    { label: "Mute", cmd: "mute", desc: "Silence audio" },
    { label: "Unmute", cmd: "unmute", desc: "Restore audio" },
    { label: "Lock Laptop", cmd: "lock laptop", desc: "Lock Windows" },
    { label: "Show Desktop", cmd: "show desktop", desc: "Minimize all" },
    { label: "Switch App", cmd: "switch app", desc: "Alt + Tab" }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-[#0e111a] border border-[#23293e] rounded-3xl shadow-2xl p-4 sm:p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-[#1c2233]">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                  Voice Assistant
                  {token ? (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Authorized
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      PIN Required
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400">
                  {token ? "Speak or tap commands to control your laptop" : "Authorize your device to unlock voice actions"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              {token && (
                <button
                  onClick={() => setEnableTTS(!enableTTS)}
                  title={enableTTS ? "Voice feedback enabled" : "Voice feedback muted"}
                  className={`p-2 rounded-xl border transition ${
                    enableTTS
                      ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                      : "bg-slate-800/50 border-slate-700 text-slate-400"
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setVoiceModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-700 transition active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ---------------- STEP 1: PIN AUTHORIZATION (When not yet paired) ---------------- */}
          {!token ? (
            <div className="my-6 flex flex-col items-center justify-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <KeyRound className="w-7 h-7" />
              </div>

              <div className="text-center max-w-sm">
                <h3 className="text-base font-bold text-white">Enter PIN to Authorize Actions</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Security verification is required before executing remote voice commands on your laptop.
                </p>
              </div>

              <form onSubmit={handleAuthorizePin} className="w-full max-w-xs space-y-3">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(null);
                  }}
                  placeholder="Enter PIN (e.g. 123456)"
                  className="w-full text-center tracking-[0.25em] font-mono text-lg py-3 px-4 rounded-xl bg-[#141926] border border-[#23293e] text-white focus:outline-none focus:border-cyan-400"
                  autoFocus
                />

                {pinError && (
                  <p className="text-xs text-rose-400 text-center font-medium">{pinError}</p>
                )}

                <button
                  type="submit"
                  disabled={pinInput.length < 4 || pinLoading}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-1.5 shadow-lg shadow-cyan-500/20"
                >
                  {pinLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authorizing...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Authorize Device & Start</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-slate-500">
                  Default permanent PIN: <span className="font-mono text-cyan-400 font-bold">123456</span>
                </p>
              </form>
            </div>
          ) : (
            /* ---------------- STEP 2: FULL VOICE ASSISTANT INTERFACE ---------------- */
            <>
              {/* Interactive Voice Visualizer */}
              <div className="my-5 flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center">
                  {isListening && (
                    <>
                      <motion.div
                        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.7, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                        className="absolute w-28 h-28 rounded-full bg-cyan-500/20 blur-xl pointer-events-none"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.9, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                        className="absolute w-24 h-24 rounded-full border border-cyan-400/40 pointer-events-none"
                      />
                    </>
                  )}

                  <button
                    onClick={toggleListening}
                    disabled={isProcessing}
                    className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                      isListening
                        ? "bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-cyan-500/30 shadow-2xl"
                        : "bg-[#182030] hover:bg-[#202b40] text-cyan-400 border border-cyan-500/30"
                    }`}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-8 h-8 animate-spin text-cyan-300" />
                    ) : isListening ? (
                      <Mic className="w-8 h-8 animate-pulse text-white" />
                    ) : (
                      <Mic className="w-8 h-8 text-cyan-400" />
                    )}
                  </button>
                </div>

                <p className="mt-3.5 text-sm font-semibold text-slate-200">
                  {isProcessing
                    ? "Executing on laptop..."
                    : isListening
                    ? "Listening... speak now"
                    : "Tap microphone to speak"}
                </p>

                {/* Transcript Preview */}
                <div className="mt-2 min-h-[32px] max-w-sm px-4 py-1.5 rounded-lg bg-[#141926] border border-[#23293e] text-center">
                  <span className="text-xs sm:text-sm font-mono text-cyan-300">
                    {transcript ? `"${transcript}"` : isListening ? "Speak a command..." : "Ready"}
                  </span>
                </div>
              </div>

              {/* Last Result Card */}
              {lastResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-4 p-3 rounded-2xl border flex items-start space-x-2.5 ${
                    lastResult.status === "error"
                      ? "bg-red-500/10 border-red-500/20 text-red-300"
                      : lastResult.status === "unrecognized"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  }`}
                >
                  {lastResult.status === "error" ? (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  ) : (
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  )}
                  <div className="text-xs">
                    <p className="font-semibold">{lastResult.message}</p>
                    {lastResult.spoken && (
                      <p className="text-[11px] opacity-75 mt-0.5">Spoken: &ldquo;{lastResult.spoken}&rdquo;</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Quick One-Tap Suggestions */}
              <div className="mb-4">
                <span className="text-[10px] font-semibold text-slate-400 mb-2 block uppercase tracking-wider">
                  One-Tap Quick Actions
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {quickCommands.map((chip) => (
                    <button
                      key={chip.cmd}
                      onClick={() => submitCommand(chip.cmd)}
                      disabled={isProcessing}
                      className="px-2.5 py-2 text-left bg-[#141926] hover:bg-cyan-500/10 hover:border-cyan-500/40 border border-[#23293e] rounded-xl transition active:scale-95 group"
                    >
                      <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">{chip.label}</div>
                      <div className="text-[10px] text-slate-400">{chip.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Command Typer */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (typedCommand.trim()) submitCommand(typedCommand);
                }}
                className="flex items-center space-x-2 pt-2 border-t border-[#1c2233]"
              >
                <input
                  type="text"
                  value={typedCommand}
                  onChange={(e) => setTypedCommand(e.target.value)}
                  placeholder="Type any command (e.g. 'lock laptop', 'open vs code')..."
                  className="flex-1 bg-[#121622] border border-[#252c42] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={!typedCommand.trim() || isProcessing}
                  className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold transition flex items-center justify-center active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
