"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { LaundryShop, ShopService, UserProfile, WalkInQRPayload } from "@/types/auth";
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
} from "lucide-react";

interface WalkInQRGeneratorProps {
  user: UserProfile | null;
  shops: LaundryShop[];
  initialShopId?: string;
  onTransactionCreated?: () => void;
}

export const WalkInQRGenerator: React.FC<WalkInQRGeneratorProps> = ({
  user,
  shops,
  initialShopId,
  onTransactionCreated,
}) => {
  const [selectedShopId, setSelectedShopId] = useState<string>(
    initialShopId || (shops.length > 0 ? shops[0].id : "")
  );

  const activeShop = shops.find((s) => s.id === selectedShopId) || shops[0];

  const availableServices = activeShop?.services && activeShop.services.length > 0
    ? activeShop.services
    : [
        { id: "s1", shop_id: selectedShopId, service_name: "Wash, Dry & Fold", price: 35, unit: "kg", estimated_minutes: 90 },
        { id: "s2", shop_id: selectedShopId, service_name: "Comforter / Bedding", price: 180, unit: "piece", estimated_minutes: 120 },
      ];

  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    availableServices[0]?.id || "s1"
  );
  const [estimatedWeight, setEstimatedWeight] = useState<number>(5.0);
  const [specialNotes, setSpecialNotes] = useState<string>("");

  const [generatedQRUrl, setGeneratedQRUrl] = useState<string | null>(null);
  const [generatedPayload, setGeneratedPayload] = useState<WalkInQRPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync initial shop if changed externally
  useEffect(() => {
    if (initialShopId) {
      setSelectedShopId(initialShopId);
    }
  }, [initialShopId]);

  const activeService =
    availableServices.find((s) => s.id === selectedServiceId) || availableServices[0];

  const estimatedAmount = activeService ? activeService.price * estimatedWeight : 0;

  const handleGenerateQR = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage(null);

    const trackingNumber = `LBD-${Math.floor(10000 + Math.random() * 90000)}`;

    const payload: WalkInQRPayload = {
      trackingNumber,
      customerId: user?.id || "guest-customer",
      customerName: user?.full_name || "Walk-In Customer",
      customerPhone: user?.phone_number || "0912 345 6789",
      shopId: activeShop?.id || selectedShopId,
      shopName: activeShop?.name || "LabadaGo Laundry",
      serviceName: activeService?.service_name || "Wash, Dry & Fold",
      estimatedWeight,
      estimatedAmount,
      specialNotes: specialNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Generate high-resolution QR code data URL
      const qrDataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
        width: 320,
        margin: 2,
        color: {
          dark: "#0F172A",
          light: "#FFFFFF",
        },
      });

      // 2. Record transaction in database / store
      await createWalkInTransaction(payload);

      setGeneratedQRUrl(qrDataUrl);
      setGeneratedPayload(payload);
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

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
        <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 text-emerald-600 flex items-center justify-center">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
        {/* Form Column */}
        <form onSubmit={handleGenerateQR} className="lg:col-span-7 space-y-4">
          {successMessage && <Alert type="success" message={successMessage} />}

          {/* Customer Autofill preview */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <User size={14} className="text-blue-600 shrink-0" />
              <div>
                <span className="font-semibold text-slate-900">{user?.full_name || "Juan Dela Cruz"}</span>
                <span className="text-slate-400 ml-1.5">• {user?.phone_number || "0912 345 6789"}</span>
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
              min="1"
              max="50"
              label="Estimated Weight (kg)"
              value={estimatedWeight}
              onChange={(e) => setEstimatedWeight(parseFloat(e.target.value) || 1)}
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
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-xl border border-slate-200 bg-slate-50/50 text-center">
          {generatedQRUrl && generatedPayload ? (
            <div className="w-full flex flex-col items-center animate-fadeIn">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm inline-block">
                <img
                  src={generatedQRUrl}
                  alt="Walk-in QR Code"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
              </div>

              <div className="mt-4 text-center">
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  {generatedPayload.trackingNumber}
                </span>
                <p className="text-xs font-semibold text-slate-900 mt-2">
                  {generatedPayload.serviceName} • {generatedPayload.estimatedWeight} kg
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Est. ₱{generatedPayload.estimatedAmount.toFixed(2)} • {generatedPayload.shopName}
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
                  Save QR Pass
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-600"
                  leftIcon={<RefreshCw size={13} />}
                  onClick={() => setGeneratedQRUrl(null)}
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
    </div>
  );
};
