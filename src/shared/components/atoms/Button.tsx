import type { ButtonHTMLAttributes, ComponentType } from "react";

type ButtonVariant = "primary" | "secondary" | "success" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ComponentType<{ size?: number; className?: string }>;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary/90 shadow-sm",
  secondary: "bg-secondary text-white hover:bg-secondary/90 shadow-sm",
  success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm",
  ghost: "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200",
};

export function Button({
  children,
  className = "",
  icon: Icon,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors disabled:opacity-40",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}
