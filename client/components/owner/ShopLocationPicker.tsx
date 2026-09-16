"use client";

import React, { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, Navigation, Compass, AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";

interface ShopLocationPickerProps {
  latitude: number;
  longitude: number;
  address?: string;
  onChangeCoords: (lat: number, lng: number) => void;
}

const PRESET_LOCATIONS = [
  { name: "Katipunan, Quezon City", lat: 14.6402, lng: 121.0744 },
  { name: "BGC, Taguig", lat: 14.5517, lng: 121.0494 },
  { name: "Makati CBD", lat: 14.5547, lng: 121.0244 },
  { name: "España, Manila", lat: 14.6062, lng: 120.9898 },
  { name: "Cebu IT Park, Cebu", lat: 10.3298, lng: 123.9056 },
];

export const ShopLocationPicker: React.FC<ShopLocationPickerProps> = ({
  latitude,
  longitude,
  onChangeCoords,
}) => {
  const [mode, setMode] = useState<"live" | "manual">("live");
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // 1. Initialize Map ONCE on Mount
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;

    async function initPickerMap() {
      try {
        const L = (await import("leaflet")).default;
        if (!isMounted || !mapContainerRef.current) return;

        // Clean up previous map if exists
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const initialLat = latitude || 14.6402;
        const initialLng = longitude || 121.0744;

        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLng],
          zoom: 15,
          scrollWheelZoom: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;

        // Custom Shop Pin Icon
        const iconHtml = `
          <div style="
            width: 36px;
            height: 36px;
            background: #10B981;
            border: 3px solid #FFFFFF;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            cursor: grab;
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        `;

        const shopPin = L.divIcon({
          html: iconHtml,
          className: "owner-shop-location-picker-pin",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        // Marker (Draggable)
        const marker = L.marker([initialLat, initialLng], {
          icon: shopPin,
          draggable: true,
        }).addTo(map);

        // Event: Marker dragged
        marker.on("dragend", (e: any) => {
          const latLng = e.target.getLatLng();
          const newLat = parseFloat(latLng.lat.toFixed(6));
          const newLng = parseFloat(latLng.lng.toFixed(6));
          onChangeCoords(newLat, newLng);
        });

        // Event: Map clicked
        map.on("click", (e: any) => {
          const newLat = parseFloat(e.latlng.lat.toFixed(6));
          const newLng = parseFloat(e.latlng.lng.toFixed(6));
          marker.setLatLng([newLat, newLng]);
          onChangeCoords(newLat, newLng);
        });

        markerRef.current = marker;
      } catch (err) {
        console.error("Error setting up shop location picker map:", err);
      }
    }

    initPickerMap();

    return () => {
      isMounted = false;
      if (markerRef.current) {
        if (markerRef.current.unbindPopup) markerRef.current.unbindPopup();
        markerRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Run only once on mount!

  // 2. Sync marker position when external coords change
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current && latitude && longitude) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapInstanceRef.current.setView([latitude, longitude], 15, { animate: false });
    }
  }, [latitude, longitude]);

  // Live GPS Detector Handler
  const handleDetectLiveLocation = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setGpsError(null);
    setGpsStatus(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const detectedLat = parseFloat(pos.coords.latitude.toFixed(6));
        const detectedLng = parseFloat(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy);

        onChangeCoords(detectedLat, detectedLng);
        setGpsStatus(`GPS detected with ±${accuracy}m accuracy at ${detectedLat}°, ${detectedLng}°`);
        setIsLocating(false);

        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLatLng([detectedLat, detectedLng]);
          mapInstanceRef.current.setView([detectedLat, detectedLng], 16, { animate: false });
        }
      },
      (err) => {
        setIsLocating(false);
        setGpsError(`Unable to fetch live GPS (${err.message}). You can use the manual map pin picker below.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSelectPreset = (preset: typeof PRESET_LOCATIONS[0]) => {
    onChangeCoords(preset.lat, preset.lng);
  };

  return (
    <div className="space-y-4 pt-1">
      {/* 2-Option Selector Toggle */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-2">
          Shop Location Setup Method
        </label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/80 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setMode("live")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              mode === "live"
                ? "bg-white text-emerald-700 shadow-xs border border-emerald-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LocateFixed size={15} className={mode === "live" ? "text-emerald-600" : "text-slate-400"} />
            <span>Option 1: Live GPS Location</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              mode === "manual"
                ? "bg-white text-blue-700 shadow-xs border border-blue-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MapPin size={15} className={mode === "manual" ? "text-blue-600" : "text-slate-400"} />
            <span>Option 2: Manual Input & Map Pin</span>
          </button>
        </div>
      </div>

      {/* Option 1: Live GPS Interface */}
      {mode === "live" && (
        <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <LocateFixed size={14} className="text-emerald-600" />
                Live Real-Time Shop Geolocation
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Automatically detect your current device coordinates to pin your laundry shop on the customer map.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDetectLiveLocation}
              disabled={isLocating}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors shrink-0 disabled:opacity-50"
            >
              {isLocating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Detecting GPS...</span>
                </>
              ) : (
                <>
                  <LocateFixed size={14} />
                  <span>Use Live Device Location</span>
                </>
              )}
            </button>
          </div>

          {gpsStatus && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-emerald-200 text-xs font-medium text-emerald-800">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              <span>{gpsStatus}</span>
            </div>
          )}

          {gpsError && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertCircle size={15} className="text-red-500 shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}
        </div>
      )}

      {/* Option 2: Manual Preset Quick Links */}
      {mode === "manual" && (
        <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900">
              Quick Landmark Presets (Metro Manila & Cebu)
            </span>
            <span className="text-[10px] text-blue-600">Click to jump pin</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_LOCATIONS.map((loc) => (
              <button
                key={loc.name}
                type="button"
                onClick={() => handleSelectPreset(loc)}
                className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-[11px] font-medium text-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                📍 {loc.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Leaflet Map Pin Picker Canvas */}
      <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
        <div ref={mapContainerRef} className="w-full h-64 z-10" />

        {/* Floating Instruction / Status Indicator */}
        <div className="absolute top-2.5 left-2.5 z-20 bg-white/95 backdrop-blur-xs border border-slate-200 px-3 py-1.5 rounded-lg text-xs text-slate-700 shadow-xs flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px]">
            {mode === "live"
              ? "Shop Live Pin Preview • Drag or click map to fine-tune"
              : "Click anywhere on map or drag pin to position shop"}
          </span>
        </div>
      </div>

      {/* Coordinate Display / Fine-tune inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Latitude Coordinate
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.000001"
              value={latitude}
              onChange={(e) => onChangeCoords(parseFloat(e.target.value) || 0, longitude)}
              className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
              placeholder="e.g. 14.6402"
              required
            />
            <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400">° N</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Longitude Coordinate
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.000001"
              value={longitude}
              onChange={(e) => onChangeCoords(latitude, parseFloat(e.target.value) || 0)}
              className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
              placeholder="e.g. 121.0744"
              required
            />
            <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400">° E</span>
          </div>
        </div>
      </div>
    </div>
  );
};
