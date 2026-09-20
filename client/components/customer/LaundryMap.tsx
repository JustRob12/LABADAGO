"use client";

import React, { useEffect, useRef, useState } from "react";
import { LaundryShop } from "@/types/auth";
import { Navigation, Compass, LocateFixed, Loader2, Plus, Minus, X } from "lucide-react";

interface LaundryMapProps {
  shops: LaundryShop[];
  selectedShop: LaundryShop | null;
  onSelectShop: (shop: LaundryShop) => void;
  userLocation?: [number, number] | null;
  onUserLocationDetected?: (coords: [number, number]) => void;
  radiusKm?: number | null;
  className?: string;
}

// Haversine formula to compute distance in kilometers
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
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

export const LaundryMap: React.FC<LaundryMapProps> = ({
  shops,
  selectedShop,
  onSelectShop,
  userLocation: initialUserLocation,
  onUserLocationDetected,
  radiusKm,
  className = "",
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const userLayerGroupRef = useRef<any>(null);
  const radiusLayerGroupRef = useRef<any>(null);
  const shopsLayerGroupRef = useRef<any>(null);
  const routeLayerGroupRef = useRef<any>(null);
  const leafletModuleRef = useRef<any>(null);
  const lastFittedShopIdRef = useRef<string | null>(null);
  const lastRadiusRef = useRef<number | null>(null);

  const [liveLocation, setLiveLocation] = useState<[number, number] | null>(
    initialUserLocation || [14.6500, 121.0500] // Default Metro Manila reference
  );
  const [isLocating, setIsLocating] = useState(false);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [calculatedDuration, setCalculatedDuration] = useState<number | null>(null);

  // Sync external userLocation if provided
  useEffect(() => {
    if (initialUserLocation) {
      setLiveLocation(initialUserLocation);
    }
  }, [initialUserLocation]);

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
          console.warn("Geolocation permission not granted, using default coordinates:", error.message);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // 1. Initialize Map ONCE on Mount
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;

    async function initMap() {
      try {
        const L = (await import("leaflet")).default;
        if (!isMounted || !mapContainerRef.current) return;

        leafletModuleRef.current = L;

        // Cleanup existing map if any
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const centerCoords = liveLocation || [14.5800, 121.0350];

        const map = L.map(mapContainerRef.current, {
          center: centerCoords,
          zoom: 12,
          scrollWheelZoom: true,
          dragging: true,
          touchZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
          zoomControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        // Create dedicated layer groups for clean management
        radiusLayerGroupRef.current = L.layerGroup().addTo(map);
        userLayerGroupRef.current = L.layerGroup().addTo(map);
        shopsLayerGroupRef.current = L.layerGroup().addTo(map);
        routeLayerGroupRef.current = L.layerGroup().addTo(map);

        mapInstanceRef.current = map;

        // Invalidate size to ensure dragging bounds and tiles calculate properly
        setTimeout(() => {
          if (map) {
            map.invalidateSize();
          }
        }, 200);
      } catch (err) {
        console.error("Error initializing Leaflet map:", err);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (routeLayerGroupRef.current) {
        routeLayerGroupRef.current.clearLayers();
        routeLayerGroupRef.current = null;
      }
      if (shopsLayerGroupRef.current) {
        shopsLayerGroupRef.current.clearLayers();
        shopsLayerGroupRef.current = null;
      }
      if (userLayerGroupRef.current) {
        userLayerGroupRef.current.clearLayers();
        userLayerGroupRef.current = null;
      }
      if (radiusLayerGroupRef.current) {
        radiusLayerGroupRef.current.clearLayers();
        radiusLayerGroupRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Run only once on mount!

  // 2. Render / Update Customer Live Location Marker
  useEffect(() => {
    const L = leafletModuleRef.current;
    if (!L || !mapInstanceRef.current || !userLayerGroupRef.current || !liveLocation) return;

    userLayerGroupRef.current.clearLayers();

    const userIconHtml = `
      <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: rgba(37, 99, 235, 0.35); animation: pulse 1.8s infinite;"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #2563EB; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 5px rgba(0,0,0,0.3); position: relative; z-index: 2;"></div>
      </div>
    `;

    const userIcon = L.divIcon({
      html: userIconHtml,
      className: "customer-live-location-pin",
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    const uMarker = L.marker(liveLocation, { icon: userIcon, zIndexOffset: 1000 });
    uMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px; font-weight: 700; color: #1E40AF; text-align: center;">
        📍 You are here (Live Location)
      </div>
    `);

    userLayerGroupRef.current.addLayer(uMarker);
  }, [liveLocation]);

  // 3. Render / Update Shop Markers
  useEffect(() => {
    const L = leafletModuleRef.current;
    if (!L || !mapInstanceRef.current || !shopsLayerGroupRef.current) return;

    shopsLayerGroupRef.current.clearLayers();

    shops.forEach((shop) => {
      const isSelected = selectedShop?.id === shop.id;
      const queueColor =
        shop.queue_status === "Low"
          ? "#10B981"
          : shop.queue_status === "Moderate"
          ? "#F59E0B"
          : "#EF4444";

      const html = `
        <div style="
          width: ${isSelected ? "38px" : "32px"};
          height: ${isSelected ? "38px" : "32px"};
          background: ${isSelected ? "#2563EB" : "#ffffff"};
          border: 2px solid ${queueColor};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.18);
          cursor: pointer;
          transition: transform 0.2s ease;
        ">
          <svg width="${isSelected ? "18" : "15"}" height="${isSelected ? "18" : "15"}" viewBox="0 0 24 24" fill="none" stroke="${isSelected ? "#ffffff" : "#2563EB"}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
            <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
            <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
          </svg>
        </div>
      `;

      const customIcon = L.divIcon({
        html,
        className: "custom-laundry-pin",
        iconSize: isSelected ? [38, 38] : [32, 32],
        iconAnchor: isSelected ? [19, 19] : [16, 16],
      });

      const marker = L.marker([shop.latitude, shop.longitude], {
        icon: customIcon,
      });

      marker.on("click", () => {
        onSelectShop(shop);
      });

      shopsLayerGroupRef.current.addLayer(marker);
    });
  }, [shops, selectedShop, onSelectShop]);

  // 4. Render / Update Route Line (Following Real Road Network via OSRM with Fallback)
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
        mapInstanceRef.current.setView([selectedShop.latitude, selectedShop.longitude], 14, {
          animate: true,
        });
      }
      return;
    }

    const userLat = liveLocation[0];
    const userLng = liveLocation[1];
    const shopLat = selectedShop.latitude;
    const shopLng = selectedShop.longitude;

    const straightDist = calculateDistanceKm(userLat, userLng, shopLat, shopLng);
    setCalculatedDistance(straightDist);
    setCalculatedDuration(Math.max(3, Math.round(straightDist * 2.5)));

    let isCancelled = false;
    const abortController = new AbortController();

    // Helper to render midpoint badge
    const addMidpointBadge = (
      coords: [number, number],
      distKm: number,
      durationMins: number,
      isRealRoad = false
    ) => {
      if (!routeLayerGroupRef.current) return;
      const badgeHtml = `
        <div style="
          background: #1E40AF;
          color: #FFFFFF;
          padding: 3px 10px;
          border-radius: 9999px;
          font-family: inherit;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          border: 1.5px solid #FFFFFF;
          pointer-events: none;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          gap: 5px;
        ">
          <span>${isRealRoad ? "🚗" : "📍"}</span>
          <span>${distKm} km • ~${durationMins}m</span>
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

    // Draw straight-line fallback immediately while OSRM calculates
    const drawStraightFallback = () => {
      if (!routeLayerGroupRef.current || !mapInstanceRef.current) return;
      routeLayerGroupRef.current.clearLayers();

      const fallbackPolyline = L.polyline(
        [
          [userLat, userLng],
          [shopLat, shopLng],
        ],
        {
          color: "#2563EB",
          weight: 3.5,
          opacity: 0.85,
          dashArray: "7, 9",
          lineCap: "round",
        }
      );
      routeLayerGroupRef.current.addLayer(fallbackPolyline);

      const midLat = (userLat + shopLat) / 2;
      const midLng = (userLng + shopLng) / 2;
      addMidpointBadge([midLat, midLng], straightDist, Math.max(3, Math.round(straightDist * 2.5)), false);

      if (selectedShop.id !== lastFittedShopIdRef.current) {
        lastFittedShopIdRef.current = selectedShop.id;
        try {
          mapInstanceRef.current.fitBounds(fallbackPolyline.getBounds(), {
            padding: [60, 60],
            maxZoom: 15,
            animate: true,
          });
        } catch (err) {
          console.warn("Could not fitBounds:", err);
        }
      }
    };

    drawStraightFallback();

    // Fetch real road navigation geometry from OSRM (Driving route along streets)
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${shopLng},${shopLat}?overview=full&geometries=geojson`;

    fetch(osrmUrl, { signal: abortController.signal })
      .then((res) => {
        if (!res.ok) throw new Error("OSRM response not ok");
        return res.json();
      })
      .then((data) => {
        if (isCancelled || !routeLayerGroupRef.current || !mapInstanceRef.current) return;

        if (data.code === "Ok" && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const rawCoords: [number, number][] = route.geometry.coordinates;

          // Convert GeoJSON [longitude, latitude] to Leaflet [latitude, longitude]
          const roadLatLngs: [number, number][] = rawCoords.map((c) => [c[1], c[0]]);

          const realDistKm = parseFloat((route.distance / 1000).toFixed(2));
          const realMins = Math.max(1, Math.round(route.duration / 60));

          setCalculatedDistance(realDistKm);
          setCalculatedDuration(realMins);

          // Clear fallback line and render road path
          routeLayerGroupRef.current.clearLayers();

          // 1. Soft glow casing for road path
          const roadCasing = L.polyline(roadLatLngs, {
            color: "#1E3A8A",
            weight: 7,
            opacity: 0.35,
            lineCap: "round",
            lineJoin: "round",
          });

          // 2. Crisp foreground road path following the street network
          const roadPolyline = L.polyline(roadLatLngs, {
            color: "#2563EB",
            weight: 4.5,
            opacity: 0.95,
            lineCap: "round",
            lineJoin: "round",
          });

          routeLayerGroupRef.current.addLayer(roadCasing);
          routeLayerGroupRef.current.addLayer(roadPolyline);

          // Place badge at the midpoint coordinate along the road
          const midIndex = Math.floor(roadLatLngs.length / 2);
          const midPoint = roadLatLngs[midIndex] || [(userLat + shopLat) / 2, (userLng + shopLng) / 2];
          addMidpointBadge(midPoint, realDistKm, realMins, true);

          // Smoothly fit bounds to the road path
          if (selectedShop.id !== lastFittedShopIdRef.current) {
            lastFittedShopIdRef.current = selectedShop.id;
            try {
              mapInstanceRef.current.fitBounds(roadPolyline.getBounds(), {
                padding: [60, 60],
                maxZoom: 16,
                animate: true,
              });
            } catch (err) {
              console.warn("Could not fitBounds to road:", err);
            }
          }
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.warn("OSRM routing request failed, straight line retained:", err);
        }
      });

    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [selectedShop, liveLocation]);

  // 5. Render / Update Facebook Marketplace Style Radius Circle
  useEffect(() => {
    const L = leafletModuleRef.current;
    if (!L || !mapInstanceRef.current || !radiusLayerGroupRef.current) return;

    radiusLayerGroupRef.current.clearLayers();

    if (!liveLocation || !radiusKm || radiusKm <= 0) return;

    // Translucent filled circle with dashed border
    const radiusCircle = L.circle(liveLocation, {
      radius: radiusKm * 1000,
      fillColor: "#3B82F6",
      fillOpacity: 0.10,
      color: "#2563EB",
      weight: 2,
      dashArray: "6, 6",
      interactive: false,
    });

    // Outer subtle boundary ring
    const outerRing = L.circle(liveLocation, {
      radius: radiusKm * 1000,
      fill: false,
      color: "#1D4ED8",
      weight: 1,
      opacity: 0.4,
      interactive: false,
    });

    radiusLayerGroupRef.current.addLayer(radiusCircle);
    radiusLayerGroupRef.current.addLayer(outerRing);

    // Fit map bounds when radius is explicitly changed and no shop is currently selected
    if (radiusKm !== lastRadiusRef.current && mapInstanceRef.current && !selectedShop) {
      lastRadiusRef.current = radiusKm;
      try {
        mapInstanceRef.current.fitBounds(radiusCircle.getBounds(), {
          padding: [30, 30],
          maxZoom: 15,
          animate: true,
        });
      } catch (err) {
        console.warn("Could not fitBounds to radius circle:", err);
      }
    }
  }, [liveLocation, radiusKm, selectedShop]);

  // Reset fitted shop ref when shop is unselected
  useEffect(() => {
    if (!selectedShop) {
      lastFittedShopIdRef.current = null;
    }
  }, [selectedShop]);

  const handleZoomIn = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.zoomOut();
  };

  const handleLocateMe = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setLiveLocation(coords);
        if (onUserLocationDetected) onUserLocationDetected(coords);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView(coords, 14, { animate: false });
        }
        setIsLocating(false);
      },
      (err) => {
        console.warn("Location fetch error:", err);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleCenterAll = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([14.5800, 121.0350], 12, { animate: false });
  };

  return (
    <div className={`relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 ${className}`}>
      {/* Map Canvas Container */}
      <div
        ref={mapContainerRef}
        className="w-full h-full min-h-[440px] z-10 cursor-grab active:cursor-grabbing"
        style={{ touchAction: "none" }}
      />

      {/* Map Overlay Controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          title="Locate my current live position"
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-blue-600 shadow-xs hover:bg-slate-50 cursor-pointer transition-colors"
        >
          {isLocating ? <Loader2 size={16} className="animate-spin text-blue-600" /> : <LocateFixed size={16} />}
        </button>

        <button
          type="button"
          onClick={handleCenterAll}
          title="Reset map view"
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-blue-600 shadow-xs hover:bg-slate-50 cursor-pointer transition-colors"
        >
          <Compass size={16} />
        </button>

        <div className="h-px bg-slate-200 my-0.5" />

        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-blue-600 shadow-xs hover:bg-slate-50 cursor-pointer transition-colors"
        >
          <Plus size={16} />
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-blue-600 shadow-xs hover:bg-slate-50 cursor-pointer transition-colors"
        >
          <Minus size={16} />
        </button>
      </div>

      {/* Top Banner: Distance indicator when a shop is pressed */}
      {selectedShop && calculatedDistance !== null && (
        <div className="absolute top-3 left-3 z-20 max-w-[calc(100%-85px)] sm:max-w-md bg-white/95 backdrop-blur-xs border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-800 shadow-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <Navigation size={13} className="text-blue-600 shrink-0" />
            <span className="truncate">
              Route to {selectedShop.name}: <strong>{calculatedDistance} km</strong> (~{calculatedDuration ?? Math.max(3, Math.round(calculatedDistance * 2.5))} mins travel)
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectShop(null as any)}
            className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer shrink-0"
            title="Clear route"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Notice when no shops exist in database yet */}
      {shops.length === 0 && (
        <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-xs border border-slate-200 px-3 py-1.5 rounded-lg text-xs text-slate-600 shadow-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Interactive Map • Awaiting partner shop registrations</span>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-xs border border-slate-200 px-3 py-1.5 rounded-lg text-[11px] text-slate-600 shadow-xs flex items-center gap-2.5 flex-wrap">
        <span className="flex items-center gap-1 font-semibold text-blue-700">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-300" /> You
        </span>
        {radiusKm && radiusKm > 0 && (
          <>
            <span className="h-3 w-px bg-slate-200" />
            <span className="flex items-center gap-1 text-blue-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full border border-dashed border-blue-500 bg-blue-100" />
              {radiusKm} km Radius
            </span>
          </>
        )}
        <span className="h-3 w-px bg-slate-200" />
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Low
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
