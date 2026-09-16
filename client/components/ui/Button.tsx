import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "success" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = "",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none";

  const sizeStyles = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-9 px-4 text-sm gap-2",
    lg: "h-10 px-5 text-sm gap-2",
  }[size];

  const variantStyles = {
    // Royal Blue primary
    primary:
      "bg-blue-600 text-white shadow-2xs hover:bg-blue-700 active:bg-blue-800",
    // Emerald Green accent
    success:
      "bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700 active:bg-emerald-800",
    // Clean Outline
    outline:
      "border border-slate-200 bg-white shadow-2xs hover:bg-slate-50 hover:text-slate-900 text-slate-700",
    // Ghost
    ghost:
      "hover:bg-slate-100 hover:text-slate-900 text-slate-700",
    // Danger
    danger:
      "bg-red-600 text-white shadow-2xs hover:bg-red-700",
  }[variant];

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin" size={size === "sm" ? 13 : 15} />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
