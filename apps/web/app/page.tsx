"use client";

import React from "react";
import { useOmniStore } from "@/stores/useOmniStore";
import { useAgentSocket } from "@/hooks/useAgentSocket";
import { AuthGate } from "@/components/AuthGate";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { PairingModal } from "@/components/PairingModal";
import { VoiceCommandModal } from "@/components/VoiceCommandModal";
import { ToastContainer } from "@/components/ToastContainer";

import { DashboardView } from "@/components/views/DashboardView";
import { DesktopView } from "@/components/views/DesktopView";
import { AppsView } from "@/components/views/AppsView";
import { FilesView } from "@/components/views/FilesView";
import { DevCentreView } from "@/components/views/DevCentreView";
import { TerminalView } from "@/components/views/TerminalView";
import { SystemView } from "@/components/views/SystemView";
import { WakeOnLanView } from "@/components/views/WakeOnLanView";
import { SecurityView } from "@/components/views/SecurityView";
import { SettingsView } from "@/components/views/SettingsView";

export default function Home() {
  // Activate live telemetry WebSocket stream
  useAgentSocket();

  const { 
    activeTab, 
    setAgentUrl, 
    setAuth, 
    setConnectionStatus, 
    addNotification, 
    setPairingModalOpen, 
    token 
  } = useOmniStore();

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Support 1-tap instant pairing from QR code or shared URL (?agentUrl=...&pin=...)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const agentParam = params.get("agentUrl");
    const pinParam = params.get("pin");
    if (agentParam) {
      setAgentUrl(agentParam);
    }
    if (pinParam && !token) {
      const connectWithPin = async () => {
        try {
          if (!agentParam) {
            const { resolveLaptopUrl } = await import("@/lib/discovery");
            const discovered = await resolveLaptopUrl(pinParam);
            if (discovered) {
              setAgentUrl(discovered);
            }
          }
          const { api } = await import("@/lib/api");
          const res = await api.auth.verifyPairing(pinParam, "Mobile Phone");
          setAuth(res.token, res.device_id);
          setConnectionStatus("CONNECTED");
          addNotification({
            title: "Quick-Pair Successful",
            message: "Connected and authenticated automatically.",
            type: "success"
          });
          setPairingModalOpen(false);
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (_) {}
      };
      connectWithPin();
    }
  }, [token, setAgentUrl, setAuth, setConnectionStatus, addNotification, setPairingModalOpen]);

  const renderActiveView = () => {
    switch (activeTab) {
      case "home":
        return <DashboardView />;
      case "desktop":
        return <DesktopView />;
      case "apps":
        return <AppsView />;
      case "files":
        return <FilesView />;
      case "dev":
        return <DevCentreView />;
      case "terminal":
        return <TerminalView />;
      case "system":
        return <SystemView />;
      case "wol":
        return <WakeOnLanView />;
      case "security":
        return <SecurityView />;
      case "settings":
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  // Prevent SSR hydration flicker
  if (!mounted) {
    return (
      <div className="min-h-screen bg-omni-dark flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Strict Authentication Gate: Without valid key/token, absolutely no access into workstation
  if (!token) {
    return (
      <div className="flex flex-col min-h-screen bg-omni-dark text-foreground">
        <ToastContainer />
        <AuthGate />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-omni-dark text-foreground">
      <Header />
      <ToastContainer />
      <PairingModal />
      <VoiceCommandModal />

      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main
          className={`flex-1 w-full ${
            activeTab === "desktop"
              ? "p-0 sm:p-2 flex flex-col items-center justify-center overflow-hidden"
              : "p-3 sm:p-6 pb-28 md:pb-8 max-w-7xl mx-auto overflow-y-auto"
          }`}
        >
          {renderActiveView()}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
