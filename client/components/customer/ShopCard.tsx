import React from "react";
import { LaundryShop } from "@/types/auth";
import { Button } from "@/components/ui/Button";
import { formatTo12Hour } from "@/components/owner/ShopSetupForm";
import {
  MapPin,
  Clock,
  Phone,
  Star,
  Navigation,
  QrCode,
  Sparkles,
  Camera,
  Store,
} from "lucide-react";

interface ShopCardProps {
  shop: LaundryShop;
  isSelected?: boolean;
  onSelect?: (shop: LaundryShop) => void;
  onGenerateQR?: (shop: LaundryShop) => void;
  distanceKm?: number;
}

export const ShopCard: React.FC<ShopCardProps> = ({
  shop,
  isSelected = false,
  onSelect,
  onGenerateQR,
  distanceKm,
}) => {
  const queueBadge = {
    Low: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Low Queue • Ready" },
    Moderate: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Moderate • ~20m wait" },
    Busy: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Busy Queue • ~45m wait" },
    Full: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", label: "Full Capacity" },
    Closed: { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200", label: "Closed" },
  }[shop.queue_status] || { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", label: shop.queue_status };

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`,
      "_blank"
    );
  };

  const hasImages = shop.images && shop.images.length > 0;
  const coverImage = hasImages ? shop.images![0] : null;

  return (
    <div
      onClick={() => onSelect && onSelect(shop)}
      className={`group rounded-xl border bg-white overflow-hidden transition-all duration-200 cursor-pointer ${
        isSelected
          ? "border-blue-600 shadow-md ring-2 ring-blue-600/20"
          : "border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-sm"
      }`}
    >
      {/* Cover Photo Header */}
      {hasImages ? (
        <div className="relative h-36 w-full bg-slate-100 overflow-hidden">
          <img
            src={coverImage!}
            alt={shop.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

          {/* Top Overlays */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs backdrop-blur-xs ${queueBadge.bg} ${queueBadge.text} ${queueBadge.border} border`}>
              {queueBadge.label}
            </span>

            {shop.images!.length > 1 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold border border-white/20 shadow-xs">
                <Camera size={10} />
                <span>{shop.images!.length} photos</span>
              </span>
            )}
          </div>

          {/* Bottom Overlay on Image: Distance */}
          {distanceKm !== undefined && (
            <div className="absolute bottom-2 left-2.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600/90 text-white text-[10px] font-bold shadow-xs backdrop-blur-xs">
                <Navigation size={10} />
                <span>{distanceKm} km away</span>
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="h-16 w-full bg-gradient-to-r from-blue-50 via-emerald-50 to-indigo-50 border-b border-slate-100 flex items-center justify-between px-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Store size={18} />
            <span className="text-[11px] font-medium text-slate-500">LabadaGo Verified Partner</span>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${queueBadge.bg} ${queueBadge.text} border ${queueBadge.border}`}>
            {queueBadge.label}
          </span>
        </div>
      )}

      {/* Card Content Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
              {shop.name}
            </h3>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
              <MapPin size={12} className="text-slate-400 shrink-0" />
              <span className="truncate max-w-[240px]">{shop.address}</span>
            </p>
          </div>

          {/* Rating badge */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 shrink-0">
            <Star size={12} className="text-amber-500 fill-amber-500" />
            <span>{shop.rating}</span>
            <span className="text-[10px] text-slate-400">({shop.total_reviews})</span>
          </div>
        </div>

        {/* Thumbnail row if multiple photos exist */}
        {hasImages && shop.images!.length > 1 && (
          <div className="mt-2.5 flex items-center gap-1.5 overflow-hidden">
            {shop.images!.slice(0, 4).map((imgUrl, i) => (
              <div
                key={i}
                className="w-10 h-8 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0"
              >
                <img src={imgUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {shop.images!.length > 4 && (
              <span className="text-[10px] text-slate-400 font-medium ml-1">
                +{shop.images!.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Meta info row */}
        <div className="mt-3 flex items-center gap-2.5 text-xs text-slate-500 flex-wrap">
          {!hasImages && distanceKm !== undefined && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-blue-200 bg-blue-50 text-[11px] font-semibold text-blue-700">
              <Navigation size={11} className="text-blue-600" />
              {distanceKm} km away
            </span>
          )}

          <span className="flex items-center gap-1 text-[11px]">
            <Clock size={12} className="text-slate-400" />
            {formatTo12Hour(shop.open_time)} – {formatTo12Hour(shop.close_time)}
          </span>

          <span className="flex items-center gap-1 text-[11px]">
            <Phone size={12} className="text-slate-400" />
            {shop.phone_number}
          </span>
        </div>

        {/* Services snapshot */}
        {shop.services && shop.services.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-1.5 text-[11px]">
            {shop.services.slice(0, 2).map((srv) => (
              <div
                key={srv.id}
                className="flex items-center justify-between p-1.5 rounded-md bg-slate-50/70 border border-slate-100"
              >
                <span className="text-slate-600 truncate">{srv.service_name}</span>
                <span className="font-bold text-slate-900 shrink-0 ml-1">
                  ₱{srv.price}/{srv.unit}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1 text-xs"
            leftIcon={<QrCode size={13} />}
            onClick={(e) => {
              e.stopPropagation();
              onGenerateQR ? onGenerateQR(shop) : (onSelect && onSelect(shop));
            }}
          >
            Walk-In Fast Pass (QR)
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs text-slate-600"
            leftIcon={<Navigation size={13} />}
            onClick={handleNavigate}
          >
            Directions
          </Button>
        </div>
      </div>
    </div>
  );
};

