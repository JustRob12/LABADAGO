"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentUserProfile, switchUserRole } from "@/lib/supabase/auth";
import { UserProfile, UserRole } from "@/types/auth";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { Button } from "@/components/ui/Button";
import {
  MapPin,
  QrCode,
  Package,
  BarChart3,
  Settings,
  ScanLine,
  ArrowRight,
  Store,
  User,
  Loader2,
  Sparkles,
} from "lucide-react";

function DashboardContent() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      setIsLoading(true);
      try {
        const profile = await getCurrentUserProfile();
        if (!profile) {
          router.push("/login?redirect=/dashboard&message=" + encodeURIComponent("Please sign in to view your profile and account dashboard."));
          return;
        }
        setUser(profile);
      } catch (err) {
        console.error("Failed to load user profile:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [router]);

  const isOwner = user?.role === UserRole.OWNER;
  const isStaff = user?.role === UserRole.STAFF;

  const handleRoleToggle = async () => {
    if (!user || isStaff) return;
    const nextRole = isOwner ? UserRole.COSTUMER : UserRole.OWNER;
    await switchUserRole(nextRole);
    setUser({ ...user, role: nextRole });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <DashboardNav
        user={user}
        onRoleSwitched={(newRole) => {
          if (user) setUser({ ...user, role: newRole });
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8 space-y-6">
        {isLoading ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-blue-600" size={28} />
            <p className="text-xs text-slate-500">
              Loading <span className="text-blue-600 font-bold">Labada</span>
              <span className="text-emerald-500 font-bold">Go</span> Dashboard...
            </p>
          </div>
        ) : (
          <>
            {/* Quick Mode Switcher Banner */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${
                    isStaff
                      ? "border-teal-200 bg-teal-50 text-teal-600"
                      : isOwner
                      ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                      : "border-blue-200 bg-blue-50 text-blue-600"
                  }`}
                >
                  {isStaff ? <ScanLine size={20} /> : isOwner ? <Store size={20} /> : <User size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900">
                      Active Portal: {isStaff ? "Branch Staff Counter" : isOwner ? "Laundry Shop Owner" : "Customer (Costumer)"}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                        isStaff
                          ? "bg-teal-50 text-teal-700 border-teal-200"
                          : isOwner
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {isStaff ? "Role 3 (Staff)" : `Role ${user?.role}`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isStaff
                      ? user?.assigned_shop_name
                        ? `Assigned Branch: ${user.assigned_shop_name} • Counter Scanning & Dispatch (Role locked by owner)`
                        : "Counter QR Scanning & Laundry Handover (Role locked by owner)"
                      : isOwner
                      ? "You have access to shop management, counter QR scanner, and business analytics."
                      : "You have access to shop map, queue tracking, walk-in QR passes, and order tracker."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!isStaff ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRoleToggle}
                      className="text-xs"
                    >
                      Switch to {isOwner ? "Customer Mode" : "Shop Owner Mode"}
                    </Button>
                    <Link href={isOwner ? "/owner" : "/customer"}>
                      <Button
                        variant={isOwner ? "success" : "primary"}
                        size="sm"
                        rightIcon={<ArrowRight size={14} />}
                        className="text-xs"
                      >
                        Enter {isOwner ? "Owner Portal" : "Customer Portal"}
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link href="/staff">
                    <Button
                      variant="primary"
                      size="sm"
                      rightIcon={<ArrowRight size={14} />}
                      className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold"
                    >
                      Open Staff Scanner
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Quick Access Action Modules Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {isStaff ? (
                // Staff Modules (Scanning, Pickup Handover, Profile)
                <>
                  <Link href="/staff">
                    <div className="bg-white rounded-xl border border-teal-200 p-5 shadow-2xs hover:border-teal-400 hover:shadow-xs transition-all cursor-pointer group">
                      <div className="w-9 h-9 rounded-lg border border-teal-200 bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
                        <ScanLine size={18} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                        Counter Scanner Station
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Automatic QR scanning to receive drop-offs, assign machines, and dispatch completed laundry.
                      </p>
                    </div>
                  </Link>

                  <Link href="/staff">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group">
                      <div className="w-9 h-9 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                        <Package size={18} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        Ready Pickups Queue
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Quick handover list for customers picking up clean laundry and settlement of payments.
                      </p>
                    </div>
                  </Link>

                  <Link href="/profile">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-slate-400 hover:shadow-xs transition-all cursor-pointer group">
                      <div className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 flex items-center justify-center mb-3">
                        <User size={18} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-slate-900 transition-colors">
                        Staff Account Profile
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        View your branch assignment details, account information, and security settings.
                      </p>
                    </div>
                  </Link>
                </>
              ) : !isOwner ? (
                // Customer Modules
                <>
                  <Link href="/customer">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group">
                      <div className="w-9 h-9 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                        <MapPin size={18} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        Interactive Map & Shops
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        View nearby laundry shops on Leaflet map, check queue availability, and get route navigation.
                      </p>
                    </div>
                  </Link>

                  <Link href="/customer?tab=qr">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group">
                      <div className="w-9 h-9 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                        <QrCode size={18} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                        Walk-In Fast Pass (QR)
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Pre-fill services and generate a counter QR code for rapid contactless shop drop-off.
                      </p>
                    </div>
                  </Link>

                  <Link href="/customer?tab=orders">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-slate-400 hover:shadow-xs transition-all cursor-pointer group">
                      <div className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 flex items-center justify-center mb-3">
                        <Package size={18} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-slate-900 transition-colors">
                        Live Order Tracker
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Track progress from wash to delivery and leave service ratings & feedback.
                      </p>
                    </div>
                  </Link>
                </>
              ) : (
                // Owner Modules
                <>
                  <Link href="/owner">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group">
                      <div className="w-9 h-9 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                        <BarChart3 size={18} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                        Business Analytics
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        View revenue trends, customer retention, service performance, and operational forecasts.
                      </p>
                    </div>
                  </Link>

                  <Link href="/owner?tab=scanner">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group">
                      <div className="w-9 h-9 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                        <ScanLine size={18} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        QR Intake & Live Queue
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Verify customer walk-in QR passes, log counter weight, and send SMS status updates.
                      </p>
                    </div>
                  </Link>

                  <Link href="/owner?tab=setup">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-slate-400 hover:shadow-xs transition-all cursor-pointer group">
                      <div className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 flex items-center justify-center mb-3">
                        <Settings size={18} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-slate-900 transition-colors">
                        Shop Setup & Location
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Update map coordinates, machine capacity, operating hours, and service pricing catalog.
                      </p>
                    </div>
                  </Link>
                </>
              )}
            </div>

            {/* Profile Information Card */}
            {user && <UserProfileCard user={user} />}
          </>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
