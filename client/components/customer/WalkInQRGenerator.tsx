"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { LaundryShop, ShopService, UserProfile, WalkInQRPayload, LaundryTransaction } from "@/types/auth";
import { createWalkInTransaction, updateTransactionStatus, deleteTransaction } from "@/lib/supabase/auth";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import {
  QrCode,
  Download,
  CheckCircle2,
  Sparkles,
  Clock,
  Shirt,
  User,
  Phone,
  Store,
  RefreshCw,
  ArrowLeft,
  MapPin,
  Package,
  Eye,
  CreditCard,
  X,
  Trash2,
} from "lucide-react";

interface WalkInQRGeneratorProps {
  user: UserProfile | null;
  shops: LaundryShop[];
  initialShopId?: string;
  transactions?: LaundryTransaction[];
  onTransactionCreated?: () => void;
  onReturnToMap?: () => void;
  onViewOrderTracker?: (trackingNumber?: string) => void;
}

export const WalkInQRGenerator: React.FC<WalkInQRGeneratorProps> = ({
  user,
  shops,
  initialShopId,
  transactions = [],
  onTransactionCreated,
  onReturnToMap,
  onViewOrderTracker,
}) => {
  const searchParams = useSearchParams();
  const queryShopId = searchParams?.get("shopId") || "";
  const effectiveShopId = initialShopId || queryShopId || "";

  const [selectedShopId, setSelectedShopId] = useState<string>(() => {
    if (effectiveShopId) return effectiveShopId;
    if (shops.length > 0) return shops[0].id;
    return "";
  });

  const activeShop = shops.find((s) => s.id === selectedShopId) || (shops.length > 0 ? shops[0] : null);

  const availableServices = activeShop?.services && activeShop.services.length > 0
    ? activeShop.services
    : [];

  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    availableServices[0]?.id || ""
  );
  const [estimatedLoads, setEstimatedLoads] = useState<string>("1");
  const [specialNotes, setSpecialNotes] = useState<string>("");
  const [guestName, setGuestName] = useState<string>("");
  const [guestPhone, setGuestPhone] = useState<string>("");

  const [generatedQRUrl, setGeneratedQRUrl] = useState<string | null>(null);
  const [generatedPayload, setGeneratedPayload] = useState<WalkInQRPayload | null>(null);
  const [activeTrackingNumber, setActiveTrackingNumber] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter all walk-in transactions (most recent first)
  const walkInTransactions = transactions.filter((t) => t.is_walkin);

  // Helper to load any walk-in transaction into the QR modal
  const loadPassIntoPreview = async (tx: LaundryTransaction, openModal = true) => {
    try {
      let payloadToUse: WalkInQRPayload;
      if (tx.qr_data) {
        try {
          payloadToUse = JSON.parse(tx.qr_data);
        } catch {
          payloadToUse = {
            trackingNumber: tx.tracking_number,
            customerId: tx.customer_id || "walk-in-customer",
            customerName: tx.customer_name,
            customerPhone: tx.customer_phone,
            shopId: tx.shop_id,
            shopName: tx.shop_name || "LabadaGo Laundry",
            serviceName: tx.service_name,
            estimatedWeight: tx.weight_kg,
            estimatedAmount: tx.total_amount,
            specialNotes: tx.special_notes,
            createdAt: tx.created_at,
          };
        }
      } else {
        payloadToUse = {
          trackingNumber: tx.tracking_number,
          customerId: tx.customer_id || "walk-in-customer",
          customerName: tx.customer_name,
          customerPhone: tx.customer_phone,
          shopId: tx.shop_id,
          shopName: tx.shop_name || "LabadaGo Laundry",
          serviceName: tx.service_name,
          estimatedWeight: tx.weight_kg,
          estimatedAmount: tx.total_amount,
          specialNotes: tx.special_notes,
          createdAt: tx.created_at,
        };
      }

      const qrDataUrl = await QRCode.toDataURL(payloadToUse.trackingNumber, {
        width: 360,
        margin: 2,
        errorCorrectionLevel: "H",
        color: {
          dark: "#0F172A",
          light: "#FFFFFF",
        },
      });

      setGeneratedQRUrl(qrDataUrl);
      setGeneratedPayload(payloadToUse);
      setActiveTrackingNumber(tx.tracking_number);
      if (openModal) {
        setShowQRModal(true);
      }
    } catch (err) {
      console.error("Failed to render QR for transaction:", err);
    }
  };

  // Sync selected shop if initialShopId or URL query param changes, or when shops array loads
  useEffect(() => {
    const targetShopId = initialShopId || searchParams?.get("shopId");
    if (targetShopId) {
      if (shops.length > 0 && shops.some((s) => s.id === targetShopId)) {
        setSelectedShopId(targetShopId);
      } else if (!shops.length) {
        setSelectedShopId(targetShopId);
      }
    } else if (!selectedShopId && shops.length > 0) {
      setSelectedShopId(shops[0].id);
    }
  }, [initialShopId, searchParams, shops]);

  // Sync selected service when active shop or availableServices changes
  useEffect(() => {
    if (availableServices.length > 0) {
      const exists = availableServices.some((s) => s.id === selectedServiceId);
      if (!exists) {
        setSelectedServiceId(availableServices[0].id);
      }
    } else {
      setSelectedServiceId("");
    }
  }, [availableServices, selectedShopId]);

  const handleShopChange = (newShopId: string) => {
    setSelectedShopId(newShopId);
    const newShop = shops.find((s) => s.id === newShopId);
    if (newShop?.services && newShop.services.length > 0) {
      setSelectedServiceId(newShop.services[0].id);
    }
  };

  const activeService =
    availableServices.find((s) => s.id === selectedServiceId) || availableServices[0];

  const parsedLoads = parseInt(estimatedLoads);
  const loadsNum = isNaN(parsedLoads) || parsedLoads <= 0 ? 1 : parsedLoads;
  const loadCapacity = activeService?.kilos || activeShop?.max_kilo_per_load || 8;
  const estimatedAmount = (activeService?.price || 0) * loadsNum;

  const handleGenerateQR = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage(null);

    const trackingNumber = `LBD-${Math.floor(10000 + Math.random() * 90000)}`;
    const approxWeight = loadsNum * loadCapacity;

    const resolvedCustomerName = user?.full_name || guestName.trim() || "Walk-In Customer (Guest)";
    const resolvedCustomerPhone = user?.phone_number || guestPhone.trim() || "";

    const payload: WalkInQRPayload = {
      trackingNumber,
      customerId: user?.id && user.id !== "guest-customer" ? user.id : "guest-customer",
      customerName: resolvedCustomerName,
      customerPhone: resolvedCustomerPhone,
      shopId: activeShop?.id || selectedShopId,
      shopName: activeShop?.name || "LabadaGo Laundry",
      serviceName: activeService?.service_name || "Wash, Dry & Fold",
      estimatedWeight: approxWeight,
      estimatedLoads: loadsNum,
      estimatedAmount,
      specialNotes: specialNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Generate high-resolution, fast-scanning QR code (encodes tracking number with Level H 30% error recovery)
      const qrDataUrl = await QRCode.toDataURL(payload.trackingNumber, {
        width: 360,
        margin: 2,
        errorCorrectionLevel: "H",
        color: {
          dark: "#0F172A",
          light: "#FFFFFF",
        },
      });

      // 2. Record transaction in database / store
      await createWalkInTransaction(payload);

      // Persist guest tracking number in localStorage so guests can track their order
      if (typeof window !== "undefined") {
        try {
          const stored: string[] = JSON.parse(
            localStorage.getItem("labadago_guest_tracking_numbers") || "[]"
          );
          if (!stored.includes(payload.trackingNumber)) {
            stored.unshift(payload.trackingNumber);
            localStorage.setItem("labadago_guest_tracking_numbers", JSON.stringify(stored));
          }
        } catch {
          // ignore
        }
      }

      setGeneratedQRUrl(qrDataUrl);
      setGeneratedPayload(payload);
      setActiveTrackingNumber(payload.trackingNumber);
      setShowQRModal(true);
      setSuccessMessage("Walk-In Fast Pass QR generated successfully! Present this code at the laundry counter.");

      if (onTransactionCreated) {
        onTransactionCreated();
      }
    } catch (err) {
      console.error("Failed to generate QR code:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadQR = () => {
    if (!generatedQRUrl || !generatedPayload) return;
    const link = document.createElement("a");
    link.href = generatedQRUrl;
    link.download = `LabadaGo-WalkIn-${generatedPayload.trackingNumber}.png`;
    link.click();
  };

  const handleCancelPass = async (txId?: string, trackingNum?: string) => {
    const targetTracking = trackingNum || activeTrackingNumber || generatedPayload?.trackingNumber;
    const targetId = txId || activeTx?.id || targetTracking;
    if (!targetTracking) return;

    if (!window.confirm(`Are you sure you want to cancel fast pass #${targetTracking}? This will permanently remove the order.`)) {
      return;
    }

    try {
      if (targetId) {
        await deleteTransaction(targetId);
      }
      if (typeof window !== "undefined") {
        try {
          const stored: string[] = JSON.parse(
            localStorage.getItem("labadago_guest_tracking_numbers") || "[]"
          );
          const next = stored.filter((t) => t !== targetTracking);
          localStorage.setItem("labadago_guest_tracking_numbers", JSON.stringify(next));
          localStorage.setItem("labadago_last_tx_update", Date.now().toString());
          window.dispatchEvent(new CustomEvent("labadago:transaction-updated"));
        } catch {
          // ignore
        }
      }

      setSuccessMessage(`Fast pass #${targetTracking} has been permanently cancelled and deleted.`);
      setShowQRModal(false);
      if (onTransactionCreated) {
        onTransactionCreated();
      }
    } catch {
      alert("Failed to cancel pass. Please try again.");
    }
  };

  const handleResetToNew = () => {
    setGeneratedQRUrl(null);
    setGeneratedPayload(null);
    setActiveTrackingNumber(null);
    setShowQRModal(false);
    setSuccessMessage(null);
  };

  // Find active transaction in real-time transactions list if available
  const activeTx = generatedPayload
    ? transactions.find((t) => t.tracking_number === generatedPayload.trackingNumber)
    : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 text-emerald-600 flex items-center justify-center shrink-0">
            <QrCode size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Walk-In Fast Pass (QR Code Generator)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pre-fill your laundry request and generate a scannable QR pass for seamless shop drop-off.
            </p>
          </div>
        </div>

        {onReturnToMap && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReturnToMap}
            leftIcon={<ArrowLeft size={14} />}
            className="text-xs self-start sm:self-auto shrink-0"
          >
            Return to Home &amp; Shops
          </Button>
        )}
      </div>

      {shops.length === 0 ? (
        <div className="py-12 px-4 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Store size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Laundry Shops Available</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            There are currently no partner laundry shops registered in the system. As soon as a shop is registered by an owner, you can select it to generate your walk-in pass.
          </p>
          {onReturnToMap && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReturnToMap}
              leftIcon={<MapPin size={14} />}
              className="text-xs mt-2"
            >
              Back to Home
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="max-w-2xl mx-auto pt-6">
            {/* Centered Form */}
            <form onSubmit={handleGenerateQR} className="space-y-4">
              {successMessage && <Alert type="success" message={successMessage} />}

              {/* Customer Profile vs Guest Details Input */}
              {user && user.id !== "guest-customer" ? (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-blue-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900">{user.full_name || "Valued Customer"}</span>
                      {user.phone_number && (
                        <span className="text-slate-400 ml-1.5">• {user.phone_number}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Registered Profile
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        G
                      </div>
                      <span className="text-xs font-bold text-slate-900">Guest Customer Details</span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 bg-white border border-blue-200 px-2 py-0.5 rounded-md shadow-2xs">
                      Availing as Guest
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    No account required to avail services! Please enter your name and contact number so the shop can identify your laundry and notify you upon completion.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Your Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="e.g. Maria Santos"
                        className="w-full text-xs p-2.5 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="e.g. 0912 345 6789"
                        className="w-full text-xs p-2.5 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium"
                      />
                    </div>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Have an account?</span>
                    <Link
                      href={`/login?redirect=${encodeURIComponent("/customer?tab=qr")}`}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Sign in for saved history &amp; rewards →
                    </Link>
                  </div>
                </div>
              )}

              {/* Laundry Shop Selection */}
              <Select
                label="Select Laundry Shop"
                value={selectedShopId}
                onChange={(e) => handleShopChange(e.target.value)}
                options={shops.map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.queue_status} Queue)`,
                }))}
                leftIcon={<Store size={15} />}
                required
              />

              {/* Service Selection */}
              <Select
                label="Select Laundry Service"
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                options={availableServices.map((srv) => {
                  const kiloTag = srv.kilos
                    ? ` (${srv.kilos}kg load)`
                    : "";
                  return {
                    value: srv.id,
                    label: `${srv.service_name} — ₱${srv.price}/load${kiloTag}`,
                  };
                })}
                leftIcon={<Shirt size={15} />}
                required
              />

              {/* Estimated Load(s) & Calculation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Estimated Load(s) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="20"
                      placeholder="1"
                      value={estimatedLoads}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || /^[0-9]+$/.test(val)) {
                          setEstimatedLoads(val);
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
                      {loadsNum === 1 ? "load" : "loads"}
                    </span>
                  </div>

                  {/* Quick Load Preset Chips */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setEstimatedLoads(String(num))}
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border transition-colors cursor-pointer ${
                          loadsNum === num
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {num} {num === 1 ? "Load" : "Loads"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col justify-start">
                  <label className="text-xs font-semibold text-slate-700 mb-1.5">
                    Estimated Total
                  </label>
                  <div className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-sm">
                    <span className="text-xs text-slate-600 font-medium">
                      {loadsNum} {loadsNum === 1 ? "load" : "loads"} ({loadCapacity}kg/load)
                    </span>
                    <span className="font-extrabold text-slate-900">₱{estimatedAmount.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Rate: ₱{activeService?.price || 0} / load (up to {loadCapacity}kg allowance)
                  </p>
                </div>
              </div>

              {/* Special Notes */}
              <Input
                type="text"
                label="Special Instructions / Care (Optional)"
                placeholder="e.g. Hypoallergenic detergent, separate whites"
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
              />

              {/* Submit button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="success"
                  size="lg"
                  className="w-full font-bold"
                  isLoading={isLoading}
                  leftIcon={<QrCode size={16} />}
                >
                  Generate Walk-In QR Fast Pass
                </Button>
              </div>
            </form>
          </div>

          {/* QR Fast Pass Modal (Shown when pass is generated or selected) */}
          {showQRModal && generatedQRUrl && generatedPayload && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full max-h-[92dvh] flex flex-col overflow-hidden text-center">
                <div className="flex items-center justify-between p-4 sm:p-5 pb-3 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-2">
                    <QrCode size={18} className="text-emerald-600" />
                    <h4 className="text-sm font-bold text-slate-900">Walk-In Fast Pass QR</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQRModal(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                  <div>
                    <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg">
                      {generatedPayload.trackingNumber}
                    </span>
                    <p className="text-xs font-bold text-slate-900 mt-2">
                      {generatedPayload.serviceName} • {generatedPayload.estimatedLoads || Math.max(1, Math.round(generatedPayload.estimatedWeight / 8))} {(generatedPayload.estimatedLoads || Math.max(1, Math.round(generatedPayload.estimatedWeight / 8))) === 1 ? "load" : "loads"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Approx. ₱{generatedPayload.estimatedAmount.toFixed(2)} • {generatedPayload.shopName}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 inline-block mx-auto">
                    <img
                      src={generatedQRUrl}
                      alt={`QR Fast Pass ${generatedPayload.trackingNumber}`}
                      className="w-48 sm:w-56 h-48 sm:h-56 mx-auto object-contain rounded-lg"
                    />
                  </div>

                  <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 leading-relaxed">
                    Present this QR code at the laundry counter. Staff will scan it to immediately start washing your clothes!
                  </p>

                  <div className="space-y-2 pt-1">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleDownloadQR}
                      leftIcon={<Download size={14} />}
                      className="w-full text-xs font-bold"
                    >
                      Download QR Code
                    </Button>

                    {onViewOrderTracker && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        leftIcon={<Package size={13} />}
                        onClick={() => {
                          setShowQRModal(false);
                          onViewOrderTracker(generatedPayload.trackingNumber);
                        }}
                      >
                        Track Status in My Orders
                      </Button>
                    )}

                    {(activeTx?.status === "Pending" || !activeTx) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelPass()}
                        leftIcon={<Trash2 size={13} className="text-rose-500" />}
                        className="w-full text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                      >
                        Cancel This Fast Pass
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowQRModal(false)}
                      className="w-full text-xs text-slate-500 hover:text-slate-700"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ALL GENERATED WALK-IN PASSES SECTION */}
          <div className="mt-10 pt-8 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                  <QrCode size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    All Generated Walk-In Fast Passes
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {walkInTransactions.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fast passes created for shop counter drop-off. Tap &quot;Show QR Pass&quot; on any order to display its scannable code above.
                  </p>
                </div>
              </div>

              {onViewOrderTracker && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onViewOrderTracker()}
                  leftIcon={<Package size={13} />}
                  className="text-xs self-start sm:self-auto shrink-0"
                >
                  View All Orders in Tracker
                </Button>
              )}
            </div>

            {walkInTransactions.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <Clock size={18} />
                </div>
                <p className="text-xs font-semibold text-slate-700">No Walk-In Passes Yet</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-0.5">
                  Select a shop and service above and tap &quot;Generate Walk-In QR Fast Pass&quot; to create your first scannable counter pass.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {walkInTransactions.map((tx) => {
                  const isCurrentlyActive = activeTrackingNumber === tx.tracking_number;
                  const formattedDate = new Date(tx.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={tx.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                        isCurrentlyActive
                          ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs"
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-900 shadow-2xs">
                            {tx.tracking_number}
                          </span>

                          {/* Status Badges */}
                          {tx.status === "Pending" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Awaiting Scan
                            </span>
                          ) : tx.status === "Ready" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              Ready to Pick Up
                            </span>
                          ) : tx.status === "Completed" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={11} className="text-slate-600" />
                              Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                              <Clock size={11} className="text-blue-600 animate-spin" />
                              Processing
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                            <Store size={13} className="text-slate-400 shrink-0" />
                            {tx.shop_name || "LabadaGo Partner Shop"}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {tx.service_name} • {Math.max(1, Math.round(tx.weight_kg / 8))} {Math.max(1, Math.round(tx.weight_kg / 8)) === 1 ? "load" : "loads"}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Total Amount</span>
                            <span className="font-bold text-slate-900">₱{tx.total_amount.toFixed(2)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Payment</span>
                            {tx.payment_status === "Paid" ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Paid (Drop-off) ✓
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Pay on Pickup
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400">Created: {formattedDate}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          leftIcon={<QrCode size={13} />}
                          onClick={() => {
                            loadPassIntoPreview(tx, true);
                          }}
                        >
                          Show QR Pass
                        </Button>
                        {tx.status === "Pending" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                            leftIcon={<Trash2 size={12} />}
                            onClick={() => handleCancelPass(tx.id, tx.tracking_number)}
                            title="Cancel this fast pass"
                          >
                            Cancel
                          </Button>
                        )}
                        {onViewOrderTracker && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs text-slate-600 hover:text-blue-600"
                            onClick={() => onViewOrderTracker(tx.tracking_number)}
                            title="Track live washing progress"
                          >
                            <Package size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
