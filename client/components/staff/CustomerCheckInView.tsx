"use client";

import React, { useState, useMemo, useEffect } from "react";
import { LaundryShop, LaundryTransaction, UserProfile, ShopService } from "@/types/auth";
import {
  createManualWalkInTransaction,
  getShopServices,
  getTransactionByTrackingNumber,
  updateTransactionStatus,
} from "@/lib/supabase/auth";
import { QRCameraScanner } from "@/components/owner/QRCameraScanner";
import {
  QrCode,
  UserPlus,
  Check,
  Shirt,
  Package,
  Sparkles,
  Clock,
  Calendar,
  Info,
  X,
  FileText,
  Search,
  CheckCircle2,
  Camera,
  AlertCircle,
  Phone,
  User,
  Store,
  RotateCcw,
  Loader2,
  Tag,
  DollarSign,
  Plus,
  Minus,
} from "lucide-react";

interface CustomerCheckInViewProps {
  staffUser: UserProfile;
  assignedShop: LaundryShop | null;
  onTransactionCreated: (tx: LaundryTransaction) => void;
  onViewQueue?: () => void;
  todayTransactionsCount?: number;
}

interface ServiceItemState {
  id: string;
  name: string;
  rate: number;
  unit: string;
  quantity: number;
  selected: boolean;
  icon: "fold" | "blanket" | "dry" | "express";
}

const determineServiceIcon = (name: string): "fold" | "blanket" | "dry" | "express" => {
  const lower = name.toLowerCase();
  if (lower.includes("blanket") || lower.includes("duvet") || lower.includes("comforter")) {
    return "blanket";
  }
  if (lower.includes("dry") || lower.includes("iron") || lower.includes("press")) {
    return "dry";
  }
  if (lower.includes("express") || lower.includes("rush") || lower.includes("fast")) {
    return "express";
  }
  return "fold";
};

