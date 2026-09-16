import React from "react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { ShieldCheck, Sparkles, Waves } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
}) => {
  return (
    <div className="min-h-screen relative flex flex-col justify-between bg-slate-50/60 selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <BrandLogo size="md" showSubtitle />

        <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white px-3 py-1 rounded-md border border-slate-200 shadow-xs">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Secure Laundry Platform</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Card Container (Clean shadcn style: no top border colors) */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 sm:p-8">
            {/* Header text with shadcn-style icon container */}
            <div className="mb-6 text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 text-blue-600 flex items-center justify-center mb-3 shadow-xs">
                <Waves size={20} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                {subtitle}
              </p>
            </div>

            {/* Form Content */}
            {children}
          </div>

          {/* Micro trust info below card */}
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-500 text-center">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={13} className="text-blue-600" /> Fast & Reliable
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-600" /> Supabase Protected
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} LabadaGo Laundry Systems. All rights reserved.</p>
      </footer>
    </div>
  );
};
