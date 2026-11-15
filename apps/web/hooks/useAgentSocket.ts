"use client";

import { useEffect, useRef } from "react";
import { useOmniStore } from "@/stores/useOmniStore";

export function useAgentSocket() {
  const {
    agentUrl,
    token,
    setConnectionStatus,
    setLatencyMs,
    setTelemetry,
    setPairingModalOpen,
  } = useOmniStore();

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backoffRef = useRef<number>(1000);

  useEffect(() => {
    let isMounted = true;

    // Ask for PIN first if device has not paired yet
    if (!token) {
      setConnectionStatus("AUTH_REQUIRED");
      setPairingModalOpen(true);
    }

    function connect() {
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
      const wsUrl = `${wsProtocol}//${hostPart}/ws/events?token=${token || ""}`;

      setConnectionStatus("CONNECTING");

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        const pingStart = Date.now();

        ws.onopen = () => {
          if (!isMounted) return;
          setConnectionStatus("CONNECTED");
          setLatencyMs(Math.max(4, Date.now() - pingStart));
          backoffRef.current = 1000; // Reset backoff on successful connection
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "telemetry" && payload.data) {
              setTelemetry(payload.data);
            }
          } catch (_) {}
        };

        ws.onerror = () => {
          if (!isMounted) return;
          setConnectionStatus("DISCONNECTED");
        };

        ws.onclose = (event) => {
          if (!isMounted) return;
          if (event.code === 4001 || event.code === 4401) {
            setConnectionStatus("AUTH_REQUIRED");
            setPairingModalOpen(true);
          } else {
            setConnectionStatus("RECONNECTING");
            // Exponential backoff up to 10s
            const delay = Math.min(10000, backoffRef.current);
            backoffRef.current = Math.min(10000, backoffRef.current * 1.5);
            reconnectTimeoutRef.current = setTimeout(connect, delay);
          }
        };
      } catch (e) {
        setConnectionStatus("OFFLINE");
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [agentUrl, token, setConnectionStatus, setLatencyMs, setTelemetry, setPairingModalOpen]);
}
