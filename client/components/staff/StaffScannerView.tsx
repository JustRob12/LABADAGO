"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LaundryShop,
  LaundryTransaction,
  OrderStatus,
  PaymentStatus,
  UserProfile,
  UserRole,
} from "@/types/auth";
import {
  updateTransactionStatus,
  updateTransactionPayment,
  getTransactionByTrackingNumber,
  getLaundryTransactions,
  uploadPaymentProof,
} from "@/lib/supabase/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QRCameraScanner } from "@/components/owner/QRCameraScanner";
import {
  ScanLine,
  Camera,
  Search,
  CheckCircle2,
  Clock,
  Shirt,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Phone,
  User,
  ShieldAlert,
  Sliders,
  Check,
  Package,
  X,
  Building2,
  RefreshCw,
  LogOut,
  ChevronRight,
  BadgeAlert,
  Banknote,
  Smartphone,
  Receipt,
  FileText,
  Eye,
} from "lucide-react";
import { PaymentRecordModal } from "@/components/payment/PaymentRecordModal";
import { PaymentProofModal } from "@/components/payment/PaymentProofModal";
import { PaymentInputSection } from "@/components/payment/PaymentInputSection";

interface StaffScannerViewProps {
  staffUser: UserProfile;
  assignedShop: LaundryShop | null;
  onSignOut?: () => void;
}

// Audio chimes for scanning and handover
function playSound(type: "scan" | "success" | "warning") {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === "scan") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // High A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } else if (type === "success") {
      // Pleasant two-tone chime
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
      // Warning low tone
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // AudioContext blocked
  }
}

const MACHINE_PRESETS = [
  "Washer 1",
  "Washer 2",
  "Washer 3",
  "Washer 4",
  "Dryer 1",
  "Dryer 2",
  "Dryer 3",
];

