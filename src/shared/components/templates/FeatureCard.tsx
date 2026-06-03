import type { ComponentType } from "react";

type FeatureCardProps = {
  children: React.ReactNode;
  icon: ComponentType<{ size?: number; className?: string }>;
  eyebrow: string;
  title: string;
};

export function FeatureCard({
  children,
  eyebrow,
  icon: Icon,
  title,
}: FeatureCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
          <Icon size={16} />
          {eyebrow}
        </div>
        <h2 className="mt-1 text-xl font-bold text-slate-950">{title}</h2>
      </div>
      {children}
    </div>
  );
}
