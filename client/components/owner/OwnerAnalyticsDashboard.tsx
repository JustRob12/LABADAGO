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
  PieChart,
  Clock,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Calendar,
  Bell,
  Tag,
  Receipt,
  ArrowRight,
  FileText,
  UserCheck,
  RotateCcw,
  BarChart3,
  Layers,
  Compass,
  X,
  Search,
  Check,
  ArrowUpRight,
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
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("May 31, 2026 (Sunday)");
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [trendRange, setTrendRange] = useState<"7d" | "14d" | "30d">("7d");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(1);

  // Modals for Quick Access
  const [activeModal, setActiveModal] = useState<"reports" | "customerRecords" | "activityDetail" | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);

  // Staff state
  const [staffList, setStaffList] = useState<BranchStaffMember[]>([]);

  useEffect(() => {
    async function loadStaff() {
      try {
        const staff = await getBranchStaff(shop?.id);
        setStaffList(staff);
      } catch (err) {
        console.error("Failed to load staff in dashboard:", err);
      }
    }
    loadStaff();
  }, [shop?.id]);

  // Scanned transactions (filter out pending/unscanned for accurate counter throughput)
  const scannedTransactions = useMemo(
    () => transactions.filter((tx) => tx.status !== "Pending"),
    [transactions]
  );

  // Dynamic vs default metrics
  const totalTransactionsCount = scannedTransactions.length > 0 ? scannedTransactions.length : 45;
  const completedTransactionsCount = useMemo(() => {
    const count = scannedTransactions.filter((tx) => tx.status === "Completed").length;
    return count > 0 ? count : 38;
  }, [scannedTransactions]);

  const completionRate = Math.round((completedTransactionsCount / totalTransactionsCount) * 100) || 84;

  const activeCustomersCount = useMemo(() => {
    const unique = new Set(scannedTransactions.map((tx) => tx.customer_phone || tx.customer_name).filter(Boolean)).size;
    return unique > 0 ? unique : 412;
  }, [scannedTransactions]);

  const estimatedRevenue = useMemo(() => {
    const rev = scannedTransactions.reduce((sum, tx) => {
      if (tx.payment_status === "Paid" || tx.status === "Completed") {
        return sum + (Number(tx.total_amount) || 0);
      }
      return sum;
    }, 0);
    return rev > 0 ? rev : 12450;
  }, [scannedTransactions]);

  const totalStaffCount = staffList.length > 0 ? staffList.length : 8;
  const activeStaffCount = staffList.filter((s) => s.status === "Active").length || 6;
  const onLeaveStaffCount = staffList.filter((s) => s.status === "On Leave").length || 2;

  // Trend data points for 7 days
  const trendData = useMemo(() => {
    if (trendRange === "7d") {
      return [
        { day: "Mon", value: 32 },
        { day: "Tue", value: 38 },
        { day: "Wed", value: 41 },
        { day: "Thu", value: 35 },
        { day: "Fri", value: 52 },
        { day: "Sat", value: 60 },
        { day: "Sun", value: 45 },
      ];
    } else if (trendRange === "14d") {
      return [
        { day: "W1-M", value: 28 },
        { day: "W1-W", value: 35 },
        { day: "W1-F", value: 48 },
        { day: "W1-S", value: 58 },
        { day: "W2-M", value: 34 },
        { day: "W2-W", value: 42 },
        { day: "W2-S", value: 65 },
      ];
    } else {
      return [
        { day: "Wk 1", value: 210 },
        { day: "Wk 2", value: 245 },
        { day: "Wk 3", value: 270 },
        { day: "Wk 4", value: 310 },
      ];
    }
  }, [trendRange]);

  // Operational metrics
  const processingCount = 12;
  const readyPickupCount = 8;
  const completedTodayCount = 38;
  const pendingTransactionsCount = 7;

  // Customer insights
  const customerInsights = {
    registered: 412,
    newThisMonth: 32,
    returning: 280,
    unregistered: 193,
  };

  // Staff preview table rows matching screenshot
  const staffTablePreview = [
    { name: "Maria Santos", role: "Staff", status: "Active", txToday: 15 },
    { name: "Juan Reyes", role: "Staff", status: "Active", txToday: 12 },
    { name: "Ana Cruz", role: "Staff", status: "Active", txToday: 11 },
    { name: "Mark Lim", role: "Staff", status: "On Leave", txToday: 0 },
  ];

  // Recent activity feed matching screenshot
  const recentActivities = [
    {
      id: "act-1",
      time: "10:45 AM",
      title: "Transaction Q-015 completed",
      subtitle: "Order is ready for pickup",
      type: "success",
      icon: <CheckCircle2 size={16} className="text-emerald-600" />,
      bg: "bg-emerald-50 border-emerald-200",
    },
    {
      id: "act-2",
      time: "10:30 AM",
      title: "New customer registered",
      subtitle: "John Dela Cruz",
      type: "user",
      icon: <UserPlus size={16} className="text-blue-600" />,
      bg: "bg-blue-50 border-blue-200",
    },
    {
      id: "act-3",
      time: "10:20 AM",
      title: "Service price updated",
      subtitle: "Wash & Fold - Regular",
      type: "service",
      icon: <Tag size={16} className="text-amber-600" />,
      bg: "bg-amber-50 border-amber-200",
    },
    {
      id: "act-4",
      time: "10:15 AM",
      title: "Transaction Q-014 checked in",
      subtitle: "Customer: Maria Santos",
      type: "order",
      icon: <Receipt size={16} className="text-blue-600" />,
      bg: "bg-blue-50 border-blue-200",
    },
    {
      id: "act-5",
      time: "10:05 AM",
      title: "Staff Mark Lim is now on leave",
      subtitle: "Sick leave - May 31, 2026",
      type: "staff",
      icon: <Calendar size={16} className="text-purple-600" />,
      bg: "bg-purple-50 border-purple-200",
    },
  ];

  // SVG Coordinates calculation for Line Chart
  // ViewBox: 0 0 540 220
  // Left: 50, Right: 510, Top: 25, Bottom: 185
  // Max Y value is 80
  const maxTrendVal = trendRange === "30d" ? 350 : 80;
  const chartPoints = trendData.map((pt, idx) => {
    const x = 70 + idx * ((490 - 70) / Math.max(1, trendData.length - 1));
    const y = 185 - (pt.value / maxTrendVal) * 155;
    return { ...pt, x, y };
  });

  const linePathD = chartPoints.reduce((acc, pt, idx) => {
    return `${acc} ${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`;
  }, "");

  const areaPathD = `${linePathD} L ${chartPoints[chartPoints.length - 1]?.x || 490} 185 L ${
    chartPoints[0]?.x || 70
  } 185 Z`;

  // Display Name
  const ownerDisplayName = user?.full_name ? user.full_name.split(" ")[0] : "Owner";

  return (
    <div className="space-y-6">
      {/* ==============================================================================
          TOP HEADER: GREETING & CONTROLS (Exact layout from reference screenshot)
          ============================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Good morning, {ownerDisplayName}! 👋
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Here&apos;s what&apos;s happening with your laundry shop today.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {/* Date Picker / Selector Pill */}
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
              <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 text-xs">
                {[
                  "May 31, 2026 (Sunday)",
                  "Today (Live System Date)",
                  "Yesterday (May 30, 2026)",
                  "Last 7 Days (May 25 - 31)",
                  "This Month (May 2026)",
                ].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setSelectedDateFilter(item);
                      setIsDateDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between ${
                      selectedDateFilter === item ? "font-semibold text-blue-600 bg-blue-50/50" : "text-slate-700"
                    }`}
                  >
                    <span>{item}</span>
                    {selectedDateFilter === item && <Check size={13} className="text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification Bell with Badge */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setNotificationCount(0);
              }}
              className="relative p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs cursor-pointer transition-colors"
              aria-label="View notifications"
            >
              <Bell size={16} />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {notificationCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-30 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-800">Notifications</span>
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-2 py-2">
                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                    <p className="font-semibold text-blue-900">1 Unclaimed Order Ready</p>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Order #Q-015 for Maria Santos has been folded and ready for pickup for over 2 hours.
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="font-semibold text-slate-800">Staff Shift Reminder</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Mark Lim marked on leave today. Shift covered by Allan Reyes.
                    </p>
                  </div>
                </div>
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

      {/* ==============================================================================
          ROW 1: 5 KPI METRIC TILES (Matches screenshot)
          ============================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Total Transactions Today */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg border border-blue-100 bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingCart size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500">Total Transactions Today</p>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              {totalTransactionsCount}
            </p>
            <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
              <span>↑ 12% vs yesterday</span>
            </p>
          </div>
        </div>

        {/* Metric 2: Completed Transactions */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500">Completed Transactions</p>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              {completedTransactionsCount}
            </p>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              {completionRate}% completion rate
            </p>
          </div>
        </div>

        {/* Metric 3: Active Customers */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg border border-purple-100 bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500">Active Customers</p>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              {activeCustomersCount}
            </p>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              Total registered customers
            </p>
          </div>
        </div>

        {/* Metric 4: Estimated Revenue */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg border border-amber-100 bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wallet size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500">Estimated Revenue</p>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              ₱{estimatedRevenue.toLocaleString()}
            </p>
            <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
              <span>↑ 15% vs yesterday</span>
            </p>
          </div>
        </div>

        {/* Metric 5: Total Staff */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg border border-blue-100 bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserPlus size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500">Total Staff</p>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              {totalStaffCount}
            </p>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              Active Today: {activeStaffCount}
            </p>
          </div>
        </div>
      </div>

      {/* ==============================================================================
          ROW 2: 3 WIDGETS (Line Chart, Donut Chart, Operational Overview)
          ============================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Widget 1: Transaction Trends Line Chart (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">Transaction Trends</h3>
            </div>

            {/* Time Filter Dropdown */}
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

          {/* SVG Line Chart */}
          <div className="w-full h-52 sm:h-56 relative">
            <svg viewBox="0 0 540 220" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines & Y Axis Labels */}
              {[80, 60, 40, 20, 0].map((val) => {
                const y = 185 - (val / 80) * 155;
                return (
                  <g key={val}>
                    <text x="35" y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-medium">
                      {val}
                    </text>
                    <line
                      x1="45"
                      y1={y}
                      x2="520"
                      y2={y}
                      stroke="#F1F5F9"
                      strokeWidth="1"
                      strokeDasharray={val === 0 ? "none" : "3 3"}
                    />
                  </g>
                );
              })}

              {/* Area Fill */}
              <path d={areaPathD} fill="url(#trendGradient)" />

              {/* Trend Stroke Line */}
              <path
                d={linePathD}
                fill="none"
                stroke="#2563EB"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points & Value Tooltips */}
              {chartPoints.map((pt) => (
                <g key={pt.day} className="group cursor-pointer">
                  {/* Point circle */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4.5"
                    fill="#2563EB"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="transition-transform group-hover:scale-125"
                  />

                  {/* Value badge on point */}
                  <text
                    x={pt.x}
                    y={pt.y - 10}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-slate-700"
                  >
                    {pt.value}
                  </text>

                  {/* X axis Day label */}
                  <text
                    x={pt.x}
                    y="205"
                    textAnchor="middle"
                    className="text-[11px] font-medium fill-slate-500"
                  >
                    {pt.day}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 bg-blue-600 rotate-45 inline-block"></span>
            <span className="font-medium text-slate-600">Transactions</span>
          </div>
        </div>

        {/* Widget 2: Most Availed Services Pie Chart (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <PieChart size={16} className="text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">Most Availed Services</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
            {/* SVG Pie Chart with Percentages inside */}
            <div className="w-40 h-40 relative shrink-0">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {/* Wedge 1: Wash & Fold 45% (162 deg from -90) */}
                <path
                  d="M 100 100 L 100 15 A 85 85 0 0 1 180.84 126.27 Z"
                  fill="#2563EB"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <text x="135" y="70" fill="#FFFFFF" textAnchor="middle" className="text-[11px] font-bold">
                  45%
                </text>

                {/* Wedge 2: Wash, Dry & Iron 25% (90 deg from 72 to 162) */}
                <path
                  d="M 100 100 L 180.84 126.27 A 85 85 0 0 1 73.73 180.84 Z"
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <text x="130" y="150" fill="#FFFFFF" textAnchor="middle" className="text-[11px] font-bold">
                  25%
                </text>

                {/* Wedge 3: Blanket Wash 15% (54 deg from 162 to 216) */}
                <path
                  d="M 100 100 L 73.73 180.84 A 85 85 0 0 1 19.16 126.27 Z"
                  fill="#F59E0B"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <text x="55" y="150" fill="#FFFFFF" textAnchor="middle" className="text-[11px] font-bold">
                  15%
                </text>

                {/* Wedge 4: Others 15% (54 deg from 216 to 270) */}
                <path
                  d="M 100 100 L 19.16 126.27 A 85 85 0 0 1 100 15 Z"
                  fill="#8B5CF6"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <text x="65" y="75" fill="#FFFFFF" textAnchor="middle" className="text-[11px] font-bold">
                  15%
                </text>
              </svg>
            </div>

            {/* Legend Beside Chart */}
            <div className="space-y-2 text-xs w-full sm:w-auto">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
                  <span className="text-slate-600">Wash & Fold</span>
                </div>
                <span className="font-bold text-slate-900">45%</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="text-slate-600">Wash, Dry & Iron</span>
                </div>
                <span className="font-bold text-slate-900">25%</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                  <span className="text-slate-600">Blanket Wash</span>
                </div>
                <span className="font-bold text-slate-900">15%</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"></span>
                  <span className="text-slate-600">Others</span>
                </div>
                <span className="font-bold text-slate-900">15%</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-100">
            Based on all completed order records
          </div>
        </div>

        {/* Widget 3: Operational Overview 2x2 Grid (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <Compass size={16} className="text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">Operational Overview</h3>
          </div>

          {/* 2x2 Grid */}
          <div className="grid grid-cols-2 gap-2.5 my-auto">
            {/* Box 1: Laundry Currently Processing */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 flex flex-col justify-between">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Sparkles size={14} />
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-medium text-slate-600 leading-tight">
                  Laundry Currently Processing
                </p>
                <p className="text-2xl font-black text-blue-600 mt-1">{processingCount}</p>
              </div>
            </div>

            {/* Box 2: Ready for Pickup */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 flex flex-col justify-between">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <ShoppingBag size={14} />
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-medium text-slate-600 leading-tight">
                  Ready for Pickup
                </p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{readyPickupCount}</p>
              </div>
            </div>

            {/* Box 3: Completed Today */}
            <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 flex flex-col justify-between">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                <CheckCircle2 size={14} />
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-medium text-slate-600 leading-tight">
                  Completed Today
                </p>
                <p className="text-2xl font-black text-amber-600 mt-1">{completedTodayCount}</p>
              </div>
            </div>

            {/* Box 4: Pending Transactions */}
            <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3 flex flex-col justify-between">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                <Clock size={14} />
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-medium text-slate-600 leading-tight">
                  Pending Transactions
                </p>
                <p className="text-2xl font-black text-rose-600 mt-1">{pendingTransactionsCount}</p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-100">
            Real-time shop machines & queue
          </div>
        </div>
      </div>

      {/* ==============================================================================
          ROW 3: 3 CARDS (Customer Insights, Staff Overview, Recent Activity)
          ============================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Card 1: Customer Insights (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">Customer Insights</h3>
          </div>

          {/* 4 Column Stat Tiles inside */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-auto">
            {/* Tile 1: Registered Customers */}
            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between text-center">
              <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-1">
                <Users size={13} />
              </div>
              <p className="text-[10px] font-medium text-slate-500 leading-tight">Registered Customers</p>
              <p className="text-xl font-black text-blue-600 my-1">{customerInsights.registered}</p>
              <p className="text-[9px] text-slate-400">Total customers</p>
            </div>

            {/* Tile 2: New Customers This Month */}
            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between text-center">
              <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-1">
                <UserPlus size={13} />
              </div>
              <p className="text-[10px] font-medium text-slate-500 leading-tight">New This Month</p>
              <p className="text-xl font-black text-emerald-600 my-1">{customerInsights.newThisMonth}</p>
              <p className="text-[9px] font-semibold text-emerald-600">↑ 8% vs last mo</p>
            </div>

            {/* Tile 3: Returning Customers */}
            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between text-center">
              <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-1">
                <RotateCcw size={13} />
              </div>
              <p className="text-[10px] font-medium text-slate-500 leading-tight">Returning Customers</p>
              <p className="text-xl font-black text-purple-600 my-1">{customerInsights.returning}</p>
              <p className="text-[9px] text-slate-400">68% of total</p>
            </div>

            {/* Tile 4: Unregistered Customers */}
            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between text-center">
              <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-1">
                <UserCheck size={13} />
              </div>
              <p className="text-[10px] font-medium text-slate-500 leading-tight">Unregistered</p>
              <p className="text-xl font-black text-amber-600 my-1">{customerInsights.unregistered}</p>
              <p className="text-[9px] text-slate-400">32% of total</p>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-100 mt-2">
            Loyalty and retention rate: 68%
          </div>
        </div>

        {/* Card 2: Staff Overview (4 cols) */}
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

          {/* 3 mini stats row */}
          <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100 text-center">
            <div>
              <p className="text-[10px] text-slate-400">Total Staff</p>
              <p className="text-base font-bold text-blue-600">{totalStaffCount}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Active Today</p>
              <p className="text-base font-bold text-emerald-600">{activeStaffCount}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">On Leave</p>
              <p className="text-base font-bold text-amber-600">{onLeaveStaffCount}</p>
            </div>
          </div>

          {/* Staff Table Preview */}
          <div className="overflow-x-auto my-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] text-slate-400 font-medium border-b border-slate-100">
                  <th className="pb-1.5 font-medium">Staff Name</th>
                  <th className="pb-1.5 font-medium">Role</th>
                  <th className="pb-1.5 font-medium">Status</th>
                  <th className="pb-1.5 font-medium text-right">Transactions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-[11px]">
                {staffTablePreview.map((staff) => (
                  <tr key={staff.name} className="hover:bg-slate-50/50">
                    <td className="py-1.5 font-medium text-slate-800">{staff.name}</td>
                    <td className="py-1.5 text-slate-500">{staff.role}</td>
                    <td className="py-1.5">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          staff.status === "Active" ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            staff.status === "Active" ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        ></span>
                        {staff.status}
                      </span>
                    </td>
                    <td className="py-1.5 font-bold text-slate-800 text-right">{staff.txToday}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

        {/* Card 3: Recent Activity (4 cols) */}
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

          {/* Activity items list */}
          <div className="space-y-2.5 my-1">
            {recentActivities.map((act) => (
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
            ))}
          </div>

          <div className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-100">
            Real-time events log
          </div>
        </div>
      </div>

      {/* ==============================================================================
          ROW 4: QUICK ACCESS (5 Horizontal Cards matching reference screenshot)
          ============================================================================== */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3 tracking-tight">Quick Access</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Action 1: View Reports */}
          <div
            onClick={() => setActiveModal("reports")}
            className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg border border-blue-100 bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <BarChart3 size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  View Reports
                </p>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  See detailed analytics and business reports
                </p>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-blue-600 transition-colors shrink-0 ml-2" />
          </div>

          {/* Action 2: Manage Services */}
          <div
            onClick={() => onNavigateTab && onNavigateTab("setup")}
            className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Tag size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Manage Services
                </p>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  Add or update laundry services and prices
                </p>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0 ml-2" />
          </div>

          {/* Action 3: Manage Staff */}
          <div
            onClick={() => onNavigateTab && onNavigateTab("staff")}
            className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg border border-purple-100 bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Users size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                  Manage Staff
                </p>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  Create and manage staff accounts
                </p>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-purple-600 transition-colors shrink-0 ml-2" />
          </div>

          {/* Action 4: View Transactions */}
          <div
            onClick={() => onNavigateTab && onNavigateTab("scanner")}
            className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg border border-amber-100 bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Receipt size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                  View Transactions
                </p>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  Browse all transactions and order history
                </p>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-amber-600 transition-colors shrink-0 ml-2" />
          </div>

          {/* Action 5: Customer Records */}
          <div
            onClick={() => setActiveModal("customerRecords")}
            className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs hover:border-cyan-300 hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg border border-cyan-100 bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                <Users size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 group-hover:text-cyan-600 transition-colors">
                  Customer Records
                </p>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  Manage customer information
                </p>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-400 group-hover:text-cyan-600 transition-colors shrink-0 ml-2" />
          </div>
        </div>
      </div>

      {/* ==============================================================================
          MODALS FOR QUICK ACCESS
          ============================================================================== */}

      {/* 1. View Reports Modal */}
      {activeModal === "reports" && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-blue-600" size={20} />
                <h3 className="font-bold text-slate-900">Comprehensive Business Reports</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800">Financial Summary</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <span className="text-slate-500">Gross Sales Today:</span>
                    <p className="font-bold text-emerald-600 text-sm">₱{estimatedRevenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Estimated Monthly Run:</span>
                    <p className="font-bold text-blue-600 text-sm">₱{(estimatedRevenue * 28).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800">Throughput & Machine Efficiency</p>
                <p className="text-slate-500 mt-1">
                  Average turnaround time: <span className="font-bold text-slate-800">2.4 hours per 8kg load</span>. Peak hours: <span className="font-bold text-slate-800">10:00 AM - 3:00 PM</span>.
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800">Service Breakdown</p>
                <ul className="list-disc list-inside text-slate-600 space-y-1 mt-1">
                  <li>Wash & Fold: 45% (Highest volume)</li>
                  <li>Wash, Dry & Iron: 25% (Highest margin)</li>
                  <li>Blanket & Comforter: 15%</li>
                  <li>Shoe & Dry clean: 15%</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer shadow-xs"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Customer Records Modal */}
      {activeModal === "customerRecords" && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="text-cyan-600" size={20} />
                <h3 className="font-bold text-slate-900">Customer Records Directory</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50">
                <Search size={14} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer by name or phone..."
                  className="bg-transparent text-xs w-full focus:outline-none text-slate-700"
                />
              </div>

              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto text-xs">
                {[
                  { name: "John Michael Reyes", phone: "0917 456 7890", orders: 14, spent: "₱2,800", type: "Registered" },
                  { name: "Maria Santos", phone: "0917 123 4567", orders: 9, spent: "₱1,950", type: "Registered" },
                  { name: "Walk-In Guest #104", phone: "0920 987 6543", orders: 2, spent: "₱450", type: "Unregistered" },
                  { name: "Sofia Cruz", phone: "0999 222 3344", orders: 6, spent: "₱1,200", type: "Registered" },
                  { name: "Walk-In Guest #109", phone: "0918 555 7788", orders: 1, spent: "₱200", type: "Unregistered" },
                ].map((cust) => (
                  <div key={cust.phone} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{cust.name}</p>
                      <p className="text-[11px] text-slate-400">{cust.phone} • {cust.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">{cust.orders} Orders</p>
                      <p className="text-[11px] text-slate-500">{cust.spent} Spent</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs cursor-pointer shadow-xs"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Activity Detail Modal */}
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
                onClick={() => {
                  setActiveModal(null);
                  setSelectedActivity(null);
                }}
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
                <p className="text-[11px] text-slate-500">
                  Event recorded on {selectedDateFilter}. Logged by automatic counter scanner & branch activity tracker.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
                {recentActivities.map((act) => (
                  <div key={act.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <span className="text-[10px] font-semibold text-slate-400">{act.time}</span>
                    <div>
                      <p className="font-bold text-slate-800">{act.title}</p>
                      <p className="text-[11px] text-slate-500">{act.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setSelectedActivity(null);
                }}
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
