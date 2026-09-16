import React from "react";
import { UserProfile, UserRole } from "@/types/auth";
import { RoleBadge } from "@/components/ui/Badge";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Info,
} from "lucide-react";

interface UserProfileCardProps {
  user: UserProfile;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({ user }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full border border-slate-200 bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-lg shrink-0">
            {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {user.full_name}
              </h2>
              <RoleBadge role={user.role} size="sm" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Member ID: <span className="font-mono text-slate-400">{user.id.slice(0, 12)}...</span>
            </p>
          </div>
        </div>

        {/* Role status pill (shadcn badge style) */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
          <Info size={13} className="text-slate-500 shrink-0" />
          <span>
            Role Level:{" "}
            <strong>
              {user.role === UserRole.ADMIN
                ? "Admin (0)"
                : user.role === UserRole.OWNER
                ? "Owner (1)"
                : "Costumer (2)"}
            </strong>
          </span>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-6">
        {/* Email */}
        <div className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
          <div className="w-8 h-8 rounded-md border border-slate-200 bg-white flex items-center justify-center text-blue-600 shadow-2xs shrink-0">
            <Mail size={15} />
          </div>
          <div className="overflow-hidden">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Email Address
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate" title={user.email || "N/A"}>
              {user.email || "Not specified"}
            </p>
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
          <div className="w-8 h-8 rounded-md border border-slate-200 bg-white flex items-center justify-center text-emerald-600 shadow-2xs shrink-0">
            <Phone size={15} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Phone Number
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-900">
              {user.phone_number || "Not provided"}
            </p>
          </div>
        </div>

        {/* Date of Birth */}
        <div className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
          <div className="w-8 h-8 rounded-md border border-slate-200 bg-white flex items-center justify-center text-blue-600 shadow-2xs shrink-0">
            <Calendar size={15} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Date of Birth
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-900">
              {user.date_of_birth || "Not specified"}
            </p>
          </div>
        </div>

        {/* Gender */}
        <div className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
          <div className="w-8 h-8 rounded-md border border-slate-200 bg-white flex items-center justify-center text-emerald-600 shadow-2xs shrink-0">
            <User size={15} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Gender
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-900">
              {user.gender || "Prefer not to say"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
