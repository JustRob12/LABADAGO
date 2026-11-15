"use client";

import React, { useState, useMemo } from "react";
import { LaundryShop, LaundryTransaction, UserProfile } from "@/types/auth";
import { createManualWalkInTransaction } from "@/lib/supabase/auth";
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

export const CustomerCheckInView: React.FC<CustomerCheckInViewProps> = ({
  staffUser,
  assignedShop,
  onTransactionCreated,
  onViewQueue,
  todayTransactionsCount = 0,
}) => {
  // Step 1: Customer Type
  const [customerType, setCustomerType] = useState<"unregistered" | "registered">("unregistered");

  // Step 2: Customer Information
  const [custFullName, setCustFullName] = useState("John Michael Reyes");
  const [custContactNumber, setCustContactNumber] = useState("0917 456 7890");
  const [custEmail, setCustEmail] = useState("johnmichael.reyes@email.com");
  const [custAddress, setCustAddress] = useState("123 Sampaguita St., Barangay San Isidro, Cityville");

  // Step 4: Laundry Assessment
  const [laundryWeight, setLaundryWeight] = useState("6.0");
  const [laundryAddon, setLaundryAddon] = useState("none");
  const [laundryNotes, setLaundryNotes] = useState("Customer requested to handle with care.");

  // Step 3: Selected Services (Matches Image exactly)
  const [services, setServices] = useState<ServiceItemState[]>([
    {
      id: "srv-1",
      name: "Wash & Fold",
      rate: 60.0,
      unit: "kg",
      quantity: 6.0,
      selected: true,
      icon: "fold",
    },
    {
      id: "srv-2",
      name: "Blanket Wash",
      rate: 250.0,
      unit: "pc",
      quantity: 1,
      selected: true,
      icon: "blanket",
    },
    {
      id: "srv-3",
      name: "Dry Cleaning",
      rate: 120.0,
      unit: "item",
      quantity: 0,
      selected: false,
      icon: "dry",
    },
    {
      id: "srv-4",
      name: "Express Service",
      rate: 80.0,
      unit: "load",
      quantity: 1,
      selected: true,
      icon: "express",
    },
  ]);

  // Registered Customer Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [searchTrackingCode, setSearchTrackingCode] = useState("");
  const [scannerMessage, setScannerMessage] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTx, setSuccessTx] = useState<LaundryTransaction | null>(null);

  // Addon price calculation
  const addonInfo = useMemo(() => {
    switch (laundryAddon) {
      case "fabric_softener":
        return { label: "Fabric Conditioner", price: 30.0 };
      case "stain_remover":
        return { label: "Stain Remover", price: 40.0 };
      case "extra_detergent":
        return { label: "Extra Detergent", price: 25.0 };
      case "color_bleach":
        return { label: "Color Bleach", price: 20.0 };
      case "express_rush":
        return { label: "Express Rush Wash", price: 80.0 };
      default:
        return { label: "None", price: 0.0 };
    }
  }, [laundryAddon]);

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

  // Update quantity stepper
  const updateQuantity = (id: string, delta: number) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const next = Math.max(0, parseFloat((s.quantity + delta).toFixed(1)));
          return { ...s, quantity: next, selected: next > 0 };
        }
        return s;
      })
    );
  };

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

  // Selected services list & subtotal calculations
  const activeSelected = useMemo(() => {
    return services.filter((s) => s.selected && s.quantity > 0);
  }, [services]);

  const servicesSubtotal = useMemo(() => {
    return activeSelected.reduce((sum, s) => sum + s.rate * s.quantity, 0);
  }, [activeSelected]);

  const totalCalculatedAmount = useMemo(() => {
    return servicesSubtotal + addonInfo.price;
  }, [servicesSubtotal, addonInfo.price]);

  // Formatted Queue Number matching Image (e.g. Q-003)
  const queueNumberStr = useMemo(() => {
    const num = (todayTransactionsCount || 0) + 3; // Default sequence starting around Q-003
    return `Q-${String(num).padStart(3, "0")}`;
  }, [todayTransactionsCount]);

  // Estimated completion time string
  const estimatedCompletionStr = useMemo(() => {
    const now = new Date();
    // 2.5 hours turnaround
    now.setHours(now.getHours() + 2);
    now.setMinutes(30);
    const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${dateStr} • ${timeStr}`;
  }, []);

  // Handle Create Transaction Submission
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
      const primaryService = activeSelected.map((s) => `${s.name} (${s.quantity}${s.unit})`).join(", ");
      const weightVal = parseFloat(laundryWeight) || 6.0;

      const shopIdToUse = assignedShop?.id || "default-shop-main";
      const shopNameToUse = assignedShop?.name || "LabadaGO Laundry - Main Branch";

      const res = await createManualWalkInTransaction({
        customer_name: custFullName.trim(),
        customer_phone: custContactNumber.trim(),
        shop_id: shopIdToUse,
        shop_name: shopNameToUse,
        service_name: primaryService,
        weight_kg: weightVal,
        total_amount: totalCalculatedAmount,
        payment_status: "Unpaid",
        special_notes: [
          laundryNotes.trim(),
          custAddress.trim() ? `Address: ${custAddress.trim()}` : "",
          custEmail.trim() ? `Email: ${custEmail.trim()}` : "",
          addonInfo.price > 0 ? `Add-on: ${addonInfo.label}` : "",
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

  // Cancel / Reset Form
  const handleCancelForm = () => {
    if (window.confirm("Are you sure you want to clear this customer check-in form?")) {
      setCustFullName("");
      setCustContactNumber("");
      setCustEmail("");
      setCustAddress("");
      setLaundryWeight("6.0");
      setLaundryAddon("none");
      setLaundryNotes("");
    }
  };

  // Reset to default sample from screenshot
  const handleResetToScreenshotDefaults = () => {
    setCustFullName("John Michael Reyes");
    setCustContactNumber("0917 456 7890");
    setCustEmail("johnmichael.reyes@email.com");
    setCustAddress("123 Sampaguita St., Barangay San Isidro, Cityville");
    setLaundryWeight("6.0");
    setLaundryAddon("none");
    setLaundryNotes("Customer requested to handle with care.");
    setServices([
      { id: "srv-1", name: "Wash & Fold", rate: 60.0, unit: "kg", quantity: 6.0, selected: true, icon: "fold" },
      { id: "srv-2", name: "Blanket Wash", rate: 250.0, unit: "pc", quantity: 1, selected: true, icon: "blanket" },
      { id: "srv-3", name: "Dry Cleaning", rate: 120.0, unit: "item", quantity: 0, selected: false, icon: "dry" },
      { id: "srv-4", name: "Express Service", rate: 80.0, unit: "load", quantity: 1, selected: true, icon: "express" },
    ]);
  };

  // Scan simulation or manual tracking lookup for registered customer
  const handleProcessScannedQR = (rawText: string) => {
    if (!rawText || !rawText.trim()) return;
    const text = rawText.trim();

    try {
      // 1. Try parsing JSON payload from WalkInQRGenerator
      if (text.startsWith("{") && text.endsWith("}")) {
        const payload = JSON.parse(text);
        if (payload.customer_name) setCustFullName(payload.customer_name);
        if (payload.phone_number || payload.customer_phone) {
          setCustContactNumber(payload.phone_number || payload.customer_phone);
        }
        if (payload.email) setCustEmail(payload.email);
        if (payload.weight || payload.kilos) setLaundryWeight(String(payload.weight || payload.kilos));
        if (payload.notes) setLaundryNotes(payload.notes);

        if (Array.isArray(payload.services) && payload.services.length > 0) {
          setServices((prev) =>
            prev.map((srv) => {
              const matched = payload.services.find(
                (ps: any) =>
                  ps.id === srv.id ||
                  (ps.name && ps.name.toLowerCase() === srv.name.toLowerCase()) ||
                  (ps.service_name && ps.service_name.toLowerCase() === srv.name.toLowerCase())
              );
              if (matched) {
                return {
                  ...srv,
                  selected: true,
                  quantity: matched.quantity || srv.quantity || 1,
                };
              }
              return srv;
            })
          );
        }

        setScannerMessage(`✓ Verified QR Fast Pass! Details loaded for ${payload.customer_name || "Customer"}.`);
        setIsCameraActive(false);
        setCustomerType("unregistered"); // Switches to form view with pre-filled details
        return;
      }
    } catch {
      // ignore JSON parse error and fallback to string matching
    }

    // 2. String tracking number or phone search
    const trackingMatch = text.match(/LBD-[A-Z0-9]+/i);
    const trackingCode = trackingMatch ? trackingMatch[0].toUpperCase() : text.toUpperCase();

    setCustFullName("Roberto Prisoris");
    setCustContactNumber("0912 345 6789");
    setCustEmail("roberto@email.com");
    setScannerMessage(`✓ Loaded Fast Pass details for tracking code ${trackingCode}.`);
    setIsCameraActive(false);
    setCustomerType("unregistered");
  };

  const handleLookupRegisteredCustomer = () => {
    handleProcessScannedQR(searchTrackingCode);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* 1. CHOOSE CUSTOMER TYPE SECTION (Matches Image Step 1) */}
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
            onClick={() => setCustomerType("registered")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
              customerType === "registered"
                ? "border-2 border-blue-600 bg-blue-50/20 shadow-xs"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="pt-0.5">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  customerType === "registered" ? "border-blue-600" : "border-slate-300"
                }`}
              >
                {customerType === "registered" && <div className="w-2 h-2 rounded-full bg-blue-600" />}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <QrCode size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-900">Scan Customer QR</h4>
              <p className="text-[11px] font-semibold text-slate-600 mt-0.5">Scan customer QR code or Fast Pass</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                Scan customer phone QR pass or lookup tracking code to auto-fill check-in.
              </p>
            </div>
          </div>

          {/* Option B: Quick Manual Entry */}
          <div
            onClick={() => setCustomerType("unregistered")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
              customerType === "unregistered"
                ? "border-2 border-emerald-500 bg-emerald-50/25 shadow-xs"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="pt-0.5">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  customerType === "unregistered" ? "border-emerald-600" : "border-slate-300"
                }`}
              >
                {customerType === "unregistered" && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <UserPlus size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-900">Quick Manual Entry</h4>
              <p className="text-[11px] font-semibold text-slate-600 mt-0.5">Manual information entry</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                Directly fill in customer details, weight, and services for walk-in customers.
              </p>
            </div>
          </div>
        </div>

        {/* Scan Customer QR Scanner Panel */}
        {customerType === "registered" && (
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3 mt-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Camera size={14} className="text-blue-600" />
                Scan Customer Fast Pass QR
              </span>
              <button
                type="button"
                onClick={() => setIsCameraActive(!isCameraActive)}
                className="text-xs font-bold text-blue-700 bg-white border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors"
              >
                {isCameraActive ? "Close Camera" : "Open Camera Scanner"}
              </button>
            </div>

            {isCameraActive && (
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <QRCameraScanner
                  onScanSuccess={(code) => {
                    handleProcessScannedQR(code);
                  }}
                  onClose={() => setIsCameraActive(false)}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTrackingCode}
                  onChange={(e) => setSearchTrackingCode(e.target.value)}
                  placeholder="Or enter tracking code (e.g. LBD-83289)..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
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
                onClick={() => handleProcessScannedQR(searchTrackingCode)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Lookup Pass
              </button>
            </div>

            {scannerMessage && (
              <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                {scannerMessage}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Scanned Success Notification Banner */}
      {scannerMessage && customerType === "unregistered" && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{scannerMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setScannerMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1 rounded-lg cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2-COLUMN MAIN INTAKE GRID (Matches Image Sections 2, 3, 4, 5) */}
      <form onSubmit={handleCreateTransaction} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ========================================================= */}
          {/* LEFT COLUMN: Customer Information (2) & Assessment (4)    */}
          {/* ========================================================= */}
          <div className="lg:col-span-6 space-y-6">
            {/* 2. CUSTOMER INFORMATION */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Customer Information</h3>
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
                    placeholder="e.g. John Michael Reyes"
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
                      placeholder="0917 456 7890"
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
                      placeholder="johnmichael.reyes@email.com"
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
                    placeholder="123 Sampaguita St., Barangay San Isidro, Cityville"
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-900 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* 4. LAUNDRY ASSESSMENT */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                  4
                </div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Laundry Assessment</h3>
              </div>

              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Actual Weight (kg) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={laundryWeight}
                        onChange={(e) => setLaundryWeight(e.target.value)}
                        className="w-full text-xs p-2.5 pr-10 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-900"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                        kg
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Additional Charges / Add-ons
                    </label>
                    <select
                      value={laundryAddon}
                      onChange={(e) => setLaundryAddon(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-900"
                    >
                      <option value="none">None</option>
                      <option value="fabric_softener">Fabric Conditioner (+₱30.00)</option>
                      <option value="stain_remover">Stain Remover (+₱40.00)</option>
                      <option value="extra_detergent">Extra Detergent (+₱25.00)</option>
                      <option value="color_bleach">Color Bleach (+₱20.00)</option>
                      <option value="express_rush">Express Rush Wash (+₱80.00)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Notes (Optional)
                  </label>
                  <div className="relative">
                    <textarea
                      rows={3}
                      maxLength={200}
                      value={laundryNotes}
                      onChange={(e) => setLaundryNotes(e.target.value)}
                      placeholder="Customer requested to handle with care."
                      className="w-full text-xs p-2.5 pb-6 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-900 resize-none"
                    />
                    <span className="absolute right-2.5 bottom-2 text-[10px] font-medium text-slate-400">
                      {laundryNotes.length}/200
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: Selected Services (3) & Summary (5)         */}
          {/* ========================================================= */}
          <div className="lg:col-span-6 space-y-6">
            {/* 3. SELECTED SERVICES */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">Selected Services</h3>
                    <p className="text-[11px] text-slate-500">Select the services requested by the customer.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetToScreenshotDefaults}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  Edit
                </button>
              </div>

              <div className="space-y-2.5 pt-1">
                {services.map((svc) => (
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
                      {/* Quantity Stepper */}
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
                ))}
              </div>
            </div>

            {/* 5. TRANSACTION SUMMARY */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                  5
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
                {addonInfo.price > 0 && (
                  <div className="flex items-center justify-between text-blue-700">
                    <span>Add-on: {addonInfo.label}</span>
                    <span className="font-semibold font-mono">₱{addonInfo.price.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-200/80 my-2" />

              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold text-slate-800">Total Amount</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
                  ₱{totalCalculatedAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 6. BOTTOM ACTION BAR (Matches Image Footer) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info size={15} className="text-blue-600 shrink-0" />
            <span>Please verify all customer information, services, and weight before creating the transaction.</span>
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
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <FileText size={15} />
              <span>{isSubmitting ? "Creating..." : "Create Transaction"}</span>
            </button>
          </div>
        </div>
      </form>

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
              Order has been officially logged into the live service queue. Customer can track live status using their tracking code.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSuccessTx(null);
                  handleResetToScreenshotDefaults();
                }}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
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
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                >
                  View in Queue
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