export const StaffScannerView: React.FC<StaffScannerViewProps> = ({
  staffUser,
  assignedShop,
  onSignOut,
}) => {
  const [transactions, setTransactions] = useState<LaundryTransaction[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [searchCode, setSearchCode] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [activeTab, setActiveTab] = useState<"ready" | "washing" | "pending" | "completed">("ready");

  // Scanned order modal & state
  const [activeScannedTx, setActiveScannedTx] = useState<LaundryTransaction | null>(null);
  const [autoActionType, setAutoActionType] = useState<"receive" | "give" | "progress" | "completed" | null>(null);

  // Form states for Receive action
  const [machineNumber, setMachineNumber] = useState<string>("");
  const [weightInput, setWeightInput] = useState<string>("5.0");
  const [specialNotesInput, setSpecialNotesInput] = useState<string>("");
  const [paymentChoice, setPaymentChoice] = useState<"unpaid" | "paid">("unpaid");

  // Form states for Give action
  const [collectPaymentOnGive, setCollectPaymentOnGive] = useState<boolean>(true);

  // Payment record & proof preview modals
  const [paymentRecordTx, setPaymentRecordTx] = useState<LaundryTransaction | null>(null);
  const [proofModalTx, setProofModalTx] = useState<LaundryTransaction | null>(null);

  // Staff inline intake & dispatch payment states
  const [staffPayMethod, setStaffPayMethod] = useState<"Cash" | "GCash">("Cash");
  const [staffPayRefNo, setStaffPayRefNo] = useState("");
  const [staffPayFile, setStaffPayFile] = useState<File | null>(null);
  const [staffPayPreviewUrl, setStaffPayPreviewUrl] = useState<string | null>(null);

  // Status feedback
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Shop mismatch modal
  const [shopMismatch, setShopMismatch] = useState<{
    intendedShop: string;
    trackingNumber: string;
  } | null>(null);

  const showToast = (type: "success" | "error" | "info", text: string) => {
    setToastMessage({ type, text });
    if (type === "success") playSound("success");
    else if (type === "error") playSound("warning");
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Load shop transactions
  const loadShopOrders = async () => {
    if (!assignedShop?.id) return;
    setIsLoadingOrders(true);
    try {
      const txs = await getLaundryTransactions(undefined, assignedShop.id);
      setTransactions(txs);
    } catch {
      // ignore
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadShopOrders();
    const interval = setInterval(loadShopOrders, 15000); // 15s auto-poll
    return () => clearInterval(interval);
  }, [assignedShop?.id]);

  // Derived order counts for quick counter metrics
  const pendingOrders = useMemo(() => transactions.filter((t) => t.status === "Pending"), [transactions]);
  const washingOrders = useMemo(
    () => transactions.filter((t) => ["Received", "Washing", "Drying", "Folding"].includes(t.status)),
    [transactions]
  );
  const readyOrders = useMemo(() => transactions.filter((t) => t.status === "Ready"), [transactions]);
  const completedOrders = useMemo(
    () =>
      transactions.filter((t) => {
        if (t.status !== "Completed") return false;
        // Today's completed orders
        const isToday =
          new Date(t.updated_at || t.created_at).toDateString() === new Date().toDateString();
        return isToday;
      }),
    [transactions]
  );

  // Process scanned QR payload or tracking code
  const handleProcessScan = async (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) return;

    playSound("scan");

    // Check if JSON payload from customer WalkInQRGenerator
    let trackingToSearch = trimmed;
    let intendedShopId = "";
    let intendedShopName = "";

    try {
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        const parsed = JSON.parse(trimmed);
        if (parsed.trackingNumber) {
          trackingToSearch = parsed.trackingNumber;
          intendedShopId = parsed.shopId || "";
          intendedShopName = parsed.shopName || "";
        }
      }
    } catch {
      // Plain tracking number string
    }

    const cleanCode = trackingToSearch.toUpperCase().replace(/[^A-Z0-9]/g, "");

    // 1. Check local transactions list
    let matchedTx = transactions.find(
      (t) => t.tracking_number.toUpperCase().replace(/[^A-Z0-9]/g, "") === cleanCode
    );

    // 2. Fallback to database lookup
    if (!matchedTx) {
      const { transaction: dbTx } = await getTransactionByTrackingNumber(cleanCode);
      if (dbTx) {
        matchedTx = dbTx;
      }
    }

    // 3. Shop branch validation
    if (assignedShop && matchedTx) {
      if (matchedTx.shop_id && matchedTx.shop_id !== assignedShop.id) {
        setShopMismatch({
          intendedShop: matchedTx.shop_name || "Another Laundry Shop",
          trackingNumber: cleanCode,
        });
        showToast("error", `QR code belongs to: ${matchedTx.shop_name || "Another Shop"}`);
        return;
      }
    } else if (assignedShop && intendedShopId && intendedShopId !== assignedShop.id) {
      setShopMismatch({
        intendedShop: intendedShopName || "Another Branch",
        trackingNumber: cleanCode,
      });
      showToast("error", `QR is for ${intendedShopName}`);
      return;
    }

    if (!matchedTx) {
      showToast("error", `Order #${cleanCode} not found in this shop's records.`);
      return;
    }

    // 4. AUTOMATIC DETECTION: Is this a RECEIVE or a GIVE / DISPATCH?
    prepareOrderActionModal(matchedTx);
  };

  const prepareOrderActionModal = (tx: LaundryTransaction) => {
    setActiveScannedTx(tx);
    setMachineNumber(tx.machine_number || "");
    setWeightInput(String(tx.weight_kg || 5.0));
    setSpecialNotesInput(tx.special_notes || "");
    setPaymentChoice(tx.payment_status === "Paid" ? "paid" : "unpaid");
    setCollectPaymentOnGive(tx.payment_status === "Unpaid");
    setStaffPayMethod("Cash");
    setStaffPayRefNo("");
    setStaffPayFile(null);
    if (staffPayPreviewUrl) URL.revokeObjectURL(staffPayPreviewUrl);
    setStaffPayPreviewUrl(null);

    if (tx.status === "Pending") {
      // AUTOMATIC: RECEIVE LAUNDRY
      setAutoActionType("receive");
    } else if (tx.status === "Ready") {
      // AUTOMATIC: GIVE / DISPATCH LAUNDRY
      setAutoActionType("give");
    } else if (["Received", "Washing", "Drying", "Folding"].includes(tx.status)) {
      // ORDER IN PROGRESS: Can change machine or mark ready
      setAutoActionType("progress");
    } else {
      // Completed or cancelled
      setAutoActionType("completed");
    }
  };

  // Execute RECEIVE action
  const handleConfirmReceive = async () => {
    if (!activeScannedTx) return;
    setIsProcessing(true);

    try {
      const numericWeight = parseFloat(weightInput) || activeScannedTx.weight_kg || 5.0;
      const ratePerKg =
        activeScannedTx.weight_kg > 0
          ? activeScannedTx.total_amount / activeScannedTx.weight_kg
          : 50;
      const totalAmount = Math.round(numericWeight * ratePerKg);

      // If staff assigned a machine, set status to Washing; otherwise Received
      const nextStatus: OrderStatus = machineNumber.trim() ? "Washing" : "Received";
      const finalPaymentStatus: PaymentStatus =
        paymentChoice === "paid" ? "Paid" : activeScannedTx.payment_status;

      let uploadedProofUrl: string | undefined = undefined;
      if (paymentChoice === "paid" && staffPayMethod === "GCash" && staffPayFile) {
        uploadedProofUrl = await uploadPaymentProof(
          staffPayFile,
          activeScannedTx.tracking_number
        );
      }

      const success = await updateTransactionStatus(
        activeScannedTx.id,
        nextStatus,
        numericWeight,
        finalPaymentStatus,
        totalAmount,
        specialNotesInput.trim() || undefined,
        machineNumber.trim() || undefined,
        staffUser.id,
        staffUser.full_name,
        paymentChoice === "paid" ? staffPayMethod : undefined,
        uploadedProofUrl,
        paymentChoice === "paid" ? staffPayRefNo.trim() || undefined : undefined
      );

      if (success) {
        showToast(
          "success",
          `Received order #${activeScannedTx.tracking_number}! ${
            machineNumber ? `Assigned to ${machineNumber}.` : ""
          } ${paymentChoice === "paid" ? `(Paid via ${staffPayMethod})` : ""}`
        );
        setActiveScannedTx(null);
        setAutoActionType(null);
        setSearchCode("");
        setStaffPayFile(null);
        if (staffPayPreviewUrl) URL.revokeObjectURL(staffPayPreviewUrl);
        setStaffPayPreviewUrl(null);
        await loadShopOrders();
      } else {
        showToast("error", "Failed to update order status. Please try again.");
      }
    } catch {
      showToast("error", "Error receiving laundry.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute GIVE / DISPATCH action
  const handleConfirmGive = async () => {
    if (!activeScannedTx) return;
    setIsProcessing(true);

    try {
      const finalPayment: PaymentStatus =
        collectPaymentOnGive || activeScannedTx.payment_status === "Paid" ? "Paid" : "Unpaid";

      let uploadedProofUrl: string | undefined = undefined;
      if (collectPaymentOnGive && staffPayMethod === "GCash" && staffPayFile) {
        uploadedProofUrl = await uploadPaymentProof(
          staffPayFile,
          activeScannedTx.tracking_number
        );
      }

      const success = await updateTransactionStatus(
        activeScannedTx.id,
        "Completed",
        undefined,
        finalPayment,
        undefined,
        undefined,
        undefined,
        staffUser.id,
        staffUser.full_name,
        collectPaymentOnGive ? staffPayMethod : undefined,
        uploadedProofUrl,
        collectPaymentOnGive ? staffPayRefNo.trim() || undefined : undefined
      );

      if (success) {
        showToast(
          "success",
          `Laundry Handover Complete! Order #${activeScannedTx.tracking_number} released to ${activeScannedTx.customer_name}.`
        );
        setActiveScannedTx(null);
        setAutoActionType(null);
        setSearchCode("");
        setStaffPayFile(null);
        if (staffPayPreviewUrl) URL.revokeObjectURL(staffPayPreviewUrl);
        setStaffPayPreviewUrl(null);
        await loadShopOrders();
      } else {
        showToast("error", "Failed to mark order as completed.");
      }
    } catch {
      showToast("error", "Error releasing laundry to customer.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Update order in progress (e.g. mark Ready for Pickup or change machine)
  const handleUpdateProgress = async (newStatus?: OrderStatus) => {
    if (!activeScannedTx) return;
    setIsProcessing(true);

    try {
      const targetStatus = newStatus || activeScannedTx.status;
      const success = await updateTransactionStatus(
        activeScannedTx.id,
        targetStatus,
        undefined,
        undefined,
        undefined,
        specialNotesInput.trim() || undefined,
        machineNumber.trim() || undefined,
        staffUser.id,
        staffUser.full_name
      );

      if (success) {
        showToast(
          "success",
          `Order #${activeScannedTx.tracking_number} updated to ${targetStatus}! ${
            targetStatus === "Ready" ? "Customer can now pick it up." : ""
          }`
        );
        setActiveScannedTx(null);
        setAutoActionType(null);
        setSearchCode("");
        await loadShopOrders();
      } else {
        showToast("error", "Failed to update order.");
      }
    } catch {
      showToast("error", "Error updating order.");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPaymentBadge = (tx: LaundryTransaction) => {
    const isPaid = tx.payment_status === "Paid";
    const methodLabel = tx.payment_method ? ` (${tx.payment_method})` : "";
    return (
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
            isPaid
              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
              : "bg-amber-950/80 text-amber-300 border border-amber-800"
          }`}
        >
          {isPaid ? <CheckCircle2 size={10} /> : <DollarSign size={10} />}
          {isPaid ? `Paid${methodLabel}` : "Unpaid"}
        </span>

        {tx.payment_proof_url && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setProofModalTx(tx);
            }}
            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-950/90 text-blue-300 border border-blue-700 hover:bg-blue-900 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="View GCash / Transfer Receipt"
          >
            <Receipt size={11} />
            Receipt
          </button>
        )}

        {!isPaid && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPaymentRecordTx(tx);
            }}
            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="Record Cash or GCash payment"
          >
            <Banknote size={11} />
            Receive Pay
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col pb-20 select-none">
      {/* Top Mobile-First Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center shrink-0">
              <ScanLine size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400 bg-teal-950 border border-teal-800/80 px-2 py-0.5 rounded-full">
                  Staff Scanner
                </span>
                <span className="text-[11px] text-slate-400">
                  • {staffUser.full_name.split(" ")[0]}
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-white truncate max-w-[200px] sm:max-w-xs">
                {assignedShop?.name || "Counter Scanning Station"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadShopOrders}
              disabled={isLoadingOrders}
              className="border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 px-2.5 py-1.5 h-8 text-xs"
              title="Refresh Queue"
            >
              <RefreshCw size={13} className={isLoadingOrders ? "animate-spin" : ""} />
            </Button>

            {onSignOut && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSignOut}
                className="text-slate-400 hover:text-rose-400 hover:bg-slate-850 px-2 h-8 text-xs"
                title="Sign Out"
              >
                <LogOut size={14} />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Real-time Toast Banner */}
      {toastMessage && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 max-w-sm w-[90%] transition-all animate-bounce ${
            toastMessage.type === "success"
              ? "bg-teal-900/90 text-teal-100 border-teal-500 backdrop-blur-md"
              : toastMessage.type === "error"
              ? "bg-rose-900/90 text-rose-100 border-rose-500 backdrop-blur-md"
              : "bg-blue-900/90 text-blue-100 border-blue-500 backdrop-blur-md"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-rose-400 shrink-0" />
          )}
          <span className="flex-1 truncate">{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Counter Workspace */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 space-y-4">
        {/* Quick Operational Metrics */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => setActiveTab("ready")}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTab === "ready"
                ? "bg-teal-950/60 border-teal-500 text-teal-300 ring-2 ring-teal-500/20"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Ready to Give</span>
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
            </div>
            <p className="text-2xl font-black text-white mt-1">{readyOrders.length}</p>
            <p className="text-[10px] text-slate-400 truncate">For Customer Pickup</p>
          </button>

          <button
            onClick={() => setActiveTab("washing")}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTab === "washing"
                ? "bg-blue-950/60 border-blue-500 text-blue-300 ring-2 ring-blue-500/20"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider">In Machines</span>
              <Shirt size={13} className="text-blue-400" />
            </div>
            <p className="text-2xl font-black text-white mt-1">{washingOrders.length}</p>
            <p className="text-[10px] text-slate-400 truncate">Washing / Drying</p>
          </button>

          <button
            onClick={() => setActiveTab("pending")}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTab === "pending"
                ? "bg-amber-950/60 border-amber-500 text-amber-300 ring-2 ring-amber-500/20"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider">To Receive</span>
              <Clock size={13} className="text-amber-400" />
            </div>
            <p className="text-2xl font-black text-white mt-1">{pendingOrders.length}</p>
            <p className="text-[10px] text-slate-400 truncate">Incoming Drop-offs</p>
          </button>
        </div>

        {/* Primary Scanning Action Card */}
        <section className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ScanLine size={17} className="text-teal-400" />
                Scan Customer QR Code
              </h2>
              <p className="text-xs text-slate-400">
                System automatically detects whether to <b className="text-teal-300">RECEIVE</b> or{" "}
                <b className="text-emerald-300">GIVE / DISPATCH</b> laundry.
              </p>
            </div>

            <Button
              variant={isCameraActive ? "danger" : "primary"}
              size="sm"
              onClick={() => setIsCameraActive(!isCameraActive)}
              className={`text-xs px-3 h-9 font-bold flex items-center gap-1.5 shadow-md ${
                !isCameraActive ? "bg-teal-600 hover:bg-teal-500 text-white" : ""
              }`}
            >
              <Camera size={15} />
              {isCameraActive ? "Close Camera" : "Open Camera"}
            </Button>
          </div>

          {/* Camera Scanner Viewfinder */}
          {isCameraActive && (
            <div className="mb-4 rounded-xl overflow-hidden border border-teal-500/50 bg-black relative">
              <QRCameraScanner
                onScanSuccess={(decoded) => {
                  handleProcessScan(decoded);
                  setIsCameraActive(false);
                }}
                onClose={() => setIsCameraActive(false)}
                incomingPasses={transactions.map((t) => ({
                  tracking_number: t.tracking_number,
                  customer_name: t.customer_name,
                }))}
              />
            </div>
          )}

          {/* Manual Input Search Fallback */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleProcessScan(searchCode);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                placeholder="Scan or type Tracking # (e.g. TRK-ABC123)"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors uppercase font-mono tracking-wider"
              />
              {searchCode && (
                <button
                  type="button"
                  onClick={() => setSearchCode("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <Button
              type="submit"
              variant="outline"
              size="md"
              className="bg-slate-800 hover:bg-slate-700 text-teal-400 font-bold border border-slate-700 text-xs sm:text-sm px-4"
              disabled={!searchCode.trim()}
            >
              Verify
            </Button>
          </form>

          {/* Quick Simulation Bar for Active Queued Orders */}
          {readyOrders.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-850 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] text-slate-500 shrink-0 font-medium">Quick Pickups:</span>
              {readyOrders.slice(0, 4).map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => prepareOrderActionModal(tx)}
                  className="bg-slate-900 hover:bg-teal-950/80 border border-slate-700 hover:border-teal-500/60 text-slate-300 hover:text-teal-300 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5 transition-colors font-mono text-[11px]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  {tx.tracking_number} ({tx.customer_name.split(" ")[0]})
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Counter Orders Tabbed List */}
        <section className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          {/* Tabs Navigation */}
          <div className="flex border-b border-slate-850 bg-slate-950/80 px-2 pt-2 gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab("ready")}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                activeTab === "ready"
                  ? "bg-slate-900 text-teal-400 border-t-2 border-teal-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Ready to Give</span>
              <span className="px-1.5 py-0.2 bg-teal-950 text-teal-400 border border-teal-800 rounded-full text-[10px]">
                {readyOrders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("washing")}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                activeTab === "washing"
                  ? "bg-slate-900 text-blue-400 border-t-2 border-blue-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>In Machines</span>
              <span className="px-1.5 py-0.2 bg-blue-950 text-blue-400 border border-blue-800 rounded-full text-[10px]">
                {washingOrders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("pending")}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                activeTab === "pending"
                  ? "bg-slate-900 text-amber-400 border-t-2 border-amber-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Pending Intake</span>
              <span className="px-1.5 py-0.2 bg-amber-950 text-amber-400 border border-amber-800 rounded-full text-[10px]">
                {pendingOrders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("completed")}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                activeTab === "completed"
                  ? "bg-slate-900 text-emerald-400 border-t-2 border-emerald-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Completed Today</span>
              <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full text-[10px]">
                {completedOrders.length}
              </span>
            </button>
          </div>

          {/* List Content */}
          <div className="p-3 sm:p-4 space-y-2.5">
            {activeTab === "ready" && (
              <>
                {readyOrders.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-xs">
                    <CheckCircle2 size={32} className="mx-auto mb-2 text-slate-600" />
                    No laundry orders currently waiting for pickup.
                  </div>
                ) : (
                  readyOrders.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => prepareOrderActionModal(tx)}
                      className="bg-slate-900 hover:bg-slate-850 border border-teal-500/40 rounded-xl p-3 sm:p-4 cursor-pointer transition-all hover:border-teal-400 flex items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-teal-300">
                            {tx.tracking_number}
                          </span>
                          <span className="text-[10px] uppercase font-bold bg-teal-950 text-teal-400 border border-teal-800 px-2 py-0.5 rounded-md">
                            Ready for Pickup
                          </span>
                          {tx.machine_number && (
                            <span className="text-[10px] font-bold bg-slate-800 text-blue-300 border border-slate-700 px-2 py-0.5 rounded-md">
                              {tx.machine_number}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          {tx.customer_name}
                          <span className="text-xs font-normal text-slate-400">
                            ({tx.customer_phone})
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {tx.service_name} • {tx.weight_kg}kg • ₱{tx.total_amount.toFixed(2)}
                        </p>
                        {renderPaymentBadge(tx)}
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shrink-0 px-3.5 group-hover:scale-105 transition-transform"
                      >
                        Give / Release
                        <ArrowRight size={13} className="ml-1" />
                      </Button>
                    </div>
                  ))
                )}
              </>
            )}

            {activeTab === "washing" && (
              <>
                {washingOrders.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-xs">
                    <Shirt size={32} className="mx-auto mb-2 text-slate-600" />
                    No machines running right now.
                  </div>
                ) : (
                  washingOrders.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => prepareOrderActionModal(tx)}
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl p-3 sm:p-4 cursor-pointer transition-all hover:border-blue-500/50 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-400">
                            {tx.tracking_number}
                          </span>
                          <span className="text-[10px] uppercase font-bold bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-md">
                            {tx.status}
                          </span>
                          {tx.machine_number ? (
                            <span className="text-[10px] font-bold bg-blue-900/60 text-blue-200 border border-blue-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Shirt size={10} />
                              {tx.machine_number}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded-md">
                              No Machine Assigned
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          {tx.customer_name}
                        </div>
                        <p className="text-xs text-slate-400">
                          {tx.service_name} • {tx.weight_kg}kg • ₱{tx.total_amount.toFixed(2)}
                        </p>
                        {renderPaymentBadge(tx)}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs shrink-0"
                      >
                        Update / Ready
                      </Button>
                    </div>
                  ))
                )}
              </>
            )}

            {activeTab === "pending" && (
              <>
                {pendingOrders.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-xs">
                    <CheckCircle2 size={32} className="mx-auto mb-2 text-slate-600" />
                    All incoming drop-offs have been received!
                  </div>
                ) : (
                  pendingOrders.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => prepareOrderActionModal(tx)}
                      className="bg-slate-900 hover:bg-slate-850 border border-amber-500/30 rounded-xl p-3 sm:p-4 cursor-pointer transition-all hover:border-amber-400 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400">
                            {tx.tracking_number}
                          </span>
                          <span className="text-[10px] uppercase font-bold bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-md">
                            Pending Intake
                          </span>
                        </div>
                        <div className="text-sm font-bold text-white">{tx.customer_name}</div>
                        <p className="text-xs text-slate-400">
                          {tx.service_name} • Est. {tx.weight_kg}kg • ₱{tx.total_amount.toFixed(2)}
                        </p>
                        {renderPaymentBadge(tx)}
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0"
                      >
                        Receive
                      </Button>
                    </div>
                  ))
                )}
              </>
            )}

            {activeTab === "completed" && (
              <>
                {completedOrders.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-xs">
                    <Clock size={32} className="mx-auto mb-2 text-slate-600" />
                    No orders completed yet today.
                  </div>
                ) : (
                  completedOrders.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-slate-900 border border-slate-850 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 text-slate-400"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-400">
                            {tx.tracking_number}
                          </span>
                          <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-md">
                            Completed
                          </span>
                        </div>
                        <div className="text-sm font-medium text-slate-200">{tx.customer_name}</div>
                        <p className="text-xs text-slate-500">
                          ₱{tx.total_amount.toFixed(2)} • Handed over to customer
                        </p>
                        {renderPaymentBadge(tx)}
                      </div>
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </section>
      </main>

      {/* AUTOMATIC ACTION MODAL: RECEIVE OR GIVE */}
      {activeScannedTx && autoActionType && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header: Changes banner color depending on automatic action */}
            <div
              className={`p-3.5 sm:p-4 border-b shrink-0 flex items-center justify-between ${
                autoActionType === "receive"
                  ? "bg-amber-950/80 border-amber-800 text-amber-200"
                  : autoActionType === "give"
                  ? "bg-teal-950/80 border-teal-800 text-teal-200"
                  : autoActionType === "progress"
                  ? "bg-blue-950/80 border-blue-800 text-blue-200"
                  : "bg-slate-900 border-slate-800 text-slate-200"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {autoActionType === "receive" && (
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                    <ScanLine size={18} />
                  </div>
                )}
                {autoActionType === "give" && (
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={18} />
                  </div>
                )}
                {autoActionType === "progress" && (
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
                    <Shirt size={18} />
                  </div>
                )}
                {autoActionType === "completed" && (
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center shrink-0">
                    <Check size={18} />
                  </div>
                )}
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                    {autoActionType === "receive" && "Automatic Action: RECEIVE LAUNDRY"}
                    {autoActionType === "give" && "Automatic Action: GIVE / DISPATCH LAUNDRY"}
                    {autoActionType === "progress" && "Order In Progress"}
                    {autoActionType === "completed" && "Order Already Completed"}
                  </h3>
                  <p className="text-[11px] opacity-80 font-mono">
                    Tracking: #{activeScannedTx.tracking_number}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveScannedTx(null);
                  setAutoActionType(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-850"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 sm:p-5 space-y-4 flex-1 overflow-y-auto">
              {/* Customer & Order Summary Card */}
              <div className="bg-slate-900 border border-slate-850 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-white font-bold">
                    <User size={14} className="text-slate-400" />
                    <span>{activeScannedTx.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Phone size={13} />
                    <span>{activeScannedTx.customer_phone}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Service Selected:</span>
                  <span className="text-white font-semibold">{activeScannedTx.service_name}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Due:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-teal-300 font-extrabold text-sm">
                      ₱{activeScannedTx.total_amount.toFixed(2)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        activeScannedTx.payment_status === "Paid"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : "bg-amber-950 text-amber-300 border border-amber-800"
                      }`}
                    >
                      {activeScannedTx.payment_status}
                      {activeScannedTx.payment_method ? ` (${activeScannedTx.payment_method})` : ""}
                    </span>

                    {/* Receipt proof preview button if GCash receipt attached */}
                    {activeScannedTx.payment_proof_url && (
                      <button
                        type="button"
                        onClick={() => setProofModalTx(activeScannedTx)}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700 hover:bg-blue-900 flex items-center gap-1 cursor-pointer"
                        title="View GCash transfer proof"
                      >
                        <Receipt size={11} />
                        Receipt
                      </button>
                    )}

                    {/* Pay now button if unpaid */}
                    {activeScannedTx.payment_status === "Unpaid" && (
                      <button
                        type="button"
                        onClick={() => setPaymentRecordTx(activeScannedTx)}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900 flex items-center gap-1 cursor-pointer"
                        title="Record Cash or GCash payment"
                      >
                        <Banknote size={11} />
                        Receive Pay
                      </button>
                    )}
                  </div>
                </div>

                {activeScannedTx.special_notes && (
                  <div className="text-[11px] bg-slate-950 p-2 rounded-lg text-slate-300 border border-slate-800 mt-1">
                    <span className="text-slate-500 font-bold block">Customer Note:</span>
                    {activeScannedTx.special_notes}
                  </div>
                )}
              </div>

              {/* ACTION FORM 1: RECEIVE (INTAKE) */}
              {autoActionType === "receive" && (
                <div className="space-y-3.5 pt-1">
                  {/* MACHINE NUMBER (OPTIONAL) */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Shirt size={14} className="text-teal-400" />
                        Machine Number <span className="text-teal-400 text-[11px] font-normal">(Optional)</span>
                      </label>
                      <span className="text-[10px] text-slate-400">Where is this load placed?</span>
                    </div>

                    <input
                      type="text"
                      placeholder="e.g. Washer 1, Dryer 2, or leave blank"
                      value={machineNumber}
                      onChange={(e) => setMachineNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />

                    {/* Quick Preset Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {MACHINE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setMachineNumber(preset)}
                          className={`text-[11px] px-2 py-1 rounded-md font-medium transition-colors border ${
                            machineNumber === preset
                              ? "bg-teal-500/20 text-teal-300 border-teal-500"
                              : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                      {machineNumber && (
                        <button
                          type="button"
                          onClick={() => setMachineNumber("")}
                          className="text-[11px] px-2 py-1 rounded-md font-medium text-rose-400 border border-rose-900 bg-rose-950/40 hover:bg-rose-900/60"
                        >
                          Clear Machine
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Weight & Payment confirmation */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Actual Scale Weight (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={weightInput}
                        onChange={(e) => setWeightInput(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Payment Timing
                      </label>
                      <select
                        value={paymentChoice}
                        onChange={(e) => setPaymentChoice(e.target.value as "unpaid" | "paid")}
                        className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                      >
                        <option value="unpaid">Pay on Pickup</option>
                        <option value="paid">Paid Now (Counter)</option>
                      </select>
                    </div>
                  </div>

                  {/* If Paid Now is selected, render PaymentInputSection for Cash / GCash proof */}
                  {paymentChoice === "paid" && (
                    <div className="pt-1 animate-fadeIn">
                      <PaymentInputSection
                        theme="dark"
                        method={staffPayMethod}
                        onMethodChange={setStaffPayMethod}
                        referenceNo={staffPayRefNo}
                        onReferenceNoChange={setStaffPayRefNo}
                        selectedFile={staffPayFile}
                        previewUrl={staffPayPreviewUrl}
                        onFileSelect={(file) => {
                          setStaffPayFile(file);
                          setStaffPayPreviewUrl(URL.createObjectURL(file));
                        }}
                        onFileClear={() => {
                          setStaffPayFile(null);
                          if (staffPayPreviewUrl) URL.revokeObjectURL(staffPayPreviewUrl);
                          setStaffPayPreviewUrl(null);
                        }}
                        amount={
                          (parseFloat(weightInput) || activeScannedTx.weight_kg || 5.0) *
                          (activeScannedTx.weight_kg > 0
                            ? activeScannedTx.total_amount / activeScannedTx.weight_kg
                            : 50)
                        }
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveScannedTx(null)}
                      className="flex-1 border-slate-700 text-slate-300 text-xs py-2.5 order-2 sm:order-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleConfirmReceive}
                      disabled={isProcessing}
                      className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 order-1 sm:order-2"
                    >
                      <CheckCircle2 size={15} />
                      {isProcessing ? "Processing..." : "Confirm & Receive Clothes"}
                    </Button>
                  </div>
                </div>
              )}

              {/* ACTION FORM 2: GIVE / DISPATCH (HANDOVER) */}
              {autoActionType === "give" && (
                <div className="space-y-4 pt-1">
                  <div className="bg-teal-950/40 border border-teal-500/40 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center gap-2 text-teal-300 font-bold text-xs">
                      <Sparkles size={16} />
                      Laundry is done and ready for handover!
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Confirm that all clothes, folded items, and hangers are handed over to{" "}
                      <b>{activeScannedTx.customer_name}</b>.
                    </p>
                    {activeScannedTx.machine_number && (
                      <p className="text-[11px] text-teal-400">
                        Washed in: <b>{activeScannedTx.machine_number}</b>
                      </p>
                    )}
                  </div>

                  {/* Payment settlement check */}
                  {activeScannedTx.payment_status === "Unpaid" ? (
                    <div className="bg-amber-950/60 border border-amber-600/60 rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <DollarSign size={15} />
                          Collect Payment at Counter
                        </span>
                        <span className="text-sm font-black text-amber-200">
                          ₱{activeScannedTx.total_amount.toFixed(2)}
                        </span>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={collectPaymentOnGive}
                          onChange={(e) => setCollectPaymentOnGive(e.target.checked)}
                          className="w-4 h-4 rounded text-teal-600 border-slate-700 focus:ring-teal-500"
                        />
                        <span>Payment collected in full (Cash / GCash)</span>
                      </label>

                      {/* If collect on give is checked, render PaymentInputSection */}
                      {collectPaymentOnGive && (
                        <div className="pt-1 animate-fadeIn">
                          <PaymentInputSection
                            theme="dark"
                            method={staffPayMethod}
                            onMethodChange={setStaffPayMethod}
                            referenceNo={staffPayRefNo}
                            onReferenceNoChange={setStaffPayRefNo}
                            selectedFile={staffPayFile}
                            previewUrl={staffPayPreviewUrl}
                            onFileSelect={(file) => {
                              setStaffPayFile(file);
                              setStaffPayPreviewUrl(URL.createObjectURL(file));
                            }}
                            onFileClear={() => {
                              setStaffPayFile(null);
                              if (staffPayPreviewUrl) URL.revokeObjectURL(staffPayPreviewUrl);
                              setStaffPayPreviewUrl(null);
                            }}
                            amount={activeScannedTx.total_amount}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-emerald-950/40 border border-emerald-600/40 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-300 font-semibold">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      Order was already prepaid. No payment required.
                    </div>
                  )}

                  {/* Give Confirmation Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveScannedTx(null)}
                      className="flex-1 border-slate-700 text-slate-300 text-xs py-2.5 order-2 sm:order-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleConfirmGive}
                      disabled={isProcessing}
                      className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-lg shadow-teal-900/40 order-1 sm:order-2"
                    >
                      <Check size={16} />
                      {isProcessing ? "Releasing..." : "Confirm Handover & Release"}
                    </Button>
                  </div>
                </div>
              )}

              {/* ACTION FORM 3: PROGRESS UPDATE */}
              {autoActionType === "progress" && (
                <div className="space-y-3.5 pt-1">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Current Status:</span>
                      <span className="text-xs font-bold text-blue-300 bg-blue-950 px-2 py-0.5 rounded-md border border-blue-800">
                        {activeScannedTx.status}
                      </span>
                    </div>

                    <div className="pt-1">
                      <label className="text-xs font-bold text-white block mb-1">
                        Assigned Machine Number (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Washer 2 or Dryer 1"
                        value={machineNumber}
                        onChange={(e) => setMachineNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs sm:text-sm"
                      />
                      <div className="flex flex-wrap gap-1 mt-2">
                        {MACHINE_PRESETS.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setMachineNumber(p)}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => handleUpdateProgress("Ready")}
                      disabled={isProcessing}
                      className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5"
                    >
                      <Sparkles size={15} />
                      Laundry is Done! Advance to &quot;Ready for Pickup&quot;
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleUpdateProgress()}
                      disabled={isProcessing}
                      className="w-full bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs py-2"
                    >
                      Save Machine Number Only
                    </Button>
                  </div>
                </div>
              )}

              {/* ACTION FORM 4: ALREADY COMPLETED */}
              {autoActionType === "completed" && (
                <div className="py-4 text-center space-y-3">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-400" />
                  <p className="text-xs text-slate-300">
                    This order has already been completed and delivered to customer.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveScannedTx(null)}
                    className="border-slate-700 text-slate-300 text-xs"
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shop Mismatch Alert Modal */}
      {shopMismatch && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-rose-700 rounded-2xl max-w-sm w-full p-5 text-center space-y-3 animate-in fade-in">
            <ShieldAlert size={36} className="mx-auto text-rose-400" />
            <h4 className="text-base font-bold text-white">Branch Mismatch</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Order <b className="font-mono text-rose-300">{shopMismatch.trackingNumber}</b> is
              designated for:
              <span className="block font-bold text-white mt-1 text-sm bg-slate-900 py-1.5 rounded-lg border border-slate-800">
                {shopMismatch.intendedShop}
              </span>
            </p>
            <p className="text-[11px] text-slate-400">
              Staff scanner can only intake and release laundry for{" "}
              <b>{assignedShop?.name || "their assigned branch"}</b>.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShopMismatch(null)}
              className="w-full border-slate-700 text-slate-300 text-xs"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Manual Counter Payment Record Modal (Cash / GCash Proof Upload) */}
      <PaymentRecordModal
        isOpen={!!paymentRecordTx}
        transaction={paymentRecordTx}
        onClose={() => setPaymentRecordTx(null)}
        onSuccess={async () => {
          showToast(
            "success",
            `Payment recorded for order #${paymentRecordTx?.tracking_number}!`
          );
          setPaymentRecordTx(null);
          await loadShopOrders();
        }}
      />

      {/* Payment Receipt / Transfer Proof Lightbox Modal */}
      <PaymentProofModal
        isOpen={!!proofModalTx}
        transaction={proofModalTx}
        onClose={() => setProofModalTx(null)}
      />
    </div>
  );
};
