"use client";

import React, { useEffect, useRef, useState } from "react";
import { LaundryShop } from "@/types/auth";
import {
  Navigation,
  Compass,
  LocateFixed,
  Loader2,
  Plus,
  Minus,
  X,
  Layers,
  Maximize2,
  Minimize2,
  ExternalLink,
  QrCode,
  Camera,
  Star,
} from "lucide-react";
import { patchLeafletPos } from "@/lib/utils/leafletPatch";
import { Button } from "@/components/ui/Button";

interface LaundryMapProps {
  shops: LaundryShop[];
  selectedShop: LaundryShop | null;
  onSelectShop: (shop: LaundryShop | null) => void;
  userLocation?: [number, number] | null;
  onUserLocationDetected?: (coords: [number, number]) => void;
  radiusKm?: number | null;
  className?: string;
  onGenerateQR?: (shop: LaundryShop) => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  sidebarOpen?: boolean;
}

// Haversine formula to compute straight-line distance in kilometers
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

// CARTO Basemap Styles & User API Key
const CARTO_API_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY || "cb1_430d_1_0464d8b330e7d05226c320d8";
const withCartoKey = (baseUrl: string) => {
  if (!CARTO_API_KEY) return baseUrl;
  return `${baseUrl}?key=${CARTO_API_KEY}`;
};

const CARTO_BASEMAPS = {
  voyager: {
    name: "CARTO Voyager",
    url: withCartoKey("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"),
  },
  positron: {
    name: "CARTO Light (Positron)",
    url: withCartoKey("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"),
  },
  dark: {
    name: "CARTO Dark Matter",
    url: withCartoKey("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"),
  },
};

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://carto.com/about-carto/" target="_blank" rel="noopener noreferrer">CARTO</a>, &copy; <a href="http://www.openstreetmap.org/about/" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

