"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Button } from "@/components/ui/Button";
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
} from "lucide-react";

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo with responsive sizing */}
          <div className="shrink-0">
            <BrandLogo size="md" showSubtitle href="/" />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-2">
            <Link href="/customer">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<MapPin size={14} className="text-blue-600" />}
              >
                Explore Map
              </Button>
            </Link>
            <Link href="/customer?tab=qr">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<QrCode size={14} className="text-emerald-600" />}
              >
                Walk-In QR
              </Button>
            </Link>
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
          </nav>

          {/* Mobile Header Controls */}
          <div className="flex md:hidden items-center gap-2">
            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                className="text-xs px-2.5 h-8"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button
                variant="success"
                size="sm"
                className="text-xs px-2.5 h-8"
              >
                Register
              </Button>
            </Link>

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
                  href="/customer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                      <MapPin size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        Interactive Laundry Map
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Find nearby shops, machine queue status &amp; routes
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 group-hover:text-blue-600" />
                </Link>

                <Link
                  href="/customer?tab=qr"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
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
                </Link>

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
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 md:py-24 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium mb-5 shadow-2xs">
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
        <p className="mt-3.5 sm:mt-5 text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl leading-relaxed px-1 sm:px-0">
          Skip the hassle of washing and folding. Locate nearby laundry shops on the interactive map,
          generate walk-in fast passes, and track orders in real time.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 w-full sm:w-auto max-w-sm sm:max-w-none">
          <Link href="/customer" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto px-6 text-sm bg-blue-600 hover:bg-blue-700"
              leftIcon={<MapPin size={16} />}
              rightIcon={<ArrowRight size={16} />}
            >
              Explore Laundry Map &amp; Shops
            </Button>
          </Link>

          <Link href="/customer?tab=qr" className="w-full sm:w-auto">
            <Button
              variant="success"
              size="lg"
              className="w-full sm:w-auto px-6 text-sm"
              leftIcon={<QrCode size={16} />}
            >
              Walk-In Fast Pass
            </Button>
          </Link>

          <Link href="/login" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-5 text-sm"
              leftIcon={<LayoutDashboard size={16} />}
            >
              Account Login
            </Button>
          </Link>
        </div>

        {/* Feature Highlights Card Grid */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 w-full text-left">
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
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 text-emerald-600 flex items-center justify-center mb-4 shrink-0">
              <Waves size={20} />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Labada (Blue) &amp; Go (Green)</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              Designed with high-clarity Blue and Green color aesthetics, modern typography,
              and clean white surfaces for a crisp user experience.
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
              triggers (Admin = 0, Owner = 1, Costumer = 2).
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
                Configured with automatic customer assignment on registration.
              </p>
            </div>
            <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200 shrink-0">
              Auto-Role: Costumer (2)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="font-semibold text-indigo-700">Role 0 : Admin</div>
              <div className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                Full administrative access and platform management.
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="font-semibold text-amber-700">Role 1 : Owner</div>
              <div className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                Laundromat branch owner and store operator controls.
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="font-semibold text-emerald-700">Role 2 : Costumer</div>
              <div className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                Default assigned role for all newly registered members.
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
