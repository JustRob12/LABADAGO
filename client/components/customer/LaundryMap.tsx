"use client";

import React, { useEffect, useRef, useState } from "react";
import { LaundryShop } from "@/types/auth";
import {
  Navigation,
  LocateFixed,
  Plus,
  Minus,
  X,
  Layers,
  Maximize2,
  Minimize2,
  ExternalLink,
  QrCode,
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

// High-Definition Basemap Styles (100% Free, Zero API Key Required, No Watermarks)
const MAP_BASEMAPS = {
  streets: {
    name: "Modern Streets",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    subdomains: "",
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a>, DeLorme, TomTom, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
  },
  osm: {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: "abc",
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
  },
  topo: {
    name: "Topographic",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    subdomains: "",
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a>, DeLorme, TomTom',
  },
  satellite: {
    name: "Satellite Imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    subdomains: "",
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a>, DigitalGlobe, GeoEye, Earthstar Geographics',
  },
};

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

  const [basemapStyle, setBasemapStyle] = useState<"streets" | "osm" | "topo" | "satellite">("streets");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [liveLocation, setLiveLocation] = useState<[number, number] | null>(
    initialUserLocation || [14.65, 121.05]
  );
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

  // Robust container ResizeObserver & window resize listener
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current && mapInstanceRef.current._container) {
        try {
          mapInstanceRef.current.invalidateSize({ animate: false });
        } catch (_) {}
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    let observer: ResizeObserver | null = null;
    if (mapContainerRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        handleResize();
      });
      observer.observe(mapContainerRef.current);
    }

    const t1 = setTimeout(handleResize, 60);
    const t2 = setTimeout(handleResize, 200);
    const t3 = setTimeout(handleResize, 500);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      if (observer) observer.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Auto-fit all registered shops when no shop is selected
  useEffect(() => {
    const L = leafletModuleRef.current;
    if (!L || !mapInstanceRef.current || !mapInstanceRef.current._container) return;
    if (!selectedShop && shops.length > 0) {
      try {
        const validShops = shops.filter((s) => s.latitude && s.longitude);
        if (validShops.length === 1) {
          mapInstanceRef.current.setView([validShops[0].latitude, validShops[0].longitude], 15, { animate: false });
        } else if (validShops.length > 1) {
          const bounds = L.latLngBounds(validShops.map((s) => [s.latitude, s.longitude]));
          if (liveLocation) {
            const dist = calculateDistanceKm(liveLocation[0], liveLocation[1], validShops[0].latitude, validShops[0].longitude);
            if (dist < 80) bounds.extend(liveLocation);
          }
          mapInstanceRef.current.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: 15,
            animate: false,
          });
        }
        mapInstanceRef.current.invalidateSize({ animate: false });
      } catch (_) {}
    }
  }, [shops, selectedShop, liveLocation]);

  // Detect customer GPS on mount
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

  // 1. Initialize Leaflet Map ONCE on Mount with CARTO Voyager
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;

    async function initMap() {
      try {
        const leaf = await import("leaflet");
        const L = (leaf as any).default || leaf;
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

        const validShop = shops.find((s) => s.latitude && s.longitude);
        const centerCoords: [number, number] = validShop
          ? [validShop.latitude, validShop.longitude]
          : liveLocation || [14.65, 121.05];

        const map = L.map(mapContainerRef.current, {
          center: centerCoords,
          zoom: 14,
          scrollWheelZoom: true,
          dragging: true,
          touchZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
          zoomControl: false,
        });

        const currentStyle = MAP_BASEMAPS[basemapStyle] || MAP_BASEMAPS.streets;
        const tileLayer = L.tileLayer(currentStyle.url, {
          attribution: currentStyle.attribution,
          subdomains: currentStyle.subdomains || "abc",
          maxZoom: currentStyle.maxZoom || 19,
        }).addTo(map);

        tileLayer.on("tileerror", (e: any) => {
          if (e.tile && !e.tile.dataset.fallbackRetried) {
            e.tile.dataset.fallbackRetried = "1";
            const src = e.tile.src || "";
            const match = src.match(/\/(\d+)\/(\d+)\/(\d+)/);
            if (match) {
              e.tile.src = `https://tile.openstreetmap.org/${match[1]}/${match[2]}/${match[3]}.png`;
            }
          }
        });

        tileLayerRef.current = tileLayer;

        radiusLayerGroupRef.current = L.layerGroup().addTo(map);
        userLayerGroupRef.current = L.layerGroup().addTo(map);
        shopsLayerGroupRef.current = L.layerGroup().addTo(map);
        routeLayerGroupRef.current = L.layerGroup().addTo(map);

        mapInstanceRef.current = map;

        const triggerInvalidate = () => {
          if (isMounted && mapInstanceRef.current && mapInstanceRef.current._container) {
            try {
              mapInstanceRef.current.invalidateSize({ animate: false });
            } catch (_) {}
          }
        };

        triggerInvalidate();
        setTimeout(triggerInvalidate, 80);
        setTimeout(triggerInvalidate, 250);
        setTimeout(triggerInvalidate, 600);
      } catch (err) {
        console.error("Error initializing Leaflet map:", err);
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

  // Update Basemap Layer when style changes
  useEffect(() => {
    const L = leafletModuleRef.current;
    if (!L || !mapInstanceRef.current || !tileLayerRef.current) return;

    try {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      const currentStyle = MAP_BASEMAPS[basemapStyle] || MAP_BASEMAPS.streets;
      const newLayer = L.tileLayer(currentStyle.url, {
        attribution: currentStyle.attribution,
        subdomains: currentStyle.subdomains || "abc",
        maxZoom: currentStyle.maxZoom || 19,
      }).addTo(mapInstanceRef.current);
      newLayer.on("tileerror", (e: any) => {
        if (e.tile && !e.tile.dataset.fallbackRetried) {
          e.tile.dataset.fallbackRetried = "1";
          const src = e.tile.src || "";
          const match = src.match(/\/(\d+)\/(\d+)\/(\d+)/);
          if (match) {
            e.tile.src = `https://tile.openstreetmap.org/${match[1]}/${match[2]}/${match[3]}.png`;
          }
        }
      });
      newLayer.bringToBack();
      tileLayerRef.current = newLayer;
    } catch (_) {}
  }, [basemapStyle]);

  // 2. Render / Update Customer Live Location Marker ("You") - Clean Pulse Puck
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

  // 3. Render / Update Shop Markers - Clean Vector Teardrop Pin
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

      const pinWidth = isSelected ? 34 : 28;
      const pinHeight = isSelected ? 44 : 36;
      const anchorX = isSelected ? 17 : 14;
      const anchorY = isSelected ? 44 : 36;

      const html = isSelected
        ? `
        <div style="position: relative; width: ${pinWidth}px; height: ${pinHeight}px; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25)); transition: transform 0.15s ease;">
          <div style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%) translateY(-5px); background: #0F172A; color: #FFFFFF; font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.28); pointer-events: none; border: 1px solid rgba(255,255,255,0.18);">
            ${shop.name}
          </div>
          <svg width="${pinWidth}" height="${pinHeight}" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 44C15.6 39.8 0 27.2 0 17C0 7.6 7.6 0 17 0C26.4 0 34 7.6 34 17C34 27.2 18.4 39.8 17 44Z" fill="#2563EB" stroke="#FFFFFF" stroke-width="2"/>
            <rect x="10.5" y="9" width="13" height="15" rx="2.5" fill="none" stroke="#FFFFFF" stroke-width="1.8"/>
            <circle cx="17" cy="17.8" r="4.2" fill="none" stroke="#FFFFFF" stroke-width="1.6"/>
            <circle cx="13.8" cy="12" r="0.9" fill="#FFFFFF"/>
            <line x1="16.5" y1="12" x2="20.5" y2="12" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round"/>
            <circle cx="26" cy="8" r="4" fill="${queueColor}" stroke="#FFFFFF" stroke-width="1.5"/>
          </svg>
        </div>
        `
        : `
        <div style="position: relative; width: ${pinWidth}px; height: ${pinHeight}px; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.18)); transition: transform 0.15s ease;">
          <svg width="${pinWidth}" height="${pinHeight}" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 36C12.8 32.5 0 22 0 14C0 6.3 6.3 0 14 0C21.7 0 28 6.3 28 14C28 22 15.2 32.5 14 36Z" fill="#FFFFFF" stroke="${queueColor}" stroke-width="2"/>
            <rect x="8.5" y="7.5" width="11" height="13" rx="2" fill="none" stroke="${queueColor}" stroke-width="1.5"/>
            <circle cx="14" cy="15" r="3.5" fill="none" stroke="${queueColor}" stroke-width="1.4"/>
            <circle cx="11.2" cy="10.2" r="0.75" fill="${queueColor}"/>
            <line x1="13.5" y1="10.2" x2="16.8" y2="10.2" stroke="${queueColor}" stroke-width="1.2" stroke-linecap="round"/>
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
    setCalculatedDuration(Math.max(1, Math.round(straightDist * 3.5)));

    const addMidpointBadge = (coords: [number, number], distKm: number, durationMins: number) => {
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

      const roadCasing = L.polyline(roadLatLngs, {
        color: "#1E3A8A",
        weight: 7,
        opacity: 0.25,
        lineCap: "round",
        lineJoin: "round",
      });

      const roadPolyline = L.polyline(roadLatLngs, {
        color: "#2563EB",
        weight: 4,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      });

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

      const midIndex = Math.floor(roadLatLngs.length / 2);
      const midPoint =
        roadLatLngs[midIndex] || [(userLat + shopLat) / 2, (userLng + shopLng) / 2];
      addMidpointBadge(midPoint, distKm, mins);

      try {
        const bounds = roadPolyline.getBounds();
        if (bounds && bounds.isValid() && mapInstanceRef.current && mapInstanceRef.current._mapPane) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: false });
        }
      } catch (_) {}
    };

    if (selectedShop.id !== lastFittedShopIdRef.current) {
      lastFittedShopIdRef.current = selectedShop.id;
      try {
        const initialBounds = L.latLngBounds([
          [userLat, userLng],
          [shopLat, shopLng],
        ]);
        if (initialBounds.isValid() && mapInstanceRef.current && mapInstanceRef.current._mapPane) {
          mapInstanceRef.current.fitBounds(initialBounds, { padding: [50, 50], maxZoom: 16, animate: false });
        }
      } catch (_) {}
    }

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${shopLng},${shopLat}?overview=full&geometries=geojson`;

    fetch(osrmUrl)
      .then((res) => {
        if (!res.ok) throw new Error("OSRM routing network error");
        return res.json();
      })
      .then((data) => {
        if (data.code === "Ok" && data.routes && data.routes[0]) {
          const route = data.routes[0];
          const rawCoords = route.geometry.coordinates;
          const roadLatLngs: [number, number][] = rawCoords.map((c: [number, number]) => [
            c[1],
            c[0],
          ]);

          const realDistanceKm = parseFloat((route.distance / 1000).toFixed(2));
          const durationMins = Math.max(1, Math.round(route.duration / 60));

          setCalculatedDistance(realDistanceKm);
          setCalculatedDuration(durationMins);

          renderRoadTrack(roadLatLngs, realDistanceKm, durationMins);
        } else {
          fallbackStraightRoute();
        }
      })
      .catch(() => {
        fallbackStraightRoute();
      });

    function fallbackStraightRoute() {
      const straightLine: [number, number][] = [
        [userLat, userLng],
        [shopLat, shopLng],
      ];
      renderRoadTrack(straightLine, straightDist, Math.max(1, Math.round(straightDist * 3.5)));
    }
  }, [selectedShop, liveLocation]);

  // 5. Render / Update Search Radius Circle
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

    if (!radiusKm || !liveLocation) {
      lastRadiusRef.current = null;
      return;
    }

    const circle = L.circle(liveLocation, {
      radius: radiusKm * 1000,
      color: "#3B82F6",
      fillColor: "#60A5FA",
      fillOpacity: 0.08,
      weight: 1.5,
      dashArray: "4, 6",
    });

    radiusLayerGroupRef.current.addLayer(circle);

    if (radiusKm !== lastRadiusRef.current && !selectedShop) {
      lastRadiusRef.current = radiusKm;
      try {
        const bounds = circle.getBounds();
        if (bounds && bounds.isValid() && mapInstanceRef.current && mapInstanceRef.current._mapPane) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 15, animate: false });
        }
      } catch (_) {}
    }
  }, [radiusKm, liveLocation, selectedShop]);

  // Controls Handlers
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.zoomIn();
      } catch (_) {}
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.zoomOut();
      } catch (_) {}
    }
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current && liveLocation) {
      try {
        mapInstanceRef.current.setView(liveLocation, 15, { animate: true });
      } catch (_) {}
    }
  };

  const toggleInternalFullscreen = () => {
    if (onToggleFullScreen) {
      onToggleFullScreen();
      return;
    }
    setIsInternalFullscreen((prev) => !prev);
  };

  const openGoogleMapsDirections = () => {
    if (!selectedShop) return;
    const dest = `${selectedShop.latitude},${selectedShop.longitude}`;
    const origin = liveLocation ? `${liveLocation[0]},${liveLocation[1]}` : "";
    const url = origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${dest}`;
    window.open(url, "_blank");
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full h-full min-h-[400px] overflow-hidden select-none bg-slate-100 ${
        isInternalFullscreen || isFullScreen
          ? "fixed inset-0 z-50 w-screen h-screen"
          : className
      }`}
    >
      {/* Leaflet Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[400px]" />

      {/* Floating Basemap Style Switcher */}
      <div className="absolute top-4 left-4 z-20">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLayerMenu((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-all cursor-pointer"
            title="Change Basemap Style"
          >
            <Layers size={15} />
            <span className="hidden sm:inline">{MAP_BASEMAPS[basemapStyle].name}</span>
          </button>

          {showLayerMenu && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5 space-y-1 z-30 animate-in fade-in zoom-in-95 duration-150">
              {(Object.keys(MAP_BASEMAPS) as (keyof typeof MAP_BASEMAPS)[]).map((key) => {
                const isSelected = basemapStyle === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setBasemapStyle(key);
                      setShowLayerMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{MAP_BASEMAPS[key].name}</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Map Action Buttons (Right Side) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {/* Zoom Controls */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-md overflow-hidden flex flex-col">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer active:bg-slate-100"
            title="Zoom In"
          >
            <Plus size={18} />
          </button>
          <div className="h-px w-full bg-slate-200" />
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer active:bg-slate-100"
            title="Zoom Out"
          >
            <Minus size={18} />
          </button>
        </div>

        {/* Recenter GPS */}
        <button
          type="button"
          onClick={handleRecenter}
          className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
          title="Recenter on Your Location"
        >
          <LocateFixed size={18} />
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={toggleInternalFullscreen}
          className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
          title={isFullScreen || isInternalFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullScreen || isInternalFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>

      {/* Selected Shop Floating Drawer / Bottom Sheet */}
      {selectedShop && (
        <div className="absolute bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:w-80 z-30 bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-3 duration-200">
          {selectedShop.images && selectedShop.images.length > 0 ? (
            <div className="relative h-28 w-full bg-slate-100 overflow-hidden">
              <img
                src={selectedShop.images[0]}
                alt={selectedShop.name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => onSelectShop(null)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-xs text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
                title="Close Drawer"
              >
                <X size={14} />
              </button>

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

              <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold border border-white/10">
                <Star size={11} className="text-amber-400 fill-amber-400" />
                <span>
                  {selectedShop.rating
                    ? Number(selectedShop.rating).toFixed(1)
                    : "5.0"}
                </span>
                <span className="text-[10px] text-slate-300 font-normal">
                  ({selectedShop.total_reviews || 0})
                </span>
              </div>
            </div>
          ) : null}

          <div className="p-3.5 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                {(!selectedShop.images || selectedShop.images.length === 0) && (
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Navigation size={16} />
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[200px]">
                    {selectedShop.name}
                  </h4>
                  {calculatedDistance !== null ? (
                    <p className="text-[11px] font-semibold text-blue-700 mt-0.5">
                      {calculatedDistance} km • ~{calculatedDuration} mins drive
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

              {(!selectedShop.images || selectedShop.images.length === 0) && (
                <button
                  type="button"
                  onClick={() => onSelectShop(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              {onGenerateQR && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (selectedShop && onGenerateQR) onGenerateQR(selectedShop);
                  }}
                  className="flex-1 text-[11px] py-1.5 h-8 font-bold flex items-center justify-center gap-1 shadow-2xs"
                >
                  <QrCode size={12} />
                  Walk-In QR
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={openGoogleMapsDirections}
                className="flex-1 text-[11px] py-1.5 h-8 font-semibold text-blue-700 border-blue-200 hover:bg-blue-50 flex items-center justify-center gap-1"
              >
                <ExternalLink size={12} />
                Directions
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 left-3 z-20 bg-white/95 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-xl text-[10px] text-slate-600 shadow-sm flex items-center gap-2.5 flex-wrap">
        <span className="flex items-center gap-1 font-bold text-blue-700">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200" />
          You
        </span>
        <span className="h-2.5 w-px bg-slate-200" />
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Low Queue
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Moderate
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> Busy
        </span>
      </div>
    </div>
  );
};
