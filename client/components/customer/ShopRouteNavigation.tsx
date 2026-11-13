"use client";

import React, { useEffect, useRef, useState } from "react";
import { LaundryShop } from "@/types/auth";
import { formatTo12Hour } from "@/components/owner/ShopSetupForm";
import { calculateDistanceKm } from "@/components/customer/LaundryMap";
import { patchLeafletPos } from "@/lib/utils/leafletPatch";
import {
  ArrowLeft,
  Navigation,
  Car,
  Footprints,
  Bike,
  Star,
  MapPin,
  Clock,
  LocateFixed,
  MoreVertical,
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  X,
} from "lucide-react";

interface ShopRouteNavigationProps {
  shop: LaundryShop;
  userLocation: [number, number] | null;
  onBack: () => void;
  onViewDetails: () => void;
  distanceKm?: number;
}

const CARTO_API_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY || "cb1_430d_1_0464d8b330e7d05226c320d8";
const withCartoKey = (baseUrl: string) => {
  if (!CARTO_API_KEY) return baseUrl;
  return `${baseUrl}?key=${CARTO_API_KEY}`;
};

export const ShopRouteNavigation: React.FC<ShopRouteNavigationProps> = ({
  shop,
  userLocation,
  onBack,
  onViewDetails,
  distanceKm: initialDistanceKm,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const routeLayerGroupRef = useRef<any>(null);
  const leafletModuleRef = useRef<any>(null);

  // Travel Mode: Drive, Walk, Bike (Matches Image 3)
  const [travelMode, setTravelMode] = useState<"drive" | "walk" | "bike">("drive");
  const [isNavigating, setIsNavigating] = useState(false);

  // Location & ETA states
  const effectiveUserLocation: [number, number] = userLocation || [14.6500, 121.0500];
  const distanceKm =
    initialDistanceKm ||
    calculateDistanceKm(
      effectiveUserLocation[0],
      effectiveUserLocation[1],
      shop.latitude,
      shop.longitude
    );

  // Dynamic travel time calculation based on mode
  const travelDurations = {
    drive: Math.max(1, Math.round((distanceKm / 22) * 60)), // ~22 km/h city drive
    walk: Math.max(1, Math.round((distanceKm / 4.5) * 60)), // ~4.5 km/h walk
    bike: Math.max(1, Math.round((distanceKm / 14) * 60)), // ~14 km/h bike
  };

  const activeDurationMins = travelDurations[travelMode];

  const closeTimeStr = shop.close_time ? formatTo12Hour(shop.close_time) : "9:00 PM";
  const coverImage =
    shop.images && shop.images.length > 0
      ? shop.images[0]
      : "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80";

  // Initialize Route Leaflet Map
  useEffect(() => {
    let isCancelled = false;

    async function initMap() {
      if (!mapContainerRef.current) return;

      // 1. Load Leaflet dynamically
      const L = await import("leaflet");
      if (isCancelled || !mapContainerRef.current) return;
      leafletModuleRef.current = L;
      patchLeafletPos(L);

      // 2. Clear existing map instance
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (_) {}
        mapInstanceRef.current = null;
      }

      // 3. Create Leaflet map centered between user and shop
      const map = L.map(mapContainerRef.current, {
        center: [
          (effectiveUserLocation[0] + shop.latitude) / 2,
          (effectiveUserLocation[1] + shop.longitude) / 2,
        ],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      // Add CARTO Voyager tile basemap
      L.tileLayer(withCartoKey("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"), {
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      // Layer group for routes and markers
      const routeGroup = L.layerGroup().addTo(map);
      routeLayerGroupRef.current = routeGroup;

      // 4. Render Origin (User Location) Marker (Pulsing Blue Ring - Matches Image 3)
      const userIcon = L.divIcon({
        className: "custom-user-marker",
        html: `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(59, 130, 246, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 16px; height: 16px; border-radius: 50%; background: #2563EB; border: 3px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker(effectiveUserLocation, { icon: userIcon, zIndexOffset: 1000 })
        .addTo(routeGroup)
        .bindTooltip("Your Current Location", {
          permanent: false,
          direction: "top",
          className: "leaflet-custom-tooltip font-bold text-xs",
        });

      // 5. Render Destination (Laundry Shop) Marker (Red Pin - Matches Image 3)
      const shopIcon = L.divIcon({
        className: "custom-shop-marker",
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: #EF4444; border: 3px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div style="background: white; border: 1px solid #E2E8F0; border-radius: 6px; padding: 1px 6px; font-size: 10px; font-weight: 800; color: #1E293B; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 3px; white-space: nowrap;">
              ${shop.name}
            </div>
          </div>
        `,
        iconSize: [32, 48],
        iconAnchor: [16, 32],
      });

      L.marker([shop.latitude, shop.longitude], { icon: shopIcon, zIndexOffset: 900 }).addTo(routeGroup);

      // 6. Fetch / Generate OSRM Street Route
      drawRoutePolyline(L, map, routeGroup, effectiveUserLocation, [shop.latitude, shop.longitude]);
    }

    initMap();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (_) {}
        mapInstanceRef.current = null;
      }
    };
  }, [shop, effectiveUserLocation]);

  // Re-draw route track & midpoint badge
  const drawRoutePolyline = async (
    L: any,
    map: any,
    group: any,
    userCoords: [number, number],
    shopCoords: [number, number]
  ) => {
    const [userLat, userLng] = userCoords;
    const [shopLat, shopLng] = shopCoords;

    const renderTrack = (latLngs: [number, number][], dist: number, mins: number) => {
      // 1. Road shadow casing
      L.polyline(latLngs, {
        color: "#1E3A8A",
        weight: 7,
        opacity: 0.2,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(group);

      // 2. Main route path (Vibrant Blue - Matches Image 3)
      const roadLine = L.polyline(latLngs, {
        color: "#2563EB",
        weight: 4.5,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(group);

      // 3. Animated traffic pulse line
      L.polyline(latLngs, {
        color: "#93C5FD",
        weight: 2,
        dashArray: "6, 12",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(group);

      // 4. Midpoint Route Badge (Matches Image 3 "8 min | 2.3 km" floating badge)
      const midIdx = Math.floor(latLngs.length / 2);
      const midPoint = latLngs[midIdx] || [(userLat + shopLat) / 2, (userLng + shopLng) / 2];

      const badgeIcon = L.divIcon({
        className: "custom-route-badge",
        html: `
          <div style="background: #1E3A8A; color: white; padding: 4px 8px; border-radius: 8px; font-size: 11px; font-weight: 800; box-shadow: 0 4px 10px rgba(0,0,0,0.25); white-space: nowrap; border: 1.5px solid #60A5FA; display: flex; flex-direction: column; align-items: center; line-height: 1.2;">
            <span>${mins} min</span>
            <span style="font-size: 9px; opacity: 0.85; font-weight: 600;">${dist} km</span>
          </div>
        `,
        iconSize: [60, 32],
        iconAnchor: [30, 16],
      });

      L.marker(midPoint, { icon: badgeIcon, interactive: false }).addTo(group);

      // Fit map bounds comfortably around the route
      map.fitBounds(roadLine.getBounds(), { padding: [50, 50], maxZoom: 16 });
    };

    // Try OSRM driving/walking service
    try {
      const modeParam = travelMode === "walk" ? "foot" : "driving";
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/${modeParam}/${userLng},${userLat};${shopLng},${shopLat}?overview=full&geometries=geojson`
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.code === "Ok" && data.routes && data.routes.length > 0) {
          const rawCoords = data.routes[0].geometry.coordinates;
          const roadLatLngs: [number, number][] = rawCoords.map((c: any) => [c[1], c[0]]);
          const dist = parseFloat((data.routes[0].distance / 1000).toFixed(1));
          renderTrack(roadLatLngs, dist, activeDurationMins);
          return;
        }
      }
    } catch (_) {
      // fallback
    }

    // Grid fallback route if offline
    const steps = 6;
    const gridPoints: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lat = userLat + (shopLat - userLat) * t;
      const lng = userLng + (shopLng - userLng) * (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
      gridPoints.push([lat, lng]);
    }
    renderTrack(gridPoints, distanceKm, activeDurationMins);
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(effectiveUserLocation, 16, { animate: true });
    }
  };

  // Launch Native GPS Turn-by-Turn in Google Maps / Apple Maps
  const handleLaunchExternalNavigation = () => {
    const isIOS =
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent);

    const modeParam = travelMode === "walk" ? "walking" : travelMode === "bike" ? "bicycling" : "driving";

    if (isIOS) {
      window.open(
        `maps://maps.apple.com/?saddr=${effectiveUserLocation[0]},${effectiveUserLocation[1]}&daddr=${shop.latitude},${shop.longitude}&dirflg=${travelMode === "walk" ? "w" : "d"}`,
        "_blank"
      );
    } else {
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${effectiveUserLocation[0]},${effectiveUserLocation[1]}&destination=${shop.latitude},${shop.longitude}&travelmode=${modeParam}`,
        "_blank"
      );
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col h-[calc(100vh-64px)] min-h-[600px] overflow-hidden bg-slate-100">
      {/* 1. Header Bar (Matches Image 3 "Route to CleanWave Laundry") */}
      <div className="absolute top-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 py-3 flex items-center justify-between shadow-2xs">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-slate-700 hover:text-slate-900 font-semibold text-xs sm:text-sm p-1 -ml-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate max-w-[220px] sm:max-w-md text-center">
          Route to {shop.name}
        </h2>

        <div className="w-12 sm:w-16" />
      </div>

      {/* 2. Top Floating Shop Info Card (Matches Image 3 Floating Header Card) */}
      <div className="absolute top-16 inset-x-3 sm:inset-x-4 z-20 max-w-2xl mx-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-3 shadow-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
              <img src={coverImage} alt={shop.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                {shop.name}
              </h4>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                <span className="flex items-center gap-0.5 font-bold text-amber-500">
                  <Star size={11} className="fill-amber-400" />
                  <span>{shop.rating || 4.8}</span>
                  <span className="text-slate-400 font-normal">({shop.total_reviews || 128})</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-semibold text-emerald-600">Open • Closes {closeTimeStr}</span>
                <span className="text-slate-300">•</span>
                <span>{distanceKm} km away</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onViewDetails}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
          >
            View Details
          </button>
        </div>
      </div>

      {/* 3. Interactive Leaflet Map (Fills background, underneath cards) */}
      <div className="relative flex-1 w-full h-full z-0">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Locate Me Crosshair Button (Matches Image 3 circular map button) */}
        <button
          type="button"
          onClick={handleRecenter}
          className="absolute right-4 bottom-72 z-20 w-11 h-11 rounded-full bg-white border border-slate-200/90 shadow-lg flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
          title="Re-center on Your Location"
        >
          <LocateFixed size={20} />
        </button>
      </div>

      {/* Live Turn-by-Turn Simulation Banner (When navigation started) */}
      {isNavigating && (
        <div className="absolute top-32 inset-x-3 sm:inset-x-4 z-20 max-w-2xl mx-auto animate-in slide-in-from-top-2">
          <div className="bg-emerald-600 text-white rounded-2xl p-3.5 shadow-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Navigation size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">
                  Head northeast on P. Pimentel Ave toward Don Enrique Lopez St
                </p>
                <p className="text-[11px] text-emerald-100 mt-0.5">
                  Arriving at {shop.name} in {activeDurationMins} minutes ({distanceKm} km)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsNavigating(false)}
              className="p-1 rounded-lg text-emerald-200 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 4. Directions Bottom Sheet / Panel (Matches Image 3 Directions bottom section) */}
      <div className="relative z-20 bg-white border-t border-slate-200/90 rounded-t-3xl shadow-2xl p-4 sm:p-5 space-y-4">
        {/* Directions Origin -> Destination List (Matches Image 3) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Directions
          </h3>

          <div className="relative flex items-center justify-between gap-3 bg-slate-50/80 rounded-2xl p-3 border border-slate-100">
            {/* Origin & Destination Stops */}
            <div className="flex-1 space-y-3">
              {/* Origin */}
              <div className="flex items-start gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100 mt-1 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    Your Current Location
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Mati City, Davao Oriental
                  </p>
                </div>
              </div>

              {/* Dotted connecting line */}
              <div className="ml-1 -my-1 border-l-2 border-dotted border-slate-300 h-4" />

              {/* Destination */}
              <div className="flex items-start gap-2.5">
                <MapPin size={13} className="text-red-500 fill-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {shop.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {distanceKm} km away • {shop.address}
                  </p>
                </div>
              </div>
            </div>

            {/* Swap Button (Matches Image 3) */}
            <button
              type="button"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              title="Reverse origin and destination"
            >
              <ArrowUpDown size={16} />
            </button>
          </div>
        </div>

        {/* Travel Mode Selector Tabs (Matches Image 3 [ Drive | Walk | Bike ]) */}
        <div className="grid grid-cols-3 gap-2">
          {/* Drive */}
          <button
            type="button"
            onClick={() => setTravelMode("drive")}
            className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              travelMode === "drive"
                ? "bg-blue-50 border-blue-400 text-blue-700 font-bold shadow-2xs"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Car size={16} />
            <div className="text-left">
              <span className="block text-xs leading-none">Drive</span>
              <span className="text-[10px] opacity-75 font-medium">{travelDurations.drive} min</span>
            </div>
          </button>

          {/* Walk */}
          <button
            type="button"
            onClick={() => setTravelMode("walk")}
            className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              travelMode === "walk"
                ? "bg-blue-50 border-blue-400 text-blue-700 font-bold shadow-2xs"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Footprints size={16} />
            <div className="text-left">
              <span className="block text-xs leading-none">Walk</span>
              <span className="text-[10px] opacity-75 font-medium">{travelDurations.walk} min</span>
            </div>
          </button>

          {/* Bike */}
          <button
            type="button"
            onClick={() => setTravelMode("bike")}
            className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              travelMode === "bike"
                ? "bg-blue-50 border-blue-400 text-blue-700 font-bold shadow-2xs"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Bike size={16} />
            <div className="text-left">
              <span className="block text-xs leading-none">Bike</span>
              <span className="text-[10px] opacity-75 font-medium">{travelDurations.bike} min</span>
            </div>
          </button>
        </div>

        {/* Route Overview (Matches Image 3) */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div>
            <h5 className="font-bold text-slate-900">Route Overview</h5>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Via P. Pimentel Ave and Don Enrique Lopez St
            </p>
          </div>
          <div className="text-right">
            <span className="font-extrabold text-slate-900 block text-sm">
              {activeDurationMins} min
            </span>
            <span className="text-[11px] text-slate-400">{distanceKm} km</span>
          </div>
        </div>

        {/* Primary Action: Start Navigation (Matches Image 3 blue button) */}
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => {
              setIsNavigating(true);
              handleLaunchExternalNavigation();
            }}
            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Navigation size={16} />
            <span>Start Navigation</span>
          </button>

          <p className="text-[10px] text-center text-slate-400 font-medium">
            Traffic conditions may affect travel time. Opens in Google Maps / Apple Maps.
          </p>
        </div>
      </div>
    </div>
  );
};

