"use client";

import React, { useState } from "react";
import { LaundryTransaction, OrderStatus } from "@/types/auth";
import { Button } from "@/components/ui/Button";
import QRCode from "qrcode";
import {
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  Receipt,
  Store,
  ArrowRight,
  ArrowLeft,
  MapPin,
  QrCode,
  X,
  Shirt,
  Sparkles,
  CreditCard,
} from "lucide-react";

interface CustomerOrderTrackerProps {
  transactions: LaundryTransaction[];
  onRefresh?: () => void;
  onReturnToMap?: () => void;
}

const STATUS_STEPS: { status: OrderStatus; label: string; shortLabel: string }[] = [
  { status: "Pending", label: "Pending", shortLabel: "Pending" },
  { status: "Received", label: "Received", shortLabel: "Received" },
  { status: "Washing", label: "Washing", shortLabel: "Washing" },
  { status: "Drying", label: "Drying", shortLabel: "Drying" },
  { status: "Folding", label: "Folding", shortLabel: "Folding" },
  { status: "Ready", label: "Ready", shortLabel: "Ready" },
  { status: "Completed", label: "Completed", shortLabel: "Completed" },
];

export const CustomerOrderTracker: React.FC<CustomerOrderTrackerProps> = ({
  transactions,
  onRefresh,
  onReturnToMap,
}) => {
  const [ratedOrders, setRatedOrders] = useState<{ [id: string]: number }>({});
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [viewingQrTx, setViewingQrTx] = useState<LaundryTransaction | null>(null);
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);

  const handleRate = (orderId: string, stars: number) => {
    setRatedOrders((prev) => ({ ...prev, [orderId]: stars }));
    setActiveFeedbackId(orderId);
  };

  const handleOpenQrModal = async (tx: LaundryTransaction) => {
    setViewingQrTx(tx);
    try {
      const qrDataString = tx.qr_data || JSON.stringify({
        trackingNumber: tx.tracking_number,
        customerId: tx.customer_id,
        customerName: tx.customer_name,
        customerPhone: tx.customer_phone,
        shopId: tx.shop_id,
        shopName: tx.shop_name,
        serviceName: tx.service_name,
        estimatedWeight: tx.weight_kg,
        estimatedAmount: tx.total_amount,
      });

      const url = await QRCode.toDataURL(qrDataString, {
        width: 280,
        margin: 2,
        color: {
          dark: "#0F172A",
          light: "#FFFFFF",
        },
      });
      setQrModalUrl(url);
    } catch {
      setQrModalUrl(null);
    }
  };

  const getStepIndex = (status: OrderStatus): number => {
    const idx = STATUS_STEPS.findIndex((s) => s.status === status);
    return idx >= 0 ? idx : 0;
  };

  const getStatusBadge = (status: OrderStatus) => {
    const map: Record<OrderStatus, { bg: string; text: string; border: string; label: string }> = {
      Pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Pending Drop-off" },
      Received: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Clothes Received" },
      Washing: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", label: "Washing" },
      Drying: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Drying" },
      Folding: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", label: "Folding" },
      Ready: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Ready for Pickup" },
      Completed: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", label: "Completed" },
      Cancelled: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Cancelled" },
    };
    return (
      map[status] || {
        bg: "bg-slate-50",
        text: "text-slate-700",
        border: "border-slate-200",
        label: status,
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">Live Laundry Orders</h3>
          <p className="text-xs text-slate-500">Track current status and transaction history in real-time.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onReturnToMap && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReturnToMap}
              leftIcon={<ArrowLeft size={13} />}
              className="text-xs"
            >
              Return to Map & Shops
            </Button>
          )}
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} className="text-xs">
              Refresh Status
            </Button>
          )}
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <Package size={32} className="text-slate-400 mx-auto" />
          <div>
            <p className="text-xs font-semibold text-slate-700">No Orders Yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Use the Walk-In Fast Pass or visit a shop on the map to start your first laundry service.
            </p>
          </div>
          {onReturnToMap && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReturnToMap}
              leftIcon={<MapPin size={13} />}
              className="text-xs mt-1"
            >
              Explore Laundry Map
            </Button>
          )}
        </div>
      ) : (
        transactions.map((tx) => {
          const currentStep = getStepIndex(tx.status);
          const badge = getStatusBadge(tx.status);
          const isPending = tx.status === "Pending";
          const isReceived = tx.status === "Received";

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

                <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                  {isPending && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<QrCode size={13} className="text-blue-600" />}
                      onClick={() => handleOpenQrModal(tx)}
                      className="text-xs font-semibold border-blue-200 bg-blue-50/40 text-blue-700 hover:bg-blue-50"
                    >
                      Show QR Pass
                    </Button>
                  )}
                  <span
                    className={`px-2.5 py-0.5 rounded-md border text-xs font-semibold ${badge.bg} ${badge.text} ${badge.border}`}
                  >
                    {badge.label}
                  </span>
                  {tx.payment_status === "Paid" ? (
                    <span className="px-2.5 py-0.5 rounded-md border text-xs font-bold bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      Paid First (₱{tx.total_amount.toFixed(2)})
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-md border text-xs font-bold bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                      <Clock size={12} className="text-amber-600" />
                      Pay on Pickup: ₱{tx.total_amount.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Stepper Bar (7 Steps) */}
              <div className="py-2">
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {STATUS_STEPS.map((stepObj, idx) => {
                    const isDone = idx <= currentStep;
                    const isCurrent = idx === currentStep;

                    return (
                      <div key={stepObj.status} className="flex flex-col items-center text-center">
                        <div
                          className={`w-full h-1.5 rounded-full mb-1.5 transition-all ${
                            isCurrent
                              ? stepObj.status === "Pending"
                                ? "bg-amber-500 ring-2 ring-amber-400/40"
                                : "bg-blue-600 ring-2 ring-blue-400/40"
                              : isDone
                              ? "bg-blue-600"
                              : "bg-slate-200"
                          }`}
                        />
                        <span
                          className={`text-[9px] sm:text-[10px] font-medium truncate w-full ${
                            isCurrent
                              ? stepObj.status === "Pending"
                                ? "text-amber-600 font-bold"
                                : "text-blue-600 font-bold"
                              : isDone
                              ? "text-slate-700"
                              : "text-slate-400"
                          }`}
                          title={stepObj.label}
                        >
                          {stepObj.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Contextual Status Guidance Banner */}
              {isPending && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs">
                  <Clock size={16} className="text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-amber-900">Pending Drop-off: Clothes Not Yet Received</p>
                    <p className="text-amber-700 text-[11px] leading-relaxed">
                      Please bring your laundry to <strong>{tx.shop_name || "the shop"}</strong> and show your QR Fast Pass. Once the counter staff scans your code, your clothes will be officially marked as <strong>Received</strong>.
                    </p>
                  </div>
                </div>
              )}

              {isReceived && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50/70 border border-blue-200/80 text-blue-900 text-xs">
                  <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-blue-900">Clothes Received at Counter</p>
                    <p className="text-blue-700 text-[11px] leading-relaxed">
                      Your clothes have been scanned, verified, and weighed ({tx.weight_kg} kg) by the counter staff. They are queued for the washing cycle.
                    </p>
                  </div>
                </div>
              )}

              {tx.status === "Washing" && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-cyan-50/70 border border-cyan-200/80 text-cyan-900 text-xs">
                  <Shirt size={16} className="text-cyan-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-cyan-900">Washing Machine in Progress</p>
                    <p className="text-cyan-700 text-[11px] leading-relaxed">
                      Your laundry is currently in the washing cycle with detergent and softener.
                    </p>
                  </div>
                </div>
              )}

              {tx.status === "Drying" && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs">
                  <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-amber-900">Drying Cycle Active</p>
                    <p className="text-amber-700 text-[11px] leading-relaxed">
                      Clothes have moved to the heated dryer machine.
                    </p>
                  </div>
                </div>
              )}

              {tx.status === "Folding" && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-indigo-50/70 border border-indigo-200/80 text-indigo-900 text-xs">
                  <Package size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-indigo-900">Folding & Packaging</p>
                    <p className="text-indigo-700 text-[11px] leading-relaxed">
                      Your clean clothes are being neatly folded and bagged.
                    </p>
                  </div>
                </div>
              )}

              {tx.status === "Ready" && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-emerald-900 text-xs">
                  <Sparkles size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-emerald-900">Ready for Pick-Up!</p>
                    <p className="text-emerald-700 text-[11px] leading-relaxed">
                      Your fresh laundry is ready! Please proceed to the counter and show tracking code <strong>{tx.tracking_number}</strong>.
                    </p>
                  </div>
                </div>
              )}

              {tx.status === "Completed" && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs">
                  <CheckCircle2 size={16} className="text-slate-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-900">Order Completed & Claimed</p>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Thank you for choosing LabadaGo! Please rate your laundry experience below.
                    </p>
                  </div>
                </div>
              )}

              {/* Payment Arrangement Banner Callout */}
              <div
                className={`flex items-start sm:items-center gap-2.5 p-3 rounded-lg border text-xs ${
                  tx.payment_status === "Paid"
                    ? "bg-emerald-50/80 border-emerald-200/90 text-emerald-950"
                    : "bg-amber-50/80 border-amber-200/90 text-amber-950"
                }`}
              >
                {tx.payment_status === "Paid" ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                    <div>
                      <span className="font-bold text-emerald-950">
                        Payment Arrangement: Paid First (Settled at Drop-off)
                      </span>
                      <p className="text-emerald-700 text-[11px] mt-0.5">
                        ₱{tx.total_amount.toFixed(2)} was received at the shop counter. You do not need to pay anything when claiming your clean clothes!
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Clock size={16} className="text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                    <div>
                      <span className="font-bold text-amber-950">
                        Payment Arrangement: Pay When Complete
                      </span>
                      <p className="text-amber-700 text-[11px] mt-0.5">
                        Please prepare <strong>₱{tx.total_amount.toFixed(2)}</strong> (Cash or GCash) when claiming your clean laundry upon pickup.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Order Meta Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex flex-wrap items-center gap-3">
                  <span>Weight: <strong className="text-slate-800">{tx.weight_kg} kg</strong></span>
                  <div className="flex items-center gap-1.5">
                    <CreditCard size={13} className="text-slate-400" />
                    <span>Payment:</span>
                    {tx.payment_status === "Paid" ? (
                      <strong className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1">
                        <CheckCircle2 size={11} className="text-emerald-600" />
                        Paid First (Drop-off)
                      </strong>
                    ) : (
                      <strong className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1">
                        <Clock size={11} className="text-amber-600" />
                        Pay When Complete (On Pickup)
                      </strong>
                    )}
                  </div>
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

      {/* QR Fast Pass Preview Modal */}
      {viewingQrTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">Walk-In QR Fast Pass</h4>
              </div>
              <button
                type="button"
                onClick={() => setViewingQrTx(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg">
                {viewingQrTx.tracking_number}
              </span>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                {viewingQrTx.service_name} • {viewingQrTx.shop_name || "LabadaGo Partner Shop"}
              </p>
            </div>

            {qrModalUrl ? (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 inline-block mx-auto">
                <img
                  src={qrModalUrl}
                  alt={`QR Fast Pass ${viewingQrTx.tracking_number}`}
                  className="w-56 h-56 mx-auto object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="w-56 h-56 flex items-center justify-center bg-slate-50 rounded-xl text-xs text-slate-400 mx-auto">
                Loading QR Code...
              </div>
            )}

            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              Show this QR code at the laundry shop counter. Once scanned, your status will automatically change from <strong>Pending</strong> to <strong>Received</strong>.
            </p>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewingQrTx(null)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