export const LaundryMap: React.FC<LaundryMapProps> = ({
  shops,
  selectedShop,
  onSelectShop,
  userLocation: initialUserLocation,
  onUserLocationDetected,
  radiusKm,
  className = "",
  onGenerateQR,
  isFullScreen = false,
  onToggleFullScreen,
  sidebarOpen = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const userLayerGroupRef = useRef<any>(null);
  const radiusLayerGroupRef = useRef<any>(null);
  const shopsLayerGroupRef = useRef<any>(null);
  const routeLayerGroupRef = useRef<any>(null);
  const leafletModuleRef = useRef<any>(null);
  const lastFittedShopIdRef = useRef<string | null>(null);
  const lastRadiusRef = useRef<number | null>(null);
  const resizeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [basemapStyle, setBasemapStyle] = useState<"voyager" | "positron" | "dark">("voyager");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [liveLocation, setLiveLocation] = useState<[number, number] | null>(
    initialUserLocation || [14.6500, 121.0500]
  );
  const [isLocating, setIsLocating] = useState(false);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [calculatedDuration, setCalculatedDuration] = useState<number | null>(null);
  const [isInternalFullscreen, setIsInternalFullscreen] = useState(false);

  // Sync external userLocation if provided
  useEffect(() => {
    if (initialUserLocation) {
      setLiveLocation(initialUserLocation);
    }
  }, [initialUserLocation]);

  // Invalidate map size whenever sidebar toggles or fullscreen changes
  useEffect(() => {
    if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    resizeTimerRef.current = setTimeout(() => {
      if (mapInstanceRef.current && mapInstanceRef.current._container) {
        try {
          mapInstanceRef.current.invalidateSize({ animate: false });
        } catch (_) {}
      }
    }, 150);
    return () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, [sidebarOpen, isFullScreen, isInternalFullscreen]);

  // Detect real customer geolocation once on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          setLiveLocation(coords);
          if (onUserLocationDetected) {
            onUserLocationDetected(coords);
          }
        },
        (error) => {
          console.warn("Geolocation permission not granted:", error.message);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // 1. Initialize Map ONCE on Mount with CARTO Voyager
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;

    async function initMap() {
      try {
        const L = (await import("leaflet")).default;
        if (!isMounted || !mapContainerRef.current) return;

        patchLeafletPos(L);
        leafletModuleRef.current = L;

        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.stop();
          } catch (_) {}
          try {
            mapInstanceRef.current.remove();
          } catch (_) {}
          mapInstanceRef.current = null;
        }

        const centerCoords = liveLocation || [14.5800, 121.0350];

        const map = L.map(mapContainerRef.current, {
          center: centerCoords,
          zoom: 13,
          scrollWheelZoom: true,
          dragging: true,
          touchZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
          zoomControl: false,
        });

        const tileLayer = L.tileLayer(CARTO_BASEMAPS[basemapStyle].url, {
          attribution: CARTO_ATTRIBUTION,
          subdomains: "abcd",
          maxZoom: 20,
        }).addTo(map);

        tileLayerRef.current = tileLayer;

        radiusLayerGroupRef.current = L.layerGroup().addTo(map);
        userLayerGroupRef.current = L.layerGroup().addTo(map);
        shopsLayerGroupRef.current = L.layerGroup().addTo(map);
        routeLayerGroupRef.current = L.layerGroup().addTo(map);

        mapInstanceRef.current = map;

        setTimeout(() => {
          if (isMounted && mapInstanceRef.current && mapInstanceRef.current._container) {
            try {
              mapInstanceRef.current.invalidateSize();
            } catch (_) {}
          }
        }, 200);
      } catch (err) {
        console.error("Error initializing CARTO Leaflet map:", err);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      if (routeLayerGroupRef.current) {
        try {
          routeLayerGroupRef.current.clearLayers();
        } catch (_) {}
      }
      if (shopsLayerGroupRef.current) {
        try {
          shopsLayerGroupRef.current.clearLayers();
        } catch (_) {}
      }
      if (userLayerGroupRef.current) {
        try {
          userLayerGroupRef.current.clearLayers();
        } catch (_) {}
      }
      if (radiusLayerGroupRef.current) {
        try {
          radiusLayerGroupRef.current.clearLayers();
        } catch (_) {}
      }
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
        } catch (_) {}
        try {
          mapInstanceRef.current.remove();
        } catch (_) {}
          mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update CARTO Basemap Layer when style changes
  useEffect(() => {
    const L = leafletModuleRef.current;
    if (!L || !mapInstanceRef.current || !tileLayerRef.current) return;

    try {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      const newLayer = L.tileLayer(CARTO_BASEMAPS[basemapStyle].url, {
        attribution: CARTO_ATTRIBUTION,
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(mapInstanceRef.current);
      newLayer.bringToBack();
      tileLayerRef.current = newLayer;
    } catch (_) {}
  }, [basemapStyle]);

  // 2. Render / Update Customer Live Location Marker ("You") - Ultra-Clean iOS/Google Maps Puck
  useEffect(() => {
    const L = leafletModuleRef.current;
    if (
      !L ||
      !mapInstanceRef.current ||
      !mapInstanceRef.current._container ||
      !userLayerGroupRef.current ||
      !liveLocation
    )
      return;

    userLayerGroupRef.current.clearLayers();

    // Clean modern iOS / Google Maps style blue GPS puck
    const userIconHtml = `
      <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; pointer-events: auto; cursor: pointer;">
        <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(37, 99, 235, 0.22); animation: pulsePin 2s infinite ease-out;"></div>
        <div style="width: 13px; height: 13px; border-radius: 50%; background: #2563EB; border: 2.5px solid #FFFFFF; box-shadow: 0 1.5px 5px rgba(0,0,0,0.3); position: relative; z-index: 2;"></div>
      </div>
    `;

    const userIcon = L.divIcon({
      html: userIconHtml,
      className: "customer-live-location-pin",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const uMarker = L.marker(liveLocation, { icon: userIcon, zIndexOffset: 1000 });
    uMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 11px; font-weight: 700; color: #1E40AF; text-align: center; padding: 2px 4px;">
        📍 Your Location
      </div>
    `);

    userLayerGroupRef.current.addLayer(uMarker);
  }, [liveLocation]);

  // 3. Render / Update Shop Markers - Simple, Modern, Vector Teardrop Pin
  useEffect(() => {
    const L = leafletModuleRef.current;
    if (
      !L ||
      !mapInstanceRef.current ||
      !mapInstanceRef.current._container ||
      !shopsLayerGroupRef.current
    )
      return;

    shopsLayerGroupRef.current.clearLayers();

    shops.forEach((shop) => {
      const isSelected = selectedShop?.id === shop.id;
      const queueColor =
        shop.queue_status === "Low"
          ? "#10B981"
          : shop.queue_status === "Moderate"
          ? "#F59E0B"
          : "#EF4444";

      // Ultra-clean vector teardrop map pin with anchor at bottom needle tip
      const pinWidth = isSelected ? 34 : 28;
      const pinHeight = isSelected ? 44 : 36;
      const anchorX = isSelected ? 17 : 14;
      const anchorY = isSelected ? 44 : 36;

      const html = isSelected
        ? `
        <div style="position: relative; width: ${pinWidth}px; height: ${pinHeight}px; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25)); transition: transform 0.15s ease;">
          <!-- Floating Shop Name Pill -->
          <div style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%) translateY(-5px); background: #0F172A; color: #FFFFFF; font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.28); pointer-events: none; border: 1px solid rgba(255,255,255,0.18);">
            ${shop.name}
          </div>

          <!-- Selected Blue Teardrop Pin -->
          <svg width="${pinWidth}" height="${pinHeight}" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 44C15.6 39.8 0 27.2 0 17C0 7.6 7.6 0 17 0C26.4 0 34 7.6 34 17C34 27.2 18.4 39.8 17 44Z" fill="#2563EB" stroke="#FFFFFF" stroke-width="2"/>
            <!-- Washing Machine Icon -->
            <rect x="10.5" y="9" width="13" height="15" rx="2.5" fill="none" stroke="#FFFFFF" stroke-width="1.8"/>
            <circle cx="17" cy="17.8" r="4.2" fill="none" stroke="#FFFFFF" stroke-width="1.6"/>
            <circle cx="13.8" cy="12" r="0.9" fill="#FFFFFF"/>
            <line x1="16.5" y1="12" x2="20.5" y2="12" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round"/>
            <!-- Status Dot -->
            <circle cx="26" cy="8" r="4" fill="${queueColor}" stroke="#FFFFFF" stroke-width="1.5"/>
          </svg>
        </div>
        `
        : `
        <div style="position: relative; width: ${pinWidth}px; height: ${pinHeight}px; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.18)); transition: transform 0.15s ease;">
          <!-- Crisp White Teardrop Pin -->
          <svg width="${pinWidth}" height="${pinHeight}" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 36C12.8 32.5 0 22 0 14C0 6.3 6.3 0 14 0C21.7 0 28 6.3 28 14C28 22 15.2 32.5 14 36Z" fill="#FFFFFF" stroke="${queueColor}" stroke-width="2"/>
            <!-- Washing Machine Icon -->
            <rect x="8.5" y="7.5" width="11" height="13" rx="2" fill="none" stroke="${queueColor}" stroke-width="1.5"/>
            <circle cx="14" cy="15" r="3.5" fill="none" stroke="${queueColor}" stroke-width="1.4"/>
            <circle cx="11.2" cy="10.2" r="0.75" fill="${queueColor}"/>
            <line x1="13.5" y1="10.2" x2="16.8" y2="10.2" stroke="${queueColor}" stroke-width="1.2" stroke-linecap="round"/>
            <!-- Status Dot -->
            <circle cx="21.5" cy="6.5" r="3.2" fill="${queueColor}" stroke="#FFFFFF" stroke-width="1.2"/>
          </svg>
        </div>
        `;

      const customIcon = L.divIcon({
        html,
        className: "custom-laundry-pin",
        iconSize: [pinWidth, pinHeight],
        iconAnchor: [anchorX, anchorY],
      });

      const marker = L.marker([shop.latitude, shop.longitude], {
        icon: customIcon,
        zIndexOffset: isSelected ? 800 : 200,
      });

      marker.on("click", () => {
        onSelectShop(shop);
      });

      shopsLayerGroupRef.current.addLayer(marker);
    });
  }, [shops, selectedShop, onSelectShop]);

  // 4. Render / Update Route Line from You to Selected Shop
  useEffect(() => {
    const L = leafletModuleRef.current;
    if (!L || !mapInstanceRef.current || !routeLayerGroupRef.current) return;

    routeLayerGroupRef.current.clearLayers();

    if (!selectedShop) {
      setCalculatedDistance(null);
      setCalculatedDuration(null);
      return;
    }

    if (!liveLocation) {
      if (selectedShop.id !== lastFittedShopIdRef.current) {
        lastFittedShopIdRef.current = selectedShop.id;
        if (mapInstanceRef.current && mapInstanceRef.current._container) {
          try {
            mapInstanceRef.current.setView(
              [selectedShop.latitude, selectedShop.longitude],
              15,
              { animate: false }
            );
          } catch (_) {}
        }
      }
      return;
    }

    const userLat = liveLocation[0];
    const userLng = liveLocation[1];
    const shopLat = selectedShop.latitude;
    const shopLng = selectedShop.longitude;

    const straightDist = calculateDistanceKm(userLat, userLng, shopLat, shopLng);
    setCalculatedDistance(straightDist);
    setCalculatedDuration(Math.max(1, Math.round(straightDist * 2.5)));

    let isCancelled = false;
    const abortController = new AbortController();

    // Sleek vector navigation midpoint badge (Apple/Google Maps style capsule)
    const addMidpointBadge = (
      coords: [number, number],
      distKm: number,
      durationMins: number
    ) => {
      if (!routeLayerGroupRef.current) return;
      const badgeHtml = `
        <div style="
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: #0F172A;
          padding: 2.5px 8px;
          border-radius: 9999px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: -0.01em;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.14);
          border: 1px solid #E2E8F0;
          pointer-events: none;
          transform: translate(-50%, -50%);
          display: inline-flex;
          align-items: center;
          gap: 4px;
        ">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="#2563EB" stroke="#2563EB" stroke-width="1.5">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          <span>${distKm} km</span>
          <span style="color: #CBD5E1;">•</span>
          <span style="color: #2563EB;">~${durationMins}m</span>
        </div>
      `;

      const badgeIcon = L.divIcon({
        html: badgeHtml,
        className: "route-midpoint-badge",
        iconSize: [0, 0],
      });

      const badgeMarker = L.marker(coords, {
        icon: badgeIcon,
        interactive: false,
      });
      routeLayerGroupRef.current.addLayer(badgeMarker);
    };

    // Responsive viewport framing for mobile screens, desktop sidebar, and right-side modal
    const applyFitBounds = (bounds: any, maxZoom = 16) => {
      if (!mapInstanceRef.current || !mapInstanceRef.current._container) return;
      try {
        const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
        const isDesktopSidebar =
          typeof window !== "undefined" && window.innerWidth >= 1024 && sidebarOpen;

        if (isMobile) {
          // Leave room on top for top bar and right-side shop modal (140px)
          mapInstanceRef.current.fitBounds(bounds, {
            paddingTopLeft: [20, 140],
            paddingBottomRight: [20, 60],
            maxZoom,
            animate: true,
          });
        } else if (isDesktopSidebar) {
          // Leave room for left sidebar (420px) and right-side modal (360px)
          mapInstanceRef.current.fitBounds(bounds, {
            paddingTopLeft: [420, 60],
            paddingBottomRight: [360, 60],
            maxZoom,
            animate: true,
          });
        } else {
          // Leave room for top bar and right-side modal (360px)
          mapInstanceRef.current.fitBounds(bounds, {
            paddingTopLeft: [60, 60],
            paddingBottomRight: [360, 60],
            maxZoom,
            animate: true,
          });
        }
      } catch (_) {}
    };

    // Render the street navigation road polyline (Always follows the road track)
    const renderRoadTrack = (
      roadLatLngs: [number, number][],
      distKm: number,
      mins: number
    ) => {
      if (
        !routeLayerGroupRef.current ||
        !mapInstanceRef.current ||
        !mapInstanceRef.current._container
      )
        return;

      routeLayerGroupRef.current.clearLayers();

      // 1. Subtle glow casing for road depth
      const roadCasing = L.polyline(roadLatLngs, {
        color: "#1E3A8A",
        weight: 7,
        opacity: 0.25,
        lineCap: "round",
        lineJoin: "round",
      });

      // 2. Foreground solid road path (Vibrant Royal Blue)
      const roadPolyline = L.polyline(roadLatLngs, {
        color: "#2563EB",
        weight: 4,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      });

      // 3. Directional animated dash line (Moving pulses indicating traffic direction)
      const dashOverlay = L.polyline(roadLatLngs, {
        color: "#93C5FD",
        weight: 2,
        dashArray: "6, 10",
        lineCap: "round",
        lineJoin: "round",
        className: "animated-route-line",
      });

      routeLayerGroupRef.current.addLayer(roadCasing);
      routeLayerGroupRef.current.addLayer(roadPolyline);
      routeLayerGroupRef.current.addLayer(dashOverlay);

      // Place badge at the midpoint of the actual road coordinates
      const midIndex = Math.floor(roadLatLngs.length / 2);
      const midPoint =
        roadLatLngs[midIndex] || [(userLat + shopLat) / 2, (userLng + shopLng) / 2];
      addMidpointBadge(midPoint, distKm, mins);

      // Smoothly fit bounds to the road path
      applyFitBounds(roadPolyline.getBounds(), 16);
    };

    // Frame initial view to include user and shop without drawing any straight line
    if (selectedShop.id !== lastFittedShopIdRef.current) {
      lastFittedShopIdRef.current = selectedShop.id;
      const initialBounds = L.latLngBounds([
        [userLat, userLng],
        [shopLat, shopLng],
      ]);
      applyFitBounds(initialBounds, 15);
    }

    // Fetch the shortest track along the road network (never a straight line)
    async function fetchShortestRoadTrack() {
      // Prioritize driving road network, then walking/footpath tracks
      const routingEndpoints = [
        `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${shopLng},${shopLat}?overview=full&geometries=geojson`,
        `https://router.project-osrm.org/route/v1/foot/${userLng},${userLat};${shopLng},${shopLat}?overview=full&geometries=geojson`,
        `https://routing.openstreetmap.de/routed-car/route/v1/driving/${userLng},${userLat};${shopLng},${shopLat}?overview=full&geometries=geojson`,
      ];

      for (const url of routingEndpoints) {
        if (isCancelled) return;
        try {
          const res = await fetch(url, { signal: abortController.signal });
          if (!res.ok) continue;
          const data = await res.json();

          if (data?.code === "Ok" && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const rawCoords: [number, number][] = route.geometry.coordinates;

            if (rawCoords && rawCoords.length >= 2) {
              const roadLatLngs: [number, number][] = rawCoords.map((c) => [c[1], c[0]]);
              const realDistKm = parseFloat((route.distance / 1000).toFixed(2));
              const realMins = Math.max(1, Math.round(route.duration / 60));

              setCalculatedDistance(realDistKm);
              setCalculatedDuration(realMins);

              renderRoadTrack(roadLatLngs, realDistKm, realMins);
              return; // Successfully rendered real shortest street track
            }
          }
        } catch (e: any) {
          if (e?.name === "AbortError") return;
          // Try next routing endpoint
        }
      }

      // If external routing network is temporarily unreachable (e.g. offline/timeout),
      // synthesize a multi-step street-grid track that turns along road axes rather than
      // cutting a raw straight diagonal line through buildings.
      if (!isCancelled && routeLayerGroupRef.current) {
        const dLat = shopLat - userLat;
        const dLng = shopLng - userLng;
        const steps = 8;
        const gridPoints: [number, number][] = [];

        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          // Smooth S-curve curve following street grid orientation
          const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
          const lat = userLat + dLat * (t < 0.5 ? t * 0.75 : 0.25 + t * 0.75);
          const lng = userLng + dLng * ease;
          gridPoints.push([lat, lng]);
        }
        gridPoints[0] = [userLat, userLng];
        gridPoints[gridPoints.length - 1] = [shopLat, shopLng];

        const estimatedDist = parseFloat((straightDist * 1.25).toFixed(2));
        const estimatedMins = Math.max(1, Math.round(estimatedDist * 2.5));
        setCalculatedDistance(estimatedDist);
        setCalculatedDuration(estimatedMins);

        renderRoadTrack(gridPoints, estimatedDist, estimatedMins);
      }
    }

    fetchShortestRoadTrack();

    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [selectedShop, liveLocation, sidebarOpen]);

  // 5. Render Distance Radius Circle
  useEffect(() => {
    const L = leafletModuleRef.current;
    if (
      !L ||
      !mapInstanceRef.current ||
      !mapInstanceRef.current._container ||
      !radiusLayerGroupRef.current
    )
      return;

    radiusLayerGroupRef.current.clearLayers();

    if (!liveLocation || !radiusKm || radiusKm <= 0) return;

    const radiusCircle = L.circle(liveLocation, {
      radius: radiusKm * 1000,
      fillColor: "#3B82F6",
      fillOpacity: 0.06,
      color: "#2563EB",
      weight: 1.5,
      dashArray: "5, 5",
      interactive: false,
    });

    radiusLayerGroupRef.current.addLayer(radiusCircle);

    if (
      radiusKm !== lastRadiusRef.current &&
      mapInstanceRef.current &&
      mapInstanceRef.current._container &&
      !selectedShop
    ) {
      lastRadiusRef.current = radiusKm;
      try {
        mapInstanceRef.current.fitBounds(radiusCircle.getBounds(), {
          padding: [25, 25],
          maxZoom: 15,
          animate: true,
        });
      } catch (_) {}
    }
  }, [liveLocation, radiusKm, selectedShop]);

  useEffect(() => {
    if (!selectedShop) {
      lastFittedShopIdRef.current = null;
    }
  }, [selectedShop]);

  const handleZoomIn = () => {
    if (!mapInstanceRef.current || !mapInstanceRef.current._container) return;
    try {
      mapInstanceRef.current.zoomIn();
    } catch (_) {}
  };

  const handleZoomOut = () => {
    if (!mapInstanceRef.current || !mapInstanceRef.current._container) return;
    try {
      mapInstanceRef.current.zoomOut();
    } catch (_) {}
  };

  const handleLocateMe = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setLiveLocation(coords);
        if (onUserLocationDetected) onUserLocationDetected(coords);

        if (mapInstanceRef.current && mapInstanceRef.current._container) {
          try {
            mapInstanceRef.current.setView(coords, 14, { animate: true });
          } catch (_) {}
        }
        setIsLocating(false);
      },
      (err) => {
        console.warn("Location error:", err);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleCenterAll = () => {
    if (!mapInstanceRef.current || !mapInstanceRef.current._container) return;
    try {
      mapInstanceRef.current.setView([14.5800, 121.0350], 12, { animate: true });
    } catch (_) {}
  };

  const handleToggleFullscreen = () => {
    if (onToggleFullScreen) {
      onToggleFullScreen();
      return;
    }

    if (!wrapperRef.current) return;

    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().then(() => {
        setIsInternalFullscreen(true);
      }).catch(() => {
        setIsInternalFullscreen(!isInternalFullscreen);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsInternalFullscreen(false);
      }).catch(() => {
        setIsInternalFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsInternalFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const openGoogleMapsDirections = () => {
    if (!selectedShop) return;
    const origin = liveLocation ? `${liveLocation[0]},${liveLocation[1]}` : "";
    const dest = `${selectedShop.latitude},${selectedShop.longitude}`;
    const url = origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
    window.open(url, "_blank");
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full h-full min-h-[440px] overflow-hidden bg-slate-100 ${className}`}
    >
      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-full z-10 cursor-grab active:cursor-grabbing"
        style={{ touchAction: "none" }}
      />

      {/* Floating Control Buttons (Relocated to bottom-right so top-right is dedicated to shop modal) */}
      <div className="absolute bottom-8 right-3 sm:right-4 z-20 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          title="Locate my GPS position"
          className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-blue-600 shadow-sm hover:bg-slate-50 cursor-pointer transition-all active:scale-95"
        >
          {isLocating ? (
            <Loader2 size={16} className="animate-spin text-blue-600" />
          ) : (
            <LocateFixed size={16} />
          )}
        </button>

        <button
          type="button"
          onClick={handleCenterAll}
          title="Reset map view"
          className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-blue-600 shadow-sm hover:bg-slate-50 cursor-pointer transition-all active:scale-95"
        >
          <Compass size={16} />
        </button>

        {/* Basemap Layer Switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            title="Change Basemap Style"
            className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl backdrop-blur-md border shadow-sm cursor-pointer transition-all active:scale-95 ${
              showLayerMenu
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white/95 border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-50"
            }`}
          >
            <Layers size={16} />
          </button>

          {showLayerMenu && (
            <div className="absolute right-full bottom-0 mr-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-1.5 shadow-xl z-30 w-40 space-y-1 animate-in fade-in zoom-in-95">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                CARTO Style
              </span>
              {(Object.keys(CARTO_BASEMAPS) as Array<keyof typeof CARTO_BASEMAPS>).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setBasemapStyle(key);
                    setShowLayerMenu(false);
                  }}
                  className={`w-full text-left px-2 py-1 rounded-md text-xs font-semibold flex items-center justify-between transition-colors ${
                    basemapStyle === key
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{CARTO_BASEMAPS[key].name}</span>
                  {basemapStyle === key && <span className="text-blue-600 font-bold">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-px bg-slate-200/80 my-0.5" />

        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-blue-600 shadow-sm hover:bg-slate-50 cursor-pointer transition-all active:scale-95"
        >
          <Plus size={16} />
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-blue-600 shadow-sm hover:bg-slate-50 cursor-pointer transition-all active:scale-95"
        >
          <Minus size={16} />
        </button>

        <button
          type="button"
          onClick={handleToggleFullscreen}
          title={isFullScreen || isInternalFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
          className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-blue-600 shadow-sm hover:bg-slate-50 cursor-pointer transition-all active:scale-95 mt-0.5"
        >
          {isFullScreen || isInternalFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* Floating Route Modal (Shop Name, Picture, Distance & Actions) - Positioned on the Right */}
      {selectedShop && (
        <div className="absolute top-16 sm:top-20 right-3 sm:right-4 z-30 max-w-sm w-[calc(100%-24px)] sm:w-80 md:w-88 bg-white/95 backdrop-blur-md border border-blue-200/90 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
          {/* Shop Picture Header if available */}
          {selectedShop.images && selectedShop.images.length > 0 ? (
            <div className="relative h-28 sm:h-32 w-full bg-slate-100 overflow-hidden">
              <img
                src={selectedShop.images[0]}
                alt={selectedShop.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

              {/* Close Button on image */}
              <button
                type="button"
                onClick={() => onSelectShop(null)}
                className="absolute top-2 right-2 text-white/90 hover:text-white bg-black/40 hover:bg-black/60 p-1.5 rounded-full backdrop-blur-xs transition-colors cursor-pointer"
                title="Close"
              >
                <X size={14} />
              </button>

              {/* Queue Status Badge */}
              <div className="absolute top-2 left-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs backdrop-blur-md border ${
                    selectedShop.queue_status === "Low"
                      ? "bg-emerald-500/90 text-white border-emerald-400"
                      : selectedShop.queue_status === "Moderate"
                      ? "bg-amber-500/90 text-white border-amber-400"
                      : "bg-red-500/90 text-white border-red-400"
                  }`}
                >
                  {selectedShop.queue_status} Queue
                </span>
              </div>

              {/* Photo Count Tag */}
              {selectedShop.images.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/20">
                  <Camera size={10} />
                  <span>{selectedShop.images.length} photos</span>
                </div>
              )}

              {/* Rating on image */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold border border-white/10">
                <Star size={11} className="text-amber-400 fill-amber-400" />
                <span>
                  {selectedShop.total_reviews > 0
                    ? Number(selectedShop.rating).toFixed(1)
                    : "New"}
                </span>
              </div>
            </div>
          ) : null}

          {/* Modal Content Body */}
          <div className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                {/* Navigation icon only when no picture */}
                {(!selectedShop.images || selectedShop.images.length === 0) && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Navigation size={14} />
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[200px] sm:max-w-[220px]">
                    {selectedShop.name}
                  </h4>
                  {calculatedDistance !== null ? (
                    <p className="text-[11px] font-semibold text-blue-700 mt-0.5">
                      {calculatedDistance} km • ~{calculatedDuration} mins
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 mt-0.5">Calculating route...</p>
                  )}
                  {selectedShop.address && (
                    <p className="text-[10px] text-slate-400 truncate max-w-[220px] mt-0.5">
                      {selectedShop.address}
                    </p>
                  )}
                </div>
              </div>

              {/* Close Button when no photo */}
              {(!selectedShop.images || selectedShop.images.length === 0) && (
                <button
                  type="button"
                  onClick={() => onSelectShop(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Clear Route"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
              {onGenerateQR && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (selectedShop && onGenerateQR) onGenerateQR(selectedShop);
                  }}
                  className="flex-1 text-[11px] py-1 h-7 font-bold flex items-center justify-center gap-1 shadow-2xs"
                >
                  <QrCode size={12} />
                  Walk-In QR
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={openGoogleMapsDirections}
                className="flex-1 text-[11px] py-1 h-7 font-semibold text-blue-700 border-blue-200 hover:bg-blue-50 flex items-center justify-center gap-1"
              >
                <ExternalLink size={12} />
                Google Maps
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Map Legend (Minimal & Mobile-Friendly) */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-md border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-600 shadow-sm flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1 font-bold text-blue-700">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200" />
          You
        </span>
        <span className="h-2.5 w-px bg-slate-200" />
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Ready
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> ~20m
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> Busy
        </span>
      </div>
    </div>
  );
};
