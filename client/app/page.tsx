import React from "react";
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
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <BrandLogo size="md" showSubtitle href="/" />

          <div className="flex items-center gap-2.5">
            <Link href="/customer">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<MapPin size={14} className="text-blue-600" />}
                className="hidden sm:inline-flex"
              >
                Explore Map
              </Button>
            </Link>
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
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium mb-6 shadow-2xs">
          <Sparkles size={13} className="text-emerald-600" />
          <span>Smart Laundry Service on the Go</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl leading-[1.15]">
          Fresh, Clean Laundry Delivered with{" "}
          <span className="text-blue-600">Labada</span>
          <span className="text-emerald-500 ml-1">Go</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
          Skip the hassle of washing and folding. Locate nearby laundry shops on the interactive map,
          generate walk-in fast passes, and track orders in real time.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link href="/customer" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto px-6 text-sm bg-blue-600 hover:bg-blue-700"
              leftIcon={<MapPin size={16} />}
              rightIcon={<ArrowRight size={16} />}
            >
              Explore Laundry Map & Shops
            </Button>
          </Link>

          <Link href="/register" className="w-full sm:w-auto">
            <Button
              variant="success"
              size="lg"
              className="w-full sm:w-auto px-6 text-sm"
              leftIcon={<UserPlus size={16} />}
            >
              Get Started (Register)
            </Button>
          </Link>

          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-5 text-sm"
              leftIcon={<LayoutDashboard size={16} />}
            >
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Feature Highlights Card Grid (Clean shadcn style) */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-5 w-full text-left">
          {/* Feature 1 */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 text-blue-600 flex items-center justify-center mb-4">
              <Shirt size={20} />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Seamless Customer Registration</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              Quick registration with your full name, date of birth, phone number, and gender.
              Automatically assigned to your default customer account.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 text-emerald-600 flex items-center justify-center mb-4">
              <Waves size={20} />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Labada (Blue) & Go (Green)</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              Designed with high-clarity Blue and Green color aesthetics, modern typography,
              and clean white surfaces for a crisp user experience.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 text-blue-600 flex items-center justify-center mb-4">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Supabase Secured & Scalable</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              Integrated with Supabase Auth, Row Level Security (RLS), and automated role
              triggers (Admin = 0, Owner = 1, Costumer = 2).
            </p>
          </div>
        </div>

        {/* Roles Reference Box (Clean shadcn style) */}
        <div className="mt-8 w-full bg-white border border-slate-200 rounded-xl p-6 text-left shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h4 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                LabadaGo Role System Configuration
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Configured with automatic customer assignment on registration.
              </p>
            </div>
            <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200">
              Auto-Role: Costumer (2)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 text-xs">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
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
