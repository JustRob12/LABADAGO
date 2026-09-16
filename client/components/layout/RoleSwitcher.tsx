"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { UserRole } from "@/types/auth";
import { switchUserRole } from "@/lib/supabase/auth";
import { Store, User, Loader2 } from "lucide-react";

interface RoleSwitcherProps {
  currentRole: UserRole;
  onRoleSwitched?: (newRole: UserRole) => void;
  className?: string;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  currentRole,
  onRoleSwitched,
  className = "",
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isSwitching, setIsSwitching] = useState(false);

  // Derive if currently in owner mode either by role or current pathname
  const isOwner = currentRole === UserRole.OWNER || pathname?.startsWith("/owner");

  const handleSwitch = async (targetRole: UserRole) => {
    if (targetRole === currentRole && ((targetRole === UserRole.OWNER && pathname?.startsWith("/owner")) || (targetRole === UserRole.COSTUMER && pathname?.startsWith("/customer")))) {
      return;
    }

    setIsSwitching(true);
    try {
      await switchUserRole(targetRole);
      if (onRoleSwitched) {
        onRoleSwitched(targetRole);
      }

      if (targetRole === UserRole.OWNER) {
        router.push("/owner");
      } else {
        router.push("/customer");
      }
    } catch (err) {
      console.error("Failed to switch role:", err);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-xs font-medium ${className}`}
      role="group"
      aria-label="Role Switcher"
    >
      {/* Customer Button */}
      <button
        type="button"
        disabled={isSwitching}
        onClick={() => handleSwitch(UserRole.COSTUMER)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
          !isOwner
            ? "bg-white text-blue-600 font-semibold shadow-2xs border border-slate-200/60"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        {isSwitching && !isOwner ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <User size={13} className={!isOwner ? "text-blue-600" : "text-slate-400"} />
        )}
        <span>Customer</span>
      </button>

      {/* Owner Button */}
      <button
        type="button"
        disabled={isSwitching}
        onClick={() => handleSwitch(UserRole.OWNER)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
          isOwner
            ? "bg-white text-emerald-600 font-semibold shadow-2xs border border-slate-200/60"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        {isSwitching && isOwner ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Store size={13} className={isOwner ? "text-emerald-600" : "text-slate-400"} />
        )}
        <span>Shop Owner</span>
      </button>
    </div>
  );
};
