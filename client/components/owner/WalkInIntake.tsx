"use client";

import React, { useState, useEffect } from "react";
import { PaymentStatus, LaundryTransaction, OrderStatus, WalkInQRPayload, LaundryShop, UserRole } from "@/types/auth";
import {
  updateTransactionStatus,
  updateTransactionPayment,
  getTransactionByTrackingNumber,
  uploadPaymentProof,
  createManualWalkInTransaction,
} from "@/lib/supabase/auth";
import { PaymentInputSection } from "@/components/payment/PaymentInputSection";
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
  Receipt,
  Smartphone,
  Loader2,
  FileText,
  PlusCircle,
  UserCheck,
} from "lucide-react";
import { PaymentRecordModal } from "@/components/payment/PaymentRecordModal";
import { PaymentProofModal } from "@/components/payment/PaymentProofModal";
import { CustomerCheckInView } from "@/components/staff/CustomerCheckInView";

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

  // Manual payment record & proof preview modal states
  const [paymentRecordTx, setPaymentRecordTx] = useState<LaundryTransaction | null>(null);
  const [proofModalTx, setProofModalTx] = useState<LaundryTransaction | null>(null);

  // Scanned intake payment state (Cash or GCash Receipt Photo)
  const [intakePaymentMethod, setIntakePaymentMethod] = useState<"Cash" | "GCash">("Cash");
  const [intakeReferenceNo, setIntakeReferenceNo] = useState("");
  const [intakeFile, setIntakeFile] = useState<File | null>(null);
  const [intakePreviewUrl, setIntakePreviewUrl] = useState<string | null>(null);
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);

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

  // Filter out unscanned pending walk-in passes from the owner's intake queue & total order count
  const scannedTransactions = transactions.filter((t) => t.status !== "Pending");


  // Intake Mode State: Customer Check-In or Transactions Queue
  const [entryMode, setEntryMode] = useState<"checkin" | "transactions">("checkin");
  const [manualCustomerName, setManualCustomerName] = useState("");
  const [manualCustomerPhone, setManualCustomerPhone] = useState("");
  const [manualService, setManualService] = useState("Wash, Dry & Fold");
  const [manualLoads, setManualLoads] = useState("1");
  const [manualMachineNumber, setManualMachineNumber] = useState("");
  const [manualSpecialNotes, setManualSpecialNotes] = useState("");
  const [manualPaymentTiming, setManualPaymentTiming] = useState<"pay_first" | "pay_on_complete">("pay_on_complete");
  const [manualPaymentMethod, setManualPaymentMethod] = useState<"Cash" | "GCash">("Cash");
  const [manualReferenceNo, setManualReferenceNo] = useState("");
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualPreviewUrl, setManualPreviewUrl] = useState<string | null>(null);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Available services list for current counter shop
  const activeServices = activeOperatingShop?.services && activeOperatingShop.services.length > 0
    ? activeOperatingShop.services
    : [
        { id: "s-1", service_name: "Wash, Dry & Fold", price: 200, unit: "load", kilos: 8 },
        { id: "s-2", service_name: "Wash & Dry", price: 160, unit: "load", kilos: 8 },
        { id: "s-3", service_name: "Wash Only", price: 70, unit: "load", kilos: 8 },
        { id: "s-4", service_name: "Dry Only", price: 70, unit: "load", kilos: 8 },
        { id: "s-5", service_name: "Blanket & Comforter", price: 180, unit: "load", kilos: 8 },
      ];

  const currentManualServiceObj = activeServices.find((s) => s.service_name === manualService) || activeServices[0];
  const manualLoadsNum = Math.max(1, parseInt(manualLoads) || 1);
  const manualRatePerLoad = currentManualServiceObj?.price || 200;
  const manualTotalAmount = manualLoadsNum * manualRatePerLoad;
  const manualCapacityKg = manualLoadsNum * (currentManualServiceObj?.kilos || 8);

  const handleManualIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCustomerName.trim()) {
      alert("Please enter customer name.");
      return;
    }
    if (!manualCustomerPhone.trim()) {
      alert("Please enter customer phone number.");
      return;
    }
    if (!activeOperatingShop) {
      alert("Please select an operating shop counter.");
      return;
    }

    setIsSubmittingManual(true);
    try {
      const isPayFirst = manualPaymentTiming === "pay_first";
      let uploadedProofUrl: string | undefined = undefined;
      if (isPayFirst && manualPaymentMethod === "GCash" && manualFile) {
        uploadedProofUrl = await uploadPaymentProof(
          manualFile,
          `manual-${Date.now()}`
        );
      }

      const res = await createManualWalkInTransaction({
        customer_name: manualCustomerName.trim(),
        customer_phone: manualCustomerPhone.trim(),
        shop_id: activeOperatingShop.id,
        shop_name: activeOperatingShop.name,
        service_name: manualService,
        weight_kg: manualCapacityKg,
        total_amount: manualTotalAmount,
        payment_status: isPayFirst ? "Paid" : "Unpaid",
        payment_method: isPayFirst ? manualPaymentMethod : undefined,
        payment_proof_url: uploadedProofUrl,
        payment_reference_no: isPayFirst ? manualReferenceNo.trim() || undefined : undefined,
        machine_number: manualMachineNumber.trim() || undefined,
        special_notes: manualSpecialNotes.trim() || undefined,
      });

      if (res.success) {
        setIntakeSuccess(
          `Manual Walk-In recorded! Tracking #${res.transaction.tracking_number} for ${res.transaction.customer_name} is now PROCESSING (${manualLoadsNum} ${manualLoadsNum === 1 ? "load" : "loads"}, ₱${manualTotalAmount.toFixed(2)}).`
        );
        setSmsNotification(
          `SMS sent to ${res.transaction.customer_phone}: "LabadaGo: Your laundry order (${res.transaction.tracking_number}) has been registered and is now PROCESSING at ${activeOperatingShop.name}!"`
        );

        // Reset manual form
        setManualCustomerName("");
        setManualCustomerPhone("");
        setManualMachineNumber("");
        setManualSpecialNotes("");
        setManualLoads("1");
        setManualPaymentTiming("pay_on_complete");
        setManualPaymentMethod("Cash");
        setManualReferenceNo("");
        setManualFile(null);
        if (manualPreviewUrl) URL.revokeObjectURL(manualPreviewUrl);
        setManualPreviewUrl(null);
        setEntryMode("transactions"); // Switch to live orders view

        onTransactionsUpdated();
      } else {
        alert("Failed to save manual intake. Please try again.");
      }
    } catch (err) {
      console.error("Manual intake error:", err);
      alert("Error saving manual walk-in entry.");
    } finally {
      setIsSubmittingManual(false);
    }
  };

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
      return cleanTxCode === cleanQuery || t.tracking_number.toUpperCase() === trackingNumToFind.toUpperCase();
    });

    // 2. Look up the transaction in the database to check its global shop affiliation
    const { transaction: dbTx } = await getTransactionByTrackingNumber(trackingNumToFind);
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
        await updateTransactionStatus(matchedTx.id, "Washing");
        matchedTx.status = "Washing";
        setIntakeSuccess(
          `QR Scanned! Clothes for ${matchedTx.customer_name} (${matchedTx.tracking_number}) verified and tagged as PROCESSING.`
        );
        setSmsNotification(
          `SMS sent to ${matchedTx.customer_phone}: "LabadaGo: Your laundry (${matchedTx.tracking_number}) has been SCANNED and is now PROCESSING at the counter!"`
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
        status: "Washing", // Counter scan confirms clothes received and tags as Processing!
        payment_status: "Unpaid",
        is_walkin: true,
        special_notes: parsedPayload.specialNotes || "",
        created_at: parsedPayload.createdAt || new Date().toISOString(),
      };
      await updateTransactionStatus(reconstructed.tracking_number, "Washing");
      setScannedTx(reconstructed);
      setActualWeight(String(reconstructed.weight_kg));
      setSelectedPaymentTiming("pay_on_complete");
      setScanInput(reconstructed.tracking_number);
      setIntakeSuccess(
        `QR Scanned! Clothes for ${reconstructed.customer_name} (${reconstructed.tracking_number}) verified and tagged as PROCESSING.`
      );
      setSmsNotification(
        `SMS sent to ${reconstructed.customer_phone}: "LabadaGo: Your laundry (${reconstructed.tracking_number}) has been SCANNED at the counter and is now PROCESSING!"`
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
      ? `Paid at counter (${intakePaymentMethod}) upon drop-off`
      : "Pay when complete / upon pickup";

    setIsSubmittingIntake(true);
    try {
      let uploadedProofUrl: string | undefined = undefined;
      if (isPayFirst && intakePaymentMethod === "GCash" && intakeFile) {
        uploadedProofUrl = await uploadPaymentProof(
          intakeFile,
          scannedTx.tracking_number
        );
      }

      const targetId = scannedTx.id || scannedTx.tracking_number;
      await updateTransactionStatus(
        targetId,
        "Washing",
        validWeight,
        paymentStatus,
        calculatedTotal,
        paymentNote,
        machineNumber.trim() || undefined,
        undefined,
        undefined,
        isPayFirst ? intakePaymentMethod : undefined,
        uploadedProofUrl,
        isPayFirst ? intakeReferenceNo.trim() || undefined : undefined
      );

      setIntakeSuccess(
        `Clothes for ${scannedTx.customer_name} (${scannedTx.tracking_number}) confirmed as PROCESSING at scale weight ${validWeight}kg${
          machineNumber ? ` (Assigned to ${machineNumber})` : ""
        }. Payment: ${
          isPayFirst
            ? `PAID via ${intakePaymentMethod} (₱${calculatedTotal.toFixed(2)})`
            : "PAY ON PICKUP (₱" + calculatedTotal.toFixed(2) + ")"
        }.`
      );
      setSmsNotification(
        `SMS sent to ${scannedTx.customer_phone}: "LabadaGo: Your laundry (${scannedTx.tracking_number}) has been received at ${validWeight}kg${
          machineNumber ? ` (${machineNumber})` : ""
        } and is now PROCESSING! Payment: ${
          isPayFirst
            ? `PAID via ${intakePaymentMethod} (₱${calculatedTotal.toFixed(2)})`
            : "PAY UPON PICKUP (₱" + calculatedTotal.toFixed(2) + ")"
        }."`
      );

      setScannedTx(null);
      setScanInput("");
      setMachineNumber("");
      setIntakePaymentMethod("Cash");
      setIntakeReferenceNo("");
      setIntakeFile(null);
      if (intakePreviewUrl) URL.revokeObjectURL(intakePreviewUrl);
      setIntakePreviewUrl(null);
      if (typeof window !== "undefined") {
        localStorage.setItem("labadago_last_tx_update", Date.now().toString());
        window.dispatchEvent(new CustomEvent("labadago:transaction-updated"));
      }
      onTransactionsUpdated();
    } catch {
      setIntakeSuccess("Error saving received intake. Please try again.");
    } finally {
      setIsSubmittingIntake(false);
    }
  };

  const handleConfirmIntake = async () => {
    if (!scannedTx) return;

    const isPayFirst = selectedPaymentTiming === "pay_first";
    const paymentStatus: PaymentStatus = isPayFirst ? "Paid" : "Unpaid";
    const paymentNote = isPayFirst
      ? `Paid at counter (${intakePaymentMethod}) upon intake`
      : "Pay when complete / upon pickup";

    setIsSubmittingIntake(true);
    try {
      let uploadedProofUrl: string | undefined = undefined;
      if (isPayFirst && intakePaymentMethod === "GCash" && intakeFile) {
        uploadedProofUrl = await uploadPaymentProof(
          intakeFile,
          scannedTx.tracking_number
        );
      }

      const targetId = scannedTx.id || scannedTx.tracking_number;
      await updateTransactionStatus(
        targetId,
        "Washing",
        validWeight,
        paymentStatus,
        calculatedTotal,
        paymentNote,
        machineNumber.trim() || undefined,
        undefined,
        undefined,
        isPayFirst ? intakePaymentMethod : undefined,
        uploadedProofUrl,
        isPayFirst ? intakeReferenceNo.trim() || undefined : undefined
      );

      setIntakeSuccess(
        `Walk-in load for ${scannedTx.customer_name} accepted! Weighed at ${validWeight}kg${
          machineNumber ? ` in ${machineNumber}` : ""
        }. Status updated to Processing. Payment: ${
          isPayFirst
            ? `PAID via ${intakePaymentMethod} (₱${calculatedTotal.toFixed(2)})`
            : "PAY ON PICKUP (₱" + calculatedTotal.toFixed(2) + ")"
        }.`
      );
      setSmsNotification(
        `SMS Notification sent to ${scannedTx.customer_phone}: "LabadaGo: Your laundry (${scannedTx.tracking_number}) has been weighed (${validWeight}kg)${
          machineNumber ? ` and is in ${machineNumber}` : ""
        } and is now PROCESSING! Payment: ${
          isPayFirst
            ? `PAID via ${intakePaymentMethod} (₱${calculatedTotal.toFixed(2)})`
            : "PAY UPON PICKUP (₱" + calculatedTotal.toFixed(2) + ")"
        }."`
      );

      setScannedTx(null);
      setScanInput("");
      setMachineNumber("");
      setIntakePaymentMethod("Cash");
      setIntakeReferenceNo("");
      setIntakeFile(null);
      if (intakePreviewUrl) URL.revokeObjectURL(intakePreviewUrl);
      setIntakePreviewUrl(null);
      if (typeof window !== "undefined") {
        localStorage.setItem("labadago_last_tx_update", Date.now().toString());
        window.dispatchEvent(new CustomEvent("labadago:transaction-updated"));
      }
      onTransactionsUpdated();
    } catch {
      setIntakeSuccess("Error saving order intake. Please try again.");
    } finally {
      setIsSubmittingIntake(false);
    }
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

      {/* Counter Walk-In QR Scanner & Manual Intake Tool */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <ScanLine size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Counter Walk-In Intake &amp; Verification
              </h3>
              <p className="text-xs text-slate-500">
                Scan customer&apos;s phone QR pass or manually register a walk-in customer
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
          </div>
        </div>

        {/* Entry Mode Switcher Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit flex-wrap">
          <button
            type="button"
            onClick={() => setEntryMode("checkin")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              entryMode === "checkin"
                ? "bg-blue-600 text-white shadow-2xs font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserCheck size={14} />
            <span>Customer Check-In</span>
          </button>
          <button
            type="button"
            onClick={() => setEntryMode("transactions")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              entryMode === "transactions"
                ? "bg-blue-600 text-white shadow-2xs font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText size={14} />
            <span>Transactions ({scannedTransactions.length})</span>
          </button>
        </div>

        {/* MODE 0: FULL CUSTOMER CHECK-IN (Matches Screenshot UI) */}
        {entryMode === "checkin" && (
          <div className="pt-2">
            <CustomerCheckInView
              staffUser={{
                id: activeOperatingShop?.owner_id || "owner-counter",
                full_name: "Shop Counter Staff",
                email: "",
                phone_number: "",
                date_of_birth: "",
                gender: "Prefer not to say",
                role: UserRole.OWNER,
                created_at: "",
              }}
              assignedShop={activeOperatingShop || currentShop || null}
              onTransactionCreated={(tx) => {
                onTransactionsUpdated();
                setIntakeSuccess(
                  `Transaction #${tx.tracking_number} created for ${tx.customer_name}! Status is now Processing.`
                );
              }}
              todayTransactionsCount={scannedTransactions.length}
              onViewQueue={() => setEntryMode("transactions")}
            />
          </div>
        )}

      </div>

      {/* Live Service Transactions Table (Hidden below Customer Check-In; shown only in Transactions view) */}
      {entryMode === "transactions" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Live Service Queue & Transactions</h3>
            <p className="text-xs text-slate-500">
              Update service progress and trigger automated customer notifications.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            {scannedTransactions.length} Total Orders
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Tracking</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Service</th>
                <th className="py-2.5 px-3">Loads</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scannedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No active processed orders yet. Scan customer QR passes or enter walk-in details above to populate the queue.
                  </td>
                </tr>
              ) : (
                scannedTransactions.map((tx) => (
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
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {Math.max(1, Math.round(tx.weight_kg / 8))} {Math.max(1, Math.round(tx.weight_kg / 8)) === 1 ? "load" : "loads"}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">₱{tx.total_amount.toFixed(2)}</td>
                    <td className="py-3 px-3">
                      {tx.payment_status === "Paid" ? (
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-0.5 rounded-md border text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 w-fit">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            Paid {tx.payment_method ? `(${tx.payment_method})` : ""}
                          </span>
                          {tx.payment_proof_url && (
                            <button
                              type="button"
                              onClick={() => setProofModalTx(tx)}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer w-fit"
                              title="View uploaded transfer receipt"
                            >
                              <Receipt size={11} />
                              View Proof
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-0.5 rounded-md border text-[11px] font-semibold bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 w-fit">
                            <Clock size={11} className="text-amber-600" />
                            Unpaid
                          </span>
                          <button
                            type="button"
                            onClick={() => setPaymentRecordTx(tx)}
                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 underline text-left cursor-pointer flex items-center gap-1"
                            title="Record Cash or GCash payment"
                          >
                            <Banknote size={11} />
                            Receive Pay ✓
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {tx.status === "Ready" ? (
                        <span className="px-2 py-0.5 rounded-md border text-[11px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 w-fit">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          Ready to Pick Up
                        </span>
                      ) : tx.status === "Completed" ? (
                        <span className="px-2 py-0.5 rounded-md border text-[11px] font-semibold bg-slate-100 text-slate-700 border-slate-200 flex items-center gap-1 w-fit">
                          <CheckCircle2 size={11} className="text-slate-600" />
                          Completed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md border text-[11px] font-bold bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 w-fit">
                          <Loader2 size={11} className="text-blue-600 animate-spin" />
                          Processing
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <select
                        value={
                          tx.status === "Ready"
                            ? "Ready"
                            : tx.status === "Completed"
                            ? "Completed"
                            : "Processing"
                        }
                        onChange={(e) => {
                          const val = e.target.value as "Processing" | "Ready" | "Completed";
                          handleStatusChange(tx.id, val === "Processing" ? "Washing" : val);
                        }}
                        className="h-7 px-2 text-xs rounded-md border border-slate-300 bg-white font-semibold text-slate-800 shadow-2xs focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Processing">Processing</option>
                        <option value="Ready">Ready to Pick Up</option>
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
      )}

      {/* ========================================================================= */}
      {/* SHOP MISMATCH WARNING MODAL                                               */}
      {/* ========================================================================= */}
      {showMismatchModal && mismatchData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full max-h-[92dvh] flex flex-col overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="bg-rose-50 border-b border-rose-100 p-4 sm:p-5 flex items-start gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-200/80 text-rose-900 mb-1">
                  Shop Mismatch Warning
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
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
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
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
            <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
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

      {/* Manual Payment Record Modal (Cash / GCash Proof Upload) */}
      <PaymentRecordModal
        isOpen={!!paymentRecordTx}
        transaction={paymentRecordTx}
        onClose={() => setPaymentRecordTx(null)}
        onSuccess={() => {
          setIntakeSuccess(`Payment recorded for order #${paymentRecordTx?.tracking_number}!`);
          setPaymentRecordTx(null);
          onTransactionsUpdated();
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
