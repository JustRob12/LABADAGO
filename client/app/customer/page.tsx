"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentUserProfile, getLaundryShops, getLaundryTransactions } from "@/lib/supabase/auth";
import { UserProfile, LaundryShop, LaundryTransaction, UserRole } from "@/types/auth";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { LaundryMap, calculateDistanceKm } from "@/components/customer/LaundryMap";
import { ShopCard } from "@/components/customer/ShopCard";
import { WalkInQRGenerator } from "@/components/customer/WalkInQRGenerator";
import { CustomerOrderTracker } from "@/components/customer/CustomerOrderTracker";
import { Button } from "@/components/ui/Button";
import { MapPin, QrCode, Package, Loader2, Sparkles, Store, Target, SlidersHorizontal, User } from "lucide-react";

function CustomerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "map";

  const [activeTab, setActiveTab] = useState<"map" | "qr" | "orders">(
    initialTab === "qr" ? "qr" : initialTab === "orders" ? "orders" : "map"
  );

  const [user, setUser] = useState<UserProfile | null>(null);
  const [shops, setShops] = useState<LaundryShop[]>([]);
  const [transactions, setTransactions] = useState<LaundryTransaction[]>([]);
  const [selectedShop, setSelectedShop] = useState<LaundryShop | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(10);
  const [isLoading, setIsLoading] = useState(true);

  // Sync tab from URL query params (defaulting cleanly to map if no tab param)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "qr") {
      setActiveTab("qr");
    } else if (tabParam === "orders") {
      setActiveTab("orders");
    } else {
      setActiveTab("map");
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [profile, shopsList, txList] = await Promise.all([
          getCurrentUserProfile(),
          getLaundryShops(),
          getLaundryTransactions(),
        ]);

        if (!profile) {
          router.push("/login?redirect=/customer&message=" + encodeURIComponent("Please sign in or create an account to access the Customer Portal."));
          return;
        }

        setUser(profile);
        setShops(shopsList);
        if (shopsList.length > 0) {
          setSelectedShop(shopsList[0]);
        }
        setTransactions(txList);
      } catch (err) {
        console.error("Failed to load customer data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const refreshTransactions = async () => {
    const txList = await getLaundryTransactions();
    setTransactions(txList);
  };

  // Auto-refresh order status in background when customer is viewing order tracker
  useEffect(() => {
    if (activeTab === "orders") {
      refreshTransactions();
      const interval = setInterval(() => {
        refreshTransactions();
      }, 3000);
      const onFocus = () => refreshTransactions();
      window.addEventListener("focus", onFocus);
      return () => {
        clearInterval(interval);
        window.removeEventListener("focus", onFocus);
      };
    }
  }, [activeTab]);

  const handleTabChange = (tab: "map" | "qr" | "orders") => {
    setActiveTab(tab);
    if (tab === "map") {
      router.push("/customer", { scroll: false });
    } else {
      router.push(`/customer?tab=${tab}`, { scroll: false });
    }
  };

  const handleSelectShopForQR = (shop: LaundryShop) => {
    setSelectedShop(shop);
    setActiveTab("qr");
    router.push("/customer?tab=qr", { scroll: false });
  };

  // Sort and filter shops by distance radius (Facebook Marketplace style)
  const filteredShops = useMemo(() => {
    const list = shops.map((s) => {
      const dist = userLocation
        ? calculateDistanceKm(userLocation[0], userLocation[1], s.latitude, s.longitude)
        : undefined;
      return { ...s, distanceKm: dist };
    });

    if (userLocation) {
      list.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    }

    if (radiusKm !== null && userLocation) {
      return list.filter((s) => s.distanceKm !== undefined && s.distanceKm <= radiusKm);
    }

    return list;
  }, [shops, radiusKm, userLocation]);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <DashboardNav
        user={user}
        onRoleSwitched={(role) => {
          if (user) setUser({ ...user, role });
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8 space-y-6">
        {/* Customer Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Customer Laundry Portal
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Locate nearby laundromats, check real-time machine queue, generate walk-in QR passes, and track orders.
            </p>
          </div>

          {/* Tab Navigation (Hidden on mobile/tablet since bottom floating nav handles tabs) */}
          <div className="hidden lg:inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => handleTabChange("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all ${
                activeTab === "map"
                  ? "bg-blue-600 text-white shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MapPin size={13} />
              <span>Map & Shops</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("qr")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all ${
                activeTab === "qr"
                  ? "bg-emerald-600 text-white shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <QrCode size={13} />
              <span>Walk-In QR</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("orders")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all ${
                activeTab === "orders"
                  ? "bg-blue-600 text-white shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Package size={13} />
              <span>My Orders ({transactions.length})</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-blue-600" size={28} />
            <p className="text-xs text-slate-500">Loading Customer Portal...</p>
          </div>
        ) : (
          <>
            {/* Tab 1: Map and Shop Locator */}
            {activeTab === "map" && (
              <div className="space-y-4">
                {/* Distance Radius Filter (Facebook Marketplace Style) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                      <Target size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Distance Radius</span>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          {radiusKm ? `Within ${radiusKm} km` : "All Distances"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Showing {filteredShops.length} of {shops.length} partner shops inside your search circle
                      </p>
                    </div>
                  </div>

                  {/* Preset Pills and Slider */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: "1 km", value: 1 },
                      { label: "3 km", value: 3 },
                      { label: "5 km", value: 5 },
                      { label: "10 km", value: 10 },
                      { label: "25 km", value: 25 },
                      { label: "All", value: null },
                    ].map((preset) => {
                      const isActive = radiusKm === preset.value;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setRadiusKm(preset.value)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                            isActive
                              ? "bg-blue-600 text-white shadow-2xs"
                              : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}

                    {/* Interactive Slider */}
                    <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                      <SlidersHorizontal size={13} className="text-slate-400 shrink-0" />
                      <input
                        type="range"
                        min="1"
                        max="50"
                        step="1"
                        value={radiusKm || 50}
                        onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
                        className="w-20 sm:w-24 accent-blue-600 cursor-pointer"
                        title="Adjust kilometer radius"
                      />
                      <span className="text-[11px] font-mono font-semibold text-slate-700 w-9 text-right">
                        {radiusKm ? `${radiusKm}km` : "All"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Leaflet Interactive Map */}
                  <div className="lg:col-span-7">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-blue-600" />
                          <h2 className="text-sm font-bold text-slate-900">
                            Interactive Laundry Shop Map
                          </h2>
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {radiusKm
                            ? `${filteredShops.length} within ${radiusKm} km`
                            : `${filteredShops.length} Partner Shops`}
                        </span>
                      </div>

                      <LaundryMap
                        shops={filteredShops}
                        selectedShop={selectedShop}
                        onSelectShop={(s) => setSelectedShop(s)}
                        userLocation={userLocation}
                        onUserLocationDetected={(coords) => setUserLocation(coords)}
                        radiusKm={radiusKm}
                      />
                    </div>
                  </div>

                  {/* Right: Shop Directory & Service Catalog */}
                  <div className="lg:col-span-5 space-y-3 max-h-[700px] overflow-y-auto pr-1">
                    <div className="flex items-center justify-between pb-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {radiusKm
                          ? `Shops Within ${radiusKm} km (${filteredShops.length})`
                          : `All Nearby Laundry Shops (${filteredShops.length})`}
                      </h3>
                      <span className="text-xs text-blue-600 font-medium">Click shop to view route</span>
                    </div>

                    {shops.length === 0 ? (
                      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                          <Store size={22} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">No Laundry Shops Found Yet</h4>
                          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                            There are currently no partner shops listed in the database. Are you a shop owner? Set up your shop in the Owner Portal to appear live on this map.
                          </p>
                        </div>
                        <Link href="/owner?tab=setup">
                          <Button variant="outline" size="sm" className="text-xs mt-1">
                            Open Shop Setup
                          </Button>
                        </Link>
                      </div>
                    ) : filteredShops.length === 0 ? (
                      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                          <Target size={22} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">No Shops Within {radiusKm} km</h4>
                          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                            No registered laundry shops found inside your {radiusKm} km search circle. Expand your radius to view nearby shops.
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setRadiusKm(25)}
                            className="text-xs"
                          >
                            Expand to 25 km
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setRadiusKm(null)}
                            className="text-xs"
                          >
                            Show All ({shops.length})
                          </Button>
                        </div>
                      </div>
                    ) : (
                      filteredShops.map((shop) => (
                        <ShopCard
                          key={shop.id}
                          shop={shop}
                          isSelected={selectedShop?.id === shop.id}
                          onSelect={(s) => setSelectedShop(s)}
                          onGenerateQR={handleSelectShopForQR}
                          distanceKm={shop.distanceKm}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Walk-In Fast Pass (QR Code Generator) */}
            {activeTab === "qr" && (
              <WalkInQRGenerator
                user={user}
                shops={shops}
                initialShopId={selectedShop?.id}
                transactions={transactions}
                onTransactionCreated={refreshTransactions}
                onReturnToMap={() => handleTabChange("map")}
                onViewOrderTracker={() => handleTabChange("orders")}
              />
            )}

            {/* Tab 3: My Orders & Tracker */}
            {activeTab === "orders" && (
              <CustomerOrderTracker
                transactions={transactions}
                onRefresh={refreshTransactions}
                onReturnToMap={() => handleTabChange("map")}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function CustomerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading...</div>}>
      <CustomerContent />
    </Suspense>
  );
}
