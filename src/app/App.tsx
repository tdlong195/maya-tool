/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import {
  Building2,
  Calendar,
  Car,
  Database,
  FileText,
  Image as ImageIcon,
  Ship,
  UserPlus,
  Users,
  Utensils,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import { CarServiceFeature } from "../features/car-service";
import { CruiseShipFeature } from "../features/cruise-ship";
import { DatabaseFeature } from "../features/database";
import { ExistingGuidesFeature } from "../features/existing-guides";
import { FormatMenuFeature } from "../features/format-menu";
import { GuestListFeature } from "../features/guest-list";
import { GuideContractFeature } from "../features/guide-contract";
import { MenuPlannerFeature } from "../features/menu-planner";
import { TranslateFeature } from "../features/translate";
import { TripNoteFeature } from "../features/trip-note";

type AppMode =
  | "new"
  | "existing"
  | "database"
  | "guest_list"
  | "translate"
  | "cruise_ship"
  | "menu"
  | "car_service"
  | "format_menu"
  | "trip_note";

const modeButtons: Array<{
  mode: AppMode;
  label: string;
  icon: typeof UserPlus;
}> = [
    { mode: "new", label: "HDV Mới", icon: UserPlus },
    { mode: "existing", label: "Hợp đồng", icon: Database },
    { mode: "guest_list", label: "Guest List", icon: Users },
    // { mode: "translate", label: "Translate", icon: FileText },
    { mode: "cruise_ship", label: "Tàu Biển", icon: Ship },
    { mode: "menu", label: "Menu", icon: Calendar },
    { mode: "car_service", label: "Xe", icon: Car },
    { mode: "format_menu", label: "Format Menu", icon: Utensils },
    { mode: "trip_note", label: "Trip note", icon: ImageIcon },
  ];

export default function App() {
  const [mode, setMode] = useState<AppMode>("existing");
  const isDatabaseMode = mode === "database";

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: AppMode; databaseTab?: string }>).detail;
      if (detail?.databaseTab) {
        window.localStorage.setItem("hello-maya.database-tab", detail.databaseTab);
      }
      if (detail?.mode) setMode(detail.mode);
    };

    window.addEventListener("hello-maya:navigate", handleNavigate);
    return () => window.removeEventListener("hello-maya:navigate", handleNavigate);
  }, []);

  const renderFeature = () => {
    switch (mode) {
      case "new":
        return <GuideContractFeature />;
      case "existing":
        return <ExistingGuidesFeature />;
      case "database":
        return <DatabaseFeature />;
      case "guest_list":
        return <GuestListFeature />;
      case "translate":
        return <TranslateFeature />;
      case "cruise_ship":
        return <CruiseShipFeature />;
      case "menu":
        return <MenuPlannerFeature />;
      case "car_service":
        return <CarServiceFeature />;
      case "trip_note":
        return <TripNoteFeature />;
      case "format_menu":
        return <FormatMenuFeature />;
      default:
        return null;
    }
  };

  if (isDatabaseMode) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
        <div className="mx-auto max-w-[1600px] px-4 py-0 md:px-6">
          <TopModeMenu mode={mode} onModeChange={setMode} />
          <div className="pt-2">
            <AnimatePresence mode="wait">{renderFeature()}</AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-warm text-slate-900 font-sans p-4 md:p-0">
      <div className="max-w-5xl mx-auto">
        <TopModeMenu mode={mode} onModeChange={setMode} />

        <AnimatePresence mode="wait">{renderFeature()}</AnimatePresence>
      </div>
    </div>
  );
}

function TopModeMenu({
  mode,
  onModeChange,
}: {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}) {
  return (
    <header className="sticky top-0 z-30 mb-4 pt-2">
      <div className="mx-auto flex max-w-fit flex-wrap justify-center gap-0 rounded-[2rem] border border-black/5 bg-white/80 p-1.5 shadow-xl shadow-secondary/5 backdrop-blur-md transition-all">
        <button
          type="button"
          onClick={() => onModeChange("database")}
          className={`flex items-center gap-2 rounded-2xl p-2 text-sm font-semibold transition-all duration-300 ${mode === "database"
            ? "bg-primary text-white shadow-lg shadow-primary/20"
            : "text-slate-500 hover:bg-white/80 hover:text-secondary"
            }`}
        >
          <Building2 size={16} />
          DB
        </button>
        {modeButtons.map(({ mode: buttonMode, label, icon: Icon }) => (
          <button
            key={buttonMode}
            type="button"
            onClick={() => onModeChange(buttonMode)}
            className={`flex items-center gap-2 rounded-2xl p-2 text-sm font-semibold transition-all duration-300 ${mode === buttonMode
              ? "bg-primary text-white shadow-lg shadow-primary/20"
              : "text-slate-500 hover:bg-white/80 hover:text-secondary"
              }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
    </header>
  );
}
