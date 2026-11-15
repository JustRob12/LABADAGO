"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCurrentUserProfile,
  getCachedUserProfile,
  getLaundryShops,
  getPlatformUsers,
  getPartnerApplications,
} from "@/lib/supabase/auth";
import { UserProfile, UserRole, LaundryShop, PartnerApplication } from "@/types/auth";
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
  Handshake,
  ShieldCheck,
  Users,
  FileText,
} from "lucide-react";

function DashboardContent() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [shops, setShops] = useState<LaundryShop[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [adminApps, setAdminApps] = useState<PartnerApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync cached profile on mount to prevent SSR hydration mismatch
  useEffect(() => {
    const cached = getCachedUserProfile();
    if (cached) {
      setUser(cached);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function loadUser() {
      try {
        const profile = await getCurrentUserProfile();
        if (!profile) {
          router.push("/login?redirect=/dashboard&message=" + encodeURIComponent("Please sign in to view your profile and account dashboard."));
          return;
        }
        setUser(profile);

        if (profile.role === UserRole.OWNER) {
          const ownerShops = await getLaundryShops(profile.id);
          setShops(ownerShops);
        } else if (profile.role === UserRole.ADMIN) {
          const [allShops, allUsers, allApps] = await Promise.all([
            getLaundryShops(),
            getPlatformUsers(),
            getPartnerApplications(),
          ]);
          setShops(allShops);
          setAdminUsers(allUsers);
          setAdminApps(allApps);
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [router]);

  const isAdmin = user?.role === UserRole.ADMIN;
  const isOwner = user?.role === UserRole.OWNER;
  const isStaff = user?.role === UserRole.STAFF;

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col lg:flex-row">
      <DashboardNav
        user={user}
        onRoleSwitched={(newRole) => {
          if (user) setUser({ ...user, role: newRole });
        }}
      />

      <main className="flex-1 min-w-0 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8 space-y-6">
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
                  className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${isAdmin
                    ? "border-indigo-200 bg-indigo-50 text-indigo-600"
                    : isStaff
                      ? "border-teal-200 bg-teal-50 text-teal-600"
                      : isOwner
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : "border-blue-200 bg-blue-50 text-blue-600"
                    }`}
                >
                  {isAdmin ? (
                    <ShieldCheck size={20} />
                  ) : isStaff ? (
                    <ScanLine size={20} />
                  ) : isOwner ? (
                    <Store size={20} />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900">
                      {isOwner
                        ? "Owner Profile"
                        : isAdmin
                          ? "Active Portal: Platform Super Admin"
                          : isStaff
                            ? "Active Portal: Branch Staff Counter"
                            : "Active Portal: Customer"}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${isAdmin
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : isStaff
                          ? "bg-teal-50 text-teal-700 border-teal-200"
                          : isOwner
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                    >
                      {isAdmin
                        ? "Role 0 (Admin)"
                        : isStaff
                          ? "Role 3 (Staff)"
                          : isOwner
                            ? "Role 1 (Owner)"
                            : "Role 2 (Customer)"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isAdmin
                      ? "Platform administrator view: review partner applications, manage shops, inspect shop owners & customers, and view platform map."
                      : isStaff
                        ? user?.assigned_shop_name
                          ? `Assigned Branch: ${user.assigned_shop_name} • Counter Scanning & Dispatch (Role locked by owner)`
                          : "Counter QR Scanning & Laundry Handover (Role locked by owner)"
                        : isOwner
                          ? "Your registered shop owner profile information and credentials."
                          : "You have access to shop map, queue tracking, walk-in QR passes, and order tracker."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {isAdmin ? (
                  <>
                    <Link href="/admin?tab=applications">
                      <Button
                        variant="primary"
                        size="sm"
                        rightIcon={<ArrowRight size={14} />}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                      >
                        Partner Applications
                      </Button>
                    </Link>
                    <Link href="/admin?tab=shops">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                      >
                        Shops View
                      </Button>
                    </Link>
                  </>
                ) : isStaff ? (
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
                ) : isOwner ? (
                  <Link href="/owner">
                    <Button
                      variant="success"
                      size="sm"
                      rightIcon={<ArrowRight size={14} />}
                      className="text-xs font-bold"
                    >
                      Go to Owner Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/partner">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold text-emerald-800 border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                      >
                        Partner with this website
                      </Button>
                    </Link>
                    <Link href="/customer">
                      <Button
                        variant="primary"
                        size="sm"
                        rightIcon={<ArrowRight size={14} />}
                        className="text-xs"
                      >
                        Enter Customer Portal
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {isAdmin ? (
              /* Admin Hub: Clean Overview & Quick Access to Shops, Owners, Customers, Map, and Applications */
              <div className="space-y-6">
                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-medium">Platform Shops</span>
                      <Store size={16} className="text-indigo-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{shops.length}</p>
                    <p className="text-[11px] text-slate-400">Registered locations</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-medium">Shop Owners</span>
                      <Users size={16} className="text-amber-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {adminUsers.filter((u) => u.role === UserRole.OWNER).length}
                    </p>
                    <p className="text-[11px] text-slate-400">Active owners</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-medium">Customers</span>
                      <User size={16} className="text-emerald-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {adminUsers.filter((u) => u.role === UserRole.COSTUMER).length}
                    </p>
                    <p className="text-[11px] text-slate-400">Registered users</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-medium">Partner Requests</span>
                      <FileText size={16} className="text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {adminApps.filter((a) => a.status === "pending").length}
                    </p>
                    <p className="text-[11px] text-slate-400">Pending review</p>
                  </div>
                </div>

                {/* Quick Navigation Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Link href="/admin?tab=shops">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer group">
                      <div className="w-10 h-10 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                        <Store size={20} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center justify-between">
                        <span>Shops View</span>
                        <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600" />
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Inspect all registered laundry shops, operating hours, machine counts, and service offerings.
                      </p>
                    </div>
                  </Link>

                  <Link href="/admin?tab=owners">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer group">
                      <div className="w-10 h-10 rounded-xl border border-amber-200 bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                        <Users size={20} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors flex items-center justify-between">
                        <span>Shop Owners</span>
                        <ArrowRight size={14} className="text-slate-400 group-hover:text-amber-600" />
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        View directory of all platform shop owners, their contact details, and assigned laundry branches.
                      </p>
                    </div>
                  </Link>

                  <Link href="/admin?tab=customers">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group">
                      <div className="w-10 h-10 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                        <User size={20} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors flex items-center justify-between">
                        <span>Customers Directory</span>
                        <ArrowRight size={14} className="text-slate-400 group-hover:text-emerald-600" />
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Browse registered customer accounts, registration dates, gender, and contact phone numbers.
                      </p>
                    </div>
                  </Link>

                  <Link href="/admin?tab=map">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group">
                      <div className="w-10 h-10 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                        <MapPin size={20} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center justify-between">
                        <span>Platform Map</span>
                        <ArrowRight size={14} className="text-slate-400 group-hover:text-blue-600" />
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Interactive CARTO map displaying the geographic coverage of all partner laundry shops.
                      </p>
                    </div>
                  </Link>

                  <Link href="/admin?tab=applications">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer group">
                      <div className="w-10 h-10 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                        <FileText size={20} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center justify-between">
                        <span>Partner Applications</span>
                        <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600" />
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Review pending applications, inspect business details, and approve new laundry partners.
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
            ) : isOwner ? (
              /* Owner Profile: display profile only of the owner */
              null
            ) : (
              /* Non-Owner Quick Access Action Modules Grid */
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
                ) : (
                  // Customer Modules
                  <>
                    <Link href="/customer">
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group">
                        <div className="w-9 h-9 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                          <Store size={18} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          Browse Nearby Laundry Shops
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Find top-rated laundry shops, explore services and pricing, and get turn-by-turn route navigation.
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

                    <Link href="/partner">
                      <div className="bg-white rounded-xl border border-emerald-200 p-5 shadow-2xs hover:border-emerald-500 hover:shadow-xs transition-all cursor-pointer group bg-gradient-to-br from-white to-emerald-50/30">
                        <div className="w-9 h-9 rounded-lg border border-emerald-300 bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                          <Handshake size={18} />
                        </div>
                        <h4 className="text-sm font-bold text-emerald-900 group-hover:text-emerald-700 transition-colors">
                          Partner with this website
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          Own a laundry shop? Apply to partner with LabadaGO to receive contactless drop-offs and live queues.
                        </p>
                      </div>
                    </Link>
                  </>
                )}
              </div>
            )}

            {/* Profile Information Card */}
            {user && <UserProfileCard user={user} shops={shops} />}
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
