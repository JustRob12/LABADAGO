import React from "react";
import { UserRole, ROLE_LABELS, ROLE_BADGE_COLORS } from "@/types/auth";
import { Shield, Sparkles, Store } from "lucide-react";

interface RoleBadgeProps {
  role: UserRole | number;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  size = "md",
  showIcon = true,
  className = "",
}) => {
  const userRole = (role in ROLE_LABELS ? role : UserRole.COSTUMER) as UserRole;
  const label = ROLE_LABELS[userRole] || "Costumer";
  const colors = ROLE_BADGE_COLORS[userRole] || ROLE_BADGE_COLORS[UserRole.COSTUMER];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2.5 py-0.5 text-xs gap-1.5",
  }[size];

  const icon = {
    [UserRole.ADMIN]: <Shield size={size === "sm" ? 11 : 13} className="text-indigo-600 shrink-0" />,
    [UserRole.OWNER]: <Store size={size === "sm" ? 11 : 13} className="text-amber-600 shrink-0" />,
    [UserRole.COSTUMER]: <Sparkles size={size === "sm" ? 11 : 13} className="text-emerald-600 shrink-0" />,
  }[userRole];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border shadow-2xs ${sizeClasses} ${colors.bg} ${colors.text} ${colors.border} ${className}`}
    >
      {showIcon && icon}
      <span>{label}</span>
      <span className="opacity-60 text-[10px] font-mono">({userRole})</span>
    </span>
  );
};
