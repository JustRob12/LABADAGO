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


  // Intake Mode State (Full Customer Check-In, Scan Fast Pass QR, or Quick Manual)
  const [entryMode, setEntryMode] = useState<"checkin" | "scan" | "manual">("checkin");
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
        setEntryMode("scan"); // Switch to live orders view

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
      await updateTransactionStatus(reconstructed.id, "Washing");
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

      await updateTransactionStatus(
        scannedTx.id,
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

      await updateTransactionStatus(
        scannedTx.id,
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
            onClick={() => setEntryMode("scan")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              entryMode === "scan"
                ? "bg-white text-blue-700 shadow-2xs font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ScanLine size={14} />
            <span>Scan Customer QR</span>
          </button>
          <button
            type="button"
            onClick={() => setEntryMode("manual")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              entryMode === "manual"
                ? "bg-white text-emerald-700 shadow-2xs font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText size={14} />
            <span>Quick Manual Entry</span>
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
            />
          </div>
        )}

        {/* MODE 1: QR SCANNER */}
        {entryMode === "scan" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Scan customer&apos;s QR code with device camera or enter their tracking number.
              </p>
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

            {/* Live Camera QR Viewfinder */}
            {isCameraActive && (
              <div className="mt-2">
                <QRCameraScanner
                  onScanSuccess={(decodedText) => {
                    setIsCameraActive(false);
                    processCodeOrPayload(decodedText);
                  }}
                  onClose={() => setIsCameraActive(false)}
                  incomingPasses={transactions.map((t) => ({
                    tracking_number: t.tracking_number,
                    customer_name: t.customer_name,
                  }))}
                />
              </div>
            )}

            <form onSubmit={handleLookup} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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
                  {isCameraActive ? "Hide Camera" : "Camera"}
                </Button>
                <Button type="submit" variant="primary" size="md" leftIcon={<ScanLine size={15} />}>
                  Verify Code
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* MODE 2: MANUAL WALK-IN ENTRY FORM */}
        {entryMode === "manual" && (
          <form onSubmit={handleManualIntakeSubmit} className="space-y-4 animate-fadeIn">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-800">
              💡 <strong>Direct Counter Intake:</strong> Register walk-in customers who don&apos;t have a phone QR code. Orders immediately start as <strong>Processing</strong> in the queue.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="Customer Full Name *"
                placeholder="e.g. Maria Santos"
                value={manualCustomerName}
                onChange={(e) => setManualCustomerName(e.target.value)}
                leftIcon={<User size={15} />}
                required
              />
              <Input
                type="tel"
                label="Customer Phone Number *"
                placeholder="09XXXXXXXXX"
                value={manualCustomerPhone}
                onChange={(e) => setManualCustomerPhone(e.target.value)}
                leftIcon={<Phone size={15} />}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Laundry Service *
                </label>
                <select
                  value={manualService}
                  onChange={(e) => setManualService(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  {activeServices.map((srv) => (
                    <option key={srv.id || srv.service_name} value={srv.service_name}>
                      {srv.service_name} — ₱{srv.price}/load ({srv.kilos || 8}kg load)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Number of Loads *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={manualLoads}
                    onChange={(e) => setManualLoads(e.target.value)}
                    className="w-24 h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <span className="text-xs text-slate-500 font-medium">
                    load(s) • Total: <strong className="text-slate-900 text-sm">₱{manualTotalAmount.toFixed(2)}</strong> ({manualCapacityKg} kg allowance)
                  </span>
                </div>
              </div>
            </div>

            {/* Machine Assignment */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Shirt size={14} className="text-blue-600" />
                Machine Number (Optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Washer 1, Dryer 2"
                  value={manualMachineNumber}
                  onChange={(e) => setManualMachineNumber(e.target.value)}
                  className="w-48 h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium focus:border-blue-500 focus:outline-none"
                />
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  {["Washer 1", "Washer 2", "Washer 3", "Dryer 1", "Dryer 2"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setManualMachineNumber(p)}
                      className={`text-[11px] px-2 py-1 rounded-md border font-medium transition-colors ${
                        manualMachineNumber === p
                          ? "bg-blue-100 text-blue-800 border-blue-300 font-bold"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Payment Timing Selection */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CreditCard size={14} className="text-blue-600" />
                Payment Arrangement *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setManualPaymentTiming("pay_first")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    manualPaymentTiming === "pay_first"
                      ? "border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-500 shadow-xs"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      1. Paid Now (Drop-Off)
                    </span>
                    <span className="text-xs font-bold text-emerald-800">₱{manualTotalAmount.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Customer is paying immediately at counter.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setManualPaymentTiming("pay_on_complete")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    manualPaymentTiming === "pay_on_complete"
                      ? "border-amber-500 bg-amber-50/80 ring-1 ring-amber-500 shadow-xs"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Clock size={14} className="text-amber-600" />
                      2. Pay on Pickup (Unpaid)
                    </span>
                    <span className="text-xs font-bold text-amber-800">₱{manualTotalAmount.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Collect payment when clothes are claimed.</p>
                </button>
              </div>
            </div>

            {manualPaymentTiming === "pay_first" && (
              <PaymentInputSection
                theme="light"
                method={manualPaymentMethod}
                onMethodChange={setManualPaymentMethod}
                referenceNo={manualReferenceNo}
                onReferenceNoChange={setManualReferenceNo}
                selectedFile={manualFile}
                previewUrl={manualPreviewUrl}
                onFileSelect={(file) => {
                  setManualFile(file);
                  setManualPreviewUrl(URL.createObjectURL(file));
                }}
                onFileClear={() => {
                  setManualFile(null);
                  if (manualPreviewUrl) URL.revokeObjectURL(manualPreviewUrl);
                  setManualPreviewUrl(null);
                }}
                amount={manualTotalAmount}
              />
            )}

            <Input
              type="text"
              label="Special Instructions / Care (Optional)"
              placeholder="e.g. Separate delicate whites, hypoallergenic detergent"
              value={manualSpecialNotes}
              onChange={(e) => setManualSpecialNotes(e.target.value)}
            />

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="success"
                size="md"
                leftIcon={<PlusCircle size={15} />}
                isLoading={isSubmittingManual}
              >
                Register &amp; Start Processing
              </Button>
            </div>
          </form>
        )}

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

            {/* If Pay First is selected, render PaymentInputSection */}
            {selectedPaymentTiming === "pay_first" && (
              <div className="pt-1 animate-fadeIn">
                <PaymentInputSection
                  theme="light"
                  method={intakePaymentMethod}
                  onMethodChange={setIntakePaymentMethod}
                  referenceNo={intakeReferenceNo}
                  onReferenceNoChange={setIntakeReferenceNo}
                  selectedFile={intakeFile}
                  previewUrl={intakePreviewUrl}
                  onFileSelect={(file) => {
                    setIntakeFile(file);
                    setIntakePreviewUrl(URL.createObjectURL(file));
                  }}
                  onFileClear={() => {
                    setIntakeFile(null);
                    if (intakePreviewUrl) URL.revokeObjectURL(intakePreviewUrl);
                    setIntakePreviewUrl(null);
                  }}
                  amount={calculatedTotal}
                />
              </div>
            )}

            <div className="pt-3 border-t border-blue-200/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setScannedTx(null)}
                className="text-xs order-3 sm:order-1"
                disabled={isSubmittingIntake}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<CheckCircle2 size={14} className="text-blue-600" />}
                onClick={handleKeepAsReceived}
                className="text-xs order-2"
                disabled={isSubmittingIntake}
              >
                Confirm Received Only
              </Button>
              <Button
                type="button"
                variant="success"
                size="sm"
                leftIcon={<Check size={14} />}
                onClick={handleConfirmIntake}
                disabled={isSubmittingIntake}
                className="order-1 sm:order-3"
              >
                {isSubmittingIntake ? "Saving Intake..." : "Accept & Start Processing"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Live Service Transactions Table */}
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
