"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentUserProfile, getCachedUserProfile, getLaundryShops, getLaundryTransactions } from "@/lib/supabase/auth";
import { UserProfile, LaundryShop, LaundryTransaction, UserRole } from "@/types/auth";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { LaundryMap, calculateDistanceKm } from "@/components/customer/LaundryMap";
import { ShopCard } from "@/components/customer/ShopCard";
import { WalkInQRGenerator } from "@/components/customer/WalkInQRGenerator";
import { CustomerOrderTracker } from "@/components/customer/CustomerOrderTracker";
import { Button } from "@/components/ui/Button";
import {
  MapPin,
  QrCode,
  Package,
  Loader2,
  Sparkles,
  Store,
  Target,
  SlidersHorizontal,
  Star,
  ArrowUpDown,
  Filter,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  List,
  Map as MapIcon,
  X,
  Navigation,
  Sliders,
} from "lucide-react";

export function CustomerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "map";

  const [activeTab, setActiveTab] = useState<"map" | "qr" | "orders">(
    initialTab === "qr" ? "qr" : initialTab === "orders" ? "orders" : "map"
  );

  const [user, setUser] = useState<UserProfile | null>(() =>
    typeof window !== "undefined" ? getCachedUserProfile() : null
  );
  const [shops, setShops] = useState<LaundryShop[]>([]);
  const [transactions, setTransactions] = useState<LaundryTransaction[]>([]);
  const [selectedShop, setSelectedShop] = useState<LaundryShop | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(10);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"distance" | "rating" | "reviews">("distance");
  const [isLoading, setIsLoading] = useState(true);

  // Full-screen map states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState<"map" | "list">("map");

  // Sync tab from URL query params
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
        const profile = await getCurrentUserProfile();

        if (!profile) {
          // If accessing private features (QR pass generator or Order tracker), redirect to login
          if (initialTab === "qr" || initialTab === "orders") {
            router.push(
              "/login?redirect=" +
                encodeURIComponent(`/customer?tab=${initialTab}`) +
                "&message=" +
                encodeURIComponent(
                  initialTab === "qr"
                    ? "Please sign in or create an account to generate your Walk-In QR Fast Pass."
                    : "Please sign in to view your orders."
                )
            );
            return;
          }
          // Redirect unauthenticated guests to public /map
          router.replace("/map");
          return;
        } else if (profile.role === UserRole.STAFF) {
          // Branch staff cannot browse customer portal; redirect to counter scanner
          router.replace("/staff");
          return;
        }

        setUser(profile);

        // Fetch all available shops
        const shopsList = await getLaundryShops();
        setShops(shopsList);
        if (shopsList.length > 0) {
          setSelectedShop(shopsList[0]);
        }

        // Fetch customer transactions if user is logged in
        if (profile) {
          const txList = await getLaundryTransactions(profile.id);
          setTransactions(txList);
        }
      } catch (err) {
        console.error("Failed to load customer data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [router, initialTab]);

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
    if (!user) return;
    const txList = await getLaundryTransactions(user.id);
    setTransactions(txList);
  };

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
    if (!user && (tab === "qr" || tab === "orders")) {
      router.push(
        "/login?redirect=" +
          encodeURIComponent(`/customer?tab=${tab}`) +
          "&message=" +
          encodeURIComponent(
            tab === "qr"
              ? "Please sign in or create an account to generate your Walk-In QR Fast Pass."
              : "Please sign in to view your active laundry orders."
          )
      );
      return;
    }
    setActiveTab(tab);
    if (tab === "map") {
      router.push("/customer", { scroll: false });
    } else {
      router.push(`/customer?tab=${tab}`, { scroll: false });
    }
  };

  const handleSelectShopForQR = (shop: LaundryShop) => {
    if (!user) {
      router.push(
        "/login?redirect=" +
          encodeURIComponent(`/customer?tab=qr&shopId=${shop.id}`) +
          "&message=" +
          encodeURIComponent("Please sign in or create an account to generate your Walk-In QR Fast Pass.")
      );
      return;
    }
    setSelectedShop(shop);
    setActiveTab("qr");
    router.push(`/customer?tab=qr&shopId=${shop.id}`, { scroll: false });
  };

  // When user clicks Directions, select shop and switch to map view
  const handleShowDirections = (shop: LaundryShop) => {
    setSelectedShop(shop);
    setMobileViewMode("map");
  };

  // Sort and filter shops by distance radius & customer rating
  const filteredShops = useMemo(() => {
    let list = shops.map((s) => {
      const dist = userLocation
        ? calculateDistanceKm(userLocation[0], userLocation[1], s.latitude, s.longitude)
        : undefined;
      return { ...s, distance_km: dist };
    });

    // 1. Distance Radius Filter
    if (radiusKm !== null && radiusKm > 0) {
      list = list.filter((s) => {
        if (s.distance_km === undefined) return true;
        return s.distance_km <= radiusKm;
      });
    }

    // 2. Rating Filter
    if (minRating !== null && minRating > 0) {
      list = list.filter((s) => {
        const numericRating = Number(s.rating) || 0;
        return numericRating >= minRating;
      });
    }

    // 3. Sorting
    if (sortBy === "distance") {
      list.sort((a, b) => {
        if (a.distance_km === undefined && b.distance_km === undefined) return 0;
        if (a.distance_km === undefined) return 1;
        if (b.distance_km === undefined) return -1;
        return a.distance_km - b.distance_km;
      });
    } else if (sortBy === "rating") {
      list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (sortBy === "reviews") {
      list.sort((a, b) => (b.total_reviews || 0) - (a.total_reviews || 0));
    }

    return list;
  }, [shops, radiusKm, userLocation, minRating, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
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
          <p className="text-xs text-slate-500">Loading Customer Portal...</p>
        </div>
      ) : activeTab === "map" ? (
        /* ========================================================================= */
        /* TAB 1: FULL SCREEN MAP WORKSPACE                                         */
        /* ========================================================================= */
        <div
          className={`relative w-full overflow-hidden flex flex-col ${
            isMapFullscreen
              ? "fixed inset-0 z-50 bg-white h-screen w-screen"
              : "flex-1 h-[calc(100vh-64px)] min-h-[550px]"
          }`}
        >
          {/* CARTO Leaflet Map (Fills 100% width and 100% height) */}
          <div className="absolute inset-0 w-full h-full z-0">
            <LaundryMap
              shops={filteredShops}
              selectedShop={selectedShop}
              onSelectShop={(s) => setSelectedShop(s)}
              userLocation={userLocation}
              onUserLocationDetected={(coords) => setUserLocation(coords)}
              radiusKm={radiusKm}
              onGenerateQR={handleSelectShopForQR}
              isFullScreen={isMapFullscreen}
              onToggleFullScreen={() => setIsMapFullscreen(!isMapFullscreen)}
              sidebarOpen={isSidebarOpen}
              className="w-full h-full rounded-none border-none"
            />
          </div>

          {/* Floating Top Controls Bar (Header + Tab Switcher + Filters) */}
          <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-4 z-20 max-w-7xl mx-auto w-auto space-y-2 pointer-events-none">
            {/* Main Floating Glass Bar (Clean Single Row without Duplicate Tabs) */}
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-lg p-2 sm:p-2.5 pointer-events-auto flex items-center justify-between gap-2.5">
              {/* Left: Interactive Kilometer Radius Slider */}
              <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200/90 shadow-2xs">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Target size={14} className="text-blue-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 hidden sm:inline">Radius:</span>
                  <span className="text-[11px] font-extrabold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs shrink-0">
                    {radiusKm ? `${radiusKm} km` : "All"}
                  </span>
                </div>

                {/* Range Slider */}
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={radiusKm || 50}
                    onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
                    className="w-20 sm:w-28 md:w-36 h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    title="Slide to filter shops by kilometer distance"
                  />
                </div>

                {/* Quick Presets */}
                <div className="hidden md:flex items-center gap-1 shrink-0 pl-1 border-l border-slate-200">
                  {[
                    { label: "1km", value: 1 },
                    { label: "3km", value: 3 },
                    { label: "5km", value: 5 },
                    { label: "10km", value: 10 },
                    { label: "All", value: null },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setRadiusKm(preset.value)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                        radiusKm === preset.value
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "bg-white text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Controls & Toggles */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Filter Expand / Collapse Button */}
                <button
                  type="button"
                  onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isFiltersExpanded || minRating
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  title="Toggle Rating & Sorting Filters"
                >
                  <Filter size={13} />
                  <span className="hidden sm:inline">Rating / Sort</span>
                  {minRating && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  )}
                </button>

                {/* Desktop Sidebar Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="hidden lg:flex px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  title="Toggle Shops Sidebar"
                >
                  <Store size={13} className="text-blue-600" />
                  <span>{isSidebarOpen ? "Hide Shops" : `Show Shops (${filteredShops.length})`}</span>
                </button>

                {/* Mobile View Switcher (Map vs List) */}
                <div className="flex lg:hidden rounded-xl border border-slate-200 bg-slate-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => setMobileViewMode("map")}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                      mobileViewMode === "map"
                        ? "bg-white text-blue-600 shadow-2xs"
                        : "text-slate-500"
                    }`}
                    title="Map View"
                  >
                    <MapIcon size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileViewMode("list")}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                      mobileViewMode === "list"
                        ? "bg-white text-blue-600 shadow-2xs"
                        : "text-slate-500"
                    }`}
                    title="List View"
                  >
                    <List size={14} />
                  </button>
                </div>

                {/* Fullscreen Button */}
                <button
                  type="button"
                  onClick={() => setIsMapFullscreen(!isMapFullscreen)}
                  className="p-1.5 sm:p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                  title={isMapFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
                >
                  {isMapFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
              </div>
            </div>

            {/* Expandable Rating & Sorting Filters Tray */}
            {isFiltersExpanded && (
              <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl p-3 sm:p-4 pointer-events-auto space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mr-1">
                      <Star size={13} className="text-amber-500 fill-amber-500" />
                      Minimum Rating:
                    </span>
                    {[
                      { label: "All", value: null },
                      { label: "★ 4.5+", value: 4.5 },
                      { label: "★ 4.0+", value: 4.0 },
                      { label: "★ 3.5+", value: 3.5 },
                      { label: "★ 3.0+", value: 3.0 },
                    ].map((item) => {
                      const isSelected = minRating === item.value;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => setMinRating(item.value)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                            isSelected
                              ? "bg-amber-500 text-white font-bold shadow-2xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <ArrowUpDown size={12} />
                      Sort:
                    </span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-800 focus:outline-none"
                    >
                      <option value="distance">Nearest Distance</option>
                      <option value="rating">Highest Rated ★</option>
                      <option value="reviews">Most Reviews</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setIsFiltersExpanded(false)}
                      className="text-slate-400 hover:text-slate-700 p-1 ml-1 cursor-pointer"
                      title="Close filters"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Floating Left Sidebar (Collapsible) */}
          <div
            className={`hidden lg:flex flex-col absolute top-24 left-4 bottom-4 z-20 w-80 sm:w-96 lg:w-[410px] bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden ${
              isSidebarOpen
                ? "translate-x-0 opacity-100 pointer-events-auto"
                : "-translate-x-full opacity-0 pointer-events-none"
            }`}
          >
            {/* Sidebar Header */}
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Store size={16} className="text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {radiusKm
                    ? `Shops Within ${radiusKm} km (${filteredShops.length})`
                    : `Nearby Laundry Shops (${filteredShops.length})`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                title="Collapse Sidebar to View Full Screen Map"
              >
                <ChevronLeft size={18} />
              </button>
            </div>

            {/* Sidebar Scrollable Shops List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {filteredShops.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <Store size={32} className="mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-700">No Shops Found in Range</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Try expanding your distance radius slider or clearing the rating filter.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRadiusKm(null);
                      setMinRating(null);
                    }}
                    className="text-xs mt-2"
                  >
                    Reset All Filters
                  </Button>
                </div>
              ) : (
                filteredShops.map((shop) => (
                  <ShopCard
                    key={shop.id}
                    shop={shop}
                    isSelected={selectedShop?.id === shop.id}
                    onSelect={(s) => setSelectedShop(s)}
                    onShowDirections={handleShowDirections}
                    onGenerateQR={handleSelectShopForQR}
                    distanceKm={shop.distance_km}
                  />
                ))
              )}
            </div>
          </div>

          {/* Floating Expand Sidebar Button when Collapsed (Desktop) */}
          {!isSidebarOpen && (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="hidden lg:flex absolute top-24 left-4 z-20 bg-white/95 backdrop-blur-md border border-slate-200 px-3.5 py-2 rounded-xl shadow-lg text-xs font-bold text-slate-800 hover:text-blue-600 hover:bg-slate-50 items-center gap-2 transition-all cursor-pointer animate-in fade-in"
            >
              <Store size={15} className="text-blue-600" />
              <span>Browse Shops ({filteredShops.length})</span>
              <ChevronRight size={16} />
            </button>
          )}



          {/* Mobile Full List View (Overlay) */}
          {mobileViewMode === "list" && (
            <div className="lg:hidden absolute inset-0 z-30 bg-slate-50 overflow-y-auto p-4 pt-20 pb-16 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Nearby Shops ({filteredShops.length})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMobileViewMode("map")}
                  className="text-xs h-8 flex items-center gap-1 font-bold text-blue-600 border-blue-200"
                >
                  <MapPin size={13} />
                  Back to Map
                </Button>
              </div>

              {filteredShops.map((shop) => (
                <ShopCard
                  key={shop.id}
                  shop={shop}
                  isSelected={selectedShop?.id === shop.id}
                  onSelect={(s) => {
                    setSelectedShop(s);
                    setMobileViewMode("map");
                  }}
                  onShowDirections={handleShowDirections}
                  onGenerateQR={handleSelectShopForQR}
                  distanceKm={shop.distance_km}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* TABS 2 & 3: QR CODE GENERATOR & ORDER TRACKER                             */
        /* ========================================================================= */
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8 space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Customer Laundry Portal
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate walk-in QR passes and track live order progress.
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => handleTabChange("map")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                <MapPin size={13} />
                <span>Map &amp; Shops</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("qr")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeTab === "qr"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <QrCode size={13} />
                <span>Walk-In QR</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("orders")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeTab === "orders"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package size={13} />
                <span>My Orders ({transactions.length})</span>
              </button>
            </div>
          </div>

          {/* Tab 2: Walk-In Fast Pass */}
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

          {/* Tab 3: Order Tracker */}
          {activeTab === "orders" && (
            <CustomerOrderTracker
              transactions={transactions}
              onRefresh={refreshTransactions}
              onReturnToMap={() => handleTabChange("map")}
            />
          )}
        </main>
      )}
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
