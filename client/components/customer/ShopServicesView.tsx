"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LaundryShop, ShopService, UserProfile, ShopReview } from "@/types/auth";
import { formatTo12Hour } from "@/components/owner/ShopSetupForm";
import { getShopServices, sendShopMessage, getCachedUserProfile, getShopReviews } from "@/lib/supabase/auth";
import {
  ArrowLeft,
  Heart,
  Star,
  MapPin,
  Clock,
  Navigation,
  MessageSquare,
  QrCode,
  Calendar,
  ChevronRight,
  Store,
  Shirt,
  Sparkles,
  Phone,
  X,
  Send,
  CheckCircle,
  Loader2,
} from "lucide-react";

interface ShopServicesViewProps {
  shop: LaundryShop;
  currentUser?: UserProfile | null;
  onBack: () => void;
  onViewRoute: (shop: LaundryShop) => void;
  onPrepareQR: (shop: LaundryShop) => void;
  onOpenChat?: (shop: LaundryShop) => void;
  distanceKm?: number;
}

// Fallback services matching Image 2
const DEFAULT_SERVICES_LIST: Array<{
  name: string;
  desc: string;
  price: string;
  unit: string;
  iconType: "fold" | "iron" | "dry" | "blanket" | "shoe";
}> = [
  {
    name: "Wash & Fold",
    desc: "Wash, dry and neatly fold your clothes.",
    price: "₱180.00",
    unit: "/ load",
    iconType: "fold",
  },
  {
    name: "Wash, Dry & Iron",
    desc: "Complete care with wash, dry and iron.",
    price: "₱250.00",
    unit: "/ load",
    iconType: "iron",
  },
  {
    name: "Dry Only",
    desc: "Professionally dried and ready to wear.",
    price: "₱80.00",
    unit: "/ load",
    iconType: "dry",
  },
  {
    name: "Blanket & Comforter Wash",
    desc: "Special care for blankets and comforters.",
    price: "₱200.00",
    unit: "/ load",
    iconType: "blanket",
  },
  {
    name: "Shoe Wash",
    desc: "Deep clean for your shoes.",
    price: "₱120.00",
    unit: "/ load",
    iconType: "shoe",
  },
];

