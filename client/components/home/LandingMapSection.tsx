"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LaundryShop, UserProfile } from "@/types/auth";
import { getCurrentUserProfile, getLaundryShops } from "@/lib/supabase/auth";
import { LaundryMap, calculateDistanceKm } from "@/components/customer/LaundryMap";
import { ShopCard } from "@/components/customer/ShopCard";
import { Button } from "@/components/ui/Button";
import {
  MapPin,
  QrCode,
  Sparkles,
  Store,
  SlidersHorizontal,
  Star,
  ArrowUpDown,
  Search,
  List,
  Map as MapIcon,
  X,
  Navigation,
  Compass,
  ChevronLeft,
  ChevronRight,
  Info,
  LogIn,
} from "lucide-react";

interface LandingMapSectionProps {
  initialShops?: LaundryShop[];
}

export const LandingMapSection: React.FC<LandingMapSectionProps> = ({ initialShops = [] }) => {
  const router = useRouter();

  const [shops, setShops] = useState<LaundryShop[]>(initialShops);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedShop, setSelectedShop] = useState<LaundryShop | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(10);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"distance" | "rating" | "reviews">("distance");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState<"map" | "list">("map");

  // Load shops and check user session
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const [profile, shopsList] = await Promise.all([
          getCurrentUserProfile(),
          getLaundryShops(),
        ]);
        setUser(profile);
        setShops(shopsList);
        if (shopsList.length > 0) {
          setSelectedShop(shopsList[0]);
        }
      } catch (err) {
        console.error("Failed to load landing map data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Listen for live rating updates
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

  // Handle Walk-In QR action: Redirect to /login if guest, or /customer?tab=qr if authenticated
  const handleWalkInQR = (shop?: LaundryShop) => {
    const targetShopId = shop ? shop.id : selectedShop?.id;
    if (user) {
      const url = targetShopId
        ? `/customer?tab=qr&shopId=${targetShopId}`
        : "/customer?tab=qr";
      router.push(url);
    } else {
      const redirectPath = targetShopId
        ? `/customer?tab=qr&shopId=${targetShopId}`
        : "/customer?tab=qr";
      const message = "Please sign in or create an account to generate your Walk-In QR Fast Pass.";
      router.push(
        `/login?redirect=${encodeURIComponent(redirectPath)}&message=${encodeURIComponent(message)}`
      );
    }
  };

  // Show directions to a shop on the map
  const handleShowDirections = (shop: LaundryShop) => {
    setSelectedShop(shop);
    setMobileViewMode("map");
    // Smooth scroll down to map if user is further up
    const mapElement = document.getElementById("landing-map-container");
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
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
    <section id="landing-map-container" className="w-full relative scroll-mt-6">
      {/* Top Header Card: Title, Radius Slider, and Filters */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-lg p-4 sm:p-5 mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <MapPin size={12} className="text-blue-600" />
                Live Laundromat Map
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {filteredShops.length} {filteredShops.length === 1 ? "branch" : "branches"} available
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
              Explore Nearby Laundromats &amp; Queue Status
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Browse branches, live machine capacity, shortest road routes, and walk-in counter passes.
            </p>
          </div>

          {/* Guest Mode Indicator / Log In Callout */}
          {!user && (
            <div className="flex items-center gap-2 bg-amber-50/80 border border-amber-200/80 rounded-xl px-3 py-2 text-xs text-amber-800 self-start md:self-auto shrink-0 shadow-2xs">
              <Info size={15} className="text-amber-600 shrink-0" />
              <div className="leading-snug">
                <span className="font-semibold">Guest Browsing:</span> No account needed to check wait times!
              </div>
            </div>
          )}
        </div>

        {/* Controls Row: Search, Distance Radius Slider & Action Toggles */}
        <div className="pt-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by branch name, street, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Distance Radius Slider & Presets */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1.5">
                <Navigation size={13} className="text-blue-600" />
                Radius:
                <span className="text-blue-600 font-extrabold ml-0.5">
                  {radiusKm === null ? "All" : `${radiusKm} km`}
                </span>
              </span>

              {/* Range slider input */}
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={radiusKm === null ? 50 : radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-20 sm:w-28 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                title="Adjust distance radius in kilometers"
              />
            </div>

            {/* Quick preset pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { label: "1km", value: 1 },
                { label: "3km", value: 3 },
                { label: "5km", value: 5 },
                { label: "10km", value: 10 },
                { label: "All", value: null },
              ].map((item) => {
                const isSelected = radiusKm === item.value;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setRadiusKm(item.value)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Ratings & Sort Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all shadow-2xs ${
                isFiltersExpanded || minRating !== null || sortBy !== "distance"
                  ? "bg-amber-500 text-white border-amber-600"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Filters</span>
              {(minRating !== null || sortBy !== "distance") && (
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              )}
            </button>

            {/* Mobile View Mode Switcher (Map vs List) */}
            <div className="flex md:hidden items-center bg-slate-100 p-1 rounded-xl border border-slate-200 ml-auto">
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
          </div>
        </div>

        {/* Expandable Filter Tray */}
        {isFiltersExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-700 flex items-center gap-1 mr-1">
                <Star size={13} className="text-amber-500 fill-amber-500" />
                Minimum Rating:
              </span>
              {[
                { label: "All", value: null },
                { label: "★ 4.5+", value: 4.5 },
                { label: "★ 4.0+", value: 4.0 },
                { label: "★ 3.5+", value: 3.5 },
              ].map((item) => {
                const isSelected = minRating === item.value;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setMinRating(item.value)}
                    className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-all ${
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
              <span className="text-slate-500 flex items-center gap-1">
                <ArrowUpDown size={12} />
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-800 focus:outline-none"
              >
                <option value="distance">Nearest Distance</option>
                <option value="rating">Highest Rated ★</option>
                <option value="reviews">Most Reviews</option>
              </select>

              <button
                type="button"
                onClick={() => setIsFiltersExpanded(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                title="Close filters"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Map & Shops Showcase Container */}
      <div className="relative w-full h-[540px] sm:h-[620px] lg:h-[720px] rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden bg-slate-100">
        {/* Desktop Sidebar Toggle Tab */}
        <div className="hidden lg:block absolute top-4 left-4 z-30 pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-blue-600 px-3 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
            title={isSidebarOpen ? "Collapse shop list" : "Expand shop list"}
          >
            {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            <span>{isSidebarOpen ? "Hide Shops" : `Browse Shops (${filteredShops.length})`}</span>
          </button>
        </div>

        {/* Desktop Floating Left Sidebar (Collapsible) */}
        <div
          className={`hidden lg:flex flex-col absolute top-16 left-4 bottom-4 z-20 w-80 sm:w-96 lg:w-[410px] bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden ${
            isSidebarOpen
              ? "translate-x-0 opacity-100 pointer-events-auto"
              : "-translate-x-full opacity-0 pointer-events-none"
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/90">
            <div>
              <div className="flex items-center gap-1.5">
                <Store size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Laundromats ({filteredShops.length})
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Click a branch to view queue &amp; shortest route
              </p>
            </div>

            <div className="text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">
              {radiusKm === null ? "All Distances" : `Within ${radiusKm}km`}
            </div>
          </div>

          {/* Scrollable Shop Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 divide-y divide-slate-100">
            {filteredShops.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <MapPin size={24} />
                </div>
                <p className="text-sm font-bold text-slate-700">No Laundromats Found</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Try expanding the kilometer radius slider or changing your search filters.
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
                  Reset All Filters
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

        {/* Mobile View: Render either Map or List based on toggle */}
        <div className="w-full h-full">
          {/* Map is active or on desktop */}
          <div
            className={`w-full h-full ${
              mobileViewMode === "list" ? "hidden md:block" : "block"
            }`}
          >
            <LaundryMap
              shops={filteredShops}
              selectedShop={selectedShop}
              onSelectShop={setSelectedShop}
              userLocation={userLocation}
              onUserLocationDetected={setUserLocation}
              radiusKm={radiusKm}
              className="w-full h-full"
              onGenerateQR={() => handleWalkInQR(selectedShop || undefined)}
              sidebarOpen={isSidebarOpen}
            />
          </div>

          {/* Mobile List Mode */}
          {mobileViewMode === "list" && (
            <div className="md:hidden w-full h-full overflow-y-auto bg-slate-50 p-3 space-y-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  {filteredShops.length} Laundromats Nearby
                </span>
                <button
                  type="button"
                  onClick={() => setMobileViewMode("map")}
                  className="text-xs font-bold text-blue-600 flex items-center gap-1 cursor-pointer"
                >
                  <MapIcon size={13} />
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
        </div>
      </div>
    </section>
  );
};
