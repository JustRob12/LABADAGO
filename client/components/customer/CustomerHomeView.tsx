"use client";

import React, { useState, useMemo, useEffect } from "react";
import { LaundryShop, UserProfile } from "@/types/auth";
import { formatTo12Hour } from "@/components/owner/ShopSetupForm";
import {
  Search,
  SlidersHorizontal,
  Star,
  MapPin,
  Clock,
  Sparkles,
  Store,
  ClipboardList,
  Heart,
  ChevronRight,
  Filter,
  X,
  Target,
  ArrowUpDown,
  Tag,
  Check,
} from "lucide-react";

interface CustomerHomeViewProps {
  user: UserProfile | null;
  shops: LaundryShop[];
  onSelectShop: (shop: LaundryShop) => void;
  onViewOrders: () => void;
  onOpenQR: (shop?: LaundryShop) => void;
  onOpenMap?: () => void;
  userLocation: [number, number] | null;
  radiusKm: number | null;
  onRadiusChange: (radius: number | null) => void;
  minRating: number | null;
  onRatingChange: (rating: number | null) => void;
  sortBy: "distance" | "rating" | "reviews";
  onSortChange: (sort: "distance" | "rating" | "reviews") => void;
}

// Fallback high-quality laundry storefront photos matching Image 1
const DEFAULT_SHOP_IMAGES = [
  "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?auto=format&fit=crop&w=800&q=80",
];

