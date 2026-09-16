import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "muted" | "glass";
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  padding = "md",
  className = "",
  ...props
}) => {
  const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  }[padding];

  const variantClasses = {
    default: "bg-white border border-slate-200 shadow-xs",
    muted: "bg-slate-50 border border-slate-200",
    glass: "bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xs",
  }[variant];

  return (
    <div
      className={`rounded-xl transition-all duration-150 ${variantClasses} ${paddingClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
