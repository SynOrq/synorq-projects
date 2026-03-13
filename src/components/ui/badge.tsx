import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "secondary" | "success" | "warning" | "danger" | "purple";
}

const variantStyles = {
  default:   "bg-indigo-100 text-indigo-700",
  secondary: "bg-gray-100 text-gray-600",
  success:   "bg-green-100 text-green-700",
  warning:   "bg-orange-100 text-orange-700",
  danger:    "bg-red-100 text-red-700",
  purple:    "bg-purple-100 text-purple-700",
};

export function Badge({ children, className, variant = "secondary" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
