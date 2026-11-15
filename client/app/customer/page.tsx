"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getCurrentUserProfile,
  getCachedUserProfile,
  getLaundryShops,
  getLaundryTransactions,
  getTransactionsByTrackingNumbers,
} from "@/lib/supabase/auth";
import { UserProfile, LaundryShop, LaundryTransaction, UserRole } from "@/types/auth";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { LaundryMap, calculateDistanceKm } from "@/components/customer/LaundryMap";
import { CustomerHomeView } from "@/components/customer/CustomerHomeView";
import { ShopServicesView } from "@/components/customer/ShopServicesView";
import { ShopRouteNavigation } from "@/components/customer/ShopRouteNavigation";
import { WalkInQRGenerator } from "@/components/customer/WalkInQRGenerator";
import { CustomerOrderTracker } from "@/components/customer/CustomerOrderTracker";
import { Button } from "@/components/ui/Button";
import {
  MapPin,
  QrCode,
  Package,
  Loader2,
  Store,
  ChevronLeft,
} from "lucide-react";

type CustomerViewTab = "home" | "map" | "services" | "route" | "qr" | "orders";

export function CustomerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab & View determination from URL
  const [activeTab, setActiveTab] = useState<CustomerViewTab>(() => {
    const tabParam = searchParams.get("tab");
    const viewParam = searchParams.get("view");
    if (tabParam === "map") return "map";
    if (tabParam === "qr") return "qr";
    if (tabParam === "orders") return "orders";
    if (viewParam === "route") return "route";
    if (viewParam === "services") return "services";
    return "home";
  });

  const [user, setUser] = useState<UserProfile | null>(() =>
    typeof window !== "undefined" ? getCachedUserProfile() : null
  );
  const [shops, setShops] = useState<LaundryShop[]>([]);
  const [transactions, setTransactions] = useState<LaundryTransaction[]>([]);
  const [selectedShop, setSelectedShop] = useState<LaundryShop | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"distance" | "rating" | "reviews">("distance");
  const [isLoading, setIsLoading] = useState(true);

  // Sync with browser URL search parameters
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const viewParam = searchParams.get("view");
    const shopIdParam = searchParams.get("shopId");

    if (tabParam === "map") {
      setActiveTab("map");
    } else if (tabParam === "qr") {
      setActiveTab("qr");
    } else if (tabParam === "orders") {
      setActiveTab("orders");
    } else if (viewParam === "route") {
      setActiveTab("route");
    } else if (viewParam === "services" || (shopIdParam && !tabParam)) {
      setActiveTab("services");
    } else {
      setActiveTab("home");
    }

    if (shopIdParam && shops.length > 0) {
      const targetShop = shops.find((s) => s.id === shopIdParam);
      if (targetShop) {
        setSelectedShop(targetShop);
      }
    }
  }, [searchParams, shops]);

  // Request user geolocation once
  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          // Fallback to Mati City / Metro Manila default
          setUserLocation([14.6500, 121.0500]);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // Load initial customer data (Supports both logged-in users and guests)
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const profile = await getCurrentUserProfile();

        // Restrict branch staff to staff counter scanner
        if (profile?.role === UserRole.STAFF) {
          router.replace("/staff");
          return;
        }

        setUser(profile || null);

        // Fetch all registered laundry shops
        const shopsList = await getLaundryShops();
        setShops(shopsList);

        // Match shopId if present in query string
        const urlShopId = searchParams.get("shopId");
        const foundShop = urlShopId ? shopsList.find((s) => s.id === urlShopId) : null;
        if (foundShop) {
          setSelectedShop(foundShop);
        } else if (shopsList.length > 0) {
          setSelectedShop((prev) => (prev ? (shopsList.find((s) => s.id === prev.id) || prev) : shopsList[0]));
        }

        // Fetch customer transactions (or guest saved orders)
        if (profile) {
          const txList = await getLaundryTransactions(profile.id);
          setTransactions(txList);
        } else if (typeof window !== "undefined") {
          try {
            const guestTrackingNumbers: string[] = JSON.parse(
              localStorage.getItem("labadago_guest_tracking_numbers") || "[]"
            );
            if (guestTrackingNumbers.length > 0) {
              const txList = await getTransactionsByTrackingNumbers(guestTrackingNumbers);
              setTransactions(txList);
            } else {
              setTransactions([]);
            }
          } catch {
            setTransactions([]);
          }
        }
      } catch (err) {
        console.error("Failed to load customer data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [router]);

  // Listen for global rating updates from reviews
  useEffect(() => {
    const handleRatingUpdate = async () => {
      const refreshedShops = await getLaundryShops();
      setShops(refreshedShops);
    };
    window.addEventListener("labadago:rating-updated", handleRatingUpdate);
    return () => {
      window.removeEventListener("labadago:rating-updated", handleRatingUpdate);
    };
  }, []);

  const refreshTransactions = async () => {
    if (user) {
      const txList = await getLaundryTransactions(user.id);
      setTransactions(txList);
    } else if (typeof window !== "undefined") {
      try {
        const guestTrackingNumbers: string[] = JSON.parse(
          localStorage.getItem("labadago_guest_tracking_numbers") || "[]"
        );
        if (guestTrackingNumbers.length > 0) {
          const txList = await getTransactionsByTrackingNumbers(guestTrackingNumbers);
          setTransactions(txList);
        } else {
          setTransactions([]);
        }
      } catch {
        setTransactions([]);
      }
    }
  };

  useEffect(() => {
    if (activeTab === "orders") {
      refreshTransactions();
      const interval = setInterval(refreshTransactions, 3000);
      window.addEventListener("focus", refreshTransactions);
      return () => {
        clearInterval(interval);
        window.removeEventListener("focus", refreshTransactions);
      };
    }
  }, [activeTab]);

  // Compute shop distances and filter by radius & rating
  const processedShops = useMemo(() => {
    let list = shops.map((s) => {
      const dist = userLocation
        ? calculateDistanceKm(userLocation[0], userLocation[1], s.latitude, s.longitude)
        : undefined;
      return { ...s, distance_km: dist };
    });

    if (radiusKm !== null && radiusKm > 0) {
      list = list.filter((s) => {
        if (s.distance_km === undefined) return true;
        return s.distance_km <= radiusKm;
      });
    }

    if (minRating !== null && minRating > 0) {
      list = list.filter((s) => (Number(s.rating) || 0) >= minRating);
    }

    if (sortBy === "distance") {
      list.sort((a, b) => (a.distance_km || 9999) - (b.distance_km || 9999));
    } else if (sortBy === "rating") {
      list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (sortBy === "reviews") {
      list.sort((a, b) => (b.total_reviews || 0) - (a.total_reviews || 0));
    }

    return list;
  }, [shops, radiusKm, userLocation, minRating, sortBy]);

  // Handlers for switching views
  const handleSelectShop = (shop: LaundryShop) => {
    setSelectedShop(shop);
    setActiveTab("services");
    router.push(`/customer?shopId=${shop.id}&view=services`, { scroll: false });
  };

  const handleViewRoute = (shop: LaundryShop) => {
    setSelectedShop(shop);
    setActiveTab("route");
    router.push(`/customer?shopId=${shop.id}&view=route`, { scroll: false });
  };

  const handlePrepareQR = (shop?: LaundryShop) => {
    if (shop) setSelectedShop(shop);
    setActiveTab("qr");
    const q = shop ? `?tab=qr&shopId=${shop.id}` : "?tab=qr";
    router.push(`/customer${q}`, { scroll: false });
  };

  const handleReturnToHome = () => {
    setActiveTab("home");
    router.push("/customer", { scroll: false });
  };

  const handleSwitchTab = (tab: CustomerViewTab) => {
    setActiveTab(tab);
    if (tab === "home") {
      router.push("/customer", { scroll: false });
    } else if (tab === "map") {
      router.push("/customer?tab=map", { scroll: false });
    } else if (tab === "qr") {
      const q = selectedShop ? `?tab=qr&shopId=${selectedShop.id}` : "?tab=qr";
      router.push(`/customer${q}`, { scroll: false });
    } else if (tab === "orders") {
      router.push("/customer?tab=orders", { scroll: false });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col lg:flex-row">
      <DashboardNav
        user={user}
        onRoleSwitched={(role) => {
          if (user) setUser({ ...user, role });
        }}
      />

      {/* Loading State */}
      {isLoading ? (
        <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-xs text-slate-500 font-medium">Loading LabadaGo...</p>
        </div>
      ) : activeTab === "home" ? (
        /* ========================================================================= */
        /* VIEW 1: CUSTOMER HOME DASHBOARD (Matches Image 1 - Figure 12)             */
        /* ========================================================================= */
        <main className="flex-1 w-full">
          <CustomerHomeView
            user={user}
            shops={processedShops}
            onSelectShop={handleSelectShop}
            onViewOrders={() => handleSwitchTab("orders")}
            onOpenQR={handlePrepareQR}
            onOpenMap={() => handleSwitchTab("map")}
            userLocation={userLocation}
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
            minRating={minRating}
            onRatingChange={setMinRating}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </main>
      ) : activeTab === "map" ? (
        /* ========================================================================= */
        /* VIEW: FULL MAP NAVIGATION (Display All Registered Shops)                  */
        /* ========================================================================= */
        <main className="flex-1 w-full flex flex-col h-[100dvh] lg:h-[calc(100vh)] min-h-0 relative">
          {/* Top Header Navigation - Hidden on Mobile to give clean full-screen map */}
          <div className="hidden lg:flex bg-white border-b border-slate-200 px-4 py-2.5 items-center justify-between z-20 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReturnToHome}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 py-1 px-2 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>Return to Home</span>
              </button>
              <div className="h-4 w-px bg-slate-200" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <MapPin size={15} className="text-blue-600" />
                All Registered Laundry Shops ({shops.length})
              </h2>
            </div>

            {/* Quick Switcher - Desktop Only (Hidden on Mobile) */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => handleSwitchTab("home")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <Store size={13} />
                <span className="hidden sm:inline">Home</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-2xs"
              >
                <MapPin size={13} />
                <span>Map</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchTab("qr")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <QrCode size={13} />
                <span className="hidden sm:inline">Walk-In QR</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchTab("orders")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <Package size={13} />
                <span className="hidden sm:inline">Orders</span>
              </button>
            </div>
          </div>

          <div className="flex-1 w-full h-full relative min-h-0">
            <LaundryMap
              shops={shops}
              selectedShop={selectedShop}
              onSelectShop={(shop) => {
                setSelectedShop(shop);
              }}
              userLocation={userLocation}
              onUserLocationDetected={(coords) => setUserLocation(coords)}
              radiusKm={null}
              onGenerateQR={handlePrepareQR}
            />
          </div>
        </main>
      ) : activeTab === "services" && selectedShop ? (
        /* ========================================================================= */
        /* VIEW 2: SHOP SERVICES & DETAILS (Matches Image 2 - Shop Services)         */
        /* ========================================================================= */
        <main className="flex-1 w-full">
          <ShopServicesView
            shop={selectedShop}
            onBack={handleReturnToHome}
            onViewRoute={handleViewRoute}
            onPrepareQR={handlePrepareQR}
            distanceKm={
              userLocation
                ? calculateDistanceKm(userLocation[0], userLocation[1], selectedShop.latitude, selectedShop.longitude)
                : selectedShop.distance_km
            }
          />
        </main>
      ) : activeTab === "route" && selectedShop ? (
        /* ========================================================================= */
        /* VIEW 3: ROUTE & NAVIGATION (Matches Image 3 - Route to Shop)              */
        /* ========================================================================= */
        <main className="flex-1 w-full">
          <ShopRouteNavigation
            shop={selectedShop}
            userLocation={userLocation}
            onBack={() => {
              setActiveTab("services");
              router.push(`/customer?shopId=${selectedShop.id}&view=services`, { scroll: false });
            }}
            onViewDetails={() => {
              setActiveTab("services");
              router.push(`/customer?shopId=${selectedShop.id}&view=services`, { scroll: false });
            }}
            distanceKm={
              userLocation
                ? calculateDistanceKm(userLocation[0], userLocation[1], selectedShop.latitude, selectedShop.longitude)
                : selectedShop.distance_km
            }
          />
        </main>
      ) : (
        /* ========================================================================= */
        /* TABS: QR WALK-IN PASS GENERATOR & ORDER TRACKER                           */
        /* ========================================================================= */
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8 space-y-6 animate-in fade-in">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={handleReturnToHome}
                  className="hidden lg:inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 -ml-1 py-0.5 px-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <ChevronLeft size={16} />
                  <span>Return to Home</span>
                </button>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {activeTab === "qr" ? "Walk-In Fast Pass QR" : "My Laundry Orders"}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeTab === "qr"
                  ? "Generate your fast pass QR code to drop off your clothes at the counter."
                  : "Track the live status, wash stage, and receipts of your laundry."}
              </p>
            </div>

            {/* Quick Tab Switcher - Desktop Only (Hidden on Mobile) */}
            <div className="hidden lg:inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => handleSwitchTab("home")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <Store size={14} />
                <span>Home</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchTab("map")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-slate-600 hover:text-slate-900"
              >
                <MapPin size={14} />
                <span>Map</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchTab("qr")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "qr"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <QrCode size={14} />
                <span>Walk-In QR</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchTab("orders")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "orders"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package size={14} />
                <span>My Orders ({transactions.length})</span>
              </button>
            </div>
          </div>

          {/* Tab: Walk-In Fast Pass */}
          {activeTab === "qr" && (
            <WalkInQRGenerator
              user={user}
              shops={shops}
              initialShopId={selectedShop?.id || searchParams.get("shopId") || undefined}
              transactions={transactions}
              onTransactionCreated={refreshTransactions}
              onReturnToMap={handleReturnToHome}
              onViewOrderTracker={() => handleSwitchTab("orders")}
            />
          )}

          {/* Tab: Order Tracker */}
          {activeTab === "orders" && (
            <CustomerOrderTracker
              transactions={transactions}
              onRefresh={refreshTransactions}
              onReturnToMap={handleReturnToHome}
            />
          )}
        </main>
      )}
    </div>
  );
}

export default function CustomerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-medium">Loading LabadaGo...</div>}>
      <CustomerContent />
    </Suspense>
  );
}
