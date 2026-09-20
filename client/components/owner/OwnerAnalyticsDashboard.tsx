"use client";

import React, { useState } from "react";
import { LaundryTransaction } from "@/types/auth";
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
  BarChart3,
  Store,
} from "lucide-react";

interface OwnerAnalyticsDashboardProps {
  transactions?: LaundryTransaction[];
}

export const OwnerAnalyticsDashboard: React.FC<OwnerAnalyticsDashboardProps> = ({
  transactions = [],
}) => {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("week");

  // Calculate actual revenue from real transactions
  const totalRevenue = transactions.reduce((sum, tx) => {
    if (tx.payment_status === "Paid" || tx.status === "Completed") {
      return sum + (Number(tx.total_amount) || 0);
    }
    return sum;
  }, 0);

  const completedOrders = transactions.filter(
    (tx) => tx.status === "Completed" || tx.status === "Ready"
  ).length;

  const activeOrders = transactions.filter(
    (tx) => tx.status !== "Completed" && tx.status !== "Cancelled"
  ).length;

  // Unique customer count
  const uniqueCustomers = new Set(
    transactions.map((tx) => tx.customer_phone || tx.customer_name).filter(Boolean)
  ).size;

  const hasData = transactions.length > 0;

  return (
    <div className="space-y-6">
      {/* Top Controls & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Business Analytics & Performance
          </h2>
          <p className="text-xs text-slate-500">
            Real-time shop sales, queue throughput, and customer volume.
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

      {/* KPI Overview Cards */}
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
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              ₱{totalRevenue.toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {hasData ? `${transactions.length} total orders logged` : "No paid orders yet"}
          </p>
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
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {completedOrders}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {activeOrders > 0 ? `${activeOrders} orders in progress` : "No orders in queue"}
          </p>
        </div>

        {/* Unique Customers */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Customers Served</span>
            <div className="w-8 h-8 rounded-md border border-slate-200 bg-slate-50 text-indigo-600 flex items-center justify-center">
              <Users size={15} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {uniqueCustomers}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {uniqueCustomers > 0 ? "Walk-in & registered users" : "Awaiting first customer"}
          </p>
        </div>

        {/* Active Machines / Turnaround */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Queue Status</span>
            <div className="w-8 h-8 rounded-md border border-slate-200 bg-slate-50 text-amber-600 flex items-center justify-center">
              <Clock size={15} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {activeOrders > 5 ? "Busy" : activeOrders > 0 ? "Moderate" : "Available"}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {activeOrders > 0 ? `${activeOrders} loads currently washing/drying` : "Machines ready for walk-in"}
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <BarChart3 size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">No Sales Data Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              Sales trends, daily throughput charts, and operational insights will populate here automatically as customers generate QR fast passes and drop off laundry loads.
            </p>
          </div>
        </div>
      ) : (
        /* Real Orders Activity Table when transactions exist */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Service Activity</h3>
              <p className="text-xs text-slate-500">Latest completed and in-progress laundry loads</p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
              {transactions.length} Total Logs
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-900">{tx.service_name} • {tx.weight_kg} kg</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{tx.tracking_number} • {tx.customer_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">₱{tx.total_amount.toFixed(2)}</p>
                  <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
