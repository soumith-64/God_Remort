import { useOmniStore } from "@/stores/useOmniStore";

export async function agentRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { agentUrl, token, setConnectionStatus, setPairingModalOpen } = useOmniStore.getState();
  
  let base = agentUrl ? agentUrl.replace(/\/$/, "") : "";
  if (typeof window !== "undefined") {
    const isVercel = window.location.hostname.endsWith("vercel.app");
    if (!isVercel && window.location.protocol === "https:" && (!base || base.startsWith("http://localhost") || base.startsWith("http://127.0.0.1"))) {
      base = window.location.origin;
    } else if (!base) {
      base = isVercel ? "" : window.location.origin;
    }
  } else if (!base) {
    base = "http://localhost:8000";
  }

  // If on Vercel and base points to Vercel itself, Vercel has no backend agent
  if (typeof window !== "undefined" && window.location.hostname.endsWith("vercel.app") && (!base || base === window.location.origin)) {
    throw new Error("Laptop Agent URL required. Please enter your laptop's local Wi-Fi IP (e.g. http://192.168.0.110:8000) or Cloudflare Tunnel URL in Host IP.");
  }

  const url = `${base}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // If body is not FormData, set Content-Type JSON
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // If no auth token is present and trying to access a protected route, prompt for PIN first
  if (!token && !endpoint.includes("/auth/")) {
    setConnectionStatus("AUTH_REQUIRED");
    setPairingModalOpen(true);
    throw new Error("Device pairing required. Please enter your PIN to continue.");
  }

  try {
    const res = await fetch(url, { ...options, headers });

    // Only trigger modal for protected routes, not pairing verify attempts
    if (res.status === 401 && !endpoint.includes("/auth/")) {
      setConnectionStatus("AUTH_REQUIRED");
      setPairingModalOpen(true);
      throw new Error("Authentication required. Please enter your PIN.");
    }

    if (!res.ok) {
      let errorMsg = `Server error (${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson.detail) errorMsg = errJson.detail;
      } catch (_) {}
      throw new Error(errorMsg);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      setConnectionStatus("OFFLINE");
      throw new Error(`Cannot reach GOD REMORT Agent at ${base || agentUrl || 'localhost:8000'}. Is the agent running on your laptop?`);
    }
    throw err;
  }
}

export const api = {
  health: () => agentRequest<{ status: string; version: string; interfaces: any[]; has_active_pairing: boolean }>("/api/v1/health"),
  
  auth: {
    initiatePairing: () => agentRequest<{ pin: string; qr_code: string; expires_in_seconds: number; network_interfaces: any[] }>("/api/v1/auth/pair/initiate", { method: "POST" }),
    verifyPairing: (pin: string, deviceName: string) => agentRequest<{ token: string; device_id: string; role: string; scopes: string[] }>("/api/v1/auth/pair/verify", {
      method: "POST",
      body: JSON.stringify({ pin, device_name: deviceName })
    }),
    setCustomPin: (pin: string) => agentRequest<any>("/api/v1/auth/pin", {
      method: "POST",
      body: JSON.stringify({ pin })
    }),
    getDevices: () => agentRequest<any[]>("/api/v1/auth/devices"),
    revokeDevice: (deviceId: string) => agentRequest<{ status: string; device_id: string }>(`/api/v1/auth/devices/${deviceId}/revoke`, { method: "POST" }),
    getAudit: () => agentRequest<any[]>("/api/v1/auth/audit"),
  },

  system: {
    getStatus: () => agentRequest<any>("/api/v1/system/status"),
    getAudio: () => agentRequest<{ available: boolean; volume_percent: number; is_muted: boolean }>("/api/v1/system/audio"),
    setAudio: (percent: number, mute?: boolean) => agentRequest<any>("/api/v1/system/audio", {
      method: "POST",
      body: JSON.stringify({ percent, mute })
    }),
    getBrightness: () => agentRequest<{ available: boolean; brightness_percent: number }>("/api/v1/system/brightness"),
    setBrightness: (percent: number) => agentRequest<any>("/api/v1/system/brightness", {
      method: "POST",
      body: JSON.stringify({ percent })
    }),
    power: (action: "lock" | "sleep" | "restart" | "shutdown" | "cancel") => agentRequest<any>("/api/v1/system/power", {
      method: "POST",
      body: JSON.stringify({ action })
    }),
    restartAgent: () => agentRequest<any>("/api/v1/system/agent/restart", {
      method: "POST"
    }),
  },

  apps: {
    getShortcuts: () => agentRequest<any[]>("/api/v1/apps/shortcuts"),
    getInstalled: (refresh = false) => agentRequest<any[]>(`/api/v1/apps/installed?refresh=${refresh}`),
    getRunning: () => agentRequest<any[]>("/api/v1/apps/running"),
    launch: (appIdOrPath: string, args?: string[]) => agentRequest<any>("/api/v1/apps/launch", {
      method: "POST",
      body: JSON.stringify({ app_id_or_path: appIdOrPath, args })
    }),
    controlWindow: (hwnd: number, action: "focus" | "minimize" | "maximize" | "close") => agentRequest<any>("/api/v1/apps/window", {
      method: "POST",
      body: JSON.stringify({ hwnd, action })
    }),
    terminate: (pid: number) => agentRequest<any>("/api/v1/apps/terminate", {
      method: "POST",
      body: JSON.stringify({ pid })
    }),
  },

  files: {
    getBookmarks: () => agentRequest<any[]>("/api/v1/files/bookmarks"),
    browse: (path = "") => agentRequest<{ current_path: string; parent_path?: string; items: any[]; total_items: number }>(`/api/v1/files/browse?path=${encodeURIComponent(path)}`),
    preview: (path: string) => agentRequest<any>(`/api/v1/files/preview?path=${encodeURIComponent(path)}`),
    downloadUrl: (path: string) => {
      const { agentUrl, token } = useOmniStore.getState();
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
      return `${base}/api/v1/files/download?path=${encodeURIComponent(path)}&token=${token || ""}`;
    },
    upload: async (destinationDir: string, file: File) => {
      const formData = new FormData();
      formData.append("destination_dir", destinationDir);
      formData.append("file", file);
      return agentRequest<any>("/api/v1/files/upload", {
        method: "POST",
        body: formData
      });
    },
    operations: (action: "create_folder" | "rename" | "delete", path: string, newName?: string) => agentRequest<any>("/api/v1/files/operations", {
      method: "POST",
      body: JSON.stringify({ action, path, new_name: newName })
    }),
  },

  wol: {
    getAdapters: () => agentRequest<any[]>("/api/v1/power/wol/adapters"),
    wake: (macAddress: string, broadcastIp = "255.255.255.255", port = 9) => agentRequest<any>("/api/v1/power/wol/wake", {
      method: "POST",
      body: JSON.stringify({ mac_address: macAddress, broadcast_ip: broadcastIp, port })
    }),
    check: (host: string, port = 8000) => agentRequest<{ host: string; port: number; reachable: boolean }>(`/api/v1/power/wol/check?host=${host}&port=${port}`),
  },

  voice: {
    sendCommand: (command: string) => agentRequest<{ status: string; action?: string; message: string; spoken_response?: string }>("/api/v1/voice/command", {
      method: "POST",
      body: JSON.stringify({ command })
    }),
  }
};
