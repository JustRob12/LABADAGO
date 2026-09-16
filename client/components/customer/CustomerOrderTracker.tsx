"use client";

import React, { useState } from "react";
import { LaundryTransaction, OrderStatus } from "@/types/auth";
import { Button } from "@/components/ui/Button";
import {
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  Receipt,
  Store,
  ArrowRight,
} from "lucide-react";

interface CustomerOrderTrackerProps {
  transactions: LaundryTransaction[];
  onRefresh?: () => void;
}

const STATUS_STEPS: OrderStatus[] = [
  "Received",
  "Washing",
  "Drying",
  "Folding",
  "Ready",
  "Completed",
];

export const CustomerOrderTracker: React.FC<CustomerOrderTrackerProps> = ({
  transactions,
  onRefresh,
}) => {
  const [ratedOrders, setRatedOrders] = useState<{ [id: string]: number }>({});
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");

  const handleRate = (orderId: string, stars: number) => {
    setRatedOrders((prev) => ({ ...prev, [orderId]: stars }));
    setActiveFeedbackId(orderId);
  };

  const getStepIndex = (status: OrderStatus): number => {
    const idx = STATUS_STEPS.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  const getStatusBadge = (status: OrderStatus) => {
    const map: Record<OrderStatus, { bg: string; text: string; border: string }> = {
      Pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
      Received: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
      Washing: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
      Drying: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
      Folding: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
      Ready: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
      Completed: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
      Cancelled: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    };
    return map[status] || { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Live Laundry Orders</h3>
          <p className="text-xs text-slate-500">Track current status and transaction history.</p>
        </div>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} className="text-xs">
            Refresh Status
          </Button>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-2xs">
          <Package size={32} className="text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">No Orders Yet</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Use the Walk-In Fast Pass or visit a shop to start your first laundry service.
          </p>
        </div>
      ) : (
        transactions.map((tx) => {
          const currentStep = getStepIndex(tx.status);
          const badge = getStatusBadge(tx.status);

          return (
            <div
              key={tx.id}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
                    {tx.tracking_number}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{tx.service_name}</h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Store size={11} className="text-slate-400" />
                      {tx.shop_name || "LabadaGo Partner Shop"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span
                    className={`px-2.5 py-0.5 rounded-md border text-xs font-medium ${badge.bg} ${badge.text} ${badge.border}`}
                  >
                    {tx.status}
                  </span>
                  <span className="font-bold text-sm text-slate-900">₱{tx.total_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Progress Stepper Bar */}
              <div className="py-2">
                <div className="grid grid-cols-6 gap-1">
                  {STATUS_STEPS.map((step, idx) => {
                    const isDone = idx <= currentStep;
                    const isCurrent = idx === currentStep;

                    return (
                      <div key={step} className="flex flex-col items-center text-center">
                        <div
                          className={`w-full h-1.5 rounded-full mb-2 transition-all ${
                            isDone ? "bg-blue-600" : "bg-slate-200"
                          } ${isCurrent ? "ring-2 ring-blue-400/40" : ""}`}
                        />
                        <span
                          className={`text-[10px] font-medium truncate w-full ${
                            isCurrent
                              ? "text-blue-600 font-bold"
                              : isDone
                              ? "text-slate-700"
                              : "text-slate-400"
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Meta Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span>Weight: <strong className="text-slate-800">{tx.weight_kg} kg</strong></span>
                  <span>Payment: <strong className={tx.payment_status === "Paid" ? "text-emerald-600" : "text-amber-600"}>{tx.payment_status}</strong></span>
                  <span>Type: <strong className="text-slate-800">{tx.is_walkin ? "Walk-In QR" : "Online"}</strong></span>
                </div>

                {/* Rating trigger for completed orders */}
                {(tx.status === "Completed" || tx.status === "Ready") && (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400 mr-1">Rating:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleRate(tx.id, star)}
                        className="cursor-pointer transition-transform hover:scale-110"
                      >
                        <Star
                          size={14}
                          className={`${
                            (ratedOrders[tx.id] || 0) >= star
                              ? "text-amber-400 fill-amber-400"
                              : "text-slate-300"
                          }`}
                        />
                      </button>
                    ))}
                    {ratedOrders[tx.id] && (
                      <span className="text-[11px] font-bold text-emerald-600 ml-1">
                        Thank you!
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
