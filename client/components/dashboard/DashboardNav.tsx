"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { signOutUser, switchUserRole, getCachedUserProfile } from "@/lib/supabase/auth";
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
  Users,
  Lock,
} from "lucide-react";

interface DashboardNavProps {
  user?: UserProfile | null;
  onLoggedOut?: () => void;
  onRoleSwitched?: (role: UserRole) => void;
}

const DashboardNavFallback: React.FC<DashboardNavProps> = () => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <BrandLogo href="/" />
        <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
      </div>
    </header>
  );
};

const DashboardNavContent: React.FC<DashboardNavProps> = ({
  user,
  onLoggedOut,
  onRoleSwitched,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "";

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Synchronously read cached profile to prevent initial render flicker
  const activeUser = user || (typeof window !== "undefined" ? getCachedUserProfile() : null);

  const isStaff = activeUser?.role === UserRole.STAFF || (!activeUser && pathname?.startsWith("/staff"));
  const isOwner =
    !isStaff &&
    ((activeUser?.role === UserRole.OWNER || activeUser?.role === UserRole.ADMIN) ||
      (!activeUser && pathname?.startsWith("/owner")));

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
    // Locked for staff and regular customers
    if (isStaff || activeUser?.role === UserRole.COSTUMER) return;
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

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {isStaff ? (
              // Staff Desktop Links (Scanner only)
              <>
                <Link
                  href="/staff"
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    pathname === "/staff"
                      ? "bg-teal-50 text-teal-700 font-semibold border border-teal-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <ScanLine size={14} className="text-teal-600" />
                    Counter QR Scanner
                  </span>
                </Link>

                <Link
                  href="/dashboard"
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    pathname === "/dashboard"
                      ? "bg-teal-50 text-teal-700 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <UserIcon size={14} className="text-slate-500" />
                    Staff Profile
                  </span>
                </Link>
              </>
            ) : isOwner ? (
              // Owner Desktop Links (Only for Owners/Admins)
              <>
                <Link
                  href="/owner"
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    pathname === "/owner" && (!currentTab || currentTab === "analytics")
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
                  href="/owner?tab=staff"
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    pathname === "/owner" && currentTab === "staff"
                      ? "bg-teal-50 text-teal-700 font-semibold border border-teal-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Users size={14} className="text-teal-600" />
                    Branch Staff
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
            ) : (
              // Customer Desktop Links (Strictly Customer - NO Owner portal links!)
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
                    Map &amp; Shops
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

                {activeUser && (
                  <>
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
                      Profile &amp; Overview
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Right: Profile Avatar Icon with Dropdown Menu (or Sign In / Register for guests) */}
          {!activeUser ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/login?redirect=${encodeURIComponent(pathname || "/customer")}`}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs"
              >
                Register
              </Link>
            </div>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer select-none focus:outline-none"
                aria-label="User menu"
                aria-expanded={dropdownOpen}
              >
                <div className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs shadow-2xs">
                  {activeUser?.full_name ? activeUser.full_name.charAt(0).toUpperCase() : <UserIcon size={14} />}
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform duration-150 ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Profile Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg py-1.5 z-50 animate-fadeIn text-xs">
                  {/* User Details Header */}
                  <div className="px-3.5 py-2.5 border-b border-slate-100">
                    <p className="font-bold text-slate-900 truncate">
                      {activeUser?.full_name || "Valued User"}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {activeUser?.email || "user@labadago.com"}
                    </p>
                    <div className="mt-1.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          isStaff
                            ? "bg-teal-50 text-teal-700 border-teal-200"
                            : isOwner
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        Active: {isStaff ? "Branch Staff" : isOwner ? "Laundry Shop Owner" : "Customer"}
                      </span>
                      {isStaff && activeUser?.assigned_shop_name && (
                        <p className="text-[10px] text-teal-700 font-semibold mt-1 truncate">
                          Branch: {activeUser.assigned_shop_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Navigation Items */}
                  <div className="py-1">
                    {isStaff ? (
                      <Link
                        href="/staff"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium"
                      >
                        <ScanLine size={14} className="text-teal-600" />
                        <span>Counter QR Scanner</span>
                      </Link>
                    ) : isOwner ? (
                      <>
                        <Link
                          href="/owner"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium"
                        >
                          <BarChart3 size={14} className="text-emerald-600" />
                          <span>Business Analytics</span>
                        </Link>
                        <Link
                          href="/owner?tab=scanner"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium"
                        >
                          <ScanLine size={14} className="text-blue-600" />
                          <span>QR Intake & Orders</span>
                        </Link>
                        <Link
                          href="/owner?tab=staff"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium"
                        >
                          <Users size={14} className="text-teal-600" />
                          <span>Branch Staff</span>
                        </Link>
                        <Link
                          href="/owner?tab=setup"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium"
                        >
                          <Settings size={14} className="text-slate-500" />
                          <span>Shop Setup</span>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/customer"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium"
                        >
                          <MapPin size={14} className="text-blue-600" />
                          <span>Customer Map & Shops</span>
                        </Link>
                        <Link
                          href="/customer?tab=qr"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium"
                        >
                          <QrCode size={14} className="text-emerald-600" />
                          <span>Walk-In QR Fast Pass</span>
                        </Link>
                        <Link
                          href="/customer?tab=orders"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium"
                        >
                          <Package size={14} className="text-slate-500" />
                          <span>Order Tracker</span>
                        </Link>
                      </>
                    )}

                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <UserIcon size={14} className="text-slate-400" />
                      <span>Profile & Hub</span>
                    </Link>
                  </div>

                  {/* Role Switcher Action (Locked for staff and regular customers!) */}
                  {isOwner && (
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
                            className="text-blue-600"
                          />
                        )}
                        <span>Switch to Customer Preview</span>
                      </button>
                    </div>
                  )}

                  {isStaff && (
                    <div className="border-t border-slate-100 py-1">
                      <div className="px-3.5 py-2 text-slate-500 bg-slate-50/80 flex items-start gap-2">
                        <Lock size={13} className="text-teal-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-700 block text-[11px]">Staff Role Locked</span>
                          <span className="text-[10px] text-slate-400 leading-tight block">
                            Only your shop owner can remove your staff role.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

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
          )}
        </div>
      </header>

      {/* Mobile Floating Bottom Navigation (Visible on mobile screens) */}
      <div className="lg:hidden fixed bottom-3 sm:bottom-4 inset-x-2 sm:inset-x-4 max-w-md mx-auto z-50 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-900/10 px-1 sm:px-2 py-1.5 flex items-center justify-around">
        {isStaff ? (
          // Staff Mobile Floating Nav (Focused purely on scanning)
          <>
            <Link
              href="/staff"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 sm:px-4 rounded-xl transition-colors ${
                pathname === "/staff"
                  ? "text-teal-700 font-bold bg-teal-50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <ScanLine size={18} />
              <span>Scanner</span>
            </Link>

            <Link
              href="/dashboard"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 sm:px-4 rounded-xl transition-colors ${
                pathname === "/dashboard"
                  ? "text-teal-700 font-bold bg-teal-50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <UserIcon size={18} />
              <span>Profile</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 sm:px-4 rounded-xl text-red-500 hover:text-red-700"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </>
        ) : isOwner ? (
          // Owner Mobile Floating Nav
          <>
            <Link
              href="/owner"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-1.5 sm:px-3 rounded-xl transition-colors ${
                pathname === "/owner" && (!currentTab || currentTab === "analytics")
                  ? "text-emerald-600 font-bold bg-emerald-50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <BarChart3 size={18} />
              <span>Analytics</span>
            </Link>

            <Link
              href="/owner?tab=scanner"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-1.5 sm:px-3 rounded-xl transition-colors ${
                pathname === "/owner" && currentTab === "scanner"
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <ScanLine size={18} />
              <span>QR Intake</span>
            </Link>

            <Link
              href="/owner?tab=staff"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-1.5 sm:px-3 rounded-xl transition-colors ${
                pathname === "/owner" && currentTab === "staff"
                  ? "text-teal-700 font-bold bg-teal-50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Users size={18} />
              <span>Staff</span>
            </Link>

            <Link
              href="/owner?tab=setup"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-1.5 sm:px-3 rounded-xl transition-colors ${
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
              className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-1.5 sm:px-3 rounded-xl transition-colors ${
                pathname === "/dashboard"
                  ? "text-emerald-600 font-bold bg-emerald-50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <UserIcon size={18} />
              <span>Profile</span>
            </Link>
          </>
        ) : (
          // Customer Mobile Floating Nav (Strictly Customer - NO Owner tabs!)
          <>
            <Link
              href="/customer"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-1.5 sm:px-3 rounded-xl transition-colors ${
                pathname === "/customer" && (!currentTab || currentTab === "map")
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <MapPin size={18} />
              <span>Map</span>
            </Link>

            <Link
              href="/customer?tab=qr"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-1.5 sm:px-3 rounded-xl transition-colors ${
                pathname === "/customer" && currentTab === "qr"
                  ? "text-emerald-600 font-bold bg-emerald-50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <QrCode size={18} />
              <span>Fast Pass</span>
            </Link>

            {activeUser ? (
              <>
                <Link
                  href="/customer?tab=orders"
                  className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-1.5 sm:px-3 rounded-xl transition-colors ${
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
                  className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-1.5 sm:px-3 rounded-xl transition-colors ${
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
              <>
                <Link
                  href="/login"
                  className="flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-1.5 sm:px-3 rounded-xl text-slate-600 hover:text-slate-900"
                >
                  <UserIcon size={18} />
                  <span>Sign In</span>
                </Link>

                <Link
                  href="/register"
                  className="flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-1.5 sm:px-3 rounded-xl text-emerald-600 hover:text-emerald-700"
                >
                  <UserIcon size={18} />
                  <span>Register</span>
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};

export const DashboardNav: React.FC<DashboardNavProps> = (props) => {
  return (
    <React.Suspense fallback={<DashboardNavFallback {...props} />}>
      <DashboardNavContent {...props} />
    </React.Suspense>
  );
};
