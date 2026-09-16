"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getCurrentUserProfile, getLaundryShops, getLaundryTransactions } from "@/lib/supabase/auth";
import { UserProfile, LaundryShop, LaundryTransaction, UserRole } from "@/types/auth";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { LaundryMap, calculateDistanceKm } from "@/components/customer/LaundryMap";
import { ShopCard } from "@/components/customer/ShopCard";
import { WalkInQRGenerator } from "@/components/customer/WalkInQRGenerator";
import { CustomerOrderTracker } from "@/components/customer/CustomerOrderTracker";
import { MapPin, QrCode, Package, Loader2, Sparkles } from "lucide-react";

function CustomerContent() {
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
  const [isLoading, setIsLoading] = useState(true);

  // Sync tab from URL query params
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "qr" || tabParam === "orders" || tabParam === "map") {
      setActiveTab(tabParam);
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

  const handleSelectShopForQR = (shop: LaundryShop) => {
    setSelectedShop(shop);
    setActiveTab("qr");
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

          {/* Tab Navigation */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("map")}
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
              onClick={() => setActiveTab("qr")}
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
              onClick={() => setActiveTab("orders")}
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Leaflet Interactive Map */}
                <div className="lg:col-span-7">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-blue-600" />
                        <h2 className="text-sm font-bold text-slate-900">
                          Interactive Laundry Shop Map (Leaflet)
                        </h2>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Showing {shops.length} Partner Shops
                      </span>
                    </div>

                    <LaundryMap
                      shops={shops}
                      selectedShop={selectedShop}
                      onSelectShop={(s) => setSelectedShop(s)}
                      userLocation={userLocation}
                      onUserLocationDetected={(coords) => setUserLocation(coords)}
                    />
                  </div>
                </div>

                {/* Right: Shop Directory & Service Catalog */}
                <div className="lg:col-span-5 space-y-3 max-h-[700px] overflow-y-auto pr-1">
                  <div className="flex items-center justify-between pb-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Nearby Laundry Shops
                    </h3>
                    <span className="text-xs text-blue-600 font-medium">Click shop to view on map</span>
                  </div>

                  {shops.map((shop) => {
                    const distance = userLocation
                      ? calculateDistanceKm(
                          userLocation[0],
                          userLocation[1],
                          shop.latitude,
                          shop.longitude
                        )
                      : undefined;

                    return (
                      <ShopCard
                        key={shop.id}
                        shop={shop}
                        isSelected={selectedShop?.id === shop.id}
                        onSelect={(s) => setSelectedShop(s)}
                        onGenerateQR={handleSelectShopForQR}
                        distanceKm={distance}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Walk-In Fast Pass (QR Code Generator) */}
            {activeTab === "qr" && (
              <WalkInQRGenerator
                user={user}
                shops={shops}
                initialShopId={selectedShop?.id}
                onTransactionCreated={refreshTransactions}
              />
            )}

            {/* Tab 3: My Orders & Tracker */}
            {activeTab === "orders" && (
              <CustomerOrderTracker
                transactions={transactions}
                onRefresh={refreshTransactions}
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
