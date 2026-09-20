"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { LaundryShop, ShopService, UserProfile, WalkInQRPayload, LaundryTransaction } from "@/types/auth";
import { createWalkInTransaction } from "@/lib/supabase/auth";
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
  const [selectedShopId, setSelectedShopId] = useState<string>(
    initialShopId || (shops.length > 0 ? shops[0].id : "")
  );

  const activeShop = shops.find((s) => s.id === selectedShopId) || shops[0];

  const availableServices = activeShop?.services && activeShop.services.length > 0
    ? activeShop.services
    : [];

  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    availableServices[0]?.id || ""
  );
  const [estimatedWeight, setEstimatedWeight] = useState<string>("5.0");
  const [specialNotes, setSpecialNotes] = useState<string>("");

  const [generatedQRUrl, setGeneratedQRUrl] = useState<string | null>(null);
  const [generatedPayload, setGeneratedPayload] = useState<WalkInQRPayload | null>(null);
  const [activeTrackingNumber, setActiveTrackingNumber] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter all walk-in transactions (most recent first)
  const walkInTransactions = transactions.filter((t) => t.is_walkin);

  // Helper to load any walk-in transaction into the QR preview box
  const loadPassIntoPreview = async (tx: LaundryTransaction) => {
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
    } catch (err) {
      console.error("Failed to render QR for transaction:", err);
    }
  };

  // Auto-display the most recent walk-in pass if not already viewing one
  useEffect(() => {
    if (!generatedQRUrl && walkInTransactions.length > 0) {
      loadPassIntoPreview(walkInTransactions[0]);
    }
  }, [walkInTransactions.length]);

  // Sync initial shop if changed externally
  useEffect(() => {
    if (initialShopId) {
      setSelectedShopId(initialShopId);
    }
  }, [initialShopId]);

  const activeService =
    availableServices.find((s) => s.id === selectedServiceId) || availableServices[0];

  const weightNum = parseFloat(estimatedWeight);
  const validWeight = isNaN(weightNum) ? 0 : weightNum;
  const estimatedAmount = activeService ? activeService.price * validWeight : 0;

  const handleGenerateQR = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage(null);

    const trackingNumber = `LBD-${Math.floor(10000 + Math.random() * 90000)}`;
    const finalWeight = parseFloat(estimatedWeight);
    const validFinalWeight = isNaN(finalWeight) || finalWeight <= 0 ? 1.0 : finalWeight;

    const payload: WalkInQRPayload = {
      trackingNumber,
      customerId: user?.id || "guest-customer",
      customerName: user?.full_name || "Walk-In Customer",
      customerPhone: user?.phone_number || "",
      shopId: activeShop?.id || selectedShopId,
      shopName: activeShop?.name || "LabadaGo Laundry",
      serviceName: activeService?.service_name || "Wash, Dry & Fold",
      estimatedWeight: validFinalWeight,
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

      setGeneratedQRUrl(qrDataUrl);
      setGeneratedPayload(payload);
      setActiveTrackingNumber(payload.trackingNumber);
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

  const handleResetToNew = () => {
    setGeneratedQRUrl(null);
    setGeneratedPayload(null);
    setActiveTrackingNumber(null);
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
            Return to Map & Shops
          </Button>
        )}
      </div>

      {!user || user.id === "guest-customer" ? (
        <div className="py-12 px-4 text-center max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <User size={26} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Account Required</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Guest access is not permitted. Please sign in to your registered account or create an account to generate a scannable Walk-In Fast Pass.
          </p>
          <div className="flex items-center justify-center gap-2.5 pt-2">
            <Link href="/login?redirect=/customer?tab=qr">
              <Button variant="primary" size="md" className="text-xs">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="success" size="md" className="text-xs">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      ) : shops.length === 0 ? (
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
              Back to Map View
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
            {/* Form Column */}
            <form onSubmit={handleGenerateQR} className="lg:col-span-7 space-y-4">
              {successMessage && <Alert type="success" message={successMessage} />}

              {/* Customer Autofill preview */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-blue-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-900">{user?.full_name || "Valued Customer"}</span>
                    {user?.phone_number && (
                      <span className="text-slate-400 ml-1.5">• {user.phone_number}</span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Registered Profile
                </span>
              </div>

              {/* Laundry Shop Selection */}
              <Select
                label="Select Laundry Shop"
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
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
                options={availableServices.map((srv) => ({
                  value: srv.id,
                  label: `${srv.service_name} — ₱${srv.price}/${srv.unit}`,
                }))}
                leftIcon={<Shirt size={15} />}
                required
              />

              {/* Estimated Weight & Calculation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="50"
                  placeholder="e.g. 5"
                  label="Estimated Weight (kg)"
                  value={estimatedWeight}
                  onChange={(e) => setEstimatedWeight(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      (e.key === "Backspace" || e.key === "Delete") &&
                      (estimatedWeight === "0" || estimatedWeight === "0.0" || estimatedWeight === "0.")
                    ) {
                      e.preventDefault();
                      setEstimatedWeight("");
                    }
                  }}
                  onFocus={(e) => {
                    if (e.target.value === "0" || e.target.value === "0.0") {
                      setEstimatedWeight("");
                    } else {
                      e.target.select();
                    }
                  }}
                  required
                />

                <div className="flex flex-col justify-end">
                  <label className="text-xs font-medium text-slate-700 mb-1.5">
                    Estimated Total
                  </label>
                  <div className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-sm">
                    <span className="text-xs text-slate-500">Approx.</span>
                    <span className="font-bold text-slate-900">₱{estimatedAmount.toFixed(2)}</span>
                  </div>
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
                  className="w-full"
                  isLoading={isLoading}
                  leftIcon={<QrCode size={16} />}
                >
                  Generate Walk-In QR Fast Pass
                </Button>
              </div>
            </form>

            {/* QR Code Preview Column */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-xl border border-slate-200 bg-slate-50/50 text-center relative">
              {generatedQRUrl && generatedPayload ? (
                <div className="w-full flex flex-col items-center animate-fadeIn">
                  {/* Real-time Status Badge */}
                  <div className="mb-3">
                    {activeTx?.status === "Pending" || !activeTx ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        Awaiting Drop-off Scan at Counter
                      </span>
                    ) : activeTx.status === "Received" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
                        <CheckCircle2 size={13} className="text-blue-600" />
                        Clothes Received at Counter ✓
                      </span>
                    ) : activeTx.status === "Ready" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        Ready for Pickup!
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-2xs">
                        <Clock size={13} className="text-indigo-600" />
                        Laundry Status: {activeTx.status}
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm inline-block">
                    <img
                      src={generatedQRUrl}
                      alt="Walk-in QR Code"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                    />
                  </div>

                  <div className="mt-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                        {generatedPayload.trackingNumber}
                      </span>
                      {activeTx?.payment_status === "Paid" ? (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          Paid
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                          <CreditCard size={11} className="text-amber-600" />
                          Pay on Pickup
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-bold text-slate-900 mt-2">
                      {generatedPayload.serviceName} • {generatedPayload.estimatedWeight} kg
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Approx. ₱{generatedPayload.estimatedAmount.toFixed(2)} • {generatedPayload.shopName}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      leftIcon={<Download size={13} />}
                      onClick={handleDownloadQR}
                    >
                      Save Pass
                    </Button>
                    {onViewOrderTracker && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 text-xs"
                        leftIcon={<Package size={13} />}
                        onClick={() => onViewOrderTracker(generatedPayload.trackingNumber)}
                      >
                        Track Order
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-slate-600"
                      leftIcon={<RefreshCw size={13} />}
                      onClick={handleResetToNew}
                      title="Generate new pass"
                    >
                      New
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center">
                  <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 mb-3">
                    <QrCode size={24} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">QR Code Preview</p>
                  <p className="text-[11px] text-slate-400 max-w-[200px] mt-1 leading-relaxed">
                    Fill out the form and click generate to create your scannable counter pass.
                  </p>
                </div>
              )}
            </div>
          </div>

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
                              Pending Drop-off
                            </span>
                          ) : tx.status === "Received" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={11} className="text-blue-600" />
                              Received at Counter
                            </span>
                          ) : tx.status === "Ready" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              Ready for Pickup
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                              <Clock size={11} className="text-indigo-600" />
                              {tx.status}
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                            <Store size={13} className="text-slate-400 shrink-0" />
                            {tx.shop_name || "LabadaGo Partner Shop"}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {tx.service_name} • {tx.weight_kg} kg
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
                          variant={isCurrentlyActive ? "primary" : "outline"}
                          size="sm"
                          className="flex-1 text-xs"
                          leftIcon={<QrCode size={13} />}
                          onClick={() => {
                            loadPassIntoPreview(tx);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          {isCurrentlyActive ? "Showing QR Pass ✓" : "Show QR Pass"}
                        </Button>
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
