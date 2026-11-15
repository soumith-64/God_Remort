"use client";

import React, { useState, useEffect } from "react";
import { useOmniStore } from "@/stores/useOmniStore";
import { api } from "@/lib/api";
import { 
  ShieldCheck, 
  Smartphone, 
  Trash2, 
  History, 
  RefreshCw, 
  Lock, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2 
} from "lucide-react";

export function SecurityView() {
  const { deviceId, addNotification } = useOmniStore();

  const [devices, setDevices] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const [devs, logs] = await Promise.all([
        api.auth.getDevices(),
        api.auth.getAudit()
      ]);
      setDevices(devs);
      setAuditLogs(logs);
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleRevoke = async (devId: string, name: string) => {
    try {
      await api.auth.revokeDevice(devId);
      addNotification({
        title: "Device Revoked",
        message: `'${name}' has been revoked and can no longer connect.`,
        type: "warning"
      });
      fetchSecurityData();
    } catch (e: any) {
      addNotification({ title: "Revocation Failed", message: e.message, type: "error" });
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-omni-cyan" />
            <span>Security & Device Trust</span>
          </h1>
          <p className="text-xs text-omni-muted">
            Manage paired controllers, token permissions, and live audit history
          </p>
        </div>
        <button
          onClick={fetchSecurityData}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-omni-surface hover:bg-omni-card border border-omni-border text-xs text-omni-muted hover:text-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Paired Devices List */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-omni-muted px-1">
          Authorized Paired Controllers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {devices.map((d) => (
            <div
              key={d.device_id}
              className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                d.revoked
                  ? "bg-rose-950/20 border-rose-500/20 opacity-60"
                  : d.device_id === deviceId
                  ? "bg-gradient-to-r from-cyan-950/60 to-indigo-950/60 border-cyan-500/40 shadow-md"
                  : "bg-omni-surface border-omni-border"
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-omni-card border border-omni-border text-omni-cyan">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white truncate">{d.name}</span>
                    {d.device_id === deviceId && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-900 text-cyan-300 font-mono">
                        This Device
                      </span>
                    )}
                    {d.revoked ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-900 text-rose-300 font-mono">
                        Revoked
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[10px] font-mono text-omni-muted mt-0.5 truncate">
                    ID: {d.device_id} • Role: {d.role}
                  </div>
                  <div className="text-[10px] text-omni-muted">
                    Last Seen: {new Date(d.last_seen_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {!d.revoked && (
                <button
                  onClick={() => handleRevoke(d.device_id, d.name)}
                  className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 text-xs"
                  title="Revoke Device Access"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Security Audit Trail */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-omni-muted px-1 flex items-center space-x-2">
          <History className="w-4 h-4 text-amber-400" />
          <span>Security Audit Log</span>
        </h3>

        <div className="rounded-3xl bg-omni-surface border border-omni-border overflow-hidden">
          <div className="max-h-72 overflow-y-auto divide-y divide-omni-border">
            {auditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-omni-muted">No audit events logged yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-omni-card/40">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white flex items-center space-x-2">
                      <span className="font-mono text-[11px] text-omni-cyan">[{log.action}]</span>
                      <span>{log.details || "Action recorded"}</span>
                    </div>
                    <div className="text-[10px] font-mono text-omni-muted">
                      Device: {log.device_id || "System"} • IP: {log.ip_address || "Local"}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-omni-muted whitespace-nowrap pl-2">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
