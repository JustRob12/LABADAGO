"use client";

import React, { useEffect, useRef, useState } from "react";
import { LaundryShop } from "@/types/auth";
import { formatTo12Hour } from "@/components/owner/ShopSetupForm";
import { calculateDistanceKm } from "@/components/customer/LaundryMap";
import { MAP_STYLES } from "@/lib/map/maplibreStyles";
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
  ArrowUpDown,
  X,
} from "lucide-react";

interface ShopRouteNavigationProps {
  shop: LaundryShop;
  userLocation: [number, number] | null;
  onBack: () => void;
  onViewDetails: () => void;
  distanceKm?: number;
}

export const ShopRouteNavigation: React.FC<ShopRouteNavigationProps> = ({
  shop,
  userLocation,
  onBack,
  onViewDetails,
  distanceKm: initialDistanceKm,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const maplibreglRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Travel Mode: Drive, Walk, Bike
  const [travelMode, setTravelMode] = useState<"drive" | "walk" | "bike">("drive");
  const [isNavigating, setIsNavigating] = useState(false);

  // Location & ETA states
  const effectiveUserLocation: [number, number] = userLocation || [14.65, 121.05];
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

  // Initialize MapLibre GL Map
  useEffect(() => {
    let isCancelled = false;

    async function initMap() {
      if (!mapContainerRef.current) return;

      try {
        const maplibregl = await import("maplibre-gl");
        if (isCancelled || !mapContainerRef.current) return;
        maplibreglRef.current = maplibregl;

        // Clean up previous instance
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const userLng = effectiveUserLocation[1];
        const userLat = effectiveUserLocation[0];
        const shopLng = shop.longitude;
        const shopLat = shop.latitude;

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: MAP_STYLES.voyager.style as any,
          center: [(userLng + shopLng) / 2, (userLat + shopLat) / 2],
          zoom: 14,
          attributionControl: false,
        });

        mapInstanceRef.current = map;

        map.on("load", () => {
          if (isCancelled) return;

          // 1. User Location Marker (Pulsating Blue Dot)
          const userEl = document.createElement("div");
          userEl.innerHTML = `
            <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(59, 130, 246, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="width: 16px; height: 16px; border-radius: 50%; background: #2563EB; border: 3px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>
            </div>
          `;
          const userMarker = new maplibregl.Marker({ element: userEl })
            .setLngLat([userLng, userLat])
            .addTo(map);
          markersRef.current.push(userMarker);

          // 2. Destination (Shop) Marker (Red Pin with Name Label)
          const shopEl = document.createElement("div");
          shopEl.innerHTML = `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: #EF4444; border: 3px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <div style="background: white; border: 1px solid #E2E8F0; border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 800; color: #1E293B; box-shadow: 0 2px 4px rgba(0,0,0,0.12); margin-top: 3px; white-space: nowrap;">
                ${shop.name}
              </div>
            </div>
          `;
          const shopMarker = new maplibregl.Marker({ element: shopEl })
            .setLngLat([shopLng, shopLat])
            .addTo(map);
          markersRef.current.push(shopMarker);

          // 3. Render Route
          drawRoute(map, maplibregl, [userLng, userLat], [shopLng, shopLat]);
        });
      } catch (err) {
        console.error("Failed to initialize MapLibre GL route map:", err);
      }
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
      markersRef.current = [];
    };
  }, [shop.id, effectiveUserLocation[0], effectiveUserLocation[1]]);

  // Re-draw route when travelMode changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const maplibregl = maplibreglRef.current;
    if (!map || !maplibregl || !map.isStyleLoaded()) return;

    const userLng = effectiveUserLocation[1];
    const userLat = effectiveUserLocation[0];
    const shopLng = shop.longitude;
    const shopLat = shop.latitude;

    drawRoute(map, maplibregl, [userLng, userLat], [shopLng, shopLat]);
  }, [travelMode]);

  const drawRoute = async (
    map: any,
    maplibregl: any,
    userCoords: [number, number],
    shopCoords: [number, number]
  ) => {
    const [userLng, userLat] = userCoords;
    const [shopLng, shopLat] = shopCoords;

    const renderPath = (coordinates: [number, number][], dist: number, mins: number) => {
      if (!map || !map.isStyleLoaded()) return;

      const geojsonData = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates,
        },
      };

      if (map.getSource("route-source")) {
        (map.getSource("route-source") as any).setData(geojsonData);
      } else {
        map.addSource("route-source", {
          type: "geojson",
          data: geojsonData,
        });

        // Casing Line
        map.addLayer({
          id: "route-casing",
          type: "line",
          source: "route-source",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#1E3A8A",
            "line-width": 8,
            "line-opacity": 0.35,
          },
        });

        // Main Route Path (Vibrant Blue)
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route-source",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#2563EB",
            "line-width": 5,
            "line-opacity": 0.95,
          },
        });
      }

      // Midpoint ETA Badge
      const midIdx = Math.floor(coordinates.length / 2);
      const midCoord = coordinates[midIdx] || [(userLng + shopLng) / 2, (userLat + shopLat) / 2];

      // Remove previous midpoint badge if any
      const existingBadge = document.getElementById("route-eta-badge");
      if (existingBadge) existingBadge.parentElement?.remove();

      const badgeEl = document.createElement("div");
      badgeEl.id = "route-eta-badge";
      badgeEl.innerHTML = `
        <div style="background: #1E3A8A; color: white; padding: 4px 9px; border-radius: 8px; font-size: 11px; font-weight: 800; box-shadow: 0 4px 12px rgba(0,0,0,0.25); white-space: nowrap; border: 1.5px solid #60A5FA; display: flex; flex-direction: column; align-items: center; line-height: 1.2;">
          <span>${mins} min</span>
          <span style="font-size: 9px; opacity: 0.85; font-weight: 600;">${dist} km</span>
        </div>
      `;
      const badgeMarker = new maplibregl.Marker({ element: badgeEl })
        .setLngLat(midCoord)
        .addTo(map);
      markersRef.current.push(badgeMarker);

      // Fit map bounds smoothly around route coordinates
      const bounds = new maplibregl.LngLatBounds();
      coordinates.forEach((c) => bounds.extend(c));
      map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
    };

    // Try OSRM routing service
    try {
      const modeParam = travelMode === "walk" ? "foot" : "driving";
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/${modeParam}/${userLng},${userLat};${shopLng},${shopLat}?overview=full&geometries=geojson`
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.code === "Ok" && data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates as [number, number][];
          const dist = parseFloat((data.routes[0].distance / 1000).toFixed(1));
          renderPath(coords, dist, activeDurationMins);
          return;
        }
      }
    } catch (_) {
      // fallback to curved line
    }

    // Curved interpolation fallback
    const steps = 8;
    const curvedPoints: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lng = userLng + (shopLng - userLng) * t;
      const lat = userLat + (shopLat - userLat) * (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
      curvedPoints.push([lng, lat]);
    }
    renderPath(curvedPoints, distanceKm, activeDurationMins);
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [effectiveUserLocation[1], effectiveUserLocation[0]],
        zoom: 16,
      });
    }
  };

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
      {/* 1. Top Header Bar */}
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

      {/* 2. Top Floating Shop Info Card */}
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
                  <span>{shop.rating ? Number(shop.rating).toFixed(1) : "5.0"}</span>
                  <span className="text-slate-400 font-normal">({shop.total_reviews || 0} reviews)</span>
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

      {/* 3. Interactive MapLibre GL Map Canvas */}
      <div className="relative flex-1 w-full h-full min-h-[380px] z-0">
        <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" />

        {/* Locate Me Crosshair Button */}
        <button
          type="button"
          onClick={handleRecenter}
          className="absolute right-4 bottom-72 z-20 w-11 h-11 rounded-full bg-white border border-slate-200/90 shadow-lg flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
          title="Re-center on Your Location"
        >
          <LocateFixed size={20} />
        </button>
      </div>

      {/* Live Turn-by-Turn Simulation Banner */}
      {isNavigating && (
        <div className="absolute top-32 inset-x-3 sm:inset-x-4 z-20 max-w-2xl mx-auto animate-in slide-in-from-top-2">
          <div className="bg-emerald-600 text-white rounded-2xl p-3.5 shadow-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Navigation size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">
                  Head toward {shop.name}
                </p>
                <p className="text-[11px] text-emerald-100 mt-0.5">
                  Arriving in {activeDurationMins} minutes ({distanceKm} km)
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

      {/* 4. Directions Bottom Sheet / Panel */}
      <div className="relative z-20 bg-white border-t border-slate-200/90 rounded-t-3xl shadow-2xl p-4 sm:p-5 space-y-4">
        {/* Origin & Destination */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Directions
          </h3>

          <div className="relative flex items-center justify-between gap-3 bg-slate-50/80 rounded-2xl p-3 border border-slate-100">
            <div className="flex-1 space-y-3">
              {/* Origin */}
              <div className="flex items-start gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100 mt-1 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    Your Current Location
                  </p>
                  <p className="text-[11px] text-slate-400">
                    GPS Coordinates Detected
                  </p>
                </div>
              </div>

              {/* Dotted line */}
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

            <button
              type="button"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              title="Reverse origin and destination"
            >
              <ArrowUpDown size={16} />
            </button>
          </div>
        </div>

        {/* Travel Mode Selector Tabs */}
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

        {/* Route Overview */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div>
            <h5 className="font-bold text-slate-900">Route Overview</h5>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Optimized turn-by-turn route to counter
            </p>
          </div>
          <div className="text-right">
            <span className="font-extrabold text-slate-900 block text-sm">
              {activeDurationMins} min
            </span>
            <span className="text-[11px] text-slate-400">{distanceKm} km</span>
          </div>
        </div>

        {/* Primary Action Button */}
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
            Opens native turn-by-turn navigation in Google Maps or Apple Maps.
          </p>
        </div>
      </div>
    </div>
  );
};
