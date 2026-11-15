"use client";

import React, { useEffect, useRef, useState } from "react";
import { LaundryShop } from "@/types/auth";
import { MAP_STYLES } from "@/lib/map/maplibreStyles";
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

function createCircleGeoJSON(centerLat: number, centerLng: number, radiusKm: number, points = 64) {
  const coords: [number, number][] = [];
  const distanceX = radiusKm / (111.32 * Math.cos((centerLat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([centerLng + x, centerLat + y]);
  }
  coords.push(coords[0]);
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
    properties: {},
  };
}

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
  const maplibreglRef = useRef<any>(null);
  const shopMarkersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  const [basemapStyle, setBasemapStyle] = useState<"voyager" | "positron" | "osm" | "dark">("voyager");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [liveLocation, setLiveLocation] = useState<[number, number] | null>(
    initialUserLocation || [14.65, 121.05]
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

  // Handle resizing on sidebar toggle or fullscreen
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.resize();
        } catch (_) {}
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [sidebarOpen, isFullScreen, isInternalFullscreen]);

  // Window resize listener
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.resize();
        } catch (_) {}
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
          console.warn("Geolocation permission notice:", error.message);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // Initialize MapLibre GL Map on Mount
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;
    let isCancelled = false;

    async function initMap() {
      try {
        const maplibregl = await import("maplibre-gl");
        if (isCancelled || !mapContainerRef.current) return;
        maplibreglRef.current = maplibregl;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const validShop = shops.find((s) => s.latitude && s.longitude);
        const centerLng = validShop ? validShop.longitude : liveLocation ? liveLocation[1] : 121.05;
        const centerLat = validShop ? validShop.latitude : liveLocation ? liveLocation[0] : 14.65;

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: MAP_STYLES[basemapStyle].style as any,
          center: [centerLng, centerLat],
          zoom: 13,
          attributionControl: false,
        });

        mapInstanceRef.current = map;

        map.on("load", () => {
          if (isCancelled) return;
          map.resize();
          renderRadiusLayer(map);
          renderRouteLayer(map);
        });
      } catch (err) {
        console.error("Error setting up MapLibre map:", err);
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
    };
  }, []);

  // Switch basemap style
  const handleSwitchBasemap = (styleKey: "voyager" | "positron" | "osm" | "dark") => {
    setBasemapStyle(styleKey);
    setShowLayerMenu(false);
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.setStyle(MAP_STYLES[styleKey].style);
        mapInstanceRef.current.once("style.load", () => {
          renderRadiusLayer(mapInstanceRef.current);
          renderRouteLayer(mapInstanceRef.current);
        });
      } catch (err) {
        console.warn("Error changing basemap style:", err);
      }
    }
  };

  // Render User Location Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    const maplibregl = maplibreglRef.current;
    if (!map || !maplibregl || !liveLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([liveLocation[1], liveLocation[0]]);
    } else {
      const userEl = document.createElement("div");
      userEl.innerHTML = `
        <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: rgba(37, 99, 235, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 14px; height: 14px; border-radius: 50%; background: #2563EB; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.3); position: relative; z-index: 2;"></div>
        </div>
      `;
      userMarkerRef.current = new maplibregl.Marker({ element: userEl })
        .setLngLat([liveLocation[1], liveLocation[0]])
        .addTo(map);
    }
  }, [liveLocation]);

  // Render / Update Radius Circle
  const renderRadiusLayer = (map: any) => {
    if (!map || !map.isStyleLoaded()) return;

    if (radiusKm && radiusKm > 0 && liveLocation) {
      const circleData = createCircleGeoJSON(liveLocation[0], liveLocation[1], radiusKm);
      if (map.getSource("radius-source")) {
        (map.getSource("radius-source") as any).setData(circleData);
      } else {
        map.addSource("radius-source", {
          type: "geojson",
          data: circleData,
        });
        map.addLayer({
          id: "radius-fill",
          type: "fill",
          source: "radius-source",
          paint: {
            "fill-color": "#3B82F6",
            "fill-opacity": 0.08,
          },
        });
        map.addLayer({
          id: "radius-line",
          type: "line",
          source: "radius-source",
          paint: {
            "line-color": "#2563EB",
            "line-width": 1.5,
            "line-dasharray": [3, 3],
          },
        });
      }
    } else {
      if (map.getLayer("radius-line")) map.removeLayer("radius-line");
      if (map.getLayer("radius-fill")) map.removeLayer("radius-fill");
      if (map.getSource("radius-source")) map.removeSource("radius-source");
    }
  };

  useEffect(() => {
    if (mapInstanceRef.current) {
      renderRadiusLayer(mapInstanceRef.current);
    }
  }, [radiusKm, liveLocation]);

  // Render Shop Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const maplibregl = maplibreglRef.current;
    if (!map || !maplibregl) return;

    // Clear previous shop markers
    shopMarkersRef.current.forEach((m) => m.remove());
    shopMarkersRef.current = [];

    shops.forEach((shop) => {
      if (!shop.latitude || !shop.longitude) return;
      const isSelected = selectedShop?.id === shop.id;
      const queueColor =
        shop.queue_status === "Low"
          ? "#10B981"
          : shop.queue_status === "Moderate"
          ? "#F59E0B"
          : "#EF4444";

      const pinEl = document.createElement("div");
      pinEl.innerHTML = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: ${
          isSelected ? "scale(1.15)" : "scale(1)"
        }; transition: transform 0.2s;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: ${
            isSelected ? "#2563EB" : queueColor
          }; border: 3px solid #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <div style="background: white; border: 1.5px solid ${
            isSelected ? "#2563EB" : "#E2E8F0"
          }; border-radius: 6px; padding: 2px 6px; font-size: 10px; font-weight: 800; color: #1E293B; box-shadow: 0 2px 6px rgba(0,0,0,0.15); margin-top: 3px; white-space: nowrap;">
            ${shop.name}
          </div>
        </div>
      `;

      pinEl.onclick = () => {
        onSelectShop(shop);
        map.flyTo({
          center: [shop.longitude, shop.latitude],
          zoom: 15,
        });
      };

      const marker = new maplibregl.Marker({ element: pinEl })
        .setLngLat([shop.longitude, shop.latitude])
        .addTo(map);

      shopMarkersRef.current.push(marker);
    });
  }, [shops, selectedShop?.id]);

  // Render Route Line to Selected Shop
  const renderRouteLayer = async (map: any) => {
    if (!map || !map.isStyleLoaded()) return;

    if (selectedShop && liveLocation) {
      const userLng = liveLocation[1];
      const userLat = liveLocation[0];
      const shopLng = selectedShop.longitude;
      const shopLat = selectedShop.latitude;

      const dist = calculateDistanceKm(userLat, userLng, shopLat, shopLng);
      setCalculatedDistance(dist);
      setCalculatedDuration(Math.max(1, Math.round((dist / 25) * 60)));

      let routeCoords: [number, number][] = [
        [userLng, userLat],
        [shopLng, shopLat],
      ];

      // Try OSRM driving route
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${shopLng},${shopLat}?overview=full&geometries=geojson`
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.routes?.[0]?.geometry?.coordinates) {
            routeCoords = data.routes[0].geometry.coordinates;
          }
        }
      } catch (_) {}

      const geojsonLine = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: routeCoords,
        },
      };

      if (map.getSource("selected-route")) {
        (map.getSource("selected-route") as any).setData(geojsonLine);
      } else {
        map.addSource("selected-route", {
          type: "geojson",
          data: geojsonLine,
        });
        map.addLayer({
          id: "selected-route-casing",
          type: "line",
          source: "selected-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#1E3A8A",
            "line-width": 7,
            "line-opacity": 0.35,
          },
        });
        map.addLayer({
          id: "selected-route-line",
          type: "line",
          source: "selected-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#2563EB",
            "line-width": 4.5,
            "line-opacity": 0.95,
          },
        });
      }
    } else {
      if (map.getLayer("selected-route-line")) map.removeLayer("selected-route-line");
      if (map.getLayer("selected-route-casing")) map.removeLayer("selected-route-casing");
      if (map.getSource("selected-route")) map.removeSource("selected-route");
      setCalculatedDistance(null);
      setCalculatedDuration(null);
    }
  };

  useEffect(() => {
    if (mapInstanceRef.current) {
      renderRouteLayer(mapInstanceRef.current);
    }
  }, [selectedShop?.id, liveLocation]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current && liveLocation) {
      mapInstanceRef.current.flyTo({
        center: [liveLocation[1], liveLocation[0]],
        zoom: 15,
      });
    }
  };

  const toggleInternalFullscreen = () => {
    if (onToggleFullScreen) {
      onToggleFullScreen();
    } else {
      setIsInternalFullscreen((prev) => !prev);
    }
  };

  const openGoogleMapsDirections = () => {
    if (!selectedShop) return;
    const dest = `${selectedShop.latitude},${selectedShop.longitude}`;
    const orig = liveLocation ? `${liveLocation[0]},${liveLocation[1]}` : "";
    const url = orig
      ? `https://www.google.com/maps/dir/?api=1&origin=${orig}&destination=${dest}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${dest}`;
    window.open(url, "_blank");
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full h-full overflow-hidden bg-slate-100 ${
        isFullScreen || isInternalFullscreen ? "fixed inset-0 z-50 rounded-none" : "rounded-2xl"
      } ${className}`}
    >
      {/* Map Viewport Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" />

      {/* Top Map Controls Floating Bar */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
        {/* Layer Selector Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
            title="Map Style"
          >
            <Layers size={18} />
          </button>

          {showLayerMenu && (
            <div className="absolute right-0 top-12 w-48 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl p-2 z-30 space-y-1 animate-in fade-in zoom-in-95">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 block">
                Free Map Styles
              </span>
              {(Object.keys(MAP_STYLES) as Array<keyof typeof MAP_STYLES>).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSwitchBasemap(key)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    basemapStyle === key
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{MAP_STYLES[key].name}</span>
                  {basemapStyle === key && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex flex-col rounded-xl overflow-hidden bg-white/95 backdrop-blur-md border border-slate-200 shadow-md divide-y divide-slate-100">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-10 h-10 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-10 h-10 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer"
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
          {/* Shop Photo Header if available */}
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

              {/* Queue Badge */}
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

              {/* Rating on image */}
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

          {/* Modal Content Body */}
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
