"use client";

import React, { useState, useEffect } from "react";
import { PaymentStatus, LaundryTransaction, OrderStatus, WalkInQRPayload, LaundryShop } from "@/types/auth";
import { updateTransactionStatus, updateTransactionPayment, getTransactionByTrackingNumber } from "@/lib/supabase/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { QRCameraScanner } from "./QRCameraScanner";
import {
  ScanLine,
  Search,
  CheckCircle2,
  Clock,
  Send,
  User,
  Phone,
  Shirt,
  DollarSign,
  Check,
  Camera,
  QrCode,
  CreditCard,
  Banknote,
  AlertTriangle,
  Store,
  MapPin,
  X,
  AlertCircle,
  Building2,
} from "lucide-react";

interface WalkInIntakeProps {
  shops?: LaundryShop[];
  currentShop?: LaundryShop | null;
  transactions: LaundryTransaction[];
  onTransactionsUpdated: () => void;
}

interface MismatchModalData {
  trackingNumber: string;
  customerName?: string;
  customerPhone?: string;
  serviceName?: string;
  intendedShopName: string;
  currentShopName: string;
  isSameOwnerDifferentBranch?: boolean;
}

export const WalkInIntake: React.FC<WalkInIntakeProps> = ({
  shops,
  currentShop,
  transactions,
  onTransactionsUpdated,
}) => {
  const [scanInput, setScanInput] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scannedTx, setScannedTx] = useState<LaundryTransaction | null>(null);
  const [actualWeight, setActualWeight] = useState<string>("5.0");
  const [selectedPaymentTiming, setSelectedPaymentTiming] = useState<"pay_first" | "pay_on_complete">("pay_on_complete");
  const [walkInFilter, setWalkInFilter] = useState<"pending" | "all">("pending");
  const [intakeSuccess, setIntakeSuccess] = useState<string | null>(null);
  const [smsNotification, setSmsNotification] = useState<string | null>(null);
  const [machineNumber, setMachineNumber] = useState<string>("");

  // Shop mismatch modal state
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [mismatchData, setMismatchData] = useState<MismatchModalData | null>(null);

  // Operating counter branch selection
  const [activeBranchId, setActiveBranchId] = useState<string>(() => {
    return currentShop?.id || (shops && shops.length > 0 ? shops[0].id : "");
  });

  useEffect(() => {
    if (currentShop?.id) {
      setActiveBranchId(currentShop.id);
    } else if (shops && shops.length > 0 && !activeBranchId) {
      setActiveBranchId(shops[0].id);
    }
  }, [currentShop?.id, shops]);

  const activeOperatingShop =
    shops?.find((s) => s.id === activeBranchId) || currentShop || (shops && shops[0]);


  const incomingWalkIns = transactions.filter((t) => t.is_walkin && t.status === "Pending");
  const allWalkIns = transactions.filter((t) => t.is_walkin);
  const displayedWalkIns = walkInFilter === "pending" ? incomingWalkIns : allWalkIns;

  const weightNum = parseFloat(actualWeight);
  const validWeight = isNaN(weightNum) || weightNum <= 0 ? (scannedTx?.weight_kg || 1) : weightNum;
  const ratePerKg =
    scannedTx && scannedTx.weight_kg > 0
      ? scannedTx.total_amount / scannedTx.weight_kg
      : 50;
  const calculatedTotal = scannedTx ? validWeight * ratePerKg : 0;

  const processCodeOrPayload = async (rawText: string) => {
    setIntakeSuccess(null);
    setSmsNotification(null);

    const trimmed = rawText.trim();
    if (!trimmed) return;

    // Check if payload is a JSON string from WalkInQRGenerator
    let parsedPayload: WalkInQRPayload | null = null;
    try {
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        parsedPayload = JSON.parse(trimmed) as WalkInQRPayload;
      }
    } catch {
      // Not JSON, continue with string search
    }

    const trackingNumToFind = parsedPayload?.trackingNumber || trimmed;
    const cleanQuery = trackingNumToFind.toUpperCase().replace(/[^A-Z0-9]/g, "");

    // 1. Try finding in current owner's transactions list
    const found = transactions.find((t) => {
      const cleanTxCode = t.tracking_number.toUpperCase().replace(/[^A-Z0-9]/g, "");
      return cleanTxCode === cleanQuery;
    });

    // 2. Look up the transaction in the database to check its global shop affiliation
    const { transaction: dbTx } = await getTransactionByTrackingNumber(cleanQuery);
    const matchedTx = found || dbTx;

    // 3. Verify shop affiliation
    const targetShopId = matchedTx?.shop_id || parsedPayload?.shopId;
    const targetShopName = matchedTx?.shop_name || parsedPayload?.shopName || "Another Laundry Shop";

    const ownerShopIds = shops ? shops.map((s) => s.id) : activeOperatingShop ? [activeOperatingShop.id] : [];
    const currentCounterShop = activeOperatingShop || (shops && shops[0]) || currentShop;

    // If target shop ID is identified and counter shop is known, check if it belongs to this shop
    if (currentCounterShop && targetShopId) {
      const isCurrentShopMatch = targetShopId === currentCounterShop.id;
      const isAnotherBranchOfSameOwner = !isCurrentShopMatch && ownerShopIds.includes(targetShopId);

      // If the QR does not belong to this active counter branch
      if (!isCurrentShopMatch) {
        setMismatchData({
          trackingNumber: cleanQuery,
          customerName: matchedTx?.customer_name || parsedPayload?.customerName || "Walk-In Customer",
          customerPhone: matchedTx?.customer_phone || parsedPayload?.customerPhone,
          serviceName: matchedTx?.service_name || parsedPayload?.serviceName,
          intendedShopName: targetShopName,
          currentShopName: currentCounterShop.name,
          isSameOwnerDifferentBranch: isAnotherBranchOfSameOwner,
        });
        setShowMismatchModal(true);
        return; // BLOCK INTAKE!
      }
    }

    // 4. Order belongs to this shop - proceed with intake
    if (matchedTx) {
      if (matchedTx.status === "Pending") {
        await updateTransactionStatus(matchedTx.id, "Received");
        matchedTx.status = "Received";
        setIntakeSuccess(
          `QR Scanned! Clothes for ${matchedTx.customer_name} (${matchedTx.tracking_number}) are now marked as RECEIVED.`
        );
        setSmsNotification(
          `SMS sent to ${matchedTx.customer_phone}: "LabadaGo: Your laundry (${matchedTx.tracking_number}) has been SCANNED and RECEIVED at the counter!"`
        );
        onTransactionsUpdated();
      } else {
        setIntakeSuccess(`Order ${matchedTx.tracking_number} verified (Status: ${matchedTx.status}).`);
      }

      setScannedTx(matchedTx);
      setMachineNumber(matchedTx.machine_number || "");
      setActualWeight(String(matchedTx.weight_kg || 5.0));
      setSelectedPaymentTiming(matchedTx.payment_status === "Paid" ? "pay_first" : "pay_on_complete");
      setScanInput(matchedTx.tracking_number);
      return;
    }

    // 5. If payload was rich JSON and verified for this shop
    if (parsedPayload && parsedPayload.trackingNumber) {
      const reconstructed: LaundryTransaction = {
        id: `tx-${Date.now()}`,
        tracking_number: parsedPayload.trackingNumber,
        customer_id: parsedPayload.customerId || null,
        shop_id: parsedPayload.shopId || currentCounterShop?.id || "",
        shop_name: parsedPayload.shopName || currentCounterShop?.name || "Laundry Shop",
        customer_name: parsedPayload.customerName || "Walk-In Customer",
        customer_phone: parsedPayload.customerPhone || "09123456789",
        service_name: parsedPayload.serviceName || "Wash, Dry & Fold",
        weight_kg: Number(parsedPayload.estimatedWeight) || 5.0,
        total_amount: Number(parsedPayload.estimatedAmount) || 150.0,
        status: "Received", // Counter scan confirms clothes received!
        payment_status: "Unpaid",
        is_walkin: true,
        special_notes: parsedPayload.specialNotes || "",
        created_at: parsedPayload.createdAt || new Date().toISOString(),
      };
      await updateTransactionStatus(reconstructed.id, "Received");
      setScannedTx(reconstructed);
      setActualWeight(String(reconstructed.weight_kg));
      setSelectedPaymentTiming("pay_on_complete");
      setScanInput(reconstructed.tracking_number);
      setIntakeSuccess(
        `QR Scanned! Clothes for ${reconstructed.customer_name} (${reconstructed.tracking_number}) verified and marked as RECEIVED.`
      );
      setSmsNotification(
        `SMS sent to ${reconstructed.customer_phone}: "LabadaGo: Your laundry (${reconstructed.tracking_number}) has been SCANNED and RECEIVED at the counter!"`
      );
      onTransactionsUpdated();
      return;
    }

    // 6. Not found
    alert(`No active walk-in record found for code: "${trackingNumToFind}". Please verify the QR code or enter manually.`);
  };


  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    processCodeOrPayload(scanInput);
  };

  const handleKeepAsReceived = async () => {
    if (!scannedTx) return;

    const isPayFirst = selectedPaymentTiming === "pay_first";
    const paymentStatus: PaymentStatus = isPayFirst ? "Paid" : "Unpaid";
    const paymentNote = isPayFirst
      ? "Paid at counter upon drop-off"
      : "Pay when complete / upon pickup";

    await updateTransactionStatus(
      scannedTx.id,
      "Received",
      validWeight,
      paymentStatus,
      calculatedTotal,
      paymentNote,
      machineNumber.trim() || undefined
    );

    setIntakeSuccess(
      `Clothes for ${scannedTx.customer_name} (${scannedTx.tracking_number}) confirmed as RECEIVED at scale weight ${validWeight}kg${
        machineNumber ? ` (Assigned to ${machineNumber})` : ""
      }. Payment arrangement: ${
        isPayFirst ? "PAID FIRST (₱" + calculatedTotal.toFixed(2) + ")" : "PAY ON PICKUP (₱" + calculatedTotal.toFixed(2) + ")"
      }.`
    );
    setSmsNotification(
      `SMS sent to ${scannedTx.customer_phone}: "LabadaGo: Your laundry (${scannedTx.tracking_number}) was received at ${validWeight}kg${
        machineNumber ? ` (${machineNumber})` : ""
      }. Payment: ${
        isPayFirst ? "PAID (₱" + calculatedTotal.toFixed(2) + ")" : "PAY UPON PICKUP (₱" + calculatedTotal.toFixed(2) + ")"
      }."`
    );

    setScannedTx(null);
    setScanInput("");
    setMachineNumber("");
    onTransactionsUpdated();
  };

  const handleConfirmIntake = async () => {
    if (!scannedTx) return;

    const isPayFirst = selectedPaymentTiming === "pay_first";
    const paymentStatus: PaymentStatus = isPayFirst ? "Paid" : "Unpaid";
    const paymentNote = isPayFirst
      ? "Paid at counter upon drop-off"
      : "Pay when complete / upon pickup";

    await updateTransactionStatus(
      scannedTx.id,
      "Washing",
      validWeight,
      paymentStatus,
      calculatedTotal,
      paymentNote,
      machineNumber.trim() || undefined
    );

    setIntakeSuccess(
      `Walk-in load for ${scannedTx.customer_name} accepted! Weighed at ${validWeight}kg${
        machineNumber ? ` in ${machineNumber}` : ""
      }. Machine timer started. Status updated to Washing. Payment: ${
        isPayFirst ? "PAID (₱" + calculatedTotal.toFixed(2) + ")" : "PAY ON PICKUP (₱" + calculatedTotal.toFixed(2) + ")"
      }.`
    );
    setSmsNotification(
      `SMS Notification sent to ${scannedTx.customer_phone}: "LabadaGo: Your laundry (${scannedTx.tracking_number}) has been weighed (${validWeight}kg)${
        machineNumber ? ` and is in ${machineNumber}` : ""
      } and is now WASHING! Payment: ${
        isPayFirst ? "PAID (₱" + calculatedTotal.toFixed(2) + ")" : "PAY UPON PICKUP (₱" + calculatedTotal.toFixed(2) + ")"
      }."`
    );

    setScannedTx(null);
    setScanInput("");
    setMachineNumber("");
    onTransactionsUpdated();
  };

  const handleStatusChange = async (txId: string, newStatus: OrderStatus) => {
    await updateTransactionStatus(txId, newStatus);
    onTransactionsUpdated();
    setSmsNotification(`Customer notified: Order status changed to ${newStatus}.`);
  };

  const handleUpdatePaymentStatus = async (txId: string, newPaymentStatus: PaymentStatus) => {
    await updateTransactionPayment(
      txId,
      newPaymentStatus,
      newPaymentStatus === "Paid" ? "Marked as Paid at counter" : "Pay upon pickup"
    );
    onTransactionsUpdated();
    setSmsNotification(`Payment status updated to ${newPaymentStatus} for order ${txId}.`);
  };

  return (
    <div className="space-y-6">
      {intakeSuccess && <Alert type="success" message={intakeSuccess} />}
      {smsNotification && <Alert type="info" message={smsNotification} />}

      {/* Incoming Walk-In Fast Passes Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Incoming Walk-In Fast Passes
                {incomingWalkIns.length > 0 && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                    {incomingWalkIns.length} Awaiting Intake
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                Customers who generated a QR pass for counter drop-off. Tap &quot;Quick Intake &amp; Weigh&quot; to intake with 1 click.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setWalkInFilter("pending")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                walkInFilter === "pending"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Awaiting Scan ({incomingWalkIns.length})
            </button>
            <button
              type="button"
              onClick={() => setWalkInFilter("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                walkInFilter === "all"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Walk-Ins ({allWalkIns.length})
            </button>
          </div>
        </div>

        {displayedWalkIns.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            {walkInFilter === "pending"
              ? "No pending walk-in passes awaiting counter scan right now."
              : "No walk-in fast passes have been generated yet."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {displayedWalkIns.map((tx) => (
              <div
                key={tx.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {tx.tracking_number}
                    </span>
                    {tx.status === "Pending" ? (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Awaiting Scan
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        {tx.status}
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="font-bold text-slate-900 text-xs">{tx.customer_name}</p>
                    <p className="text-[11px] text-slate-500">{tx.customer_phone}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium truncate max-w-[140px]">
                      {tx.service_name}
                    </span>
                    <span className="font-bold text-slate-900">
                      {tx.weight_kg} kg • ₱{tx.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60">
                  <Button
                    type="button"
                    variant={tx.status === "Pending" ? "primary" : "outline"}
                    size="sm"
                    className="w-full text-xs font-semibold"
                    leftIcon={tx.status === "Pending" ? <ScanLine size={13} /> : <CheckCircle2 size={13} />}
                    onClick={() => {
                      processCodeOrPayload(tx.tracking_number);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    {tx.status === "Pending" ? "Quick Intake & Weigh" : "View / Edit Order"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Counter QR Scanner / Code Entry Tool */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <ScanLine size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Counter Walk-In QR Scanner & Verification
              </h3>
              <p className="text-xs text-slate-500">
                Scan customer&apos;s phone QR pass directly with camera or enter tracking code
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {shops && shops.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
                <Store size={13} className="text-emerald-600 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-500">Counter:</span>
                <select
                  value={activeBranchId}
                  onChange={(e) => setActiveBranchId(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {activeOperatingShop && (!shops || shops.length <= 1) && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700">
                <Store size={13} className="text-emerald-600 shrink-0" />
                <span>Counter: {activeOperatingShop.name}</span>
              </div>
            )}
            <Button
              type="button"
              variant={isCameraActive ? "outline" : "primary"}
              size="sm"
              leftIcon={<Camera size={15} />}
              onClick={() => setIsCameraActive((prev) => !prev)}
              className="shadow-sm font-medium"
            >
              {isCameraActive ? "Close Camera" : "Scan with Camera"}
            </Button>
          </div>
        </div>

        {/* Live Camera QR Viewfinder */}
        {isCameraActive && (
          <div className="mt-4">
            <QRCameraScanner
              onScanSuccess={(decodedText) => {
                setIsCameraActive(false);
                processCodeOrPayload(decodedText);
              }}
              onClose={() => setIsCameraActive(false)}
              incomingPasses={incomingWalkIns.map((t) => ({
                tracking_number: t.tracking_number,
                customer_name: t.customer_name,
              }))}
            />
          </div>
        )}

        <form onSubmit={handleLookup} className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1">
            <Input
              placeholder="Scan with camera or enter Tracking Number (e.g. LBD-96532)"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              leftIcon={<Search size={15} />}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isCameraActive ? "ghost" : "outline"}
              size="md"
              leftIcon={<Camera size={15} />}
              onClick={() => setIsCameraActive((prev) => !prev)}
            >
              {isCameraActive ? "Hide Camera" : "Scan with Camera"}
            </Button>
            <Button type="submit" variant="primary" size="md" leftIcon={<ScanLine size={15} />}>
              Verify Code
            </Button>
          </div>
        </form>

        {/* Scanned Verification Card */}
        {scannedTx && (
          <div className="mt-4 p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-blue-700 bg-white px-2.5 py-1 rounded-md border border-blue-200">
                  {scannedTx.tracking_number}
                </span>
                <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-blue-600" />
                  Clothes Received at Counter
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                Customer Pass Verified ✓
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-slate-400">Customer Name</p>
                <p className="font-bold text-slate-900">{scannedTx.customer_name}</p>
              </div>
              <div>
                <p className="text-slate-400">Phone</p>
                <p className="font-bold text-slate-900">{scannedTx.customer_phone}</p>
              </div>
              <div>
                <p className="text-slate-400">Service Requested</p>
                <p className="font-bold text-slate-900">{scannedTx.service_name}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-blue-200/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Counter Scale Weight:</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  placeholder="5.0"
                  value={actualWeight}
                  onChange={(e) => setActualWeight(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      (e.key === "Backspace" || e.key === "Delete") &&
                      (actualWeight === "0" || actualWeight === "0.0" || actualWeight === "0.")
                    ) {
                      e.preventDefault();
                      setActualWeight("");
                    }
                  }}
                  onFocus={(e) => {
                    if (e.target.value === "0" || e.target.value === "0.0") {
                      setActualWeight("");
                    } else {
                      e.target.select();
                    }
                  }}
                  className="w-20 h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-bold"
                />
                <span className="text-xs text-slate-500">kg</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs bg-white px-3 py-1.5 rounded-lg border border-blue-200">
                <span className="text-slate-500">Calculated Total:</span>
                <span className="font-bold text-slate-900 text-sm">₱{calculatedTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Machine Number (Optional) */}
            <div className="pt-2 border-t border-blue-200/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Shirt size={14} className="text-blue-600" />
                  Machine Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <span className="text-[10px] text-slate-500">Assign washer or dryer for this load</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Washer 1, Dryer 2"
                  value={machineNumber}
                  onChange={(e) => setMachineNumber(e.target.value)}
                  className="w-44 h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium focus:border-blue-500 focus:outline-none"
                />
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  {["Washer 1", "Washer 2", "Washer 3", "Dryer 1", "Dryer 2"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setMachineNumber(p)}
                      className={`text-[11px] px-2 py-1 rounded-md border font-medium transition-colors ${
                        machineNumber === p
                          ? "bg-blue-100 text-blue-800 border-blue-300 font-bold"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  {machineNumber && (
                    <button
                      type="button"
                      onClick={() => setMachineNumber("")}
                      className="text-[10px] text-rose-600 hover:text-rose-700 px-1.5 py-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Choice Selection */}
            <div className="pt-2 border-t border-blue-200/60 space-y-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CreditCard size={14} className="text-blue-600" />
                Select Customer Payment Arrangement:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentTiming("pay_first")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedPaymentTiming === "pay_first"
                      ? "border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-500 shadow-xs"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <CreditCard size={14} className="text-emerald-600" />
                      1. Pay First (Paid Now)
                    </span>
                    {selectedPaymentTiming === "pay_first" && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Customer pays right now at the counter upon drop-off.
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      Mark as Paid ✓
                    </span>
                    <span className="text-xs font-bold text-emerald-800">
                      ₱{calculatedTotal.toFixed(2)}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPaymentTiming("pay_on_complete")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedPaymentTiming === "pay_on_complete"
                      ? "border-amber-500 bg-amber-50/80 ring-1 ring-amber-500 shadow-xs"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Clock size={14} className="text-amber-600" />
                      2. Pay When Complete
                    </span>
                    {selectedPaymentTiming === "pay_on_complete" && (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Customer will pay upon pickup when clothes are claimed.
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                      Collect on Pickup
                    </span>
                    <span className="text-xs font-bold text-amber-800">
                      ₱{calculatedTotal.toFixed(2)}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-blue-200/60 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setScannedTx(null)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<CheckCircle2 size={14} className="text-blue-600" />}
                onClick={handleKeepAsReceived}
                className="text-xs"
              >
                Confirm Received Only
              </Button>
              <Button
                type="button"
                variant="success"
                size="sm"
                leftIcon={<Check size={14} />}
                onClick={handleConfirmIntake}
              >
                Accept & Start Washing
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Live Service Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Live Service Queue & Transactions</h3>
            <p className="text-xs text-slate-500">
              Update service progress and trigger automated customer notifications.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            {transactions.length} Total Orders
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Tracking</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Service</th>
                <th className="py-2.5 px-3">Weight</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No active transactions or walk-in orders yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-blue-600">
                      <div className="flex flex-col gap-0.5">
                        <span>{tx.tracking_number}</span>
                        {tx.is_walkin && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded w-fit">
                            Walk-In QR Pass
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-900">{tx.customer_name}</p>
                      <p className="text-[11px] text-slate-400">{tx.customer_phone}</p>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      <p>{tx.service_name}</p>
                      {tx.machine_number && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200 mt-0.5">
                          <Shirt size={10} />
                          {tx.machine_number}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{tx.weight_kg} kg</td>
                    <td className="py-3 px-3 font-bold text-slate-900">₱{tx.total_amount.toFixed(2)}</td>
                    <td className="py-3 px-3">
                      {tx.payment_status === "Paid" ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="px-2 py-0.5 rounded-md border text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 w-fit">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            Paid (Drop-off)
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-0.5 rounded-md border text-[11px] font-semibold bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 w-fit">
                            <Clock size={11} className="text-amber-600" />
                            Pay on Pickup
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdatePaymentStatus(tx.id, "Paid")}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline text-left cursor-pointer"
                            title="Mark order as paid when customer pays on pickup"
                          >
                            Mark as Paid ✓
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {tx.status === "Pending" ? (
                        <span className="px-2 py-0.5 rounded-md border text-[11px] font-semibold bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 w-fit">
                          <Clock size={11} className="text-amber-600 animate-pulse" />
                          Pending Scan
                        </span>
                      ) : tx.status === "Received" ? (
                        <span className="px-2 py-0.5 rounded-md border text-[11px] font-semibold bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 w-fit">
                          <CheckCircle2 size={11} className="text-blue-600" />
                          Received
                        </span>
                      ) : tx.status === "Ready" ? (
                        <span className="px-2 py-0.5 rounded-md border text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 w-fit">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          Ready
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md border text-[11px] font-medium bg-slate-50 text-slate-700 border-slate-200">
                          {tx.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <select
                        value={tx.status}
                        onChange={(e) => handleStatusChange(tx.id, e.target.value as OrderStatus)}
                        className="h-7 px-2 text-xs rounded-md border border-slate-200 bg-white font-medium text-slate-700"
                      >
                        <option value="Pending">Pending (Not Scanned)</option>
                        <option value="Received">Received (Clothes at Counter)</option>
                        <option value="Washing">Washing</option>
                        <option value="Drying">Drying</option>
                        <option value="Folding">Folding</option>
                        <option value="Ready">Ready</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SHOP MISMATCH WARNING MODAL                                               */}
      {/* ========================================================================= */}
      {showMismatchModal && mismatchData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="bg-rose-50 border-b border-rose-100 p-5 flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <AlertTriangle size={22} />
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-200/80 text-rose-900 mb-1">
                  Shop Mismatch Warning
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  This Laundry Doesn&apos;t Belong to This Shop!
                </h3>
                <p className="text-xs text-rose-700 mt-1">
                  This customer&apos;s QR booking is registered to a different laundry shop and cannot be received at this counter.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMismatchModal(false);
                  setMismatchData(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Branch Comparison Cards */}
              <div className="space-y-2">
                <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                    ❌ Intended Laundry Shop (Booked Here)
                  </span>
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Store size={14} className="text-rose-600 shrink-0" />
                    <span>{mismatchData.intendedShopName}</span>
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    📍 Your Current Counter Branch
                  </span>
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Store size={14} className="text-emerald-600 shrink-0" />
                    <span>{mismatchData.currentShopName}</span>
                  </p>
                </div>
              </div>

              {/* Pass Details */}
              <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-3 space-y-2 text-xs">
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                  <span className="text-slate-500">Tracking Code:</span>
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    #{mismatchData.trackingNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-800">{mismatchData.customerName}</span>
                </div>
                {mismatchData.customerPhone && (
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                    <span className="text-slate-500">Phone:</span>
                    <span className="text-slate-700">{mismatchData.customerPhone}</span>
                  </div>
                )}
                {mismatchData.serviceName && (
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500">Service:</span>
                    <span className="text-slate-700 font-medium">{mismatchData.serviceName}</span>
                  </div>
                )}
              </div>

              {/* Customer Instruction Alert */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>What to do:</strong> Please advise the customer to bring their clothes to{" "}
                  <span className="font-bold underline">{mismatchData.intendedShopName}</span>, or have them generate a new walk-in QR pass for{" "}
                  <span className="font-bold underline">{mismatchData.currentShopName}</span>.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  setShowMismatchModal(false);
                  setMismatchData(null);
                }}
              >
                Understood & Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
