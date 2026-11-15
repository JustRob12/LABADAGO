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

const CARTO_VOYAGER_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://carto.com/about-carto/" target="_blank" rel="noopener noreferrer">CARTO</a>, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

export const ShopRouteNavigation: React.FC<ShopRouteNavigationProps> = ({
  shop,
  userLocation,
  onBack,
  onViewDetails,
  distanceKm: initialDistanceKm,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletModuleRef = useRef<any>(null);
  const routeGroupRef = useRef<any>(null);

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

  // Initialize Leaflet Map
  useEffect(() => {
    let isCancelled = false;

    async function initMap() {
      if (!mapContainerRef.current) return;

      try {
        const leaf = await import("leaflet");
        const L = (leaf as any).default || leaf;
        if (isCancelled || !mapContainerRef.current) return;

        patchLeafletPos(L);
        leafletModuleRef.current = L;

        // Clean up previous instance
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch (_) {}
          mapInstanceRef.current = null;
        }

        const userLat = effectiveUserLocation[0];
        const userLng = effectiveUserLocation[1];
        const shopLat = shop.latitude;
        const shopLng = shop.longitude;

        const map = L.map(mapContainerRef.current, {
          center: [(userLat + shopLat) / 2, (userLng + shopLng) / 2],
          zoom: 14,
          zoomControl: false,
          attributionControl: false,
        });

        L.tileLayer(CARTO_VOYAGER_URL, {
          attribution: CARTO_ATTRIBUTION,
          subdomains: "abcd",
          maxZoom: 20,
        }).addTo(map);

        mapInstanceRef.current = map;

        // User Location Marker (Pulse Puck)
        const userIcon = L.divIcon({
          html: `
            <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(59, 130, 246, 0.35); animation: pulsePin 2s infinite ease-out;"></div>
              <div style="width: 15px; height: 15px; border-radius: 50%; background: #2563EB; border: 3px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>
            </div>
          `,
          className: "user-nav-puck",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);

        // Shop Destination Marker (Red Pin with Name Label)
        const shopIcon = L.divIcon({
          html: `
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
          `,
          className: "shop-nav-pin",
          iconSize: [32, 48],
          iconAnchor: [16, 16],
        });
        L.marker([shopLat, shopLng], { icon: shopIcon, zIndexOffset: 900 }).addTo(map);

        const routeGroup = L.layerGroup().addTo(map);
        routeGroupRef.current = routeGroup;

        // Render OSRM Route
        drawRoutePolyline(L, map, routeGroup, [userLat, userLng], [shopLat, shopLng]);

        setTimeout(() => {
          if (!isCancelled && mapInstanceRef.current === map) {
            try {
              map.invalidateSize({ animate: false });
            } catch (_) {}
          }
        }, 150);
      } catch (err) {
        console.error("Failed to initialize Leaflet route map:", err);
      }
    }

    initMap();

    return () => {
      isCancelled = true;
      if (routeGroupRef.current) {
        try {
          routeGroupRef.current.clearLayers();
        } catch (_) {}
      }
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (_) {}
        mapInstanceRef.current = null;
      }
    };
  }, [shop.id, effectiveUserLocation[0], effectiveUserLocation[1]]);

  // Re-draw route when travelMode changes
  useEffect(() => {
    const L = leafletModuleRef.current;
    const map = mapInstanceRef.current;
    const routeGroup = routeGroupRef.current;
    if (!L || !map || !routeGroup) return;

    drawRoutePolyline(
      L,
      map,
      routeGroup,
      [effectiveUserLocation[0], effectiveUserLocation[1]],
      [shop.latitude, shop.longitude]
    );
  }, [travelMode]);

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
      if (!mapInstanceRef.current || mapInstanceRef.current !== map) return;
      if (!mapContainerRef.current || !group || !map._mapPane) return;
      if (!latLngs || latLngs.length < 2) return;

      try {
        group.clearLayers();
      } catch (_) {}

      // 1. Road shadow casing
      const roadCasing = L.polyline(latLngs, {
        color: "#1E3A8A",
        weight: 8,
        opacity: 0.35,
        lineCap: "round",
        lineJoin: "round",
      });

      // 2. Main route path (Vibrant Blue)
      const roadLine = L.polyline(latLngs, {
        color: "#2563EB",
        weight: 5,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      });

      // 3. Directional dashed overlay
      const dashOverlay = L.polyline(latLngs, {
        color: "#93C5FD",
        weight: 2.5,
        dashArray: "6, 10",
        lineCap: "round",
        lineJoin: "round",
      });

      group.addLayer(roadCasing);
      group.addLayer(roadLine);
      group.addLayer(dashOverlay);

      // Midpoint ETA Badge
      const midIdx = Math.floor(latLngs.length / 2);
      const midPoint = latLngs[midIdx] || [(userLat + shopLat) / 2, (userLng + shopLng) / 2];

      const badgeIcon = L.divIcon({
        html: `
          <div style="background: #1E3A8A; color: white; padding: 4px 9px; border-radius: 8px; font-size: 11px; font-weight: 800; box-shadow: 0 4px 12px rgba(0,0,0,0.25); white-space: nowrap; border: 1.5px solid #60A5FA; display: flex; flex-direction: column; align-items: center; line-height: 1.2;">
            <span>${mins} min</span>
            <span style="font-size: 9px; opacity: 0.85; font-weight: 600;">${dist} km</span>
          </div>
        `,
        className: "route-eta-badge-pin",
        iconSize: [0, 0],
      });

      L.marker(midPoint, { icon: badgeIcon, interactive: false }).addTo(group);

      // Fit map bounds safely around the route
      try {
        const bounds = roadLine.getBounds();
        if (
          bounds &&
          typeof bounds.isValid === "function" &&
          bounds.isValid() &&
          mapInstanceRef.current === map &&
          map._mapPane
        ) {
          map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16, animate: false });
        }
      } catch (err) {
        console.warn("fitBounds skipped safely:", err);
      }
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
          const rawCoords = data.routes[0].geometry.coordinates as [number, number][];
          const latLngs: [number, number][] = rawCoords.map((c) => [c[1], c[0]]);
          const dist = parseFloat((data.routes[0].distance / 1000).toFixed(1));
          renderTrack(latLngs, dist, activeDurationMins);
          return;
        }
      }
    } catch (_) {
      // fallback
    }

    // Curved interpolation fallback
    const steps = 8;
    const curvedPoints: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lat = userLat + (shopLat - userLat) * t;
      const lng = userLng + (shopLng - userLng) * (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
      curvedPoints.push([lat, lng]);
    }
    renderTrack(curvedPoints, distanceKm, activeDurationMins);
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.setView(effectiveUserLocation, 16, { animate: true });
      } catch (_) {}
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
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-slate-100 flex flex-col">
      {/* 1. Header Toolbar (Back Button, Destination Title, and Mode Switcher) */}
      <div className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-4 z-20 flex flex-col gap-2 max-w-lg mx-auto pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl p-3 sm:p-4 space-y-3 pointer-events-auto">
          {/* Top Row: Back button, Route Title, Recenter */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shrink-0"
              title="Back to Shop"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="min-w-0 flex-1 px-1">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                Route to {shop.name}
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                {distanceKm} km away • {activeDurationMins} min est.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRecenter}
              className="p-2 rounded-xl text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer shrink-0"
              title="Recenter on My Location"
            >
              <LocateFixed size={18} />
            </button>
          </div>

          {/* Travel Mode Selector: Drive, Walk, Bike */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTravelMode("drive")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                travelMode === "drive"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Car size={14} />
              <span>Drive</span>
              <span className="text-[10px] opacity-75 font-normal">({travelDurations.drive}m)</span>
            </button>

            <button
              type="button"
              onClick={() => setTravelMode("walk")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                travelMode === "walk"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Footprints size={14} />
              <span>Walk</span>
              <span className="text-[10px] opacity-75 font-normal">({travelDurations.walk}m)</span>
            </button>

            <button
              type="button"
              onClick={() => setTravelMode("bike")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                travelMode === "bike"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Bike size={14} />
              <span>Bike</span>
              <span className="text-[10px] opacity-75 font-normal">({travelDurations.bike}m)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Leaflet Map Container */}
      <div className="relative flex-1 w-full h-full min-h-[380px] z-0">
        <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" />
      </div>

      {/* 3. Bottom Navigation Floating Action Card */}
      <div className="absolute bottom-4 inset-x-3 sm:bottom-5 sm:inset-x-4 z-20 max-w-lg mx-auto pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-2xl p-4 space-y-3 pointer-events-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                <img
                  src={coverImage}
                  alt={shop.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">{shop.name}</h3>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                  <span className="flex items-center gap-1 text-amber-500 font-semibold">
                    <Star size={12} className="fill-amber-400" />
                    <span>{shop.rating ? Number(shop.rating).toFixed(1) : "5.0"}</span>
                  </span>
                  <span>•</span>
                  <span>Closes {closeTimeStr}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onViewDetails}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline shrink-0 cursor-pointer"
            >
              View Shop
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLaunchExternalNavigation}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-[0.98]"
            >
              <Navigation size={16} />
              <span>Start Navigation in Maps</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
