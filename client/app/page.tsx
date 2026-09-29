"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Button } from "@/components/ui/Button";
import { getCurrentUserProfile } from "@/lib/supabase/auth";
import { UserProfile, UserRole } from "@/types/auth";
import {
  Sparkles,
  Waves,
  ArrowRight,
  ShieldCheck,
  Shirt,
  UserPlus,
  LogIn,
  LayoutDashboard,
  CheckCircle2,
  MapPin,
  QrCode,
  Store,
  Menu,
  X,
  Package,
  ChevronRight,
  Compass,
  Navigation,
  User,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const profile = await getCurrentUserProfile();
        setUser(profile);
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    }
    checkAuth();
  }, []);

  const handleWalkInQR = () => {
    if (user) {
      router.push("/customer?tab=qr");
    } else {
      router.push(
        `/login?redirect=${encodeURIComponent("/customer?tab=qr")}&message=${encodeURIComponent(
          "Please sign in or create an account to generate your Walk-In QR Fast Pass."
        )}`
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="shrink-0">
            <BrandLogo size="md" showSubtitle href="/" />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-2">
            <Link href="/map">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-slate-200 text-slate-700 hover:text-blue-600 shadow-2xs font-semibold"
                leftIcon={<MapPin size={14} className="text-blue-600" />}
              >
                View Map
              </Button>
            </Link>

            <button
              type="button"
              onClick={handleWalkInQR}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-emerald-600 hover:bg-slate-50 border border-slate-200 cursor-pointer transition-colors shadow-2xs"
            >
              <QrCode size={14} className="text-emerald-600" />
              <span>Walk-In QR</span>
            </button>

            <Link href="/owner">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Store size={14} className="text-slate-600" />}
              >
                Owner Portal
              </Button>
            </Link>

            <div className="h-4 w-px bg-slate-200 mx-1" />

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={
                    user.role === UserRole.STAFF
                      ? "/staff"
                      : user.role === UserRole.OWNER
                      ? "/owner"
                      : "/customer"
                  }
                >
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-xs"
                    leftIcon={<LayoutDashboard size={14} />}
                  >
                    Go to Dashboard
                  </Button>
                </Link>
                <div className="w-8 h-8 rounded-full border border-slate-200 bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shadow-2xs">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : <User size={13} />}
                </div>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<LogIn size={14} />}
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    variant="success"
                    size="sm"
                    leftIcon={<UserPlus size={14} />}
                  >
                    Register
                  </Button>
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Header Controls */}
          <div className="flex md:hidden items-center gap-2">
            <Link href="/map">
              <Button
                variant="outline"
                size="sm"
                className="text-xs px-2.5 h-8 border-slate-200 text-blue-600"
                leftIcon={<MapPin size={13} />}
              >
                Map
              </Button>
            </Link>

            {user ? (
              <Link
                href={
                  user.role === UserRole.STAFF
                    ? "/staff"
                    : user.role === UserRole.OWNER
                    ? "/owner"
                    : "/customer"
                }
              >
                <Button
                  variant="primary"
                  size="sm"
                  className="text-xs px-2.5 h-8 bg-blue-600"
                >
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs px-2.5 h-8"
                >
                  Sign In
                </Button>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200 shadow-2xs shrink-0"
              aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white shadow-xl animate-fadeIn">
            <div className="px-4 py-4 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Explore LabadaGo
              </p>

              {/* Navigation Links */}
              <div className="space-y-1">
                <Link
                  href="/map"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-left flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                      <MapPin size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        View Laundry Map (Full Page)
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Explore nearby shops, queue status &amp; shortest routes
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 group-hover:text-blue-600" />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleWalkInQR();
                  }}
                  className="w-full text-left flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                      <QrCode size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                        Walk-In Fast Pass (QR)
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Pre-fill laundry details &amp; generate scannable counter pass
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 group-hover:text-emerald-600" />
                </button>

                <Link
                  href="/customer?tab=orders"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                      <Package size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        Order Progress Tracker
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Live washing, drying, folding &amp; pickup status
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 group-hover:text-indigo-600" />
                </Link>

                <Link
                  href="/owner"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                      <Store size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                        Shop Owner Portal
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Register branch, scan QR counter intake &amp; view analytics
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 group-hover:text-amber-600" />
                </Link>
              </div>

              {/* Action Buttons in Drawer */}
              {!user && (
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="success" size="sm" className="w-full text-xs">
                      Register
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-24 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold mb-5 shadow-2xs">
          <Sparkles size={13} className="text-emerald-600 shrink-0" />
          <span>Smart Laundry Service on the Go</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl leading-[1.2] sm:leading-[1.15]">
          Fresh, Clean Laundry Delivered with{" "}
          <span className="text-blue-600">Labada</span>
          <span className="text-emerald-500 ml-1">Go</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 sm:mt-5 text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl leading-relaxed px-1 sm:px-0">
          Skip the hassle of washing and folding. Locate nearby laundry shops on our whole-page interactive map,
          check real-time washer &amp; dryer queues, get turn-by-turn road routes, and skip the line with counter QR passes.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-8 sm:mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto max-w-sm sm:max-w-none">
          <Link href="/map" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto px-7 text-sm bg-blue-600 hover:bg-blue-700 shadow-md cursor-pointer h-12"
              leftIcon={<MapPin size={17} />}
              rightIcon={<ArrowRight size={17} />}
            >
              View Map
            </Button>
          </Link>

          <Button
            type="button"
            onClick={handleWalkInQR}
            variant="success"
            size="lg"
            className="w-full sm:w-auto px-7 text-sm shadow-md cursor-pointer h-12"
            leftIcon={<QrCode size={17} />}
          >
            Generate Walk-In Fast Pass
          </Button>

          {user ? (
            <Link
              href={
                user.role === UserRole.STAFF
                  ? "/staff"
                  : user.role === UserRole.OWNER
                  ? "/owner"
                  : "/customer"
              }
              className="w-full sm:w-auto"
            >
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto px-6 text-sm h-12"
                leftIcon={<LayoutDashboard size={17} />}
              >
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto px-6 text-sm h-12"
                leftIcon={<LogIn size={17} />}
              >
                Account Sign In
              </Button>
            </Link>
          )}
        </div>

        {/* Dedicated Map Teaser Callout Banner */}
        <div className="mt-12 sm:mt-16 w-full max-w-4xl bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-semibold text-white">
              <Compass size={13} className="text-blue-200" />
              <span>Full-Screen Map Workspace</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Explore Branches &amp; Live Machine Queues
            </h3>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Open the dedicated whole-page map to filter shops by 1–50 km radius, preview photos, and get turn-by-turn road routes with real-time ETA.
            </p>
          </div>

          <Link href="/map" className="shrink-0 w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto bg-white text-blue-700 hover:bg-blue-50 border-white font-bold text-sm shadow-md"
              leftIcon={<MapPin size={16} />}
              rightIcon={<ArrowRight size={16} />}
            >
              View Full Map
            </Button>
          </Link>
        </div>

        {/* How It Works 3-Step Grid */}
        <div className="mt-14 sm:mt-20 w-full text-left">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Quick &amp; Convenient
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              How LabadaGo Works
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              From finding an available machine to pickup in 3 simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs relative">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-black text-sm mb-4">
                1
              </div>
              <h4 className="text-base font-bold text-slate-900">
                1. View Map &amp; Check Queue
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Click <strong>View Map</strong> to open the full-screen map workspace. Filter by distance, check washer/dryer queues, and view road navigation tracks.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-black text-sm mb-4">
                2
              </div>
              <h4 className="text-base font-bold text-slate-900">
                2. Walk-In QR Fast Pass
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Sign in to create your laundry counter pass in seconds. Counter staff scans your QR pass instantly without paper receipt delays.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs relative">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-black text-sm mb-4">
                3
              </div>
              <h4 className="text-base font-bold text-slate-900">
                3. Real-Time Tracking &amp; Pickup
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Track washing, drying, and folding progress right on your phone. Pick up your clean, freshly folded laundry right on schedule.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Highlights Card Grid */}
        <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 w-full text-left">
          {/* Feature 1 */}
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 text-blue-600 flex items-center justify-center mb-4 shrink-0">
              <Shirt size={20} />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Seamless Customer Registration</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              Quick registration with your full name, date of birth, phone number, and gender.
              Automatically assigned to your default customer account.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 bg-slate-50 text-emerald-600 flex items-center justify-center mb-4 shrink-0">
            <Waves size={20} />
          </div>
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 text-emerald-600 flex items-center justify-center mb-4 shrink-0">
              <Navigation size={20} />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Shortest Road Navigation</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              Turn-by-turn road pathing powered by OSRM and CARTO Voyager tiles with animated pulse tracks and distance ETA badges.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 text-blue-600 flex items-center justify-center mb-4 shrink-0">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Supabase Secured &amp; Scalable</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              Integrated with Supabase Auth, Row Level Security (RLS), and automated role
              triggers (Admin = 0, Owner = 1, Customer = 2, Staff = 3).
            </p>
          </div>
        </div>

        {/* Roles Reference Box */}
        <div className="mt-6 sm:mt-8 w-full bg-white border border-slate-200 rounded-xl p-4 sm:p-6 text-left shadow-2xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-4 border-b border-slate-100">
            <div>
              <h4 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                LabadaGo Role System Configuration
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Configured with automatic customer assignment on registration and branch staff delegation.
              </p>
            </div>
            <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200 shrink-0">
              Auto-Role: Customer (2)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-4 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="font-semibold text-indigo-700">Role 0 : Admin</div>
              <div className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                Full administrative access and platform management.
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="font-semibold text-amber-700">Role 1 : Owner</div>
              <div className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                Laundromat branch owner, staff management, and analytics.
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="font-semibold text-emerald-700">Role 2 : Customer</div>
              <div className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                Default assigned role for all newly registered members.
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="font-semibold text-teal-700">Role 3 : Staff</div>
              <div className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                Counter scanner and machine dispatch for assigned branches.
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" />
            <span className="text-slate-400">| Laundry On The Go</span>
          </div>
          <p>© {new Date().getFullYear()} LabadaGo. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
