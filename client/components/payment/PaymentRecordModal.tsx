"use client";

import React, { useState, useRef } from "react";
import { LaundryTransaction } from "@/types/auth";
import { uploadPaymentProof, updateTransactionPayment } from "@/lib/supabase/auth";
import {
  X,
  Banknote,
  Smartphone,
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";

interface PaymentRecordModalProps {
  transaction: LaundryTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedTx?: LaundryTransaction) => void;
}

export const PaymentRecordModal: React.FC<PaymentRecordModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [method, setMethod] = useState<"Cash" | "GCash">("Cash");
  const [referenceNo, setReferenceNo] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !transaction) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrorMsg("Please select a valid image file (PNG, JPG, WEBP).");
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      let uploadedProofUrl: string | undefined = undefined;

      if (method === "GCash") {
        if (selectedFile) {
          uploadedProofUrl = await uploadPaymentProof(
            selectedFile,
            transaction.tracking_number
          );
        }
      }

      const success = await updateTransactionPayment(
        transaction.id,
        "Paid",
        method === "Cash" ? "Paid at counter (Cash)" : "Paid via GCash transfer",
        method,
        uploadedProofUrl,
        referenceNo.trim() || undefined
      );

      if (success) {
        onSuccess();
        onClose();
        handleClearFile();
        setReferenceNo("");
      } else {
        setErrorMsg("Failed to update payment record. Please try again.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record payment.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl text-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-950/80 border border-teal-800/80 px-2 py-0.5 rounded-full">
              Record Counter Payment
            </span>
            <h3 className="text-base font-bold text-white mt-1">
              Order #{transaction.tracking_number}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Order Summary Strip */}
          <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Customer</p>
              <p className="text-sm font-bold text-white truncate max-w-[180px]">
                {transaction.customer_name}
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                {transaction.service_name} • {transaction.weight_kg}kg
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Total Payable</p>
              <p className="text-lg font-black text-amber-300">
                ₱{transaction.total_amount.toFixed(2)}
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMethod("Cash")}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === "Cash"
                    ? "bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-md ring-1 ring-emerald-500"
                    : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                }`}
              >
                <Banknote size={22} className={method === "Cash" ? "text-emerald-400" : ""} />
                <span className="text-xs font-bold">Cash</span>
                <span className="text-[10px] text-slate-400">Direct OTC Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod("GCash")}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === "GCash"
                    ? "bg-blue-950/60 border-blue-500 text-blue-300 shadow-md ring-1 ring-blue-500"
                    : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                }`}
              >
                <Smartphone size={22} className={method === "GCash" ? "text-blue-400" : ""} />
                <span className="text-xs font-bold">GCash / Bank</span>
                <span className="text-[10px] text-slate-400">Scan QR / Transfer</span>
              </button>
            </div>
          </div>

          {/* Method: CASH Details */}
          {method === "Cash" && (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <CheckCircle2 size={15} />
                Cash Payment at Counter
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Confirm that the customer handed <b>₱{transaction.total_amount.toFixed(2)}</b> in cash.
                Once confirmed, this order will be permanently recorded as <b>Paid (Cash)</b> across
                the Customer, Staff, and Owner portals.
              </p>
            </div>
          )}

          {/* Method: GCASH Details */}
          {method === "GCash" && (
            <div className="space-y-3.5">
              <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-3 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-bold text-blue-400 mb-1">
                  <Smartphone size={15} />
                  GCash / Online Bank Verification
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Have customer send <b>₱{transaction.total_amount.toFixed(2)}</b> to the shop&apos;s
                  official GCash QR code or phone number. Attach the receipt screenshot or snap a
                  photo as proof.
                </p>
              </div>

              {/* Reference Number */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  GCash Reference Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1029 3847 5510"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* File / Camera Upload */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  Receipt Photo / Transfer Screenshot (Recommended)
                </label>

                {previewUrl ? (
                  <div className="relative rounded-xl border border-slate-700 bg-slate-950 p-2 overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Payment Receipt Preview"
                      className="w-full max-h-48 object-contain rounded-lg bg-black/40"
                    />
                    <div className="mt-2 flex items-center justify-between px-1">
                      <span className="text-[11px] text-slate-400 truncate max-w-[200px] flex items-center gap-1">
                        <FileText size={12} className="text-blue-400" />
                        {selectedFile?.name || "Receipt Image"}
                      </span>
                      <button
                        type="button"
                        onClick={handleClearFile}
                        className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1 p-1 rounded-md hover:bg-red-950/60"
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {/* Camera Capture Button */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="p-3 border border-dashed border-slate-700 hover:border-blue-500 rounded-xl bg-slate-950/60 hover:bg-slate-800/50 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-300 transition-colors cursor-pointer"
                    >
                      <Camera size={20} className="text-blue-400" />
                      <span className="text-xs font-semibold">Take Photo</span>
                      <span className="text-[10px] text-slate-500">Camera</span>
                    </button>

                    {/* File Browser Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 border border-dashed border-slate-700 hover:border-blue-500 rounded-xl bg-slate-950/60 hover:bg-slate-800/50 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-300 transition-colors cursor-pointer"
                    >
                      <Upload size={20} className="text-blue-400" />
                      <span className="text-xs font-semibold">Upload Image</span>
                      <span className="text-[10px] text-slate-500">Gallery / Files</span>
                    </button>
                  </div>
                )}

                {/* Hidden File Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer ${
                method === "Cash"
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : "bg-blue-600 hover:bg-blue-500"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  Confirm {method} (₱{transaction.total_amount.toFixed(2)})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