export const CustomerHomeView: React.FC<CustomerHomeViewProps> = ({
  user,
  shops,
  onSelectShop,
  onViewOrders,
  onOpenQR,
  onOpenMap,
  userLocation,
  radiusKm,
  onRadiusChange,
  minRating,
  onRatingChange,
  sortBy,
  onSortChange,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [favoriteShopIds, setFavoriteShopIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("labadago_favorite_shops");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist favorites
  const toggleFavorite = (shopId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteShopIds((prev) => {
      const next = prev.includes(shopId)
        ? prev.filter((id) => id !== shopId)
        : [...prev, shopId];
      try {
        localStorage.setItem("labadago_favorite_shops", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Time of day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const customerFirstName = useMemo(() => {
    if (!user?.full_name) return "Guest";
    return user.full_name.trim().split(" ")[0];
  }, [user]);

  // Filter and search shops
  const filteredShops = useMemo(() => {
    let list = [...shops];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.address.toLowerCase().includes(query) ||
          s.services?.some((srv) => srv.service_name.toLowerCase().includes(query))
      );
    }

    return list;
  }, [shops, searchQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 pb-24 lg:pb-12 animate-in fade-in duration-200">
      {/* 1. Search Bar with Filter Button (Matches Image 1 top search row) */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search laundry shops, services..."
            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white border border-slate-200/90 shadow-xs text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter Toggle Button */}
        <button
          type="button"
          onClick={() => setShowFilterDrawer(!showFilterDrawer)}
          className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-center justify-center shrink-0 ${
            showFilterDrawer || minRating !== null
              ? "bg-blue-50 border-blue-300 text-blue-600"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
          title="Filter and sort shops"
        >
          <SlidersHorizontal size={18} />
          {minRating !== null && (
            <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-2 right-2 ring-2 ring-white" />
          )}
        </button>
      </div>

      {/* Filter Popover / Expandable Drawer */}
      {showFilterDrawer && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-lg space-y-3.5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-blue-600" />
              <h4 className="text-xs font-bold text-slate-900">Filter &amp; Sort Registered Shops</h4>
            </div>
            <button
              type="button"
              onClick={() => setShowFilterDrawer(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rating Filter */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Minimum Rating
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: "All", value: null },
                  { label: "★ 4.5+", value: 4.5 },
                  { label: "★ 4.0+", value: 4.0 },
                  { label: "★ 3.5+", value: 3.5 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onRatingChange(item.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      minRating === item.value
                        ? "bg-amber-500 text-white shadow-2xs font-bold"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Order */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as any)}
                className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="distance">Nearest Distance</option>
                <option value="rating">Highest Rating ★</option>
                <option value="reviews">Most Reviews</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 2. Welcome Greeting Banner (Matches Image 1 "Good morning, Juan!") */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border border-blue-100/80 p-5 sm:p-6 shadow-xs">
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="space-y-1 sm:space-y-1.5 max-w-md">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{greeting}, {customerFirstName}!</span>
              <span className="text-2xl animate-bounce">👋</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Let&apos;s get your laundry done today.
            </p>
          </div>

          {/* SVG Laundry Machine & Basket Illustration (Matches Image 1 right illustration) */}
          <div className="shrink-0 w-24 sm:w-36 h-20 sm:h-28 flex items-center justify-center relative">
            <svg
              viewBox="0 0 160 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full drop-shadow-md select-none pointer-events-none"
            >
              {/* Washing Machine Body */}
              <rect x="70" y="15" width="80" height="95" rx="10" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2.5" />
              {/* Control Panel */}
              <rect x="75" y="20" width="70" height="16" rx="4" fill="#F1F5F9" />
              <circle cx="85" cy="28" r="4" fill="#3B82F6" />
              <rect x="95" y="26" width="30" height="4" rx="2" fill="#94A3B8" />
              <circle cx="137" cy="28" r="2.5" fill="#10B981" />
              {/* Drum Outer Ring */}
              <circle cx="110" cy="68" r="28" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
              {/* Drum Glass */}
              <circle cx="110" cy="68" r="22" fill="#60A5FA" fillOpacity="0.35" stroke="#3B82F6" strokeWidth="2" />
              {/* Water Waves inside Drum */}
              <path
                d="M93 68 C100 62, 105 74, 112 68 C119 62, 124 74, 127 68"
                stroke="#2563EB"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M95 75 C101 70, 107 80, 114 74 C120 70, 123 78, 125 75"
                stroke="#38BDF8"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Blue Laundry Basket (Left of Washer) */}
              <path
                d="M10 50 L18 105 C18 108, 22 110, 26 110 L58 110 C62 110, 66 108, 66 105 L74 50 Z"
                fill="#2563EB"
                stroke="#1D4ED8"
                strokeWidth="2"
              />
              {/* Basket Grid Lines */}
              <line x1="22" y1="65" x2="62" y2="65" stroke="#93C5FD" strokeWidth="2" />
              <line x1="24" y1="80" x2="60" y2="80" stroke="#93C5FD" strokeWidth="2" />
              <line x1="26" y1="95" x2="58" y2="95" stroke="#93C5FD" strokeWidth="2" />
              <line x1="32" y1="50" x2="36" y2="110" stroke="#93C5FD" strokeWidth="2" />
              <line x1="52" y1="50" x2="48" y2="110" stroke="#93C5FD" strokeWidth="2" />

              {/* Fluffy Towels folded in basket */}
              <ellipse cx="42" cy="48" rx="28" ry="12" fill="#E2E8F0" />
              <ellipse cx="42" cy="42" rx="24" ry="10" fill="#6EE7B7" />
              <ellipse cx="42" cy="36" rx="20" ry="8" fill="#F8FAFC" />

              {/* Detergent Bottle (Far Right) */}
              <rect x="135" y="45" width="20" height="35" rx="5" fill="#2563EB" />
              <rect x="140" y="38" width="10" height="7" rx="2" fill="#1D4ED8" />
              <circle cx="145" cy="62" r="5" fill="#93C5FD" />
            </svg>
          </div>
        </div>

        {/* Decorative soft blurred circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-200/30 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-200/30 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 3. Quick Action Shortcut Pills (Matches Image 1 3 buttons) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {/* Find Shops */}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("shops-section");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Store size={20} />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors text-center">
            Find Shops
          </span>
        </button>

        {/* My Orders */}
        <button
          type="button"
          onClick={onViewOrders}
          className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <ClipboardList size={20} />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-purple-600 transition-colors text-center">
            My Orders
          </span>
        </button>

        {/* Nearby Shops */}
        <button
          type="button"
          onClick={() => {
            if (onOpenMap) {
              onOpenMap();
            } else {
              const el = document.getElementById("shops-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }
          }}
          className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <MapPin size={20} />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors text-center">
            Nearby Shops
          </span>
        </button>
      </div>

      {/* 4. Nearby Laundry Shops Section (Matches Image 1 Shop Cards) */}
      <div id="shops-section" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              Nearby Laundry Shops
            </h3>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {filteredShops.length}
            </span>
          </div>
          {radiusKm !== null && (
            <button
              type="button"
              onClick={() => onRadiusChange(null)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
            >
              <span>View all</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Shop Cards Grid */}
        {filteredShops.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <Store size={36} className="mx-auto text-slate-300" />
            <h4 className="text-sm font-bold text-slate-700">No Laundry Shops Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              We couldn&apos;t find any laundry shops matching your search or radius filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                onRadiusChange(null);
                onRatingChange(null);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-2xs hover:bg-blue-700 transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredShops.map((shop, index) => {
              const isFavorited = favoriteShopIds.includes(shop.id);
              const shopImage =
                shop.images && shop.images.length > 0
                  ? shop.images[0]
                  : DEFAULT_SHOP_IMAGES[index % DEFAULT_SHOP_IMAGES.length];

              // Queue badge styling matching Image 1 (Light Queue, Moderate Queue, Busy)
              const queueInfo = {
                Low: { label: "Light Queue", color: "text-emerald-700 bg-emerald-50 border-emerald-200 dot:bg-emerald-500", turnaround: "Est. turnaround 2 hrs" },
                Moderate: { label: "Moderate Queue", color: "text-amber-700 bg-amber-50 border-amber-200 dot:bg-amber-500", turnaround: "Est. turnaround 3 hrs" },
                Busy: { label: "Busy", color: "text-red-700 bg-red-50 border-red-200 dot:bg-red-500", turnaround: "Est. turnaround 4-5 hrs" },
                Full: { label: "Full Capacity", color: "text-slate-700 bg-slate-100 border-slate-200 dot:bg-slate-400", turnaround: "Est. turnaround 5+ hrs" },
                Closed: { label: "Closed", color: "text-slate-500 bg-slate-100 border-slate-200 dot:bg-slate-400", turnaround: "Opens next morning" },
              }[shop.queue_status] || {
                label: "Light Queue",
                color: "text-emerald-700 bg-emerald-50 border-emerald-200 dot:bg-emerald-500",
                turnaround: "Est. turnaround 2 hrs",
              };

              const closeTimeStr = shop.close_time ? formatTo12Hour(shop.close_time) : "9:00 PM";
              const openStatusText = shop.is_open ? `Open • Closes ${closeTimeStr}` : "Closed";

              return (
                <div
                  key={shop.id}
                  onClick={() => onSelectShop(shop)}
                  className="group rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer flex flex-col"
                >
                  {/* Shop Cover Image */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={shopImage}
                      alt={shop.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                    {/* Shop Brand Title Badge on Signage */}
                    <div className="absolute bottom-3 left-3 right-12">
                      <div className="inline-block px-2.5 py-1 rounded-lg bg-blue-900/90 backdrop-blur-xs border border-blue-400/30 text-white font-extrabold text-xs uppercase tracking-wider truncate shadow-sm">
                        {shop.name}
                      </div>
                    </div>

                    {/* Heart / Favorite Button (Top Right) */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(shop.id, e)}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-600 hover:text-red-500 shadow-sm transition-transform active:scale-90"
                      title={isFavorited ? "Remove from Favorites" : "Add to Favorites"}
                    >
                      <Heart
                        size={16}
                        className={isFavorited ? "text-red-500 fill-red-500" : ""}
                      />
                    </button>
                  </div>

                  {/* Shop Card Body (Matches Image 1) */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      {/* Name */}
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {shop.name}
                      </h4>

                      {/* Rating & Distance */}
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-semibold text-amber-500">
                          <Star size={13} className="fill-amber-400" />
                          <span className="text-slate-800 font-bold">{shop.rating || 4.8}</span>
                          <span className="text-slate-400">({shop.total_reviews || 128})</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          <MapPin size={12} className="text-blue-500" />
                          {shop.distance_km !== undefined
                            ? `${shop.distance_km} km away`
                            : "2.3 km away"}
                        </span>
                      </div>

                      {/* Queue Status Badge */}
                      <div className="mt-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${queueInfo.color}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {queueInfo.label}
                        </span>
                      </div>

                      {/* Turnaround & Hours */}
                      <div className="mt-2.5 space-y-1 text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-slate-400 shrink-0" />
                          <span>{queueInfo.turnaround}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-emerald-500 shrink-0" />
                          <span className="font-medium text-slate-600">{openStatusText}</span>
                        </div>
                      </div>
                    </div>

                    {/* Explore Services Button (Image 1 blue button) */}
                    <button
                      type="button"
                      onClick={() => onSelectShop(shop)}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-wide transition-all shadow-2xs hover:shadow-sm cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                    >
                      <span>Explore Services</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Special Offers Just for You! Banner (Matches Image 1 bottom banner) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50 via-sky-50 to-emerald-50 border border-blue-200/80 p-4 sm:p-5 shadow-xs">
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Promo Ribbon Badge Icon */}
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Tag size={20} />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">
                Special Offers Just for You!
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Check out exclusive promotions and discount bundles from top laundry shops.
              </p>
            </div>
          </div>

          {/* Clean folded laundry & detergent graphic (Matches Image 1) */}
          <div className="shrink-0 hidden sm:flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-lg bg-white/90 border border-emerald-200 text-emerald-700 text-xs font-extrabold shadow-2xs">
              % Promo
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

