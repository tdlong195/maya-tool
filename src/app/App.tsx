/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import {
  Calendar,
  Car,
  Database,
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
import { TripNoteFeature } from "../features/trip-note";
import { TopModeMenu } from "../shared/components";

type AppMode =
  | "new"
  | "existing"
  | "database"
  | "guest_list"
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
        <div className="mx-auto max-w-[1600px] px-3 py-0 sm:px-4 md:px-6">
          <TopModeMenu<AppMode>
            activeMode={mode}
            databaseMode="database"
            items={modeButtons}
            onModeChange={setMode}
          />
          <div className="pt-2">
            <AnimatePresence mode="wait">{renderFeature()}</AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-warm px-4 pb-4 pt-0 text-slate-900 font-sans md:p-0">
      <div className="mx-auto max-w-5xl">
        <TopModeMenu<AppMode>
          activeMode={mode}
          databaseMode="database"
          items={modeButtons}
          onModeChange={setMode}
        />

        <AnimatePresence mode="wait">{renderFeature()}</AnimatePresence>
      </div>
    </div>
  );
}
