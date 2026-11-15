"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUserProfile,
  getCachedUserProfile,
  getPartnerApplications,
  reviewPartnerApplication,
  getLaundryShops,
  switchUserRole,
} from "@/lib/supabase/auth";
import { UserProfile, UserRole, PartnerApplication, LaundryShop } from "@/types/auth";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import {
  ShieldCheck,
  Store,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Check,
  X,
  AlertTriangle,
  Loader2,
  ArrowRightLeft,
  Building2,
  FileText,
  BadgeAlert,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { formatTo12Hour } from "@/components/partner/PartnerApplicationForm";
import { OwnerAnalyticsDashboard } from "@/components/owner/OwnerAnalyticsDashboard";

function AdminPageContent() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(() =>
    typeof window !== "undefined" ? getCachedUserProfile() : null
  );
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Partner Applications state
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [activeShops, setActiveShops] = useState<LaundryShop[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Filters & Tabs
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTab, setCurrentTab] = useState<"dashboard" | "applications" | "shops">("dashboard");

  // Rejection modal state
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Full Details inspection modal
  const [inspectingApp, setInspectingApp] = useState<PartnerApplication | null>(null);

  // Success / Error banner
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load User & Applications
  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [apps, shops] = await Promise.all([
        getPartnerApplications(),
        getLaundryShops(),
      ]);
      setApplications(apps);
      setActiveShops(shops);
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    async function initAdmin() {
      try {
        const profile = await getCurrentUserProfile();
        setUser(profile);
      } catch (err) {
        console.error("Failed to load admin profile:", err);
      } finally {
        setIsLoadingUser(false);
      }
    }
    initAdmin();
    loadData();
  }, []);

  // Filtered applications
  const filteredApps = applications.filter((app) => {
    const matchesStatus = statusFilter === "all" ? true : app.status === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      app.shop_name.toLowerCase().includes(query) ||
      app.applicant_name.toLowerCase().includes(query) ||
      app.shop_address.toLowerCase().includes(query) ||
      app.applicant_phone.includes(query);
    return matchesStatus && matchesQuery;
  });

  const pendingCount = applications.filter((a) => a.status === "pending").length;
  const approvedCount = applications.filter((a) => a.status === "approved").length;
  const rejectedCount = applications.filter((a) => a.status === "rejected").length;

  // Handle Approve Application
  const handleApprove = async (app: PartnerApplication) => {
    if (
      !window.confirm(
        `Approve partnership for "${app.shop_name}"?\n\nThis will:\n1. Upgrade ${app.applicant_name} to a Laundry Shop Owner.\n2. Officially register and publish "${app.shop_name}" on LabadaGO.`
      )
    ) {
      return;
    }

    setIsProcessingAction(true);
    try {
      const res = await reviewPartnerApplication(app.id, "approved", "Approved by Platform Administrator");
      if (res.success) {
        setToastMessage({
          type: "success",
          text: `🎉 Approved "${app.shop_name}"! ${app.applicant_name} is now upgraded to Shop Owner and their branch is live.`,
        });
        await loadData();
      } else {
        setToastMessage({ type: "error", text: res.error || "Failed to approve application." });
      }
    } catch {
      setToastMessage({ type: "error", text: "An error occurred while approving." });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle Reject Application
  const handleConfirmReject = async () => {
    if (!rejectingAppId) return;
    setIsProcessingAction(true);
    try {
      const res = await reviewPartnerApplication(
        rejectingAppId,
        "rejected",
        rejectionReason.trim() || "Application declined by administrator. Please verify address and permits."
      );
      if (res.success) {
        setToastMessage({
          type: "success",
          text: "Application marked as rejected with feedback sent to applicant.",
        });
        setRejectingAppId(null);
        setRejectionReason("");
        await loadData();
      } else {
        setToastMessage({ type: "error", text: res.error || "Failed to reject application." });
      }
    } catch {
      setToastMessage({ type: "error", text: "An error occurred." });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Quick helper to switch to Admin role for instant testing
  const handleSwitchToAdminRole = async () => {
    try {
      await switchUserRole(UserRole.ADMIN);
      const profile = await getCurrentUserProfile();
      setUser(profile);
      setToastMessage({ type: "success", text: "Successfully switched active account role to Admin!" });
    } catch {
      setToastMessage({ type: "error", text: "Could not switch role." });
    }
  };

  const isAdmin = user?.role === UserRole.ADMIN;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col lg:flex-row pb-20 select-none">
      <DashboardNav user={user || undefined} />

      <main className="flex-1 min-w-0 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-md animate-in fade-in ${
              toastMessage.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : "bg-rose-50 border-rose-300 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === "success" ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle size={18} className="text-rose-600 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Platform Admin
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Partner Approvals &amp; Admin Portal
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Review and approve client laundry shop partnership applications submitted through the website.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={loadData}
                disabled={isLoadingData}
                className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Refresh applications"
              >
                <RefreshCw size={14} className={isLoadingData ? "animate-spin text-indigo-600" : ""} />
                <span>Refresh</span>
              </button>

              {!isAdmin && (
                <button
                  type="button"
                  onClick={handleSwitchToAdminRole}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Switch to Admin role for full privilege testing"
                >
                  <ArrowRightLeft size={14} />
                  <span>Switch to Admin Role</span>
                </button>
              )}
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
              <div className="flex items-center justify-between text-amber-700">
                <span className="text-[11px] font-bold uppercase tracking-wider">Pending Review</span>
                <Clock size={16} />
              </div>
              <div className="text-2xl font-black text-amber-900 mt-1">{pendingCount}</div>
              <div className="text-[10px] text-amber-700/80 mt-0.5">Awaiting admin decision</div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
              <div className="flex items-center justify-between text-emerald-700">
                <span className="text-[11px] font-bold uppercase tracking-wider">Approved Partners</span>
                <CheckCircle2 size={16} />
              </div>
              <div className="text-2xl font-black text-emerald-900 mt-1">{approvedCount}</div>
              <div className="text-[10px] text-emerald-700/80 mt-0.5">Live shop owners</div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200">
              <div className="flex items-center justify-between text-rose-700">
                <span className="text-[11px] font-bold uppercase tracking-wider">Rejected</span>
                <XCircle size={16} />
              </div>
              <div className="text-2xl font-black text-rose-900 mt-1">{rejectedCount}</div>
              <div className="text-[10px] text-rose-700/80 mt-0.5">Declined requests</div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200">
              <div className="flex items-center justify-between text-blue-700">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Active Shops</span>
                <Store size={16} />
              </div>
              <div className="text-2xl font-black text-blue-900 mt-1">{activeShops.length}</div>
              <div className="text-[10px] text-blue-700/80 mt-0.5">On map &amp; platform</div>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-2xl shadow-2xs self-start sm:self-auto">
            <button
              onClick={() => setCurrentTab("dashboard")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === "dashboard"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 size={14} />
              <span>Platform Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentTab("applications")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === "applications"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText size={14} />
              <span>Partner Applications ({applications.length})</span>
            </button>

            <button
              onClick={() => setCurrentTab("shops")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === "shops"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Store size={14} />
              <span>Platform Shops ({activeShops.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px] sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shop, applicant, or address..."
              className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 shadow-2xs"
            />
          </div>
        </div>

        {/* TAB 0: SYSTEM / PLATFORM ANALYTICS DASHBOARD */}
        {currentTab === "dashboard" && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs">
            <OwnerAnalyticsDashboard
              user={user}
              shops={activeShops}
              shop={activeShops[0] || null}
              onNavigateTab={(tab) => {
                if (tab === "setup") {
                  setCurrentTab("shops");
                } else if (tab === "scanner" || tab === "staff") {
                  window.location.href = `/owner?tab=${tab}`;
                }
              }}
            />
          </div>
        )}

        {/* TAB 1: PARTNER APPLICATIONS LIST */}
        {currentTab === "applications" && (
          <div className="space-y-4">
            {/* Status Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Filter:</span>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
                  statusFilter === "pending"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Pending Review ({pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
                  statusFilter === "all"
                    ? "bg-slate-800 text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                All Applications ({applications.length})
              </button>
              <button
                onClick={() => setStatusFilter("approved")}
                className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
                  statusFilter === "approved"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Approved ({approvedCount})
              </button>
              <button
                onClick={() => setStatusFilter("rejected")}
                className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
                  statusFilter === "rejected"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Rejected ({rejectedCount})
              </button>
            </div>

            {/* Applications List */}
            {filteredApps.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs shadow-2xs">
                <Building2 size={40} className="mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-slate-700 text-sm">No partner applications found.</p>
                <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                  {statusFilter === "pending"
                    ? "There are no pending partner applications awaiting approval right now."
                    : "No applications match your search query."}
                </p>
                <div className="mt-4">
                  <Link
                    href="/partner"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <span>View Client Partner Application Page</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredApps.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4 hover:border-slate-300 transition-all"
                  >
                    {/* Top Row: Shop Name & Status Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                            {app.shop_name}
                          </h3>
                          <span
                            className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${
                              app.status === "approved"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : app.status === "rejected"
                                ? "bg-rose-50 text-rose-800 border-rose-300"
                                : "bg-amber-50 text-amber-800 border-amber-300"
                            }`}
                          >
                            {app.status === "approved"
                              ? "✓ Approved Partner"
                              : app.status === "rejected"
                              ? "✕ Rejected"
                              : "⏱ Pending Admin Review"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Application ID: <span className="font-mono">{app.id}</span> • Applied on{" "}
                          {new Date(app.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setInspectingApp(app)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                      >
                        <Eye size={13} className="text-slate-500" />
                        <span>View Full Details</span>
                      </button>
                    </div>

                    {/* Middle Grid: Client Details & Proposed Shop Details */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      {/* Left: Applicant / Client Details */}
                      <div className="md:col-span-5 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Client / Applicant Profile
                        </span>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-blue-600 shrink-0" />
                            <span className="font-bold text-slate-900">{app.applicant_name}</span>
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-semibold">
                              Customer
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-slate-600">
                            <Phone size={14} className="text-slate-400 shrink-0" />
                            <span>{app.applicant_phone}</span>
                          </div>

                          {app.applicant_email && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Mail size={14} className="text-slate-400 shrink-0" />
                              <span className="truncate">{app.applicant_email}</span>
                            </div>
                          )}

                          {app.admin_notes && (
                            <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-200/80">
                              <strong>Notes:</strong> {app.admin_notes}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Shop Details & Services */}
                      <div className="md:col-span-7 space-y-3">
                        <div className="space-y-1">
                          <div className="text-xs text-slate-700 flex items-start gap-1.5">
                            <MapPin size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-slate-900">{app.shop_address}</strong>
                              <span className="text-[11px] text-slate-400 block font-mono">
                                Coordinates: {app.latitude.toFixed(4)}, {app.longitude.toFixed(4)}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                            <span className="flex items-center gap-1">
                              <Clock size={13} className="text-amber-500" />
                              {formatTo12Hour(app.open_time)} – {formatTo12Hour(app.close_time)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Store size={13} className="text-indigo-500" />
                              {app.washer_count} Washers • {app.dryer_count} Dryers
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Max {app.max_kilo_per_load || 8}kg / load
                            </span>
                          </div>
                        </div>

                        {/* Services List Preview */}
                        <div className="pt-1">
                          <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                            Services &amp; Pricing Offered ({app.services.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {app.services.map((srv) => (
                              <span
                                key={srv.id || srv.service_name}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800"
                              >
                                {srv.service_name}:{" "}
                                <strong className="text-emerald-700 font-mono">
                                  ₱{srv.price.toFixed(2)}
                                </strong>
                                <span className="text-[10px] text-slate-400 font-normal"> / {srv.unit}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-slate-500">
                        {app.status === "pending" ? (
                          <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                            <BadgeAlert size={14} className="text-amber-600 shrink-0" />
                            Requires administrator review to grant Owner portal access.
                          </span>
                        ) : app.status === "approved" ? (
                          <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                            Client approved as official Laundry Shop Owner.
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-rose-700 font-medium">
                            <XCircle size={14} className="text-rose-600 shrink-0" />
                            Application was declined.
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {app.status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingAppId(app.id);
                                setRejectionReason("");
                              }}
                              disabled={isProcessingAction}
                              className="px-3.5 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <X size={14} />
                              <span>Decline</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleApprove(app)}
                              disabled={isProcessingAction}
                              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <CheckCircle2 size={15} />
                              <span>Approve Partner &amp; Shop</span>
                            </button>
                          </>
                        )}

                        {app.status === "approved" && (
                          <Link
                            href="/customer?tab=map"
                            className="px-3.5 py-1.5 rounded-xl border border-emerald-300 text-emerald-800 bg-emerald-50 text-xs font-bold hover:bg-emerald-100 flex items-center gap-1.5"
                          >
                            <MapPin size={13} />
                            <span>View on Laundry Map</span>
                          </Link>
                        )}

                        {app.status === "rejected" && (
                          <button
                            type="button"
                            onClick={() => handleApprove(app)}
                            disabled={isProcessingAction}
                            className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <span>Reconsider &amp; Approve</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE PLATFORM SHOPS */}
        {currentTab === "shops" && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">All Verified Platform Laundry Shops</h3>
                <p className="text-xs text-slate-500">Currently active on the customer map and booking directory</p>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                {activeShops.length} active shops
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {activeShops.map((shop) => (
                <div
                  key={shop.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">{shop.name}</h4>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1">{shop.address}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Hotline: {shop.phone_number}</span>
                    <span>⭐ {shop.rating || 5.0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REJECTION REASON MODAL */}
        {rejectingAppId && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                  <XCircle size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Decline Partner Application</h3>
                  <p className="text-xs text-slate-500">Provide rejection reason or revision guidance for the applicant.</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Feedback / Reason for Denial</label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Incomplete street address or business permit verification required..."
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-800 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectingAppId(null)}
                  disabled={isProcessingAction}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleConfirmReject}
                  isLoading={isProcessingAction}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* FULL DETAILS INSPECT MODAL */}
        {inspectingApp && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Store size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{inspectingApp.shop_name}</h3>
                    <p className="text-xs text-slate-500">Submitted by {inspectingApp.applicant_name}</p>
                  </div>
                </div>

                <button
                  onClick={() => setInspectingApp(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Address &amp; Location
                  </span>
                  <p className="font-semibold text-slate-900">{inspectingApp.shop_address}</p>
                  <p className="text-slate-500 font-mono">
                    Latitude: {inspectingApp.latitude}, Longitude: {inspectingApp.longitude}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Hours &amp; Contact
                    </span>
                    <p className="font-semibold text-slate-900">
                      {formatTo12Hour(inspectingApp.open_time)} – {formatTo12Hour(inspectingApp.close_time)}
                    </p>
                    <p className="text-slate-500">{inspectingApp.phone_number}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Machine Capacity
                    </span>
                    <p className="font-semibold text-slate-900">
                      {inspectingApp.washer_count} Washers • {inspectingApp.dryer_count} Dryers
                    </p>
                    <p className="text-slate-500">Max {inspectingApp.max_kilo_per_load || 8}kg / load</p>
                  </div>
                </div>

                {inspectingApp.shop_description && (
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Shop Bio / Description
                    </span>
                    <p className="text-slate-700 leading-relaxed">{inspectingApp.shop_description}</p>
                  </div>
                )}

                {/* Services */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-700 block">Configured Services:</span>
                  <div className="space-y-1.5">
                    {inspectingApp.services.map((srv) => (
                      <div
                        key={srv.id || srv.service_name}
                        className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between"
                      >
                        <span className="font-bold text-slate-900">{srv.service_name}</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          ₱{srv.price.toFixed(2)} / {srv.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInspectingApp(null)}
                >
                  Close
                </Button>
                {inspectingApp.status === "pending" && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    onClick={() => {
                      setInspectingApp(null);
                      handleApprove(inspectingApp);
                    }}
                  >
                    Approve Application
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <p className="text-xs text-slate-500 font-medium">Loading Admin Portal...</p>
        </div>
      }
    >
      <AdminPageContent />
    </Suspense>
  );
}
