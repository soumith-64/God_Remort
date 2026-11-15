"use client";

import React from "react";
import { useOmniStore } from "@/stores/useOmniStore";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export function ToastContainer() {
  const { notifications, dismissNotification } = useOmniStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full">
      {notifications.map((n) => {
        const isSuccess = n.type === "success";
        const isError = n.type === "error";
        const isWarning = n.type === "warning";

        return (
          <div
            key={n.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start space-x-3 transition-all animate-fade-in ${
              isSuccess
                ? "bg-emerald-950/85 border-emerald-500/40 text-emerald-200"
                : isError
                ? "bg-rose-950/85 border-rose-500/40 text-rose-200"
                : isWarning
                ? "bg-amber-950/85 border-amber-500/40 text-amber-200"
                : "bg-omni-surface/90 border-omni-border text-white"
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {isError && <AlertCircle className="w-4 h-4 text-rose-400" />}
              {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {n.type === "info" && <Info className="w-4 h-4 text-omni-cyan" />}
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold text-white">{n.title}</h5>
              <p className="text-[11px] opacity-90 mt-0.5 leading-snug">{n.message}</p>
            </div>
            <button
              onClick={() => dismissNotification(n.id)}
              className="shrink-0 p-1 rounded-full text-white/60 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
