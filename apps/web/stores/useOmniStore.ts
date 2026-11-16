import { create } from "zustand";

export type ConnectionStatus = 
  | "DISCONNECTED" 
  | "CONNECTING" 
  | "CONNECTED" 
  | "RECONNECTING" 
  | "AUTH_REQUIRED" 
  | "OFFLINE";

export type NavigationTab = 
  | "home" 
  | "desktop" 
  | "apps" 
  | "files" 
  | "dev" 
  | "terminal" 
  | "system" 
  | "wol" 
  | "security" 
  | "settings";

export interface SystemProfile {
  id: string;
  name: string;
  url: string;
  token?: string | null;
}

export interface TelemetryData {
  timestamp?: number;
  cpu?: {
    overall_percent: number;
    cores_percent: number[];
    core_count_logical: number;
    core_count_physical: number;
    freq_current_mhz?: number;
    temperature?: any;
  };
  memory?: {
    total_gb: number;
    used_gb: number;
    available_gb: number;
    percent: number;
  };
  disk?: {
    primary?: {
      total_gb: number;
      used_gb: number;
      free_gb: number;
      percent: number;
      mountpoint?: string;
    };
    disks?: Array<{
      device: string;
      mountpoint: string;
      fstype?: string;
      total_gb: number;
      used_gb: number;
      free_gb: number;
      percent: number;
    }>;
  };
  battery?: {
    available: boolean;
    percent: number;
    power_plugged: boolean;
    status_text: string;
    seconds_left?: number;
  };
  network?: {
    upload_kbs: number;
    download_kbs: number;
    total_sent_mb: number;
    total_recv_mb: number;
  };
  system?: {
    hostname: string;
    os: string;
    os_release: string;
    os_version: string;
    architecture: string;
    uptime_seconds: number;
    boot_time: number;
  };
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: number;
}

interface OmniStore {
  agentUrl: string;
  token: string | null;
  deviceId: string | null;
  deviceName: string;
  connectionStatus: ConnectionStatus;
  latencyMs: number;
  telemetry: TelemetryData | null;
  activeTab: NavigationTab;
  isPairingModalOpen: boolean;
  isVoiceModalOpen: boolean;
  theme: "dark" | "light";
  desktopQuality: number;
  desktopScale: number;
  showOnScreenKeyboard: boolean;
  notifications: AppNotification[];

  // Multi-System Profiles
  systems: SystemProfile[];
  activeSystemId: string;
  addSystem: (name: string, url: string) => void;
  removeSystem: (id: string) => void;
  switchSystem: (id: string) => void;

