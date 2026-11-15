"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUserProfile, getCachedUserProfile } from "@/lib/supabase/auth";
import { UserProfile, UserRole } from "@/types/auth";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { PartnerApplicationForm } from "@/components/partner/PartnerApplicationForm";
import {
  Handshake,
  Store,
  QrCode,
  MapPin,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Loader2,
  Users,
} from "lucide-react";
import Link from "next/link";

function PartnerPageContent() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);

  // Sync cached profile on mount to prevent SSR hydration mismatch
  useEffect(() => {
    const cached = getCachedUserProfile();
    if (cached) {
      setUser(cached);
    }
  }, []);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const profile = await getCurrentUserProfile();
        setUser(profile);
      } catch (err) {
        console.error("Failed to load user profile:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col lg:flex-row pb-20 select-none">
      <DashboardNav user={user || undefined} />

      <main className="flex-1 min-w-0 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Hero Section */}
        <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-emerald-700 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
          <div className="max-w-2xl relative z-10 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-white text-xs font-bold border border-white/20">
              <Handshake size={14} className="text-emerald-300" />
              <span>Partner With This Website</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              Grow Your Laundry Business with LabadaGO
            </h1>

            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed font-normal">
              Register your shop to become an official LabadaGO Partner. Once approved by our platform admin, you’ll unlock the full Shop Owner Portal, live QR counter intake, staff management, and turn-by-turn customer navigation.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-blue-100">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-300" />
                Zero setup fees
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-300" />
                Fast admin verification
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-300" />
                Interactive map listing
              </span>
            </div>
          </div>

          <div className="hidden lg:block absolute -right-6 -bottom-6 opacity-20 pointer-events-none">
            <Store size={220} />
          </div>
        </div>

        {/* 3 Step Benefits Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
              1
            </div>
            <h3 className="text-xs font-bold text-slate-900">Submit Shop Details</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Fill in your shop name, coordinates, machines capacity, operating hours, and load rates.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xs">
              2
            </div>
            <h3 className="text-xs font-bold text-slate-900">Admin Approval</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Platform administrator reviews your submission on the Admin Page to verify your shop counter.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">
              3
            </div>
            <h3 className="text-xs font-bold text-slate-900">Go Live as Owner</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Account upgrades to Owner role with access to the scanning suite, revenue analytics, and staff tools.
            </p>
          </div>
        </div>

        {/* Not Signed In Warning for Guests */}
        {!user && !isLoading && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div>
              <strong>Sign in recommended:</strong> You are currently browsing as a guest. Please sign in or register to link your approved shop directly to your profile.
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/login?redirect=/partner"
                className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 font-bold text-amber-800 hover:bg-amber-100"
              >
                Sign In
              </Link>
              <Link
                href="/register?redirect=/partner"
                className="px-3 py-1.5 rounded-lg bg-amber-600 font-bold text-white hover:bg-amber-700"
              >
                Register
              </Link>
            </div>
          </div>
        )}

        {/* Partner Application Form Component */}
        <PartnerApplicationForm user={user} />
      </main>
    </div>
  );
}

export default function PartnerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-xs text-slate-500 font-medium">Loading Partner Portal...</p>
        </div>
      }
    >
      <PartnerPageContent />
    </Suspense>
  );
}
