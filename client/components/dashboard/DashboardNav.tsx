"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { signOutUser, switchUserRole } from "@/lib/supabase/auth";
import { UserProfile, UserRole } from "@/types/auth";
import {
  LogOut,
  User as UserIcon,
  MapPin,
  QrCode,
  Package,
  BarChart3,
  Settings,
  ScanLine,
  ArrowRightLeft,
  ChevronDown,
  Loader2,
} from "lucide-react";

interface DashboardNavProps {
  user: UserProfile | null;
  onLoggedOut?: () => void;
  onRoleSwitched?: (role: UserRole) => void;
}

export const DashboardNav: React.FC<DashboardNavProps> = ({
  user,
  onLoggedOut,
  onRoleSwitched,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [currentTab, setCurrentTab] = useState("");

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isOwner = user?.role === UserRole.OWNER || pathname?.startsWith("/owner");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setCurrentTab(params.get("tab") || "");
    }
  }, [pathname]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await signOutUser();
    if (onLoggedOut) {
      onLoggedOut();
    } else {
      router.push("/login");
    }
  };

  const handleToggleRole = async () => {
    setIsSwitchingRole(true);
    const targetRole = isOwner ? UserRole.COSTUMER : UserRole.OWNER;

    try {
      await switchUserRole(targetRole);
      if (onRoleSwitched) {
        onRoleSwitched(targetRole);
      }
      setDropdownOpen(false);

      if (targetRole === UserRole.OWNER) {
        router.push("/owner");
      } else {
        router.push("/customer");
      }
    } catch (err) {
      console.error("Failed to switch role:", err);
    } finally {
      setIsSwitchingRole(false);
    }
  };

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <BrandLogo size="md" />
          </div>

          {/* Desktop Navigation Links (Clean & Centered) */}
          <nav className="hidden lg:flex items-center gap-1">
            {!isOwner ? (
              // Customer Desktop Links
              <>
                <Link
                  href="/customer"
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    pathname === "/customer" && !currentTab
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-blue-600" />
                    Map & Shops
                  </span>
                </Link>

                <Link
                  href="/customer?tab=qr"
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    pathname === "/customer" && currentTab === "qr"
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <QrCode size={14} className="text-emerald-600" />
                    Walk-In QR
                  </span>
                </Link>

                <Link
                  href="/customer?tab=orders"
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    pathname === "/customer" && currentTab === "orders"
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Package size={14} className="text-slate-500" />
                    Order Tracker
                  </span>
                </Link>

                <Link
                  href="/dashboard"
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    pathname === "/dashboard"
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  Profile & Overview
                </Link>
              </>
            ) : (
              // Owner Desktop Links
              <>
                <Link
                  href="/owner"
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    pathname === "/owner" && !currentTab
                      ? "bg-emerald-50 text-emerald-700 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-emerald-600" />
                    Business Analytics
                  </span>
                </Link>

                <Link
                  href="/owner?tab=scanner"
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    pathname === "/owner" && currentTab === "scanner"
                      ? "bg-emerald-50 text-emerald-700 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <ScanLine size={14} className="text-blue-600" />
                    QR Intake & Orders
                  </span>
                </Link>

                <Link
                  href="/owner?tab=setup"
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    pathname === "/owner" && currentTab === "setup"
                      ? "bg-emerald-50 text-emerald-700 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Settings size={14} className="text-slate-500" />
                    Shop Setup
                  </span>
                </Link>

                <Link
                  href="/dashboard"
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    pathname === "/dashboard"
                      ? "bg-emerald-50 text-emerald-700 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  Profile & Hub
                </Link>
              </>
            )}
          </nav>

          {/* Right: Profile Avatar Icon with Dropdown Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer select-none focus:outline-none"
              aria-label="User menu"
              aria-expanded={dropdownOpen}
            >
              <div className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs shadow-2xs">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon size={14} />}
              </div>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform duration-150 ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Profile Dropdown Menu (shadcn style) */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg py-1.5 z-50 animate-fadeIn text-xs">
                {/* User Details Header */}
                <div className="px-3.5 py-2.5 border-b border-slate-100">
                  <p className="font-bold text-slate-900 truncate">
                    {user?.full_name || "Valued User"}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {user?.email || "user@labadago.com"}
                  </p>
                  <div className="mt-1.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        isOwner
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      Active: {isOwner ? "Laundry Shop Owner" : "Customer"}
                    </span>
                  </div>
                </div>

                {/* Navigation Items */}
                <div className="py-1">
                  <Link
                    href="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <UserIcon size={14} className="text-slate-400" />
                    <span>Profile</span>
                  </Link>

                  <Link
                    href={isOwner ? "/owner?tab=setup" : "/dashboard"}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <Settings size={14} className="text-slate-400" />
                    <span>Settings</span>
                  </Link>
                </div>

                {/* Role Switcher Action */}
                <div className="border-t border-slate-100 py-1">
                  <button
                    type="button"
                    disabled={isSwitchingRole}
                    onClick={handleToggleRole}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    {isSwitchingRole ? (
                      <Loader2 size={14} className="animate-spin text-blue-600" />
                    ) : (
                      <ArrowRightLeft
                        size={14}
                        className={isOwner ? "text-blue-600" : "text-emerald-600"}
                      />
                    )}
                    <span>
                      {isOwner ? "Switch to Customer" : "Switch to Owner"}
                    </span>
                  </button>
                </div>

                {/* Sign Out Action */}
                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-red-600 hover:bg-red-50 cursor-pointer font-medium transition-colors"
                  >
                    <LogOut size={14} className="text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Floating Bottom Navigation (Visible on mobile screens) */}
      <div className="lg:hidden fixed bottom-4 inset-x-4 max-w-sm mx-auto z-50 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-900/10 px-2 py-1.5 flex items-center justify-around">
        {!isOwner ? (
          // Customer Mobile Floating Nav
          <>
            <Link
              href="/customer"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors ${
                pathname === "/customer" && !currentTab
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <MapPin size={18} />
              <span>Map</span>
            </Link>

            <Link
              href="/customer?tab=qr"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors ${
                pathname === "/customer" && currentTab === "qr"
                  ? "text-emerald-600 font-bold bg-emerald-50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <QrCode size={18} />
              <span>Fast Pass</span>
            </Link>

            <Link
              href="/customer?tab=orders"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors ${
                pathname === "/customer" && currentTab === "orders"
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Package size={18} />
              <span>Orders</span>
            </Link>

            <Link
              href="/dashboard"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors ${
                pathname === "/dashboard"
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <UserIcon size={18} />
              <span>Profile</span>
            </Link>
          </>
        ) : (
          // Owner Mobile Floating Nav
          <>
            <Link
              href="/owner"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors ${
                pathname === "/owner" && !currentTab
                  ? "text-emerald-600 font-bold bg-emerald-50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <BarChart3 size={18} />
              <span>Analytics</span>
            </Link>

            <Link
              href="/owner?tab=scanner"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors ${
                pathname === "/owner" && currentTab === "scanner"
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <ScanLine size={18} />
              <span>QR Intake</span>
            </Link>

            <Link
              href="/owner?tab=setup"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors ${
                pathname === "/owner" && currentTab === "setup"
                  ? "text-slate-900 font-bold bg-slate-100"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Settings size={18} />
              <span>Setup</span>
            </Link>

            <Link
              href="/dashboard"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors ${
                pathname === "/dashboard"
                  ? "text-emerald-600 font-bold bg-emerald-50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <UserIcon size={18} />
              <span>Profile</span>
            </Link>
          </>
        )}
      </div>
    </>
  );
};
