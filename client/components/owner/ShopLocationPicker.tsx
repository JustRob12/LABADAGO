"use client";

import React, { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { patchLeafletPos } from "@/lib/utils/leafletPatch";

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

const CARTO_VOYAGER_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://carto.com/about-carto/" target="_blank" rel="noopener noreferrer">CARTO</a>, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

export const ShopLocationPicker: React.FC<ShopLocationPickerProps> = ({
  latitude,
  longitude,
  onChangeCoords,
}) => {
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // 1. Initialize Leaflet Map ONCE on Mount
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;

    async function initPickerMap() {
      try {
        const leaf = await import("leaflet");
        const L = (leaf as any).default || leaf;
        if (!isMounted || !mapContainerRef.current) return;

        patchLeafletPos(L);

        // Clean up previous map if exists
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch (_) {}
          mapInstanceRef.current = null;
        }

        const initialLat = latitude || 14.6402;
        const initialLng = longitude || 121.0744;

        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLng],
          zoom: 15,
          scrollWheelZoom: true,
          zoomControl: true,
        });

        L.tileLayer(CARTO_VOYAGER_URL, {
          attribution: CARTO_ATTRIBUTION,
          subdomains: "abcd",
          maxZoom: 20,
        }).addTo(map);

        mapInstanceRef.current = map;

        // Custom Green Shop Pin Element
        const shopPin = L.divIcon({
          html: `
            <div style="
              width: 36px;
              height: 36px;
              background: #10B981;
              border: 3px solid #FFFFFF;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 14px rgba(0,0,0,0.3);
              cursor: grab;
            ">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
          `,
          className: "owner-shop-location-picker-pin",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        // Marker (Draggable)
        const marker = L.marker([initialLat, initialLng], {
          icon: shopPin,
          draggable: true,
        }).addTo(map);

        marker.on("dragend", (e: any) => {
          const latLng = e.target.getLatLng();
          const newLat = parseFloat(latLng.lat.toFixed(6));
          const newLng = parseFloat(latLng.lng.toFixed(6));
          onChangeCoords(newLat, newLng);
        });

        map.on("click", (e: any) => {
          const newLat = parseFloat(e.latlng.lat.toFixed(6));
          const newLng = parseFloat(e.latlng.lng.toFixed(6));
          marker.setLatLng([newLat, newLng]);
          onChangeCoords(newLat, newLng);
        });

        markerRef.current = marker;

        setTimeout(() => {
          if (isMounted && mapInstanceRef.current === map) {
            try {
              map.invalidateSize({ animate: false });
            } catch (_) {}
          }
        }, 150);
      } catch (err) {
        console.error("Error setting up shop location picker map:", err);
      }
    }

    initPickerMap();

    return () => {
      isMounted = false;
      if (markerRef.current) {
        try {
          markerRef.current.remove();
        } catch (_) {}
        markerRef.current = null;
      }
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (_) {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Sync marker position when external coords change
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      const currentLatLng = markerRef.current.getLatLng();
      const currentLat = currentLatLng.lat;
      const currentLng = currentLatLng.lng;

      if (
        Math.abs(currentLat - latitude) > 0.0001 ||
        Math.abs(currentLng - longitude) > 0.0001
      ) {
        markerRef.current.setLatLng([latitude, longitude]);
        try {
          mapInstanceRef.current.panTo([latitude, longitude], { animate: true });
        } catch (_) {}
      }
    }
  }, [latitude, longitude]);

  // 3. Geolocation: Detect Device GPS
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setGpsError(null);
    setGpsStatus("Accessing device GPS...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const detectedLat = parseFloat(pos.coords.latitude.toFixed(6));
        const detectedLng = parseFloat(pos.coords.longitude.toFixed(6));

        onChangeCoords(detectedLat, detectedLng);

        if (markerRef.current && mapInstanceRef.current) {
          markerRef.current.setLatLng([detectedLat, detectedLng]);
          try {
            mapInstanceRef.current.setView([detectedLat, detectedLng], 16, { animate: true });
          } catch (_) {}
        }

        setIsLocating(false);
        setGpsStatus(
          `Location detected! (Accuracy: ±${Math.round(pos.coords.accuracy)}m)`
        );
      },
      (err) => {
        setIsLocating(false);
        setGpsStatus(null);
        let msg = "Could not detect location.";
        if (err.code === 1) msg = "Location permission denied. Please allow GPS access.";
        if (err.code === 2) msg = "Position unavailable. Please pick a preset or click on map.";
        if (err.code === 3) msg = "Location request timed out.";
        setGpsError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleApplyPreset = (presetLat: number, presetLng: number) => {
    onChangeCoords(presetLat, presetLng);
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([presetLat, presetLng]);
      try {
        mapInstanceRef.current.setView([presetLat, presetLng], 15, { animate: true });
      } catch (_) {}
    }
  };

  return (
    <div className="space-y-3">
      {/* Location Picker Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div>
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <MapPin size={15} className="text-emerald-600" />
            Branch Coordinates on Map
          </label>
          <p className="text-[11px] text-slate-500">
            Click map or drag the green pin to set the exact shop counter entrance.
          </p>
        </div>

        {/* GPS Locate Me Button */}
        <button
          type="button"
          onClick={handleDetectGPS}
          disabled={isLocating}
          className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          {isLocating ? (
            <Loader2 size={13} className="animate-spin text-emerald-600" />
          ) : (
            <LocateFixed size={13} className="text-emerald-600" />
          )}
          <span>{isLocating ? "Locating..." : "Use My Current GPS"}</span>
        </button>
      </div>

      {/* GPS Status feedback */}
      {gpsStatus && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
          <span>{gpsStatus}</span>
        </div>
      )}

      {gpsError && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle size={14} className="text-amber-600 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Preset Location Pills */}
      <div className="space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Or Quick Select Major Hub:
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESET_LOCATIONS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleApplyPreset(preset.lat, preset.lng)}
              className="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Leaflet Map Viewport */}
      <div className="relative w-full h-64 sm:h-72 rounded-2xl border border-slate-200 overflow-hidden shadow-inner bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Lat / Lng inputs row */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Latitude
          </label>
          <input
            type="number"
            step="0.000001"
            value={latitude || ""}
            onChange={(e) => onChangeCoords(parseFloat(e.target.value) || 0, longitude)}
            className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Longitude
          </label>
          <input
            type="number"
            step="0.000001"
            value={longitude || ""}
            onChange={(e) => onChangeCoords(latitude, parseFloat(e.target.value) || 0)}
            className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>
    </div>
  );
};
