import React from "react";
import { Button } from "@/components/ui/Button";
import {
  Package,
  Clock,
  CheckCircle2,
  Gift,
  Waves,
  PlusCircle,
  Truck,
} from "lucide-react";

export const EmptyDashboardState: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Top Quick Metrics (Clean shadcn metric cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Active Orders */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Bookings</span>
            <div className="w-8 h-8 rounded-md border border-slate-200 bg-slate-50 text-blue-600 flex items-center justify-center">
              <Package size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">0</span>
            <span className="text-[11px] text-slate-400 font-medium">In Queue</span>
          </div>
        </div>

        {/* In Process */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Washing & Folding</span>
            <div className="w-8 h-8 rounded-md border border-slate-200 bg-slate-50 text-emerald-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">0</span>
            <span className="text-[11px] text-slate-400 font-medium">Machines running</span>
          </div>
        </div>

        {/* Ready for Pickup */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Ready for Delivery</span>
            <div className="w-8 h-8 rounded-md border border-slate-200 bg-slate-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">0</span>
            <span className="text-[11px] text-slate-400 font-medium">Fresh & Clean</span>
          </div>
        </div>

        {/* Rewards */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">LabadaGo Points</span>
            <div className="w-8 h-8 rounded-md border border-slate-200 bg-slate-50 text-emerald-600 flex items-center justify-center">
              <Gift size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">0</span>
            <span className="text-[11px] text-emerald-600 font-medium">+100 on first load</span>
          </div>
        </div>
      </div>

      {/* Main Empty State Card (Clean shadcn style) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-8 sm:p-12 text-center">
        <div className="max-w-md mx-auto flex flex-col items-center">
          {/* shadcn style minimal icon box */}
          <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-50 text-blue-600 flex items-center justify-center mb-4 shadow-2xs">
            <Waves size={24} />
          </div>

          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            No Laundry Bookings Yet
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
            Your laundry dashboard is empty. Book your very first laundry service and let{" "}
            <span className="text-blue-600 font-semibold">Labada</span>
            <span className="text-emerald-500 font-semibold">Go</span> handle the wash, fold, and delivery!
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusCircle size={15} />}
              onClick={() => alert("Booking service integration coming soon!")}
            >
              Book Laundry Service
            </Button>
            <Button
              variant="outline"
              size="md"
              leftIcon={<Truck size={15} />}
              onClick={() => alert("Delivery tracker will appear once you have an order.")}
            >
              Track Deliveries
            </Button>
          </div>
        </div>
      </div>

      {/* 3 Step onboarding guide (Clean cards with subtle borders) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="w-7 h-7 rounded-md border border-blue-200 bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center mb-3">
            1
          </div>
          <h4 className="text-sm font-semibold text-slate-900">Schedule a Pickup</h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Choose your preferred time and tell us your laundry preferences.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="w-7 h-7 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center mb-3">
            2
          </div>
          <h4 className="text-sm font-semibold text-slate-900">Premium Wash & Care</h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Carefully washed, sanitized, dried, and crisply folded with top-tier detergents.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="w-7 h-7 rounded-md border border-blue-200 bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center mb-3">
            3
          </div>
          <h4 className="text-sm font-semibold text-slate-900">Delivered Fresh & Warm</h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Delivered directly back to your doorstep ready to wear.
          </p>
        </div>
      </div>
    </div>
  );
};
