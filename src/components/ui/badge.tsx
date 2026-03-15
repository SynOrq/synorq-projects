import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "secondary" | "success" | "warning" | "danger" | "purple";
  dot?: boolean;
}

const variantStyles: Record<string, string> = {
  default:   "bg-indigo-50 text-indigo-700 ring-indigo-200/60",
  secondary: "bg-slate-100 text-slate-600 ring-slate-200/60",
  success:   "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
  warning:   "bg-amber-50 text-amber-700 ring-amber-200/60",
  danger:    "bg-red-50 text-red-700 ring-red-200/60",
  purple:    "bg-violet-50 text-violet-700 ring-violet-200/60",
};

const dotStyles: Record<string, string> = {
  default:   "bg-indigo-500",
  secondary: "bg-slate-400",
  success:   "bg-emerald-500",
  warning:   "bg-amber-500",
  danger:    "bg-red-500",
  purple:    "bg-violet-500",
};

export function Badge({ children, className, variant = "secondary", dot }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1",
        variantStyles[variant],
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", dotStyles[variant])} />}
      {children}
    </span>
  );
}
