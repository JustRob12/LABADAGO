"use client";

import React, { useState } from "react";
import { LaundryTransaction } from "@/types/auth";
import { uploadPaymentProof, updateTransactionPayment } from "@/lib/supabase/auth";
import { PaymentInputSection } from "./PaymentInputSection";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
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

  if (!isOpen || !transaction) return null;

  const handleClearFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl text-slate-100 overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-950/80 border border-teal-800/80 px-2 py-0.5 rounded-full">
              Record Counter Payment
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white mt-1">
              Order #{transaction.tracking_number}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          {/* Order Summary Strip */}
          <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-[11px] text-slate-400">Customer</p>
              <p className="text-xs sm:text-sm font-bold text-white truncate">
                {transaction.customer_name}
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono">
                {transaction.service_name} • {transaction.weight_kg}kg
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] text-slate-400">Total Payable</p>
              <p className="text-base sm:text-lg font-black text-amber-300">
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

          {/* Reusable Payment Input Section */}
          <PaymentInputSection
            theme="dark"
            method={method}
            onMethodChange={setMethod}
            referenceNo={referenceNo}
            onReferenceNoChange={setReferenceNo}
            selectedFile={selectedFile}
            previewUrl={previewUrl}
            onFileSelect={(file) => {
              setSelectedFile(file);
              setPreviewUrl(URL.createObjectURL(file));
            }}
            onFileClear={handleClearFile}
            amount={transaction.total_amount}
          />

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer order-1 sm:order-2 ${
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
