import React from "react";
import { LaundryShop } from "@/types/auth";
import { Button } from "@/components/ui/Button";
import {
  MapPin,
  Clock,
  Phone,
  Star,
  Navigation,
  QrCode,
  Sparkles,
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

  return (
    <div
      onClick={() => onSelect && onSelect(shop)}
      className={`rounded-xl border bg-white p-4 transition-all duration-150 cursor-pointer ${
        isSelected
          ? "border-blue-600 shadow-sm ring-1 ring-blue-600/20"
          : "border-slate-200 hover:border-slate-300 shadow-2xs"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 leading-snug">
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

      {/* Meta info row */}
      <div className="mt-3 flex items-center gap-2.5 text-xs text-slate-500 flex-wrap">
        {distanceKm !== undefined && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-blue-200 bg-blue-50 text-[11px] font-semibold text-blue-700">
            <Navigation size={11} className="text-blue-600" />
            {distanceKm} km away
          </span>
        )}

        <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium ${queueBadge.bg} ${queueBadge.text} ${queueBadge.border}`}>
          {queueBadge.label}
        </span>

        <span className="flex items-center gap-1 text-[11px]">
          <Clock size={12} className="text-slate-400" />
          {shop.open_time} - {shop.close_time}
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
  );
};
