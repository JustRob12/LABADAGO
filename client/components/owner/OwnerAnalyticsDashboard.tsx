"use client";

import React, { useState, useEffect, useMemo } from "react";
import { LaundryTransaction, LaundryShop, UserProfile, BranchStaffMember } from "@/types/auth";
import { getBranchStaff } from "@/lib/supabase/auth";
import {
  ShoppingCart,
  CheckCircle2,
  Users,
  Wallet,
  UserPlus,
  TrendingUp,
  Clock,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Calendar,
  Tag,
  Receipt,
  ArrowRight,
  UserCheck,
  RotateCcw,
  BarChart3,
  Layers,
  Compass,
  X,
  Search,
  Check,
  FileText,
  Loader2,
} from "lucide-react";

interface OwnerAnalyticsDashboardProps {
  transactions?: LaundryTransaction[];
  shop?: LaundryShop | null;
  shops?: LaundryShop[];
  user?: UserProfile | null;
  onNavigateTab?: (tab: "analytics" | "scanner" | "setup" | "staff") => void;
}

export const OwnerAnalyticsDashboard: React.FC<OwnerAnalyticsDashboardProps> = ({
  transactions = [],
  shop = null,
  shops = [],
  user = null,
  onNavigateTab,
}) => {
  // Date and Range controls
  const today = new Date();
  const todayLabel = today.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("Today (Live)");
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [trendRange, setTrendRange] = useState<"7d" | "14d" | "30d">("7d");

  // Modals for Quick Access
  const [activeModal, setActiveModal] = useState<"reports" | "customerRecords" | "activityDetail" | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");

  // Staff state — loaded from DB
  const [staffList, setStaffList] = useState<BranchStaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  useEffect(() => {
    if (!shop?.id) return;
    setStaffLoading(true);
    getBranchStaff(shop.id)
      .then(setStaffList)
      .catch((err) => console.error("Failed to load staff:", err))
      .finally(() => setStaffLoading(false));
  }, [shop?.id]);

  // ── Date filtering helper ────────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (selectedDateFilter === "Today (Live)") {
      const start = startOf(now);
      return transactions.filter((tx) => new Date(tx.created_at) >= start);
    }
    if (selectedDateFilter === "Yesterday") {
      const start = startOf(now);
      start.setDate(start.getDate() - 1);
      const end = startOf(now);
      return transactions.filter((tx) => {
        const d = new Date(tx.created_at);
        return d >= start && d < end;
      });
    }
    if (selectedDateFilter === "Last 7 Days") {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return transactions.filter((tx) => new Date(tx.created_at) >= start);
    }
    if (selectedDateFilter === "Last 14 Days") {
      const start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      return transactions.filter((tx) => new Date(tx.created_at) >= start);
    }
    if (selectedDateFilter === "This Month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return transactions.filter((tx) => new Date(tx.created_at) >= start);
    }
    return transactions;
  }, [transactions, selectedDateFilter]);

  // ── KPI Metrics (all from real data) ────────────────────────────────────────
  const totalTransactionsCount = filteredTransactions.length;
  const completedTransactionsCount = filteredTransactions.filter(
    (tx) => tx.status === "Completed"
  ).length;
  const completionRate =
    totalTransactionsCount > 0
      ? Math.round((completedTransactionsCount / totalTransactionsCount) * 100)
      : 0;

  const activeCustomersCount = useMemo(() => {
    return new Set(
      filteredTransactions
        .map((tx) => tx.customer_phone || tx.customer_name)
        .filter(Boolean)
    ).size;
  }, [filteredTransactions]);

  const estimatedRevenue = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) => {
      if (tx.payment_status === "Paid" || tx.status === "Completed") {
        return sum + (Number(tx.total_amount) || 0);
      }
      return sum;
    }, 0);
  }, [filteredTransactions]);

  const totalStaffCount = staffList.length;
  const activeStaffCount = staffList.filter((s) => s.status === "Active").length;
  const onLeaveStaffCount = staffList.filter((s) => s.status === "On Leave").length;

  // ── Operational Overview (from real transactions) ────────────────────────────
  const processingCount = filteredTransactions.filter(
    (tx) => tx.status === "Washing" || tx.status === "Processing"
  ).length;
  const readyPickupCount = filteredTransactions.filter(
    (tx) => tx.status === "Ready"
  ).length;
  const completedTodayCount = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return transactions.filter(
      (tx) => tx.status === "Completed" && new Date(tx.created_at) >= start
    ).length;
  }, [transactions]);
  const pendingTransactionsCount = filteredTransactions.filter(
    (tx) => tx.status === "Pending"
  ).length;

  // ── Transaction Trend Chart (grouped by day) ─────────────────────────────────
  const trendData = useMemo(() => {
    const now = new Date();
    const days = trendRange === "7d" ? 7 : trendRange === "14d" ? 14 : 30;
    const buckets: { label: string; value: number }[] = [];

    if (trendRange === "30d") {
      // Weekly buckets
      for (let w = 3; w >= 0; w--) {
        const start = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
        const end = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
        const count = transactions.filter((tx) => {
          const d = new Date(tx.created_at);
          return d >= start && d < end;
        }).length;
        buckets.push({ label: `Wk ${4 - w}`, value: count });
      }
    } else {
      // Daily buckets
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        const count = transactions.filter((tx) => {
          const d = new Date(tx.created_at);
          return d >= start && d < end;
        }).length;
        buckets.push({ label: dayNames[date.getDay()], value: count });
      }
      // Show only last 7 day labels when 14d
      if (trendRange === "14d") {
        return buckets.filter((_, idx) => idx % 2 === 0);
      }
    }
    return buckets;
  }, [transactions, trendRange]);

  const maxTrendVal = Math.max(...trendData.map((d) => d.value), 1);
  const chartPoints = trendData.map((pt, idx) => {
    const x = 70 + idx * ((490 - 70) / Math.max(1, trendData.length - 1));
    const y = 185 - (pt.value / maxTrendVal) * 155;
    return { ...pt, x, y };
  });
  const linePathD = chartPoints.reduce(
    (acc, pt, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`,
    ""
  );
  const areaPathD = `${linePathD} L ${chartPoints[chartPoints.length - 1]?.x || 490} 185 L ${
    chartPoints[0]?.x || 70
  } 185 Z`;

  // ── Most Availed Services (from real transactions) ───────────────────────────
  const serviceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach((tx) => {
      const name = tx.service_name || "Other";
      counts[name] = (counts[name] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count], idx) => ({
        name,
        count,
        percent: Math.round((count / total) * 100),
        color: ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6"][idx],
        dotClass: ["bg-blue-600", "bg-emerald-500", "bg-amber-500", "bg-purple-500"][idx],
      }));
  }, [transactions]);

  // ── Customer Insights (from real transactions) ───────────────────────────────
  const customerInsights = useMemo(() => {
    const allPhones = new Set(
      transactions.map((tx) => tx.customer_phone).filter(Boolean)
    );
    const registered = allPhones.size;

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const newThisMonth = new Set(
      transactions
        .filter((tx) => new Date(tx.created_at) >= monthStart)
        .map((tx) => tx.customer_phone)
        .filter(Boolean)
    ).size;

    // Returning = appeared more than once
    const phoneCounts: Record<string, number> = {};
    transactions.forEach((tx) => {
      if (tx.customer_phone) {
        phoneCounts[tx.customer_phone] = (phoneCounts[tx.customer_phone] || 0) + 1;
      }
    });
    const returning = Object.values(phoneCounts).filter((c) => c > 1).length;

    const unregistered = transactions.filter(
      (tx) => !tx.customer_phone && tx.customer_name
    ).length;

    return { registered, newThisMonth, returning, unregistered };
  }, [transactions]);

  // ── Recent Activity (from real transactions) ─────────────────────────────────
  const recentActivities = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((tx) => {
        const time = new Date(tx.created_at).toLocaleTimeString("en-PH", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const isCompleted = tx.status === "Completed";
        const isPending = tx.status === "Pending";
        return {
          id: tx.id,
          time,
          title: `Transaction ${tx.tracking_number || tx.id.slice(0, 8)} — ${tx.status}`,
          subtitle: tx.customer_name ? `Customer: ${tx.customer_name}` : "Walk-in guest",
          type: isCompleted ? "success" : isPending ? "pending" : "order",
          icon: isCompleted ? (
            <CheckCircle2 size={16} className="text-emerald-600" />
          ) : isPending ? (
            <Clock size={16} className="text-amber-600" />
          ) : (
            <Receipt size={16} className="text-blue-600" />
          ),
          bg: isCompleted
            ? "bg-emerald-50 border-emerald-200"
            : isPending
            ? "bg-amber-50 border-amber-200"
            : "bg-blue-50 border-blue-200",
          rawTx: tx,
        };
      });
  }, [transactions]);

  // ── Customer Records for modal ───────────────────────────────────────────────
  const customerRecords = useMemo(() => {
    const map: Record<
      string,
      { name: string; phone: string; orders: number; spent: number; type: string }
    > = {};
    transactions.forEach((tx) => {
      const key = tx.customer_phone || tx.customer_name || "unknown";
      if (!map[key]) {
        map[key] = {
          name: tx.customer_name || "Walk-in Guest",
          phone: tx.customer_phone || "—",
          orders: 0,
          spent: 0,
          type: tx.customer_phone ? "Registered" : "Unregistered",
        };
      }
      map[key].orders += 1;
      map[key].spent += Number(tx.total_amount) || 0;
    });
    return Object.values(map).sort((a, b) => b.orders - a.orders);
  }, [transactions]);

  const filteredCustomerRecords = useMemo(() => {
    if (!customerSearch.trim()) return customerRecords;
    const q = customerSearch.toLowerCase();
    return customerRecords.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
    );
  }, [customerRecords, customerSearch]);

  // ── Display Name ─────────────────────────────────────────────────────────────
  const ownerDisplayName = user?.full_name ? user.full_name.split(" ")[0] : "Owner";

  return (
    <div className="space-y-6">
      {/* ============================================================
          TOP HEADER
          ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Good morning, {ownerDisplayName}! 👋
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {shop ? (
              <>Shop: <span className="font-semibold text-slate-700">{shop.name}</span></>
            ) : (
              "Here's your shop overview."
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {/* Date Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-2xs cursor-pointer transition-colors"
            >
              <Calendar size={13} className="text-slate-400" />
              <span>{selectedDateFilter}</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>
            {isDateDropdownOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 text-xs">
                {["Today (Live)", "Yesterday", "Last 7 Days", "Last 14 Days", "This Month", "All Time"].map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setSelectedDateFilter(item);
                        setIsDateDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between ${
                        selectedDateFilter === item
                          ? "font-semibold text-blue-600 bg-blue-50/50"
                          : "text-slate-700"
                      }`}
                    >
                      <span>{item}</span>
                      {selectedDateFilter === item && <Check size={13} className="text-blue-600" />}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              <Users size={15} />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight">
                {user?.full_name || "Owner"}
              </p>
              <p className="text-[11px] text-slate-400 font-medium">Shop Owner</p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          ROW 1: 5 KPI TILES
          ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Metric 1 */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="w-9 h-9 rounded-lg border border-blue-100 bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShoppingCart size={18} />
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500">Total Transactions</p>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              {totalTransactionsCount}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-1">{selectedDateFilter}</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="w-9 h-9 rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={18} />
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500">Completed</p>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              {completedTransactionsCount}
            </p>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              {completionRate}% completion rate
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="w-9 h-9 rounded-lg border border-purple-100 bg-purple-50 text-purple-600 flex items-center justify-center">
            <Users size={18} />
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500">Unique Customers</p>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              {activeCustomersCount}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-1">{selectedDateFilter}</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="w-9 h-9 rounded-lg border border-amber-100 bg-amber-50 text-amber-600 flex items-center justify-center">
            <Wallet size={18} />
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500">Revenue (Paid)</p>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              ₱{estimatedRevenue.toLocaleString()}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-1">{selectedDateFilter}</p>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow col-span-2 sm:col-span-1">
          <div className="w-9 h-9 rounded-lg border border-blue-100 bg-blue-50 text-blue-600 flex items-center justify-center">
            <UserPlus size={18} />
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500">Total Staff</p>
            {staffLoading ? (
              <Loader2 size={20} className="animate-spin text-blue-400 mt-2" />
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
                  {totalStaffCount}
                </p>
                <p className="text-[11px] font-medium text-slate-500 mt-1">
                  Active: {activeStaffCount}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          ROW 2: Line Chart + Service Breakdown + Operational Overview
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Widget 1: Transaction Trends */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">Transaction Trends</h3>
            </div>
            <select
              value={trendRange}
              onChange={(e) => setTrendRange(e.target.value as any)}
              className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600 font-medium cursor-pointer focus:outline-none focus:border-blue-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="14d">Last 14 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          {transactions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 py-8">
              <TrendingUp size={28} className="opacity-30" />
              <p className="text-xs">No transaction data yet</p>
            </div>
          ) : (
            <div className="w-full h-52 sm:h-56 relative">
              <svg viewBox="0 0 540 220" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {[0, 25, 50, 75, 100].map((pct) => {
                  const val = Math.round((pct / 100) * maxTrendVal);
                  const y = 185 - (pct / 100) * 155;
                  return (
                    <g key={pct}>
                      <text x="35" y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-medium">
                        {val}
                      </text>
                      <line x1="45" y1={y} x2="520" y2={y} stroke="#F1F5F9" strokeWidth="1" strokeDasharray={pct === 0 ? "none" : "3 3"} />
                    </g>
                  );
                })}

                <path d={areaPathD} fill="url(#trendGradient)" />
                <path d={linePathD} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {chartPoints.map((pt) => (
                  <g key={pt.label} className="group cursor-pointer">
                    <circle cx={pt.x} cy={pt.y} r="4.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" className="transition-transform group-hover:scale-125" />
                    <text x={pt.x} y={pt.y - 10} textAnchor="middle" className="text-[10px] font-bold fill-slate-700">
                      {pt.value}
                    </text>
                    <text x={pt.x} y="205" textAnchor="middle" className="text-[11px] font-medium fill-slate-500">
                      {pt.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 bg-blue-600 rotate-45 inline-block"></span>
            <span className="font-medium text-slate-600">Transactions</span>
          </div>
        </div>

        {/* Widget 2: Most Availed Services */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <Layers size={16} className="text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">Most Availed Services</h3>
          </div>

          {serviceBreakdown.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 py-8">
              <Layers size={28} className="opacity-30" />
              <p className="text-xs">No service data yet</p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {serviceBreakdown.map((s, idx) => (
                <div key={s.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-slate-700 truncate max-w-[140px]">{s.name}</span>
                    </div>
                    <span className="font-bold text-slate-900 ml-2">{s.percent}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${s.percent}%`, backgroundColor: s.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-100">
            Based on {transactions.length} total transaction{transactions.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Widget 3: Operational Overview */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <Compass size={16} className="text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">Operational Overview</h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5 my-auto">
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 flex flex-col justify-between">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Sparkles size={14} />
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-medium text-slate-600 leading-tight">Currently Processing</p>
                <p className="text-2xl font-black text-blue-600 mt-1">{processingCount}</p>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 flex flex-col justify-between">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <ShoppingBag size={14} />
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-medium text-slate-600 leading-tight">Ready for Pickup</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{readyPickupCount}</p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 flex flex-col justify-between">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                <CheckCircle2 size={14} />
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-medium text-slate-600 leading-tight">Completed Today</p>
                <p className="text-2xl font-black text-amber-600 mt-1">{completedTodayCount}</p>
              </div>
            </div>

            <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3 flex flex-col justify-between">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                <Clock size={14} />
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-medium text-slate-600 leading-tight">Pending</p>
                <p className="text-2xl font-black text-rose-600 mt-1">{pendingTransactionsCount}</p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-100">
            Live queue status
          </div>
        </div>
      </div>

      {/* ============================================================
          ROW 3: Customer Insights + Staff Overview + Recent Activity
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Card 1: Customer Insights */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">Customer Insights</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-auto">
            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between text-center">
              <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-1">
                <Users size={13} />
              </div>
              <p className="text-[10px] font-medium text-slate-500 leading-tight">With Phone</p>
              <p className="text-xl font-black text-blue-600 my-1">{customerInsights.registered}</p>
              <p className="text-[9px] text-slate-400">All time</p>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between text-center">
              <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-1">
                <UserPlus size={13} />
              </div>
              <p className="text-[10px] font-medium text-slate-500 leading-tight">New This Month</p>
              <p className="text-xl font-black text-emerald-600 my-1">{customerInsights.newThisMonth}</p>
              <p className="text-[9px] text-slate-400">This month</p>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between text-center">
              <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-1">
                <RotateCcw size={13} />
              </div>
              <p className="text-[10px] font-medium text-slate-500 leading-tight">Returning</p>
              <p className="text-xl font-black text-purple-600 my-1">{customerInsights.returning}</p>
              <p className="text-[9px] text-slate-400">2+ orders</p>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between text-center">
              <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-1">
                <UserCheck size={13} />
              </div>
              <p className="text-[10px] font-medium text-slate-500 leading-tight">Walk-ins</p>
              <p className="text-xl font-black text-amber-600 my-1">{customerInsights.unregistered}</p>
              <p className="text-[9px] text-slate-400">No phone #</p>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-100 mt-2">
            Derived from {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Card 2: Staff Overview */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">Staff Overview</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab("staff")}
              className="text-xs font-semibold text-blue-600 border border-blue-600 rounded-md px-2.5 py-0.5 hover:bg-blue-50 cursor-pointer transition-colors"
            >
              Manage Staff
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100 text-center">
            <div>
              <p className="text-[10px] text-slate-400">Total Staff</p>
              <p className="text-base font-bold text-blue-600">{totalStaffCount}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Active</p>
              <p className="text-base font-bold text-emerald-600">{activeStaffCount}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">On Leave</p>
              <p className="text-base font-bold text-amber-600">{onLeaveStaffCount}</p>
            </div>
          </div>

          <div className="overflow-x-auto my-2">
            {staffLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : staffList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-1 text-slate-400">
                <Users size={22} className="opacity-30" />
                <p className="text-xs">No staff assigned yet</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] text-slate-400 font-medium border-b border-slate-100">
                    <th className="pb-1.5 font-medium">Staff Name</th>
                    <th className="pb-1.5 font-medium">Role</th>
                    <th className="pb-1.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-[11px]">
                  {staffList.slice(0, 5).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="py-1.5 font-medium text-slate-800">{s.full_name}</td>
                      <td className="py-1.5 text-slate-500">{s.role_title || "Staff"}</td>
                      <td className="py-1.5">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            s.status === "Active" ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.status === "Active" ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {s.status || "Active"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="text-right pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab("staff")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View all staff</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Card 3: Recent Activity */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">Recent Activity</h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal("activityDetail")}
              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="space-y-2.5 my-1">
            {recentActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-1 text-slate-400">
                <Clock size={22} className="opacity-30" />
                <p className="text-xs">No activity yet</p>
              </div>
            ) : (
              recentActivities.map((act) => (
                <div
                  key={act.id}
                  onClick={() => {
                    setSelectedActivity(act);
                    setActiveModal("activityDetail");
                  }}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-semibold text-slate-400 w-14 shrink-0">
                      {act.time}
                    </span>
                    <div className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${act.bg}`}>
                      {act.icon}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                        {act.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{act.subtitle}</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 shrink-0 ml-1" />
                </div>
              ))
            )}
          </div>

          <div className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-100">
            Live events from your transactions
          </div>
        </div>
      </div>

      {/* ============================================================
          ROW 4: QUICK ACCESS
          ============================================================ */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3 tracking-tight">Quick Access</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div
            onClick={() => onNavigateTab && onNavigateTab("scanner")}
            className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg border border-blue-100 bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <BarChart3 size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">View Transactions</p>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Browse all orders</p>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-blue-600 transition-colors shrink-0 ml-2" />
          </div>

          <div
            onClick={() => onNavigateTab && onNavigateTab("setup")}
            className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Tag size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">Manage Services</p>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Add or update prices</p>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0 ml-2" />
          </div>

          <div
            onClick={() => onNavigateTab && onNavigateTab("staff")}
            className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg border border-purple-100 bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Users size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors">Manage Staff</p>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Staff accounts & roles</p>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-purple-600 transition-colors shrink-0 ml-2" />
          </div>

          <div
            onClick={() => setActiveModal("customerRecords")}
            className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs hover:border-cyan-300 hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg border border-cyan-100 bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 group-hover:text-cyan-600 transition-colors">Customer Records</p>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">View customer history</p>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-cyan-600 transition-colors shrink-0 ml-2" />
          </div>
        </div>
      </div>

      {/* ============================================================
          MODALS
          ============================================================ */}

      {/* Customer Records Modal */}
      {activeModal === "customerRecords" && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="text-cyan-600" size={20} />
                <h3 className="font-bold text-slate-900">Customer Records</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="bg-transparent text-xs w-full focus:outline-none text-slate-700"
              />
            </div>

            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto text-xs">
              {filteredCustomerRecords.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  {transactions.length === 0 ? "No transactions yet." : "No matching customers."}
                </div>
              ) : (
                filteredCustomerRecords.map((cust, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{cust.name}</p>
                      <p className="text-[11px] text-slate-400">{cust.phone} • {cust.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">{cust.orders} Order{cust.orders !== 1 ? "s" : ""}</p>
                      <p className="text-[11px] text-slate-500">₱{cust.spent.toLocaleString()} Spent</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Detail Modal */}
      {activeModal === "activityDetail" && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="text-blue-600" size={20} />
                <h3 className="font-bold text-slate-900">Recent Shop Activity</h3>
              </div>
              <button
                type="button"
                onClick={() => { setActiveModal(null); setSelectedActivity(null); }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {selectedActivity ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">{selectedActivity.time}</span>
                    <span className="font-bold text-slate-900">{selectedActivity.title}</span>
                  </div>
                  <p className="text-slate-600 mt-1">{selectedActivity.subtitle}</p>
                </div>
                {selectedActivity.rawTx && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <p className="text-slate-400">Status</p>
                      <p className="font-bold text-slate-800">{selectedActivity.rawTx.status}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <p className="text-slate-400">Amount</p>
                      <p className="font-bold text-slate-800">
                        ₱{Number(selectedActivity.rawTx.total_amount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <p className="text-slate-400">Service</p>
                      <p className="font-bold text-slate-800">
                        {selectedActivity.rawTx.service_name || "—"}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <p className="text-slate-400">Payment</p>
                      <p className="font-bold text-slate-800">
                        {selectedActivity.rawTx.payment_status || "—"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
                {recentActivities.length === 0 ? (
                  <div className="py-6 text-center text-slate-400">No activity yet.</div>
                ) : (
                  recentActivities.map((act) => (
                    <div
                      key={act.id}
                      className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center gap-3 cursor-pointer hover:bg-slate-100"
                      onClick={() => setSelectedActivity(act)}
                    >
                      <span className="text-[10px] font-semibold text-slate-400">{act.time}</span>
                      <div>
                        <p className="font-bold text-slate-800">{act.title}</p>
                        <p className="text-[11px] text-slate-500">{act.subtitle}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => { setActiveModal(null); setSelectedActivity(null); }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