export const ShopServicesView: React.FC<ShopServicesViewProps> = ({
  shop,
  currentUser,
  onBack,
  onViewRoute,
  onPrepareQR,
  onOpenChat,
  distanceKm,
}) => {
  const router = useRouter();
  const [isFavorited, setIsFavorited] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = localStorage.getItem("labadago_favorite_shops");
      const list = stored ? JSON.parse(stored) : [];
      return list.includes(shop.id);
    } catch {
      return false;
    }
  });

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [customMsg, setCustomMsg] = useState("");
  const [reviewsList, setReviewsList] = useState<ShopReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchReviews = async () => {
      setIsLoadingReviews(true);
      try {
        const revs = await getShopReviews(shop.id);
        if (isMounted) setReviewsList(revs);
      } catch {
        // ignore
      } finally {
        if (isMounted) setIsLoadingReviews(false);
      }
    };
    fetchReviews();

    const handleRatingUpdated = () => {
      fetchReviews();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("labadago:rating-updated", handleRatingUpdated);
    }
    return () => {
      isMounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("labadago:rating-updated", handleRatingUpdated);
      }
    };
  }, [shop.id]);

  const handleSendInquiry = async () => {
    if (!customMsg.trim() || isSendingMessage) return;

    const activeUser =
      currentUser || (typeof window !== "undefined" ? getCachedUserProfile() : null);

    if (!activeUser) {
      router.push(
        "/login?redirect=" +
          encodeURIComponent(
            typeof window !== "undefined"
              ? window.location.pathname + window.location.search
              : "/customer"
          ) +
          "&message=" +
          encodeURIComponent("Please sign in to message this laundry shop.")
      );
      return;
    }

    setIsSendingMessage(true);
    setSendError(null);

    try {
      const res = await sendShopMessage({
        shopId: shop.id,
        shopName: shop.name,
        customerId: activeUser.id,
        customerName: activeUser.full_name,
        customerPhone: activeUser.phone_number,
        senderId: activeUser.id,
        senderName: activeUser.full_name,
        senderRole: "customer",
        message: customMsg,
      });

      if (res.success) {
        setMessageSent(true);
        setCustomMsg("");
      } else {
        setSendError(res.error || "Failed to send inquiry.");
      }
    } catch (err: any) {
      setSendError(err?.message || "Failed to deliver inquiry.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Live database services
  const [dbServices, setDbServices] = useState<ShopService[]>(shop.services || []);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadShopServices() {
      setIsLoadingServices(true);
      try {
        const live = await getShopServices(shop.id);
        if (isMounted && live && live.length > 0) {
          setDbServices(live);
        }
      } catch (err) {
        console.error("Failed to load services for shop from database:", err);
      } finally {
        if (isMounted) {
          setIsLoadingServices(false);
        }
      }
    }

    loadShopServices();
    return () => {
      isMounted = false;
    };
  }, [shop.id]);

  const toggleFavorite = () => {
    setIsFavorited((prev) => {
      const next = !prev;
      try {
        const stored = localStorage.getItem("labadago_favorite_shops");
        let list: string[] = stored ? JSON.parse(stored) : [];
        if (next && !list.includes(shop.id)) {
          list.push(shop.id);
        } else if (!next) {
          list = list.filter((id) => id !== shop.id);
        }
        localStorage.setItem("labadago_favorite_shops", JSON.stringify(list));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const queueInfo = {
    Low: { label: "Light Queue", color: "text-emerald-700 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500", turnaround: "Est. turnaround 2 hrs" },
    Moderate: { label: "Moderate Queue", color: "text-amber-700 bg-amber-50 border-amber-200", dot: "bg-amber-500", turnaround: "Est. turnaround 3 hrs" },
    Busy: { label: "Busy", color: "text-red-700 bg-red-50 border-red-200", dot: "bg-red-500", turnaround: "Est. turnaround 4-5 hrs" },
    Full: { label: "Full Capacity", color: "text-slate-700 bg-slate-100 border-slate-200", dot: "bg-slate-400", turnaround: "Est. turnaround 5+ hrs" },
    Closed: { label: "Closed", color: "text-slate-500 bg-slate-100 border-slate-200", dot: "bg-slate-400", turnaround: "Opens next morning" },
  }[shop.queue_status] || {
    label: "Light Queue",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
    turnaround: "Est. turnaround 2 hrs",
  };

  const openTimeStr = shop.open_time ? formatTo12Hour(shop.open_time) : "7:00 AM";
  const closeTimeStr = shop.close_time ? formatTo12Hour(shop.close_time) : "9:00 PM";
  const coverImage =
    shop.images && shop.images.length > 0
      ? shop.images[0]
      : "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=1200&q=80";

  // Build service display list connected to database
  const activeServiceList = dbServices.length > 0 ? dbServices : (shop.services || []);
  const servicesToDisplay =
    activeServiceList.length > 0
      ? activeServiceList.map((s) => {
          const type = s.service_name.toLowerCase().includes("iron")
            ? "iron"
            : s.service_name.toLowerCase().includes("dry only")
            ? "dry"
            : s.service_name.toLowerCase().includes("blanket") || s.service_name.toLowerCase().includes("comforter")
            ? "blanket"
            : s.service_name.toLowerCase().includes("shoe")
            ? "shoe"
            : "fold";
          const kiloInfo = s.kilos ? `Up to ${s.kilos} kg allowance per load.` : "Quality wash and clean laundry service.";
          return {
            name: s.service_name,
            desc: s.description || kiloInfo,
            price: `₱${s.price.toFixed(2)}`,
            unit: `/ load`,
            iconType: type as any,
          };
        })
      : DEFAULT_SERVICES_LIST;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-5 pb-24 lg:pb-12 animate-in fade-in duration-200">
      {/* 1. Header Navigation Bar (Matches Image 2) */}
      <div className="flex items-center justify-between py-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-semibold text-xs sm:text-sm p-1.5 -ml-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
          Shop Services
        </h2>

        <button
          type="button"
          onClick={toggleFavorite}
          className="p-2 rounded-xl text-slate-600 hover:text-red-500 hover:bg-slate-100 transition-colors"
          title={isFavorited ? "Remove from Favorites" : "Save Shop"}
        >
          <Heart size={20} className={isFavorited ? "text-red-500 fill-red-500" : ""} />
        </button>
      </div>

      {/* 2. Hero Shop Banner & Details Card (Matches Image 2) */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Cover Photo */}
        <div className="relative h-48 sm:h-56 w-full bg-slate-100 overflow-hidden">
          <img
            src={coverImage}
            alt={shop.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Inset Shop Logo Badge (Matches Image 2 blue square badge) */}
          <div className="absolute top-4 left-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-900/95 border-2 border-white/60 shadow-md p-2 flex flex-col items-center justify-center text-center text-white">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider leading-tight">
                {shop.name.slice(0, 10)}
              </span>
              <span className="text-[8px] sm:text-[9px] font-bold text-blue-200 uppercase tracking-widest mt-0.5">
                LAUNDRY
              </span>
            </div>
          </div>
        </div>

        {/* Hero Card Content */}
        <div className="p-4 sm:p-5 space-y-4">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {shop.name}
            </h1>

            {/* Rating & Opening Info */}
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 flex-wrap">
              <span className="flex items-center gap-1 font-bold text-amber-500">
                <Star size={14} className="fill-amber-400" />
                <span className="text-slate-900">{Number(shop.rating || 5).toFixed(1)}</span>
                <span className="text-slate-400 font-normal">
                  ({reviewsList.length > 0 ? reviewsList.length : (shop.total_reviews || 0)} {((reviewsList.length || shop.total_reviews || 0) === 1 ? "review" : "reviews")})
                </span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 font-semibold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{shop.is_open ? "Open" : "Closed"}</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">Closes {closeTimeStr}</span>
            </div>
          </div>

          {/* 3-Column Quick Metrics Row (Matches Image 2) */}
          <div className="grid grid-cols-3 gap-2 py-3 px-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            {/* Distance */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-700">
              <MapPin size={14} className="text-blue-600 shrink-0" />
              <span className="font-semibold truncate">
                {distanceKm !== undefined ? `${distanceKm} km away` : "2.3 km away"}
              </span>
            </div>

            {/* Est. turnaround */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-700 border-x border-slate-200/80 px-1">
              <Clock size={14} className="text-slate-500 shrink-0" />
              <span className="font-semibold truncate">{queueInfo.turnaround}</span>
            </div>

            {/* Queue Badge */}
            <div className="flex items-center justify-center gap-1.5 text-xs">
              <span className={`w-2 h-2 rounded-full shrink-0 ${queueInfo.dot}`} />
              <span className="font-bold text-slate-800 truncate">{queueInfo.label}</span>
            </div>
          </div>

          {/* Two Action Buttons (Matches Image 2 [ Message Shop ] and [ View Route ]) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Message Shop */}
            <button
              type="button"
              onClick={() => setShowMessageModal(true)}
              className="py-2.5 sm:py-3 px-4 rounded-xl border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <MessageSquare size={16} />
              <span>Message Shop</span>
            </button>

            {/* View Route */}
            <button
              type="button"
              onClick={() => onViewRoute(shop)}
              className="py-2.5 sm:py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs hover:shadow-md"
            >
              <Navigation size={16} />
              <span>View Route</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Prepare Transaction QR Card (Matches Image 2 green banner) */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-4.5 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <QrCode size={20} />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
              Prepare Transaction QR
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed max-w-md">
              Pre-select your services to make your transaction faster when you arrive.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onPrepareQR(shop)}
          className="px-3.5 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-600 hover:text-white font-extrabold text-xs transition-all shadow-2xs shrink-0 flex items-center gap-1 cursor-pointer"
        >
          <span>Prepare Now</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* 4. Services Offered Section (Matches Image 2) */}
      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
          Services Offered
        </h3>

        <div className="space-y-2.5">
          {servicesToDisplay.map((item, index) => {
            return (
              <div
                key={index}
                className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Category Icon */}
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Shirt size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>

                {/* Price Display (Matches Image 2 right aligned bold price) */}
                <div className="text-right shrink-0">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 block">
                    {item.price}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {item.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. About This Shop Section (Matches Image 2) */}
      <div className="space-y-2.5">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
          About This Shop
        </h3>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
            <Store size={18} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-600 leading-relaxed">
              {shop.description ||
                `${shop.name} provides quality and affordable laundry services. We use gentle yet effective cleaning products to ensure your clothes are fresh and clean.`}
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Capacity:</span>
              <span>{shop.washer_count || 6} Heavy Duty Washers</span>
              <span>•</span>
              <span>{shop.dryer_count || 4} Fast Dryers</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Operating Hours Section (Matches Image 2) */}
      <div className="space-y-2.5">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
          Operating Hours
        </h3>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-slate-800">
              Monday – Sunday
            </span>
          </div>
          <span className="text-xs sm:text-sm font-extrabold text-slate-900">
            {openTimeStr} – {closeTimeStr}
          </span>
        </div>
      </div>

      {/* 7. Customer Ratings & Reviews */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
            Customer Reviews & Ratings
          </h3>
          <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
            <Star size={13} className="fill-amber-500 text-amber-500" />
            <span>{Number(shop.rating || 5).toFixed(1)} / 5.0</span>
          </span>
        </div>

        {reviewsList.length === 0 ? (
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center space-y-1.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
              <Star size={20} className="fill-amber-400" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">No Reviews Yet</h4>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Be the first customer to leave a review! After claiming your completed laundry, tap &ldquo;Rate Shop&rdquo; on the Live Order Tracker.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {reviewsList.map((rev) => (
              <div
                key={rev.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                      {rev.customer_name ? rev.customer_name.charAt(0).toUpperCase() : "C"}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">{rev.customer_name || "Valued Customer"}</h5>
                      <span className="text-[10px] text-slate-400">
                        {new Date(rev.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={12}
                        className={
                          s <= rev.rating
                            ? "text-amber-400 fill-amber-400"
                            : "text-slate-200"
                        }
                      />
                    ))}
                  </div>
                </div>

                {rev.comment && (
                  <p className="text-xs text-slate-600 pl-9 leading-relaxed">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Shop Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Contact {shop.name}</h4>
                  <p className="text-[11px] text-slate-500">{shop.phone_number || "Direct Shop Counter"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMessageModal(false);
                  setMessageSent(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {messageSent ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle size={36} className="text-emerald-500 mx-auto" />
                <div>
                  <h5 className="text-sm font-bold text-slate-900">Inquiry Delivered!</h5>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-0.5">
                    {shop.name} staff has received your inquiry and can reply to you directly in Messages.
                  </p>
                </div>
                {onOpenChat && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMessageModal(false);
                      setMessageSent(false);
                      onOpenChat(shop);
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <MessageSquare size={14} />
                    <span>Open Messenger Chat</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {sendError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                    {sendError}
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Quick Inquiries:
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {[
                      "Hi! Is there currently a queue at your branch?",
                      "Do you accept comforter/blanket washing today?",
                      "What is the estimated turnaround time right now?",
                    ].map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCustomMsg(q)}
                        className="text-left p-2 rounded-xl text-xs bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-colors text-slate-700 cursor-pointer"
                      >
                        &ldquo;{q}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <textarea
                    rows={3}
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    placeholder="Type your message or special instruction..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendInquiry}
                  disabled={!customMsg.trim() || isSendingMessage}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  {isSendingMessage ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  <span>{isSendingMessage ? "Delivering..." : "Send Message"}</span>
                </button>
              </div>
            )}

            {/* Direct Calling Bar */}
            {shop.phone_number && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Prefer to call?</span>
                <a
                  href={`tel:${shop.phone_number}`}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Phone size={13} />
                  <span>Call {shop.phone_number}</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

