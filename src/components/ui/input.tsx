import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          id={inputId}
          className={cn(
            "flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm text-gray-900 shadow-sm placeholder:text-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-400 focus:ring-red-400",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
