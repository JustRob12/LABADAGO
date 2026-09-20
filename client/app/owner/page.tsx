"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentUserProfile, getLaundryShops, getLaundryTransactions } from "@/lib/supabase/auth";
import { UserProfile, LaundryShop, LaundryTransaction, UserRole } from "@/types/auth";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { OwnerAnalyticsDashboard } from "@/components/owner/OwnerAnalyticsDashboard";
import { WalkInIntake } from "@/components/owner/WalkInIntake";
import { ShopSetupForm } from "@/components/owner/ShopSetupForm";
import { BarChart3, ScanLine, Settings, Store, Loader2 } from "lucide-react";

function OwnerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "analytics";

  const [activeTab, setActiveTab] = useState<"analytics" | "scanner" | "setup">(
    initialTab === "scanner" ? "scanner" : initialTab === "setup" ? "setup" : "analytics"
  );

  const [user, setUser] = useState<UserProfile | null>(null);
  const [shop, setShop] = useState<LaundryShop | null>(null);
  const [shops, setShops] = useState<LaundryShop[]>([]);
  const [transactions, setTransactions] = useState<LaundryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "scanner") {
      setActiveTab("scanner");
    } else if (tabParam === "setup") {
      setActiveTab("setup");
    } else {
      setActiveTab("analytics");
    }
  }, [searchParams]);

  const handleTabChange = (tab: "analytics" | "scanner" | "setup") => {
    setActiveTab(tab);
    if (tab === "analytics") {
      router.push("/owner", { scroll: false });
    } else {
      router.push(`/owner?tab=${tab}`, { scroll: false });
    }
  };

  useEffect(() => {
    async function loadOwnerData() {
      setIsLoading(true);
      try {
        const [profile, shopsList, txList] = await Promise.all([
          getCurrentUserProfile(),
          getLaundryShops(),
          getLaundryTransactions(),
        ]);

        if (!profile) {
          router.push("/login?redirect=/owner&message=" + encodeURIComponent("Please sign in to your shop owner account."));
          return;
        }

        setUser(profile);
        setShops(shopsList);
        if (shopsList.length > 0) {
          setShop(shopsList[0]);
        }
        setTransactions(txList);
      } catch (err) {
        console.error("Failed to load owner data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadOwnerData();
  }, []);

  const refreshTransactions = async () => {
    const txList = await getLaundryTransactions();
    setTransactions(txList);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <DashboardNav
        user={user}
        onRoleSwitched={(role) => {
          if (user) setUser({ ...user, role });
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8 space-y-6">
        {/* Owner Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Laundry Shop Owner Portal
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your shop profile, process customer walk-in QR passes, and monitor business analytics.
            </p>
          </div>

          {/* Owner Tab Navigation (Hidden on mobile/tablet since bottom floating nav handles tabs) */}
          <div className="hidden lg:inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => handleTabChange("analytics")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all ${
                activeTab === "analytics"
                  ? "bg-emerald-600 text-white shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 size={13} />
              <span>Business Analytics</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("scanner")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all ${
                activeTab === "scanner"
                  ? "bg-blue-600 text-white shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ScanLine size={13} />
              <span>QR Intake & Orders</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("setup")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all ${
                activeTab === "setup"
                  ? "bg-slate-900 text-white shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Settings size={13} />
              <span>Shop Setup</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {isLoading ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-emerald-600" size={28} />
            <p className="text-xs text-slate-500">Loading Shop Owner Portal...</p>
          </div>
        ) : (
          <>
            {/* Tab 1: Business Analytics */}
            {activeTab === "analytics" && <OwnerAnalyticsDashboard transactions={transactions} />}

            {/* Tab 2: Walk-In QR Intake & Live Orders */}
            {activeTab === "scanner" && (
              <WalkInIntake
                transactions={transactions}
                onTransactionsUpdated={refreshTransactions}
              />
            )}

            {/* Tab 3: Shop Setup */}
            {activeTab === "setup" && (
              <ShopSetupForm
                shops={shops}
                initialShop={shop || undefined}
                onSaved={(updated) => {
                  setShop(updated);
                  setShops((prev) => {
                    const idx = prev.findIndex((s) => s.id === updated.id);
                    if (idx >= 0) {
                      const next = [...prev];
                      next[idx] = updated;
                      return next;
                    }
                    return [updated, ...prev];
                  });
                }}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function OwnerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading...</div>}>
      <OwnerContent />
    </Suspense>
  );
}
