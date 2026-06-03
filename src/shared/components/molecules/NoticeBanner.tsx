import type { ComponentType } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type NoticeBannerProps = {
  children: React.ReactNode;
  icon?: ComponentType<{ size?: number; className?: string }>;
  tone?: "error" | "success" | "info";
  className?: string;
};

const toneClasses = {
  error: "bg-red-50 text-red-600",
  success: "bg-emerald-50 text-emerald-700",
  info: "bg-slate-50 text-slate-600",
};

export function NoticeBanner({
  children,
  className = "",
  icon,
  tone = "info",
}: NoticeBannerProps) {
  const Icon = icon || (tone === "success" ? CheckCircle2 : AlertCircle);

  return (
    <div
      className={[
        "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold",
        toneClasses[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon size={16} />
      {children}
    </div>
  );
}
