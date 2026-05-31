/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
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
    { mode: "database", label: "Database", icon: Building2 },
    { mode: "existing", label: "Hợp đồng và lệnh", icon: Database },
    { mode: "guest_list", label: "Guest List", icon: Users },
    // { mode: "translate", label: "Translate", icon: FileText },
    { mode: "cruise_ship", label: "Tàu Biển", icon: Ship },
    { mode: "menu", label: "Thực Đơn", icon: Calendar },
    { mode: "car_service", label: "Xe", icon: Car },
    { mode: "format_menu", label: "Format Menu", icon: Utensils },
    { mode: "trip_note", label: "Làm trip note", icon: ImageIcon },
  ];

export default function App() {
  const [mode, setMode] = useState<AppMode>("existing");

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

  return (
    <div className="min-h-screen bg-bg-warm text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-16 text-center space-y-6">
          <div className="relative inline-block">
            <h1 className="text-2xl md:text-2xl font-serif italic font-medium tracking-tight text-secondary relative z-10">
              Hello Maya Tran
            </h1>
          </div>

          <div className="flex flex-wrap justify-center gap-2 p-1.5 bg-white/60 backdrop-blur-md rounded-[2rem] border border-black/5 shadow-xl shadow-secondary/5 transition-all max-w-fit mx-auto">
            {modeButtons.map(({ mode: buttonMode, label, icon: Icon }) => (
              <button
                key={buttonMode}
                onClick={() => setMode(buttonMode)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 ${mode === buttonMode
                  ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                  : "text-slate-500 hover:text-secondary hover:bg-white/80"
                  }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </header>

        <AnimatePresence mode="wait">{renderFeature()}</AnimatePresence>
      </div>
    </div>
  );
}
