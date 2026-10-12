"use client";

import React from "react";
import { LaundryTransaction } from "@/types/auth";
import {
  X,
  ExternalLink,
  Smartphone,
  Banknote,
  CheckCircle2,
  Calendar,
  Hash,
  Download,
} from "lucide-react";

interface PaymentProofModalProps {
  transaction: LaundryTransaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentProofModal: React.FC<PaymentProofModalProps> = ({
  transaction,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !transaction) return null;

  const isGcash =
    transaction.payment_method?.toLowerCase().includes("gcash") ||
    transaction.payment_method?.toLowerCase().includes("bank");

  const formattedPaidAt = transaction.paid_at
    ? new Date(transaction.paid_at).toLocaleString()
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl text-slate-100 overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isGcash
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}
            >
              {isGcash ? <Smartphone size={18} /> : <Banknote size={18} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/90 border border-emerald-800/80 px-2 py-0.2 rounded-full inline-flex items-center gap-1">
                  <CheckCircle2 size={10} />
                  Payment Verified
                </span>
                <span className="text-xs text-slate-400 font-mono truncate">
                  #{transaction.tracking_number}
                </span>
              </div>
              <h3 className="text-xs sm:text-base font-bold text-white truncate">
                Receipt &amp; Payment Record
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1">
          {/* Key Payment Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 block">Total Amount</span>
              <span className="text-base font-extrabold text-amber-300">
                ₱{transaction.total_amount.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Method</span>
              <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                {isGcash ? (
                  <span className="text-blue-400">GCash / Bank</span>
                ) : (
                  <span className="text-emerald-400">Cash (OTC)</span>
                )}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 block">Customer</span>
              <span className="font-semibold text-slate-200 truncate block">
                {transaction.customer_name}
              </span>
            </div>
            {transaction.payment_reference_no && (
              <div className="col-span-2 sm:col-span-3 pt-1 border-t border-slate-700/50 flex items-center gap-1.5">
                <Hash size={13} className="text-blue-400 shrink-0" />
                <span className="text-slate-400 text-[11px]">GCash Ref #:</span>
                <span className="font-mono font-bold text-blue-300 text-xs truncate">
                  {transaction.payment_reference_no}
                </span>
              </div>
            )}
            {formattedPaidAt && (
              <div className="col-span-2 sm:col-span-3 text-[11px] text-slate-400 flex items-center gap-1.5">
                <Calendar size={12} className="text-slate-500 shrink-0" />
                <span className="truncate">Recorded on: {formattedPaidAt}</span>
              </div>
            )}
          </div>

          {/* Receipt Proof Photo */}
          {transaction.payment_proof_url ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Uploaded Receipt / Screenshot
                </span>
                <a
                  href={transaction.payment_proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 hover:underline"
                >
                  <ExternalLink size={12} />
                  Open Full Size
                </a>
              </div>

              <div className="relative rounded-xl border border-slate-800 bg-black/60 p-2 flex items-center justify-center max-h-64 sm:max-h-80 overflow-hidden group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={transaction.payment_proof_url}
                  alt={`Payment proof for ${transaction.tracking_number}`}
                  className="max-h-56 sm:max-h-72 w-auto object-contain rounded-lg shadow-lg"
                />
              </div>
            </div>
          ) : (
            <div className="py-6 text-center bg-slate-800/40 rounded-xl border border-slate-700/40 space-y-1">
              <Banknote size={28} className="mx-auto text-emerald-400/80 mb-2" />
              <p className="text-xs font-semibold text-slate-200">
                Direct Over-the-Counter Cash Payment
              </p>
              <p className="text-[11px] text-slate-400">
                Payment was handed directly to the counter staff and officially confirmed in person.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Status: <b className="text-emerald-400">Verified &amp; Settled</b>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
