"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Users,
  Shirt,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export const OwnerAnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("week");

  // Weekly sales data
  const revenueData = [
    { day: "Mon", revenue: 5200, orders: 18, height: "65%" },
    { day: "Tue", revenue: 4800, orders: 16, height: "60%" },
    { day: "Wed", revenue: 6400, orders: 22, height: "80%" },
    { day: "Thu", revenue: 5900, orders: 20, height: "72%" },
    { day: "Fri", revenue: 7800, orders: 27, height: "95%" },
    { day: "Sat", revenue: 8200, orders: 29, height: "100%" },
    { day: "Sun", revenue: 7100, orders: 25, height: "88%" },
  ];

  const servicePerformance = [
    { name: "Wash, Dry & Fold", percentage: 54, revenue: "₱24,510", count: 98, color: "bg-blue-600" },
    { name: "Comforter / Bedding", percentage: 26, revenue: "₱11,800", count: 42, color: "bg-emerald-600" },
    { name: "Steam Press & Ironing", percentage: 12, revenue: "₱5,440", count: 22, color: "bg-indigo-600" },
    { name: "Express Priority Wash", percentage: 8, revenue: "₱3,650", count: 14, color: "bg-amber-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Controls & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Business Analytics & Forecasting
          </h2>
          <p className="text-xs text-slate-500">
            Real-time performance reports, sales trends, and operational forecasting.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs shadow-2xs">
          {(["week", "month", "year"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded-md font-medium capitalize cursor-pointer transition-colors ${
                timeRange === r
                  ? "bg-slate-900 text-white font-semibold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              This {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Overview Cards (Clean shadcn style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Revenue</span>
            <div className="w-8 h-8 rounded-md border border-slate-200 bg-slate-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">₱45,400</span>
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center">
              <ArrowUpRight size={12} /> +14.8%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">vs. previous period</p>
        </div>

        {/* Total Orders Completed */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Completed Orders</span>
            <div className="w-8 h-8 rounded-md border border-slate-200 bg-slate-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">176</span>
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center">
              <ArrowUpRight size={12} /> +22 loads
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Avg 25.1 orders / day</p>
        </div>

        {/* Customer Retention */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Customer Retention</span>
            <div className="w-8 h-8 rounded-md border border-slate-200 bg-slate-50 text-indigo-600 flex items-center justify-center">
              <Users size={15} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">76.4%</span>
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center">
              <ArrowUpRight size={12} /> +3.2%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">112 repeat customers</p>
        </div>

        {/* Average Turnaround */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Avg. Turnaround</span>
            <div className="w-8 h-8 rounded-md border border-slate-200 bg-slate-50 text-amber-600 flex items-center justify-center">
              <Clock size={15} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">78 min</span>
            <span className="text-[11px] font-semibold text-emerald-600">Optimal</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Wash, dry & fold cycle</p>
        </div>
      </div>

      {/* Grid: Sales Chart + Service Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales Revenue Trend Chart */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Daily Revenue Performance</h3>
              <p className="text-xs text-slate-500">Sales and order throughput across the week</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              Peak: Sat (₱8,200)
            </span>
          </div>

          {/* CSS/SVG Bar Chart */}
          <div className="pt-4">
            <div className="h-48 flex items-end justify-between gap-3 px-2 border-b border-slate-100 pb-2">
              {revenueData.map((item) => (
                <div key={item.day} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    ₱{item.revenue}
                  </span>
                  <div className="w-full max-w-[36px] bg-slate-100 rounded-t-md relative flex items-end h-40">
                    <div
                      style={{ height: item.height }}
                      className="w-full bg-blue-600 group-hover:bg-emerald-600 rounded-t-md transition-all duration-300"
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">{item.day}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>Monday: 18 loads</span>
              <span>Weekend surge: ~54 loads</span>
            </div>
          </div>
        </div>

        {/* Service Performance Distribution */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Service Breakdown</h3>
            <p className="text-xs text-slate-500">Revenue contribution per laundry service</p>
          </div>

          <div className="space-y-3.5 pt-1">
            {servicePerformance.map((srv) => (
              <div key={srv.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{srv.name}</span>
                  <span className="font-bold text-slate-900">
                    {srv.revenue} <span className="text-slate-400 font-normal">({srv.percentage}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${srv.percentage}%` }}
                    className={`h-full ${srv.color} rounded-full`}
                  />
                </div>
                <p className="text-[11px] text-slate-400 text-right">{srv.count} total loads completed</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Forecasting & Operational Insights */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Sparkles size={16} className="text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Smart Forecasting & Operational Insights
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Insight 1 */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1.5">
            <div className="flex items-center gap-1.5 text-blue-700 font-semibold">
              <Clock size={14} />
              <span>Tomorrow&apos;s Projected Demand</span>
            </div>
            <p className="text-xl font-bold text-slate-900">~26 to 30 Loads</p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Based on historical Wednesday trends and student housing area activity.
            </p>
          </div>

          {/* Insight 2 */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <TrendingUp size={14} />
              <span>Peak Operational Window</span>
            </div>
            <p className="text-xl font-bold text-slate-900">2:00 PM – 6:30 PM</p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Highest walk-in drop-offs occur late afternoon. Recommend 2 staff on duty.
            </p>
          </div>

          {/* Insight 3 */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
              <AlertTriangle size={14} />
              <span>Machine & Inventory Maintenance</span>
            </div>
            <p className="text-xl font-bold text-slate-900">Dryers #3 & #4</p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Reached 60 run cycles. Lint filter inspection and detergent restock recommended.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
