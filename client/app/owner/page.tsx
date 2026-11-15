"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentUserProfile, getCachedUserProfile, getLaundryShops, getLaundryTransactions } from "@/lib/supabase/auth";
import { UserProfile, LaundryShop, LaundryTransaction, UserRole } from "@/types/auth";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { OwnerAnalyticsDashboard } from "@/components/owner/OwnerAnalyticsDashboard";
import { WalkInIntake } from "@/components/owner/WalkInIntake";
import { ShopSetupForm } from "@/components/owner/ShopSetupForm";
import { BranchStaffManagement } from "@/components/owner/BranchStaffManagement";
import { ShopMessenger } from "@/components/messaging/ShopMessenger";
import { Loader2 } from "lucide-react";

function OwnerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "analytics";

  const [activeTab, setActiveTab] = useState<
    "analytics" | "scanner" | "setup" | "staff" | "messages"
  >(
    initialTab === "scanner"
      ? "scanner"
      : initialTab === "setup"
      ? "setup"
      : initialTab === "staff"
      ? "staff"
      : initialTab === "messages"
      ? "messages"
      : "analytics"
  );

  const [user, setUser] = useState<UserProfile | null>(() =>
    typeof window !== "undefined" ? getCachedUserProfile() : null
  );
  const [shop, setShop] = useState<LaundryShop | null>(null);
  const [shops, setShops] = useState<LaundryShop[]>([]);
  const [transactions, setTransactions] = useState<LaundryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (shops.length === 0 && !isLoading) {
      setActiveTab("setup");
      return;
    }
    if (tabParam === "scanner") {
      setActiveTab("scanner");
    } else if (tabParam === "setup") {
      setActiveTab("setup");
    } else if (tabParam === "staff") {
      setActiveTab("staff");
    } else if (tabParam === "messages") {
      setActiveTab("messages");
    } else {
      setActiveTab("analytics");
    }
  }, [searchParams, shops.length, isLoading]);

  const handleTabChange = (
    tab: "analytics" | "scanner" | "setup" | "staff" | "messages"
  ) => {
    // If owner has no shops yet, lock to setup
    if (shops.length === 0 && tab !== "setup") {
      setActiveTab("setup");
      router.push("/owner?tab=setup", { scroll: false });
      return;
    }
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
        const profile = await getCurrentUserProfile();

        if (!profile) {
          router.push("/login?redirect=/owner&message=" + encodeURIComponent("Please sign in to your shop owner account."));
          return;
        }

        // Dedicated restriction: Staff users cannot access the owner management portal
        if (profile.role === UserRole.STAFF) {
          router.replace("/staff");
          return;
        }

        // Dedicated restriction: Customer accounts cannot access the owner management portal
        if (profile.role === UserRole.COSTUMER) {
          router.replace("/customer");
          return;
        }

        setUser(profile);

        // Fetch strictly this owner's shops
        const ownerShops = await getLaundryShops(profile.id);
        setShops(ownerShops);
        if (ownerShops.length > 0) {
          setShop(ownerShops[0]);
        } else {
          setShop(null);
        }

        // Fetch strictly transactions belonging to this owner's registered shops
        const ownerShopIds = ownerShops.map((s) => s.id);
        const txList = await getLaundryTransactions(undefined, undefined, ownerShopIds);
        setTransactions(txList);
      } catch (err) {
        console.error("Failed to load owner data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadOwnerData();
  }, [router]);

  const refreshTransactions = async () => {
    if (!user) return;
    const ownerShopIds = shops.map((s) => s.id);
    const txList = await getLaundryTransactions(undefined, undefined, ownerShopIds);
    setTransactions(txList);
  };


  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col lg:flex-row">
      <DashboardNav
        user={user}
        hasShops={shops.length > 0}
        onRoleSwitched={(role) => {
          if (user) setUser({ ...user, role });
        }}
      />

      <main className="flex-1 min-w-0 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8 space-y-6">
        {/* Header for non-analytics tabs */}
        {activeTab !== "analytics" && (
          <div className="pb-2 border-b border-slate-100">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {activeTab === "scanner"
                ? "QR Intake & Counter Orders"
                : activeTab === "setup"
                ? "Laundry Shop Configuration"
                : activeTab === "staff"
                ? "Branch Staff Management"
                : "Customer Inquiries & Messages"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === "scanner"
                ? "Scan customer passes or manual check-in, set load weight, and update order status."
                : activeTab === "setup"
                ? "Manage your shop coordinates, machine capacities, pricing, and operating schedule."
                : activeTab === "staff"
                ? "Register and manage staff accounts, roles, and branch permissions."
                : "Read incoming customer inquiries, reply live, and answer questions across all your registered branches."}
            </p>
          </div>
        )}

        {/* Tab Content */}
        {isLoading ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-emerald-600" size={28} />
            <p className="text-xs text-slate-500">Loading Shop Owner Portal...</p>
          </div>
        ) : (
          <>
            {/* Tab 1: Business Analytics */}
            {activeTab === "analytics" && (
              <OwnerAnalyticsDashboard
                transactions={transactions}
                shop={shop}
                shops={shops}
                user={user}
                onNavigateTab={handleTabChange}
              />
            )}

            {/* Tab 2: Walk-In QR Intake & Live Orders */}
            {activeTab === "scanner" && (
              <WalkInIntake
                shops={shops}
                currentShop={shop}
                transactions={transactions}
                onTransactionsUpdated={refreshTransactions}
              />
            )}

            {/* Tab 3: Shop Setup */}
            {activeTab === "setup" && (
              <ShopSetupForm
                ownerId={user?.id}
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
                onDeleted={(deletedId) => {
                  setShops((prev) => {
                    const remaining = prev.filter((s) => s.id !== deletedId);
                    setShop(remaining.length > 0 ? remaining[0] : null);
                    return remaining;
                  });
                }}
              />
            )}

            {/* Tab 4: Branch Staff Management */}
            {activeTab === "staff" && (
              <BranchStaffManagement
                shops={shops}
                currentShop={shop}
                ownerId={user?.id}
              />
            )}

            {/* Tab 5: Customer Messages & Inquiries (Messenger Design) */}
            {activeTab === "messages" && user && (
              <ShopMessenger
                mode="owner"
                currentUser={user}
                shops={shops}
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