  setAgentUrl: (url: string) => void;
  setAuth: (token: string | null, deviceId: string | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLatencyMs: (ms: number) => void;
  setTelemetry: (data: TelemetryData) => void;
  setActiveTab: (tab: NavigationTab) => void;
  setPairingModalOpen: (open: boolean) => void;
  setVoiceModalOpen: (open: boolean) => void;
  setTheme: (theme: "dark" | "light") => void;
  setDesktopSettings: (quality?: number, scale?: number) => void;
  setShowOnScreenKeyboard: (show: boolean) => void;
  addNotification: (notification: Omit<AppNotification, "id" | "timestamp">) => void;
  dismissNotification: (id: string) => void;
}

const getInitialAgentUrl = () => {
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_DEFAULT_AGENT_URL || "http://localhost:8000";
  let saved = localStorage.getItem("omni_agent_url");
  if (saved) {
    // Repair corrupted duplicate protocols from previous input bugs
    if (saved.includes("http://http:") || saved.includes("http://http://") || saved.includes("https://http:")) {
      saved = saved.replace(/^(https?:\/\/)+(https?:?\/*)?/i, (m) => m.toLowerCase().includes("https") ? "https://" : "http://");
      localStorage.setItem("omni_agent_url", saved);
    }
    return saved;
  }
  return process.env.NEXT_PUBLIC_DEFAULT_AGENT_URL || (window.location.hostname.endsWith("vercel.app") ? "" : window.location.origin);
};

const getInitialSystems = (): SystemProfile[] => {
  const defaultUrl = process.env.NEXT_PUBLIC_DEFAULT_AGENT_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:8000");
  if (typeof window === "undefined") return [{ id: "default", name: "Primary Workstation", url: defaultUrl }];
  const saved = localStorage.getItem("omni_systems");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (_) {}
  }
  return [{ id: "default", name: "Primary Workstation", url: defaultUrl }];
};

export const useOmniStore = create<OmniStore>((set, get) => ({
  agentUrl: getInitialAgentUrl(),
  token: typeof window !== "undefined" ? localStorage.getItem("omni_token") : null,
  deviceId: typeof window !== "undefined" ? localStorage.getItem("omni_device_id") : null,
  deviceName: typeof window !== "undefined" ? (localStorage.getItem("omni_device_name") || "Mobile Client") : "Mobile Client",
  connectionStatus: "CONNECTING", 
  latencyMs: 12,
  telemetry: null,
  activeTab: "home",
  isPairingModalOpen: false,
  isVoiceModalOpen: false,
  theme: "dark",
  desktopQuality: 40,
  desktopScale: 0.50, 
  showOnScreenKeyboard: false,
  notifications: [],

  systems: getInitialSystems(),
  activeSystemId: "default",

  addSystem: (name: string, url: string) => {
    let clean = url.trim().replace(/\/$/, "");
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = "http://" + clean;
    }
    const newSys: SystemProfile = {
      id: "sys_" + Math.random().toString(36).substring(2, 8),
      name: name.trim() || clean,
      url: clean,
      token: null
    };
    const updated = [...get().systems, newSys];
    if (typeof window !== "undefined") {
      localStorage.setItem("omni_systems", JSON.stringify(updated));
    }
    set({ systems: updated });
    get().switchSystem(newSys.id);
  },

  removeSystem: (id: string) => {
    const updated = get().systems.filter((s) => s.id !== id);
    if (updated.length === 0) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("omni_systems", JSON.stringify(updated));
    }
    set({ systems: updated });
    if (get().activeSystemId === id) {
      get().switchSystem(updated[0].id);
    }
  },

  switchSystem: (id: string) => {
    const target = get().systems.find((s) => s.id === id);
    if (!target) return;
    set({
      activeSystemId: id,
      agentUrl: target.url,
      token: target.token || null,
      connectionStatus: "CONNECTING",
      telemetry: null
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("omni_agent_url", target.url);
      if (target.token) localStorage.setItem("omni_token", target.token);
      else localStorage.removeItem("omni_token");
    }
  },

  setAgentUrl: (url: string) => {
    let clean = url.trim();
    // Repair corrupted duplicate protocols like http://http: or http://http://
    if (clean.includes("http://http:") || clean.includes("http://http://") || clean.includes("https://http:")) {
      clean = clean.replace(/^(https?:\/\/)+(https?:?\/*)?/i, (m) => m.toLowerCase().includes("https") ? "https://" : "http://");
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("omni_agent_url", clean);
    }
    // Update active system URL as well
    const systems = get().systems.map((s) => s.id === get().activeSystemId ? { ...s, url: clean } : s);
    if (typeof window !== "undefined") {
      localStorage.setItem("omni_systems", JSON.stringify(systems));
    }
    set({ agentUrl: clean, systems });
  },

  setAuth: (token: string | null, deviceId: string | null) => {
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem("omni_token", token);
      else localStorage.removeItem("omni_token");
      if (deviceId) localStorage.setItem("omni_device_id", deviceId);
      else localStorage.removeItem("omni_device_id");
    }
    // Update active system profile token
    const systems = get().systems.map((s) => s.id === get().activeSystemId ? { ...s, token } : s);
    if (typeof window !== "undefined") {
      localStorage.setItem("omni_systems", JSON.stringify(systems));
    }
    set({ token, deviceId, systems });
  },

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setLatencyMs: (latencyMs) => set({ latencyMs }),
  setTelemetry: (telemetry) => set({ telemetry }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setPairingModalOpen: (isPairingModalOpen) => set({ isPairingModalOpen }),
  setVoiceModalOpen: (isVoiceModalOpen) => set({ isVoiceModalOpen }),
  setTheme: (theme) => set({ theme }),
  setDesktopSettings: (quality, scale) => set((s) => ({
    desktopQuality: quality ?? s.desktopQuality,
    desktopScale: scale ?? s.desktopScale,
  })),
  setShowOnScreenKeyboard: (showOnScreenKeyboard) => set({ showOnScreenKeyboard }),
  addNotification: (n) => set((s) => ({
    notifications: [
      { ...n, id: Math.random().toString(36).substring(2, 9), timestamp: Date.now() },
      ...s.notifications.slice(0, 9)
    ]
  })),
  dismissNotification: (id) => set((s) => ({
    notifications: s.notifications.filter((n) => n.id !== id)
  })),
}));
