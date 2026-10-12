"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Button } from "@/components/ui/Button";
import { LaundryMap, calculateDistanceKm } from "@/components/customer/LaundryMap";
import { ShopCard } from "@/components/customer/ShopCard";
import { getCurrentUserProfile, getLaundryShops, signOutUser } from "@/lib/supabase/auth";
import { LaundryShop, UserProfile, UserRole } from "@/types/auth";
import {
  MapPin,
  QrCode,
  Search,
  SlidersHorizontal,
  Star,
  ArrowUpDown,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  List,
  Map as MapIcon,
  X,
  Target,
  LogIn,
  UserPlus,
  Store,
  Loader2,
  LogOut,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";

function MapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [shops, setShops] = useState<LaundryShop[]>([]);
  const [selectedShop, setSelectedShop] = useState<LaundryShop | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(10);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"distance" | "rating" | "reviews">("distance");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Layout states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState<"map" | "list">("map");

  // Load shops and check if user is logged in (does NOT force login, allows guest browsing)
  useEffect(() => {
    async function loadMapData() {
      setIsLoading(true);
      try {
        const [profile, shopsList] = await Promise.all([
          getCurrentUserProfile(),
          getLaundryShops(),
        ]);
        setUser(profile);
        setShops(shopsList);

        const shopIdParam = searchParams.get("shopId");
        if (shopIdParam) {
          const matched = shopsList.find((s) => s.id === shopIdParam);
          if (matched) setSelectedShop(matched);
        } else if (shopsList.length > 0) {
          setSelectedShop(shopsList[0]);
        }
      } catch (err) {
        console.error("Failed to load map data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadMapData();
  }, [searchParams]);

  // Handle Walk-In QR action:
  // If user is a guest (not logged in), redirect immediately to login with redirect & friendly message.
  // If user is logged in, redirect to their customer Walk-In QR pass.
  const handleWalkInQR = (shop?: LaundryShop) => {
    const targetShop = shop || selectedShop;
    if (user) {
      const url = targetShop
        ? `/customer?tab=qr&shopId=${targetShop.id}`
        : "/customer?tab=qr";
      router.push(url);
    } else {
      const redirectPath = targetShop
        ? `/customer?tab=qr&shopId=${targetShop.id}`
        : "/customer?tab=qr";
      const message = "Please sign in or create an account to generate your Walk-In QR Fast Pass.";
      router.push(
        `/login?redirect=${encodeURIComponent(redirectPath)}&message=${encodeURIComponent(message)}`
      );
    }
  };

  const handleShowDirections = (shop: LaundryShop) => {
    setSelectedShop(shop);
    setMobileViewMode("map");
  };

  const handleLogout = async () => {
    await signOutUser();
    setUser(null);
  };

  // Filter and sort shops
  const filteredShops = useMemo(() => {
    let list = shops.map((s) => {
      const dist = userLocation
        ? calculateDistanceKm(userLocation[0], userLocation[1], s.latitude, s.longitude)
        : undefined;
      return { ...s, distance_km: dist };
    });

    // 1. Text Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q)
      );
    }

    // 2. Distance Radius Filter
    if (radiusKm !== null && radiusKm > 0) {
      list = list.filter((s) => {
        if (s.distance_km === undefined) return true;
        return s.distance_km <= radiusKm;
      });
    }

    // 3. Rating Filter
    if (minRating !== null && minRating > 0) {
      list = list.filter((s) => {
        const numericRating = Number(s.rating) || 0;
        return numericRating >= minRating;
      });
    }

    // 4. Sorting
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
  }, [shops, userLocation, radiusKm, minRating, sortBy, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Dedicated Public Map Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo & Page Title */}
          <div className="flex items-center gap-3">
            <BrandLogo size="md" href="/" />
            <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <MapPin size={12} className="text-blue-600" />
                Live Map
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {filteredShops.length} {filteredShops.length === 1 ? "branch" : "branches"}
              </span>
            </div>
          </div>

          {/* Desktop Right Actions: Guest or User */}
          <nav className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleWalkInQR()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-emerald-600 hover:bg-slate-50 border border-slate-200 cursor-pointer transition-colors shadow-2xs"
            >
              <QrCode size={14} className="text-emerald-600" />
              <span>Walk-In QR</span>
            </button>

            {(!user || user.role === UserRole.OWNER || user.role === UserRole.ADMIN) && (
              <Link href="/owner">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Store size={14} className="text-slate-600" />}
                >
                  Owner Portal
                </Button>
              </Link>
            )}

            <div className="h-4 w-px bg-slate-200 mx-1" />

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={
                    user.role === UserRole.STAFF
                      ? "/staff"
                      : user.role === UserRole.OWNER
                      ? "/owner"
                      : "/customer"
                  }
                >
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-xs"
                    leftIcon={<LayoutDashboard size={14} />}
                  >
                    Dashboard
                  </Button>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  Guest Mode
                </span>
                <Link href={`/login?redirect=${encodeURIComponent("/map")}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<LogIn size={14} />}
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    variant="success"
                    size="sm"
                    leftIcon={<UserPlus size={14} />}
                  >
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Right Actions */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => handleWalkInQR()}
              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1"
            >
              <QrCode size={14} />
              <span>QR</span>
            </button>

            {user ? (
              <Link
                href={
                  user.role === UserRole.STAFF
                    ? "/staff"
                    : user.role === UserRole.OWNER
                    ? "/owner"
                    : "/customer"
                }
              >
                <Button variant="primary" size="sm" className="text-xs px-2.5 h-8 bg-blue-600">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href={`/login?redirect=${encodeURIComponent("/map")}`}>
                <Button variant="outline" size="sm" className="text-xs px-2.5 h-8">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Whole-Page Map Workspace */}
      {isLoading ? (
        <div className="flex-1 min-h-[500px] flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-xs text-slate-500 font-medium">Loading Laundry Map &amp; Branches...</p>
        </div>
      ) : (
        <main
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
              onGenerateQR={handleWalkInQR}
              isFullScreen={isMapFullscreen}
              onToggleFullScreen={() => setIsMapFullscreen(!isMapFullscreen)}
              sidebarOpen={isSidebarOpen}
              className="w-full h-full rounded-none border-none"
            />
          </div>

          {/* Floating Top Controls Bar: Distance Radius Slider + Rating/Sort Filters */}
          <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-4 z-20 max-w-7xl mx-auto w-auto space-y-2 pointer-events-none">
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-lg p-2 sm:p-2.5 pointer-events-auto flex items-center justify-between gap-2.5">
              {/* Left: Distance Radius Slider & Presets */}
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
                  ].map((preset) => {
                    const isSelected = radiusKm === preset.value;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setRadiusKm(preset.value)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/80"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Filters Button, Mobile Toggle & Fullscreen */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all shadow-2xs ${
                    isFiltersExpanded || minRating !== null || sortBy !== "distance"
                      ? "bg-amber-500 text-white border-amber-600"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <SlidersHorizontal size={13} />
                  <span className="hidden sm:inline">Filters</span>
                  {(minRating !== null || sortBy !== "distance") && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </button>

                {/* Mobile Map / List Switcher */}
                <div className="flex lg:hidden items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
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

            {/* Expandable Filter Tray */}
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
            className={`hidden lg:flex flex-col absolute top-20 left-4 bottom-4 z-20 w-80 sm:w-96 lg:w-[410px] bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden ${
              isSidebarOpen
                ? "translate-x-0 opacity-100 pointer-events-auto"
                : "-translate-x-full opacity-0 pointer-events-none"
            }`}
          >
            {/* Sidebar Header with Search */}
            <div className="p-3.5 border-b border-slate-100 flex flex-col gap-2.5 shrink-0 bg-white/90">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Store size={16} className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Laundromats ({filteredShops.length})
                  </h3>
                </div>
                <div className="text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">
                  {radiusKm === null ? "All Distances" : `Within ${radiusKm}km`}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search branch name, street, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Shop Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 divide-y divide-slate-100">
              {filteredShops.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <MapPin size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-700">No Laundromats Found</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Try expanding the radius slider or changing your search terms.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRadiusKm(null);
                      setMinRating(null);
                      setSearchQuery("");
                    }}
                    className="mt-4 text-xs"
                  >
                    Reset Filters
                  </Button>
                </div>
              ) : (
                filteredShops.map((shop) => (
                  <div key={shop.id} className="pt-2 first:pt-0">
                    <ShopCard
                      shop={shop}
                      isSelected={selectedShop?.id === shop.id}
                      onSelect={(s) => setSelectedShop(s)}
                      onGenerateQR={() => handleWalkInQR(shop)}
                      onShowDirections={() => handleShowDirections(shop)}
                      distanceKm={shop.distance_km}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Desktop Sidebar Toggle Button */}
          <div className="hidden lg:block absolute top-20 left-4 z-10 pointer-events-auto">
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-lg text-xs font-bold text-slate-700 hover:text-blue-600 cursor-pointer"
              >
                <ChevronRight size={15} />
                <span>Show Shops ({filteredShops.length})</span>
              </button>
            )}
          </div>

          {/* Mobile List View (When Toggled) */}
          {mobileViewMode === "list" && (
            <div className="lg:hidden absolute inset-0 z-30 bg-slate-50 overflow-y-auto p-3 space-y-3 pt-20">
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                <span className="text-xs font-bold text-slate-800">
                  {filteredShops.length} Laundromats Nearby
                </span>
                <button
                  type="button"
                  onClick={() => setMobileViewMode("map")}
                  className="text-xs font-bold text-blue-600 flex items-center gap-1 cursor-pointer"
                >
                  <MapIcon size={14} />
                  Switch to Map
                </button>
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
                  onGenerateQR={() => handleWalkInQR(shop)}
                  onShowDirections={() => handleShowDirections(shop)}
                  distanceKm={shop.distance_km}
                />
              ))}
            </div>
          )}
        </main>
      )}
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-white">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-xs text-slate-500 font-medium">Loading Laundry Map...</p>
        </div>
      }
    >
      <MapPageContent />
    </Suspense>
  );
}