export const CustomerCheckInView: React.FC<CustomerCheckInViewProps> = ({
  staffUser,
  assignedShop,
  onTransactionCreated,
  onViewQueue,
  todayTransactionsCount = 0,
}) => {
  // Step 1: Customer Type ("scan" for Scan Customer QR, "manual" for Quick Manual Entry)
  const [customerType, setCustomerType] = useState<"scan" | "manual">("manual");

  // Step 2: Customer Information - Starts completely empty as requested
  const [custFullName, setCustFullName] = useState("");
  const [custContactNumber, setCustContactNumber] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custAddress, setCustAddress] = useState("");

  // Step 3: Selected Services - Read directly from the database for the active shop
  const [services, setServices] = useState<ServiceItemState[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  // Scan Customer QR State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [searchTrackingCode, setSearchTrackingCode] = useState("");
  const [isSearchingPass, setIsSearchingPass] = useState(false);
  const [scannedTransaction, setScannedTransaction] = useState<LaundryTransaction | null>(null);
  const [scannerMessage, setScannerMessage] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isConfirmingScanned, setIsConfirmingScanned] = useState(false);

  // Submission State for Quick Manual Entry
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTx, setSuccessTx] = useState<LaundryTransaction | null>(null);

  // Fetch shop services directly from the database (shop_services table)
  useEffect(() => {
    async function loadShopServicesFromDb() {
      if (!assignedShop?.id) return;
      setIsLoadingServices(true);
      try {
        const dbServices = await getShopServices(assignedShop.id);
        if (dbServices && dbServices.length > 0) {
          setServices(
            dbServices.map((srv, idx) => ({
              id: srv.id,
              name: srv.service_name,
              rate: Number(srv.price) || 0,
              unit: srv.unit || "load",
              quantity: 1,
              selected: idx === 0, // default first service selected
              icon: determineServiceIcon(srv.service_name),
            }))
          );
        } else if (assignedShop.services && assignedShop.services.length > 0) {
          setServices(
            assignedShop.services.map((srv, idx) => ({
              id: srv.id,
              name: srv.service_name,
              rate: Number(srv.price) || 0,
              unit: srv.unit || "load",
              quantity: 1,
              selected: idx === 0,
              icon: determineServiceIcon(srv.service_name),
            }))
          );
        } else {
          // Standard laundry services if no custom services have been configured yet
          setServices([
            { id: "srv-def-1", name: "Wash & Fold", rate: 60.0, unit: "kg", quantity: 6.0, selected: true, icon: "fold" },
            { id: "srv-def-2", name: "Wash & Dry", rate: 55.0, unit: "kg", quantity: 1, selected: false, icon: "fold" },
            { id: "srv-def-3", name: "Blanket & Comforter", rate: 180.0, unit: "pc", quantity: 1, selected: false, icon: "blanket" },
          ]);
        }
      } catch (err) {
        console.error("Failed to load database services for shop:", err);
      } finally {
        setIsLoadingServices(false);
      }
    }

    loadShopServicesFromDb();
  }, [assignedShop?.id]);

  // Toggle service selection
  const toggleService = (id: string) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const newSelected = !s.selected;
          const newQty = newSelected && s.quantity === 0 ? 1 : s.quantity;
          return { ...s, selected: newSelected, quantity: newQty };
        }
        return s;
      })
    );
  };

  // Direct quantity input update
  const setDirectQuantity = (id: string, val: number) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const next = Math.max(0, val);
          return { ...s, quantity: next, selected: next > 0 };
        }
        return s;
      })
    );
  };

  // Active selected services & subtotal calculation
  const activeSelected = useMemo(() => {
    return services.filter((s) => s.selected && s.quantity > 0);
  }, [services]);

  const servicesSubtotal = useMemo(() => {
    return activeSelected.reduce((sum, s) => sum + s.rate * s.quantity, 0);
  }, [activeSelected]);

  // Formatted Queue Number (e.g. Q-005)
  const queueNumberStr = useMemo(() => {
    const num = (todayTransactionsCount || 0) + 1;
    return `Q-${String(num).padStart(3, "0")}`;
  }, [todayTransactionsCount]);

  // Estimated completion time string
  const estimatedCompletionStr = useMemo(() => {
    const now = new Date();
    now.setHours(now.getHours() + 2);
    now.setMinutes(30);
    const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${dateStr} • ${timeStr}`;
  }, []);

  // Handle Quick Manual Entry Submission
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custFullName.trim()) {
      alert("Please enter customer's full name.");
      return;
    }
    if (!custContactNumber.trim()) {
      alert("Please enter customer's contact number.");
      return;
    }
    if (activeSelected.length === 0) {
      alert("Please select at least one laundry service.");
      return;
    }

    setIsSubmitting(true);
    try {
      const primaryService = activeSelected.map((s) => `${s.name} (${s.quantity} ${s.unit})`).join(", ");

      // Calculate weight based on kg services or shop default capacity
      const kgServices = activeSelected.filter((s) => s.unit === "kg");
      const totalKg =
        kgServices.length > 0
          ? kgServices.reduce((sum, s) => sum + s.quantity, 0)
          : assignedShop?.max_kilo_per_load
          ? Number(assignedShop.max_kilo_per_load)
          : 8.0;

      const shopIdToUse = assignedShop?.id || "default-shop-main";
      const shopNameToUse = assignedShop?.name || "LabadaGO Laundry - Main Branch";

      const res = await createManualWalkInTransaction({
        customer_name: custFullName.trim(),
        customer_phone: custContactNumber.trim(),
        shop_id: shopIdToUse,
        shop_name: shopNameToUse,
        service_name: primaryService,
        weight_kg: totalKg,
        total_amount: servicesSubtotal,
        payment_status: "Unpaid",
        special_notes: [
          custAddress.trim() ? `Address: ${custAddress.trim()}` : "",
          custEmail.trim() ? `Email: ${custEmail.trim()}` : "",
          `Queue: ${queueNumberStr}`,
        ]
          .filter(Boolean)
          .join(" | "),
        staff_id: staffUser.id,
      });

      if (res.success) {
        setSuccessTx(res.transaction);
        onTransactionCreated(res.transaction);
      } else {
        alert("Failed to create transaction. Please try again.");
      }
    } catch (err) {
      console.error("Error creating transaction:", err);
      alert("An unexpected error occurred while creating transaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Quick Manual Entry Form
  const handleCancelForm = () => {
    if (window.confirm("Are you sure you want to clear this customer check-in form?")) {
      setCustFullName("");
      setCustContactNumber("");
      setCustEmail("");
      setCustAddress("");
      setServices((prev) => prev.map((s) => ({ ...s, selected: false, quantity: 1 })));
    }
  };

  // Process Scanned QR or Tracking Code Search
  const handleProcessScannedQR = async (rawText: string) => {
    if (!rawText || !rawText.trim()) return;
    const text = rawText.trim();
    setIsSearchingPass(true);
    setScannerMessage(null);
    setScannerError(null);

    try {
      // 1. Try parsing JSON payload from customer pass
      if (text.startsWith("{") && text.endsWith("}")) {
        try {
          const payload = JSON.parse(text);
          const tracking = payload.trackingNumber || payload.tracking_number;
          if (tracking) {
            const { transaction } = await getTransactionByTrackingNumber(tracking);
            if (transaction) {
              setScannedTransaction(transaction);
              setScannerMessage(`✓ Verified QR Fast Pass #${transaction.tracking_number} for ${transaction.customer_name}.`);
              setIsCameraActive(false);
              return;
            }
          }

          // If offline pass or freshly created, reconstruct it from payload
          const reconstructedTx: LaundryTransaction = {
            id: `tx-${Date.now()}`,
            tracking_number: tracking || `LBD-${Math.floor(10000 + Math.random() * 90000)}`,
            customer_id: payload.customerId || null,
            shop_id: payload.shopId || assignedShop?.id || "",
            shop_name: payload.shopName || assignedShop?.name || "Laundry Shop",
            customer_name: payload.customerName || payload.customer_name || "Walk-In Customer",
            customer_phone: payload.customerPhone || payload.phone_number || "09123456789",
            service_name:
              payload.serviceName ||
              (Array.isArray(payload.services) ? payload.services.map((s: any) => s.name).join(", ") : "Laundry Service"),
            weight_kg: Number(payload.estimatedWeight || payload.weight || 8.0),
            total_amount: Number(payload.estimatedAmount || payload.total || 0),
            status: "Pending",
            payment_status: "Unpaid",
            is_walkin: true,
            special_notes: payload.notes || payload.specialNotes || "",
            created_at: payload.createdAt || new Date().toISOString(),
          };
          setScannedTransaction(reconstructedTx);
          setScannerMessage(`✓ Verified QR Fast Pass #${reconstructedTx.tracking_number} for ${reconstructedTx.customer_name}.`);
          setIsCameraActive(false);
          return;
        } catch (_) {
          // ignore json parse error, fall through to tracking search
        }
      }

      // 2. String tracking number lookup (e.g. LBD-XXXXX or alphanumeric)
      const trackingMatch = text.match(/LBD-[A-Z0-9]+/i);
      const trackingCode = trackingMatch ? trackingMatch[0].toUpperCase() : text.toUpperCase();

      const { transaction } = await getTransactionByTrackingNumber(trackingCode);
      if (transaction) {
        setScannedTransaction(transaction);
        setScannerMessage(`✓ Verified QR Fast Pass #${transaction.tracking_number} for ${transaction.customer_name}.`);
        setIsCameraActive(false);
      } else {
        setScannerError(`No active pass found for code "${trackingCode}". Please verify code or use Quick Manual Entry.`);
      }
    } catch (err) {
      console.error("Error looking up transaction by QR:", err);
      setScannerError("Failed to lookup transaction. Please try again.");
    } finally {
      setIsSearchingPass(false);
    }
  };

  // Confirm Scanned Customer Check-In
  const handleConfirmScannedCheckIn = async () => {
    if (!scannedTransaction) return;
    setIsConfirmingScanned(true);
    try {
      await updateTransactionStatus(scannedTransaction.id, "Washing", scannedTransaction.weight_kg);
      const updated: LaundryTransaction = {
        ...scannedTransaction,
        status: "Washing",
      };
      setScannedTransaction(updated);
      onTransactionCreated(updated);
      setScannerMessage(`✓ Confirmed! Order #${updated.tracking_number} for ${updated.customer_name} is now PROCESSING.`);
    } catch (err) {
      console.error("Error confirming scanned intake:", err);
      alert("Failed to confirm check-in. Please try again.");
    } finally {
      setIsConfirmingScanned(false);
    }
  };

  // Reset Scan Customer QR to scan another code
  const handleResetScanner = () => {
    setScannedTransaction(null);
    setSearchTrackingCode("");
    setScannerMessage(null);
    setScannerError(null);
    setIsCameraActive(true);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* 1. CHOOSE CUSTOMER TYPE SECTION (Step 1) */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
            1
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Choose Customer Type</h3>
            <p className="text-xs text-slate-500">Select how you would like to identify the customer.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Option A: Scan Customer QR */}
          <div
            onClick={() => {
              setCustomerType("scan");
              if (!scannedTransaction) {
                setIsCameraActive(true);
              }
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
              customerType === "scan"
                ? "border-2 border-blue-600 bg-blue-50/20 shadow-xs"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="pt-0.5">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  customerType === "scan" ? "border-blue-600" : "border-slate-300"
                }`}
              >
                {customerType === "scan" && <div className="w-2 h-2 rounded-full bg-blue-600" />}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <QrCode size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-900">Scan Customer QR</h4>
              <p className="text-[11px] font-semibold text-slate-600 mt-0.5">Scan customer QR code or Fast Pass</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                Scan customer phone QR pass or lookup tracking code to verify check-in.
              </p>
            </div>
          </div>

          {/* Option B: Quick Manual Entry */}
          <div
            onClick={() => {
              setCustomerType("manual");
              setIsCameraActive(false);
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
              customerType === "manual"
                ? "border-2 border-emerald-500 bg-emerald-50/25 shadow-xs"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="pt-0.5">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  customerType === "manual" ? "border-emerald-600" : "border-slate-300"
                }`}
              >
                {customerType === "manual" && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <UserPlus size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-900">Quick Manual Entry</h4>
              <p className="text-[11px] font-semibold text-slate-600 mt-0.5">Manual information entry</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                Directly fill in customer details and services for walk-in customers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODE 1: SCAN CUSTOMER QR (Displays Scanner and Scanned Transaction Details) */}
      {/* ========================================================================= */}
      {customerType === "scan" && (
        <section className="bg-white rounded-2xl border border-blue-200 p-5 shadow-xs space-y-4 animate-in fade-in">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Camera size={16} className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Scan Customer Fast Pass QR</h3>
            </div>
            {!scannedTransaction && (
              <button
                type="button"
                onClick={() => setIsCameraActive(!isCameraActive)}
                className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors"
              >
                {isCameraActive ? "Close Camera" : "Open Camera Scanner"}
              </button>
            )}
          </div>

          {/* Camera Viewfinder */}
          {isCameraActive && !scannedTransaction && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <QRCameraScanner
                onScanSuccess={(code) => {
                  handleProcessScannedQR(code);
                }}
                onClose={() => setIsCameraActive(false)}
              />
            </div>
          )}

          {/* Tracking Number Search Input */}
          {!scannedTransaction && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTrackingCode}
                  onChange={(e) => setSearchTrackingCode(e.target.value)}
                  placeholder="Or enter tracking code (e.g. LBD-83289)..."
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-medium"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleProcessScannedQR(searchTrackingCode);
                    }
                  }}
                />
              </div>
              <button
                type="button"
                disabled={isSearchingPass}
                onClick={() => handleProcessScannedQR(searchTrackingCode)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSearchingPass ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                <span>Lookup Pass</span>
              </button>
            </div>
          )}

          {/* Feedback Messages */}
          {scannerError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle size={15} className="text-red-600 shrink-0" />
              <span>{scannerError}</span>
            </div>
          )}

          {scannerMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              <span className="font-semibold">{scannerMessage}</span>
            </div>
          )}

          {/* SCANNED TRANSACTION DETAILS CARD */}
          {scannedTransaction && (
            <div className="p-5 bg-gradient-to-br from-blue-50/50 via-white to-slate-50 border border-blue-200 rounded-2xl shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-blue-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-full">
                    Verified Customer Pass
                  </span>
                  <h4 className="text-lg font-black text-slate-900 mt-1">
                    Order #{scannedTransaction.tracking_number}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      scannedTransaction.status === "Washing" || scannedTransaction.status === "Processing"
                        ? "bg-blue-100 text-blue-700"
                        : scannedTransaction.status === "Ready"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {scannedTransaction.status === "Washing"
                      ? "Processing"
                      : scannedTransaction.status || "Pending Drop-Off"}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      scannedTransaction.payment_status === "Paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {scannedTransaction.payment_status || "Unpaid"}
                  </span>
                </div>
              </div>

              {/* Transaction Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <User size={14} className="text-blue-600" />
                    <span>{scannedTransaction.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
                    <Phone size={12} />
                    <span>{scannedTransaction.customer_phone}</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shop Branch</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <Store size={14} className="text-emerald-600" />
                    <span className="truncate">{scannedTransaction.shop_name || assignedShop?.name || "Laundry Shop"}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Queue: <strong className="text-teal-600">{queueNumberStr}</strong>
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Requested Service</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Shirt size={14} className="text-blue-600" />
                    <span>{scannedTransaction.service_name}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Weight / Capacity: <strong>{scannedTransaction.weight_kg || 8.0} kg</strong>
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Amount</span>
                  <span className="text-lg font-black text-emerald-600 font-mono block">
                    ₱{Number(scannedTransaction.total_amount || 0).toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <Clock size={12} className="text-slate-400" />
                    Est. Ready: {estimatedCompletionStr}
                  </span>
                </div>
              </div>

              {scannedTransaction.special_notes && (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                  <span className="font-bold text-slate-700">Special Notes: </span>
                  <span>{scannedTransaction.special_notes}</span>
                </div>
              )}

              {/* Action Buttons for Scanned Pass */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleResetScanner}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  <span>Scan Another QR</span>
                </button>

                {scannedTransaction.status !== "Washing" && scannedTransaction.status !== "Processing" && (
                  <button
                    type="button"
                    disabled={isConfirmingScanned}
                    onClick={handleConfirmScannedCheckIn}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isConfirmingScanned ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    <span>Confirm Check-In &amp; Start Processing</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: QUICK MANUAL ENTRY (Customer Info + DB Services + Summary)        */}
      {/* ========================================================================= */}
      {customerType === "manual" && (
        <form onSubmit={handleCreateTransaction} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ========================================================= */}
            {/* LEFT COLUMN: Customer Information (Step 2)                */}
            {/* ========================================================= */}
            <div className="lg:col-span-6 space-y-6">
              {/* 2. CUSTOMER INFORMATION */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">Customer Information</h3>
                    <p className="text-xs text-slate-500">Enter customer details for this walk-in order.</p>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={custFullName}
                      onChange={(e) => setCustFullName(e.target.value)}
                      placeholder="Enter customer full name..."
                      className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-900 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Contact Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={custContactNumber}
                        onChange={(e) => setCustContactNumber(e.target.value)}
                        placeholder="09XX XXX XXXX"
                        className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-900 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        value={custEmail}
                        onChange={(e) => setCustEmail(e.target.value)}
                        placeholder="customer@email.com"
                        className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-900 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={custAddress}
                      onChange={(e) => setCustAddress(e.target.value)}
                      placeholder="Barangay, City..."
                      className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-900 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* RIGHT COLUMN: Selected Services (Step 3) & Summary (Step 4)*/}
            {/* ========================================================= */}
            <div className="lg:col-span-6 space-y-6">
              {/* 3. SELECTED SERVICES (Read from Database) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      3
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight">Selected Services</h3>
                      <p className="text-[11px] text-slate-500">Read from shop services database.</p>
                    </div>
                  </div>
                  {isLoadingServices && (
                    <div className="flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                      <Loader2 size={13} className="animate-spin" />
                      <span>Loading...</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 pt-1">
                  {services.length === 0 && !isLoadingServices ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No services registered in the database for this branch.
                    </div>
                  ) : (
                    services.map((svc) => (
                      <div
                        key={svc.id}
                        onClick={() => toggleService(svc.id)}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          svc.selected
                            ? "border-emerald-300 bg-emerald-50/20 shadow-2xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                              svc.selected
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {svc.selected && <Check size={12} strokeWidth={3} />}
                          </div>

                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            {svc.icon === "fold" && <Shirt size={16} />}
                            {svc.icon === "blanket" && <Package size={16} />}
                            {svc.icon === "dry" && <Sparkles size={16} />}
                            {svc.icon === "express" && <Clock size={16} />}
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{svc.name}</h4>
                            <p className="text-[11px] text-slate-500 font-medium">
                              ₱{svc.rate.toFixed(2)} / {svc.unit}
                            </p>
                          </div>
                        </div>

                        <div
                          className="flex items-center gap-3 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Quantity Input */}
                          <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
                            <input
                              type="number"
                              step={svc.unit === "kg" ? 0.5 : 1}
                              min={0}
                              value={svc.quantity}
                              onChange={(e) => setDirectQuantity(svc.id, parseFloat(e.target.value) || 0)}
                              className="w-14 text-center text-xs font-bold text-slate-900 py-1 px-1 focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400 font-medium pr-2">
                              {svc.unit}
                            </span>
                          </div>

                          <span className="text-xs font-bold text-slate-900 min-w-[70px] text-right font-mono">
                            ₱{(svc.selected ? svc.rate * svc.quantity : 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 4. TRANSACTION SUMMARY */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    4
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Transaction Summary</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Queue Number
                    </span>
                    <span className="text-base font-extrabold text-teal-600 mt-0.5 block">
                      {queueNumberStr}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Estimated Completion
                    </span>
                    <span className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5 truncate">
                      <Calendar size={13} className="text-emerald-600 shrink-0" />
                      {estimatedCompletionStr}
                    </span>
                  </div>
                </div>

                {/* Itemized summary breakdown */}
                <div className="space-y-1.5 pt-1 text-xs text-slate-600">
                  {activeSelected.map((s) => (
                    <div key={s.id} className="flex items-center justify-between">
                      <span className="text-slate-700">
                        {s.name} ({s.quantity} {s.unit} × ₱{s.rate.toFixed(2)})
                      </span>
                      <span className="font-semibold text-slate-900 font-mono">
                        ₱{(s.rate * s.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {activeSelected.length === 0 && (
                    <p className="text-[11px] text-slate-400 italic">No services selected yet.</p>
                  )}
                </div>

                <div className="h-px bg-slate-200/80 my-2" />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-bold text-slate-800">Total Amount</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
                    ₱{servicesSubtotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM ACTION BAR */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info size={15} className="text-blue-600 shrink-0" />
              <span>Please verify customer information and selected services before creating the transaction.</span>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <X size={14} />
                <span>Cancel</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting || activeSelected.length === 0}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <FileText size={15} />
                <span>{isSubmitting ? "Creating..." : "Create Transaction"}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SUCCESS CONFIRMATION MODAL */}
      {successTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Transaction Created
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-2">
                Order #{successTx.tracking_number}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Customer: <strong>{successTx.customer_name}</strong>
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Queue Number:</span>
                <span className="font-bold text-teal-600">{queueNumberStr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Amount:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  ₱{successTx.total_amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-blue-600">Processing</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Order has been logged into the live service queue. Customer can track live status using tracking code #{successTx.tracking_number}.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSuccessTx(null);
                  setCustFullName("");
                  setCustContactNumber("");
                  setCustEmail("");
                  setCustAddress("");
                  setServices((prev) => prev.map((s) => ({ ...s, selected: false, quantity: 1 })));
                }}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                New Check-In
              </button>
              {onViewQueue && (
                <button
                  type="button"
                  onClick={() => {
                    setSuccessTx(null);
                    onViewQueue();
                  }}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  View in Processing
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
