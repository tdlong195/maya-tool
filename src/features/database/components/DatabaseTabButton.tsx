import type { LucideIcon } from "lucide-react";

type DatabaseTabButtonProps = {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
};

export function DatabaseTabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: DatabaseTabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold ${
        active
          ? "bg-primary text-white shadow-lg shadow-primary/20"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      <Icon size={18} /> {label}
    </button>
  );
}
