"use client";

import React from "react";
import { useOmniStore } from "@/stores/useOmniStore";
import { useAgentSocket } from "@/hooks/useAgentSocket";
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

  const { activeTab } = useOmniStore();

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
