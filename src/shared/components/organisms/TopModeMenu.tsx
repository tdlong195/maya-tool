import type { ComponentType } from "react";
import { Building2 } from "lucide-react";

export type TopModeMenuItem<TMode extends string> = {
  mode: TMode;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

type TopModeMenuProps<TMode extends string> = {
  activeMode: TMode;
  databaseMode: TMode;
  items: Array<TopModeMenuItem<TMode>>;
  onModeChange: (mode: TMode) => void;
};

export function TopModeMenu<TMode extends string>({
  activeMode,
  databaseMode,
  items,
  onModeChange,
}: TopModeMenuProps<TMode>) {
  return (
    <header className="sticky top-0 z-30 mb-4">
      <nav className="mx-auto max-w-full overflow-x-auto rounded-b-2xl border border-t-0 border-black/5 bg-white/90 p-1.5 shadow-lg shadow-secondary/5 backdrop-blur-md">
        <div className="flex min-w-max items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => onModeChange(databaseMode)}
            className={`flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold transition-all duration-200 ${
              activeMode === databaseMode
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-slate-500 hover:bg-slate-50 hover:text-secondary"
            }`}
          >
            <Building2 size={16} />
            DB
          </button>
          {items.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onModeChange(mode)}
              className={`flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold transition-all duration-200 ${
                activeMode === mode
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-slate-500 hover:bg-slate-50 hover:text-secondary"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
}
