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
  createManualWalkInTransaction,
  getUnreadMessagesCount,
} from "@/lib/supabase/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QRCameraScanner } from "@/components/owner/QRCameraScanner";
import { CustomerCheckInView } from "./CustomerCheckInView";
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
  LayoutDashboard,
  UserCheck,
  ListOrdered,
  Waves,
  Users,
  Tag,
  BarChart3,
  Bell,
  Settings,
  Store,
  Menu,
  ChevronDown,
  UserPlus,
  Info,
  Calendar,
  MessageSquare,
  Printer,
  Download,
  TrendingUp,
  Filter,
} from "lucide-react";
import { PaymentRecordModal } from "@/components/payment/PaymentRecordModal";
import { PaymentProofModal } from "@/components/payment/PaymentProofModal";
import { PaymentInputSection } from "@/components/payment/PaymentInputSection";
import { ShopMessenger } from "@/components/messaging/ShopMessenger";

interface StaffScannerViewProps {
  staffUser: UserProfile;
  assignedShop: LaundryShop | null;
  initialSidebarTab?: string;
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
  initialSidebarTab,
  onSignOut,
}) => {
  const [transactions, setTransactions] = useState<LaundryTransaction[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [searchCode, setSearchCode] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [activeTab, setActiveTab] = useState<"washing" | "ready" | "completed">("washing");

  // Modern Sidebar Navigation State
  const [currentSidebarTab, setCurrentSidebarTab] = useState<
    "checkin" | "processing" | "transactions" | "dashboard" | "customers" | "services" | "reports" | "notifications" | "settings" | "messages"
  >(initialSidebarTab === "messages" ? "messages" : "checkin");
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [staffUnreadCount, setStaffUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (initialSidebarTab === "messages") {
      setCurrentSidebarTab("messages");
    }
  }, [initialSidebarTab]);

  // Live count of incoming customer inquiries for this staff's assigned shop
  useEffect(() => {
    let isMounted = true;
    async function fetchUnread() {
      if (!staffUser?.id) return;
      try {
        const count = await getUnreadMessagesCount(
          staffUser.id,
          staffUser.role,
          assignedShop?.id
        );
        if (isMounted) setStaffUnreadCount(count);
      } catch {
        // ignore
      }
    }

    fetchUnread();

    const handleUpdate = () => {
      fetchUnread();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("labadago_messages_updated", handleUpdate);
    }

    const interval = setInterval(fetchUnread, 5000);

    return () => {
      isMounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("labadago_messages_updated", handleUpdate);
      }
      clearInterval(interval);
    };
  }, [staffUser?.id, staffUser?.role, assignedShop?.id]);

  // Staff entry mode toggle (Scan vs Manual Walk-in Entry)
  const [entryMode, setEntryMode] = useState<"scan" | "manual">("scan");
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

  // Available services list for assigned shop
  const staffShopServices = assignedShop?.services && assignedShop.services.length > 0
    ? assignedShop.services
    : [
        { id: "s-1", service_name: "Wash, Dry & Fold", price: 200, unit: "load", kilos: 8 },
        { id: "s-2", service_name: "Wash & Dry", price: 160, unit: "load", kilos: 8 },
        { id: "s-3", service_name: "Wash Only", price: 70, unit: "load", kilos: 8 },
        { id: "s-4", service_name: "Dry Only", price: 70, unit: "load", kilos: 8 },
        { id: "s-5", service_name: "Blanket & Comforter", price: 180, unit: "load", kilos: 8 },
      ];

  const currentStaffServiceObj = staffShopServices.find((s) => s.service_name === manualService) || staffShopServices[0];
  const staffLoadsNum = Math.max(1, parseInt(manualLoads) || 1);
  const staffRatePerLoad = currentStaffServiceObj?.price || 200;
  const staffTotalAmount = staffLoadsNum * staffRatePerLoad;
  const staffCapacityKg = staffLoadsNum * (currentStaffServiceObj?.kilos || 8);

  const handleStaffManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCustomerName.trim()) {
      showToast("error", "Please enter customer name.");
      return;
    }
    if (!manualCustomerPhone.trim()) {
      showToast("error", "Please enter customer phone number.");
      return;
    }
    if (!assignedShop) {
      showToast("error", "No assigned laundry shop found.");
      return;
    }

    setIsSubmittingManual(true);
    try {
      const isPayFirst = manualPaymentTiming === "pay_first";
      let uploadedProofUrl: string | undefined = undefined;
      if (isPayFirst && manualPaymentMethod === "GCash" && manualFile) {
        uploadedProofUrl = await uploadPaymentProof(
          manualFile,
          `staff-manual-${Date.now()}`
        );
      }

      const res = await createManualWalkInTransaction({
        customer_name: manualCustomerName.trim(),
        customer_phone: manualCustomerPhone.trim(),
        shop_id: assignedShop.id,
        shop_name: assignedShop.name,
        service_name: manualService,
        weight_kg: staffCapacityKg,
        total_amount: staffTotalAmount,
        payment_status: isPayFirst ? "Paid" : "Unpaid",
        payment_method: isPayFirst ? manualPaymentMethod : undefined,
        payment_proof_url: uploadedProofUrl,
        payment_reference_no: isPayFirst ? manualReferenceNo.trim() || undefined : undefined,
        machine_number: manualMachineNumber.trim() || undefined,
        special_notes: manualSpecialNotes.trim() || undefined,
        staff_id: staffUser.id,
      });

      if (res.success) {
        showToast(
          "success",
          `Walk-In #${res.transaction.tracking_number} recorded for ${res.transaction.customer_name}! Processing ${staffLoadsNum} load(s).`
        );

        // Reset
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
        setEntryMode("scan");
        setActiveTab("washing");

        await loadShopOrders();
      } else {
        showToast("error", "Failed to save walk-in entry.");
      }
    } catch (err) {
      console.error("Staff manual intake error:", err);
      showToast("error", "Error creating manual walk-in entry.");
    } finally {
      setIsSubmittingManual(false);
    }
  };

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

  // Derived order counts for quick counter metrics (unscanned 'Pending' orders do NOT count towards Total Orders)
  const pendingOrders = useMemo(() => transactions.filter((t) => t.status === "Pending"), [transactions]);
  const washingOrders = useMemo(
    () => transactions.filter((t) => ["Received", "Washing", "Drying", "Folding", "Processing"].includes(t.status)),
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
  const totalScannedOrders = useMemo(() => transactions.filter((t) => t.status !== "Pending").length, [transactions]);

  // Reports & Financial Analytics State (Connected to Live Database)
  const [reportRange, setReportRange] = useState<"today" | "yesterday" | "7days" | "month" | "all">("today");
  const [reportStatusFilter, setReportStatusFilter] = useState<"all" | "completed" | "active" | "paid" | "unpaid">("all");
  const [reportSearchQuery, setReportSearchQuery] = useState("");

  // Filtered transactions for the selected report scope
  const reportFilteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const sevenDaysAgoStart = todayStart - 6 * 24 * 60 * 60 * 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return transactions.filter((tx) => {
      const txTime = new Date(tx.created_at).getTime();

      if (reportRange === "today") {
        if (isNaN(txTime) || txTime < todayStart || txTime >= todayEnd) return false;
      } else if (reportRange === "yesterday") {
        if (isNaN(txTime) || txTime < yesterdayStart || txTime >= todayStart) return false;
      } else if (reportRange === "7days") {
        if (isNaN(txTime) || txTime < sevenDaysAgoStart) return false;
      } else if (reportRange === "month") {
        if (isNaN(txTime) || txTime < monthStart) return false;
      }

      if (reportStatusFilter === "completed" && tx.status !== "Completed") return false;
      if (reportStatusFilter === "active" && tx.status === "Completed") return false;
      if (reportStatusFilter === "paid" && tx.payment_status !== "Paid") return false;
      if (reportStatusFilter === "unpaid" && tx.payment_status === "Paid") return false;

      if (reportSearchQuery.trim()) {
        const q = reportSearchQuery.toLowerCase();
        const matchTracking = (tx.tracking_number || "").toLowerCase().includes(q);
        const matchCustomer = (tx.customer_name || "").toLowerCase().includes(q);
        const matchPhone = (tx.customer_phone || "").toLowerCase().includes(q);
        const matchService = (tx.service_name || "").toLowerCase().includes(q);
        if (!matchTracking && !matchCustomer && !matchPhone && !matchService) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, reportRange, reportStatusFilter, reportSearchQuery]);

  // Aggregated KPI & Financial Metrics for the Report
  const reportStats = useMemo(() => {
    let grossPaid = 0;
    let uncollected = 0;
    let totalWeight = 0;
    let cashPaid = 0;
    let cashCount = 0;
    let gcashPaid = 0;
    let gcashCount = 0;
    let completedCount = 0;
    let activeCount = 0;

    const serviceMap = new Map<string, { count: number; totalWeight: number; revenue: number }>();

    reportFilteredTransactions.forEach((tx) => {
      const amount = Number(tx.total_amount) || 0;
      const weight = Number(tx.weight_kg) || 0;
      const isPaid = tx.payment_status === "Paid";

      if (isPaid) {
        grossPaid += amount;
        const method = (tx.payment_method || "").toLowerCase();
        if (method === "cash") {
          cashPaid += amount;
          cashCount += 1;
        } else {
          gcashPaid += amount;
          gcashCount += 1;
        }
      } else {
        uncollected += amount;
      }

      totalWeight += weight;

      if (tx.status === "Completed") {
        completedCount += 1;
      } else {
        activeCount += 1;
      }

      const sName = tx.service_name || "Standard Laundry";
      const existing = serviceMap.get(sName) || { count: 0, totalWeight: 0, revenue: 0 };
      existing.count += 1;
      existing.totalWeight += weight;
      if (isPaid) existing.revenue += amount;
      serviceMap.set(sName, existing);
    });

    const totalOrders = reportFilteredTransactions.length;
    const completionRate = totalOrders > 0 ? Math.round((completedCount / totalOrders) * 100) : 100;
    const servicesRanked = Array.from(serviceMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    return {
      grossPaid,
      uncollected,
      totalWeight,
      totalOrders,
      completedCount,
      activeCount,
      completionRate,
      cashPaid,
      cashCount,
      gcashPaid,
      gcashCount,
      servicesRanked,
    };
  }, [reportFilteredTransactions]);

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

      // Tag as Processing (saved as Washing to satisfy DB constraint)
      const nextStatus: OrderStatus = "Washing";
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
          `Order #${activeScannedTx.tracking_number} received & tagged as Processing! ${
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
          className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 border ${
            isPaid
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
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
            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
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
            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex select-none">
      {/* 1. DESKTOP SIDEBAR (Matches Screenshot Left Sidebar) */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col justify-between h-screen sticky top-0 z-30 shrink-0">
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Logo Brand Header */}
          <div className="p-5 flex items-center gap-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Waves size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="font-extrabold text-slate-900 text-lg tracking-tight leading-none">
                LabadaGO
              </div>
              <div className="text-[11px] font-medium text-slate-400 tracking-wide mt-1">
                Laundry System
              </div>
            </div>
          </div>

          {/* Nav Items List */}
          <nav className="p-3 space-y-1">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "checkin", label: "Customer Check-In", icon: UserCheck },
              {
                id: "messages",
                label: "Customer Inquiries",
                icon: MessageSquare,
                badge: staffUnreadCount > 0 ? staffUnreadCount : undefined,
              },
              { id: "processing", label: "Laundry Processing", icon: Shirt },
              { id: "transactions", label: "Transactions", icon: FileText },
              { id: "customers", label: "Customers", icon: Users },
              { id: "services", label: "Services & Pricing", icon: Tag },
              { id: "reports", label: "Reports", icon: BarChart3 },
              { id: "notifications", label: "Notifications", icon: Bell, badge: 3 },
              { id: "settings", label: "Settings", icon: Settings },
            ].map((item) => {
              const IconComp = item.icon;
              const isActive = currentSidebarTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentSidebarTab(item.id as any);
                    if (item.id === "processing") {
                      setActiveTab("washing");
                    } else if (item.id === "transactions") {
                      setActiveTab("completed");
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white font-semibold shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComp size={17} className={isActive ? "text-white" : "text-slate-500"} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                        isActive ? "bg-white text-rose-600" : "bg-rose-500 text-white animate-pulse"
                      }`}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Branch Info Card & Logout */}
        <div className="p-3 border-t border-slate-100 space-y-2.5 shrink-0 bg-white">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <Store size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-800 truncate">
                  {assignedShop?.name || "LabadaGO Laundry - Main Branch"}
                </h4>
                <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                  {assignedShop?.address || "123 Laundry St., Barangay San Isidro, Cityville 1234"}
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentSidebarTab("settings")}
                  className="mt-1.5 text-[10px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  View Branch Info
                  <ChevronRight size={11} />
                </button>
              </div>
            </div>
          </div>

          {onSignOut && (
            <button
              onClick={onSignOut}
              className="w-full py-2 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              Logout
            </button>
          )}
        </div>
      </aside>

      {/* MOBILE DRAWER SIDEBAR */}
      {isSidebarOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsSidebarOpenMobile(false)}
          />
          <div className="relative w-64 bg-white flex flex-col justify-between h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex flex-col flex-1 overflow-y-auto">
              <div className="p-4 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
                    <Waves size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">LabadaGO</div>
                    <div className="text-[10px] text-slate-400">Laundry System</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsSidebarOpenMobile(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="p-3 space-y-1">
                {[
                  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                  { id: "checkin", label: "Customer Check-In", icon: UserCheck },
                  {
                    id: "messages",
                    label: "Customer Inquiries",
                    icon: MessageSquare,
                    badge: staffUnreadCount > 0 ? staffUnreadCount : undefined,
                  },
                  { id: "processing", label: "Laundry Processing", icon: Shirt },
                  { id: "transactions", label: "Transactions", icon: FileText },
                  { id: "customers", label: "Customers", icon: Users },
                  { id: "services", label: "Services & Pricing", icon: Tag },
                  { id: "reports", label: "Reports", icon: BarChart3 },
                  { id: "notifications", label: "Notifications", icon: Bell, badge: 3 },
                  { id: "settings", label: "Settings", icon: Settings },
                ].map((item) => {
                  const IconComp = item.icon;
                  const isActive = currentSidebarTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentSidebarTab(item.id as any);
                        if (item.id === "processing") {
                          setActiveTab("washing");
                        } else if (item.id === "transactions") {
                          setActiveTab("completed");
                        }
                        setIsSidebarOpenMobile(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                        isActive
                          ? "bg-blue-600 text-white font-semibold"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <IconComp size={16} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                            isActive ? "bg-white text-rose-600" : "bg-rose-500 text-white animate-pulse"
                          }`}
                        >
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-3 border-t border-slate-100 space-y-2 shrink-0">
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="w-full py-2 px-3 rounded-xl border border-rose-200 text-rose-600 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN VIEW CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top SaaS Header (Matches Screenshot) */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpenMobile(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu size={18} />
            </button>

            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
                {currentSidebarTab === "checkin"
                  ? "Customer Check-In"
                  : currentSidebarTab === "messages"
                  ? "Customer Inquiries & Messages"
                  : currentSidebarTab === "processing"
                  ? "Laundry Processing"
                  : currentSidebarTab === "transactions"
                  ? "Completed Transactions"
                  : currentSidebarTab === "dashboard"
                  ? "Staff Operations Dashboard"
                  : currentSidebarTab === "customers"
                  ? "Customer Directory"
                  : currentSidebarTab === "services"
                  ? "Services & Pricing"
                  : currentSidebarTab === "reports"
                  ? "Reports & Analytics"
                  : currentSidebarTab === "notifications"
                  ? "Station Notifications"
                  : "Settings & Preferences"}
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                {currentSidebarTab === "checkin"
                  ? "Receive and create laundry transactions"
                  : currentSidebarTab === "messages"
                  ? "Reply directly to customer questions about turnaround and services"
                  : currentSidebarTab === "processing"
                  ? "Track active washing cycles, dryers, and ready pickups"
                  : currentSidebarTab === "transactions"
                  ? "Official receipts and past customer pickups"
                  : currentSidebarTab === "dashboard"
                  ? "Counter operations & live shop performance overview"
                  : currentSidebarTab === "customers"
                  ? "View and manage registered and walk-in customer history"
                  : currentSidebarTab === "services"
                  ? "View active laundry services and rate cards"
                  : currentSidebarTab === "reports"
                  ? "Daily turnover and completed laundry summaries"
                  : currentSidebarTab === "notifications"
                  ? "Alerts, incoming fast passes, and machine updates"
                  : "Counter preferences, audio alerts, and branch details"}
              </p>
            </div>
          </div>

          {/* Right Header: Notifications + Staff Avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={loadShopOrders}
              disabled={isLoadingOrders}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
              title="Refresh orders"
            >
              <RefreshCw size={16} className={isLoadingOrders ? "animate-spin text-blue-600" : ""} />
            </button>

            {/* Notification Bell with Badge */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCurrentSidebarTab("notifications")}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell size={16} />
              </button>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white pointer-events-none">
                3
              </span>
            </div>

            {/* Staff Profile Avatar & Info */}
            <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-linear-to-tr from-amber-400 to-rose-400 p-0.5 shrink-0 flex items-center justify-center shadow-2xs">
                <div className="w-full h-full rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                  {staffUser.full_name ? staffUser.full_name.substring(0, 2) : "MS"}
                </div>
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {staffUser.full_name || "Maria Santos"}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Staff</div>
              </div>
              <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
            </div>
          </div>
        </header>

        {/* Real-time Toast Banner */}
        {toastMessage && (
          <div
            className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 max-w-sm w-[90%] transition-all animate-bounce ${
              toastMessage.type === "success"
                ? "bg-emerald-900/90 text-emerald-100 border-emerald-500 backdrop-blur-md"
                : toastMessage.type === "error"
                ? "bg-rose-900/90 text-rose-100 border-rose-500 backdrop-blur-md"
                : "bg-blue-900/90 text-blue-100 border-blue-500 backdrop-blur-md"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-rose-400 shrink-0" />
            )}
            <span className="flex-1 truncate">{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Main Body Content */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto pb-24 lg:pb-8">
          {/* TAB 1: CUSTOMER CHECK-IN (Matches Screenshot 100%) */}
          {currentSidebarTab === "checkin" && (
            <div className="max-w-6xl mx-auto">
              <CustomerCheckInView
                staffUser={staffUser}
                assignedShop={assignedShop}
                onTransactionCreated={(tx) => {
                  playSound("success");
                  loadShopOrders();
                }}
                onViewQueue={() => setCurrentSidebarTab("processing")}
                todayTransactionsCount={transactions.length}
              />
            </div>
          )}

          {/* TAB: CUSTOMER INQUIRIES & MESSAGES (Messenger Design) */}
          {currentSidebarTab === "messages" && (
            <div className="max-w-6xl mx-auto">
              <ShopMessenger
                mode="staff"
                currentUser={staffUser}
                assignedShop={assignedShop}
              />
            </div>
          )}

          {/* TAB 2: LAUNDRY PROCESSING */}
          {currentSidebarTab === "processing" && (
            <div className="max-w-5xl mx-auto space-y-5 animate-in fade-in duration-200">
              {/* Quick Operational Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setActiveTab("washing")}
                  className={`p-4 rounded-2xl border text-left transition-all bg-white cursor-pointer ${
                    activeTab === "washing"
                      ? "border-2 border-blue-600 shadow-xs"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Processing
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Shirt size={15} />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-2">{washingOrders.length}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Active washing / drying</p>
                </button>

                <button
                  onClick={() => setActiveTab("ready")}
                  className={`p-4 rounded-2xl border text-left transition-all bg-white cursor-pointer ${
                    activeTab === "ready"
                      ? "border-2 border-teal-600 shadow-xs"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Ready to Pick Up
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                      <CheckCircle2 size={15} />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-2">{readyOrders.length}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Waiting for pickup</p>
                </button>

                <button
                  onClick={() => setActiveTab("completed")}
                  className={`p-4 rounded-2xl border text-left transition-all bg-white cursor-pointer ${
                    activeTab === "completed"
                      ? "border-2 border-emerald-600 shadow-xs"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Completed
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Package size={15} />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-2">{completedOrders.length}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Handed over today</p>
                </button>
              </div>

              {/* Fast Scanner / Tracking Search Box */}
              <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ScanLine size={16} className="text-blue-600" />
                      Station Scanner &amp; Quick Lookup
                    </h2>
                    <p className="text-xs text-slate-500">
                      Scan customer fast pass QR or search tracking code to update status.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={isCameraActive ? "danger" : "outline"}
                      size="sm"
                      onClick={() => setIsCameraActive(!isCameraActive)}
                      className="text-xs px-3 h-8 font-semibold flex items-center gap-1.5"
                    >
                      <Camera size={14} />
                      {isCameraActive ? "Close Camera" : "Open Camera Scanner"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setCurrentSidebarTab("checkin")}
                      className="text-xs font-semibold px-3 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <UserCheck size={14} />
                      New Check-In
                    </button>
                  </div>
                </div>

                {isCameraActive && (
                  <div className="rounded-xl overflow-hidden border border-blue-200 bg-black relative">
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
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Scan or type Tracking # (e.g. LBD-12345)"
                      value={searchCode}
                      onChange={(e) => setSearchCode(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white uppercase font-mono tracking-wider transition-colors"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 text-xs"
                  >
                    Lookup Pass
                  </Button>
                </form>
              </section>

              {/* Active Orders List */}
              <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="flex border-b border-slate-150 bg-slate-50/60 px-3 pt-2 gap-2 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab("washing")}
                    className={`px-3 py-2 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === "washing"
                        ? "bg-white text-blue-600 border-t-2 border-blue-600 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>Processing</span>
                    <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px]">
                      {washingOrders.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("ready")}
                    className={`px-3 py-2 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === "ready"
                        ? "bg-white text-teal-600 border-t-2 border-teal-600 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>Ready for Pickup</span>
                    <span className="px-1.5 py-0.2 bg-teal-50 text-teal-700 border border-teal-200 rounded-full text-[10px]">
                      {readyOrders.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("completed")}
                    className={`px-3 py-2 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === "completed"
                        ? "bg-white text-emerald-600 border-t-2 border-emerald-600 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>Completed</span>
                    <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px]">
                      {completedOrders.length}
                    </span>
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  {activeTab === "washing" && (
                    <>
                      {washingOrders.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">
                          <Shirt size={36} className="mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-600">No active laundry processing.</p>
                          <p className="mt-1">Check in a customer to begin a new wash cycle.</p>
                          <button
                            type="button"
                            onClick={() => setCurrentSidebarTab("checkin")}
                            className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <UserCheck size={14} />
                            Start Customer Check-In
                          </button>
                        </div>
                      ) : (
                        washingOrders.map((tx) => (
                          <div
                            key={tx.id}
                            onClick={() => prepareOrderActionModal(tx)}
                            className="bg-white hover:bg-slate-50/70 border border-slate-200 rounded-xl p-4 cursor-pointer transition-all hover:border-blue-400 flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                  {tx.tracking_number}
                                </span>
                                <span className="text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                                  Processing
                                </span>
                                {tx.machine_number ? (
                                  <span className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Shirt size={10} className="text-blue-600" />
                                    {tx.machine_number}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-md">
                                    No Machine
                                  </span>
                                )}
                              </div>
                              <div className="text-sm font-bold text-slate-900">
                                {tx.customer_name}
                              </div>
                              <p className="text-xs text-slate-500">
                                {tx.service_name} • {Math.max(1, Math.round(tx.weight_kg / 8))} load(s) • ₱{tx.total_amount.toFixed(2)}
                              </p>
                              {renderPaymentBadge(tx)}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 text-xs shrink-0 font-semibold"
                            >
                              Update / Ready
                            </Button>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {activeTab === "ready" && (
                    <>
                      {readyOrders.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">
                          <CheckCircle2 size={36} className="mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-600">No orders waiting for pickup.</p>
                          <p className="mt-1">Orders marked as ready will appear here for customer claim.</p>
                        </div>
                      ) : (
                        readyOrders.map((tx) => (
                          <div
                            key={tx.id}
                            onClick={() => prepareOrderActionModal(tx)}
                            className="bg-white hover:bg-teal-50/30 border border-teal-200 rounded-xl p-4 cursor-pointer transition-all hover:border-teal-400 flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                                  {tx.tracking_number}
                                </span>
                                <span className="text-[10px] uppercase font-bold bg-teal-100 text-teal-800 border border-teal-300 px-2 py-0.5 rounded-md">
                                  Ready to Pick Up
                                </span>
                                {tx.machine_number && (
                                  <span className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md">
                                    {tx.machine_number}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                {tx.customer_name}
                                <span className="text-xs font-normal text-slate-500">
                                  ({tx.customer_phone})
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">
                                {tx.service_name} • {Math.max(1, Math.round(tx.weight_kg / 8))} load(s) • ₱{tx.total_amount.toFixed(2)}
                              </p>
                              {renderPaymentBadge(tx)}
                            </div>

                            <Button
                              variant="primary"
                              size="sm"
                              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shrink-0 px-3.5"
                            >
                              Release &amp; Complete
                              <ArrowRight size={13} className="ml-1" />
                            </Button>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {activeTab === "completed" && (
                    <>
                      {completedOrders.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">
                          <Clock size={36} className="mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-600">No orders completed yet today.</p>
                        </div>
                      ) : (
                        completedOrders.map((tx) => (
                          <div
                            key={tx.id}
                            className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3 text-slate-600 shadow-2xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  {tx.tracking_number}
                                </span>
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-md">
                                  Completed
                                </span>
                              </div>
                              <div className="text-sm font-semibold text-slate-900">{tx.customer_name}</div>
                              <p className="text-xs text-slate-500">
                                ₱{tx.total_amount.toFixed(2)} • Handed over to customer
                              </p>
                              {renderPaymentBadge(tx)}
                            </div>
                            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: TRANSACTIONS TAB */}
          {currentSidebarTab === "transactions" && (
            <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">All Completed Transactions</h3>
                    <p className="text-xs text-slate-500">History of customer drop-offs and claimed laundry</p>
                  </div>
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {completedOrders.length} records today
                  </span>
                </div>

                <div className="pt-4 space-y-3">
                  {completedOrders.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      <FileText size={36} className="mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">No completed transactions recorded yet.</p>
                    </div>
                  ) : (
                    completedOrders.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {tx.tracking_number}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              Completed
                            </span>
                          </div>
                          <div className="text-sm font-bold text-slate-900">{tx.customer_name}</div>
                          <div className="text-xs text-slate-500">
                            {tx.service_name} • ₱{tx.total_amount.toFixed(2)}
                          </div>
                          {renderPaymentBadge(tx)}
                        </div>
                        <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DASHBOARD TAB */}
          {currentSidebarTab === "dashboard" && (
            <div className="max-w-5xl mx-auto space-y-5 animate-in fade-in duration-200">
              {/* Dashboard Banner */}
              <div className="bg-linear-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-md flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Good Day, {staffUser.full_name.split(" ")[0]}!</h2>
                  <p className="text-xs text-blue-100 mt-1 max-w-md">
                    Here is your live station overview for {assignedShop?.name || "LabadaGO Laundry - Main Branch"}.
                  </p>
                  <div className="mt-4 flex items-center gap-2.5">
                    <button
                      onClick={() => setCurrentSidebarTab("checkin")}
                      className="px-4 py-2 bg-white text-blue-700 font-bold text-xs rounded-xl hover:bg-blue-50 shadow-xs cursor-pointer"
                    >
                      + Customer Check-In
                    </button>
                    <button
                      onClick={() => setCurrentSidebarTab("processing")}
                      className="px-4 py-2 bg-blue-500/30 text-white border border-white/30 font-bold text-xs rounded-xl hover:bg-blue-500/50 cursor-pointer"
                    >
                      View Laundry Processing
                    </button>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                    <Waves size={32} />
                  </div>
                </div>
              </div>

              {/* 4 Cards Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <div className="text-xs font-semibold text-slate-500">Total Orders</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{transactions.length}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Scanned or walk-in</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <div className="text-xs font-semibold text-blue-600">In Processing</div>
                  <div className="text-2xl font-black text-blue-700 mt-1">{washingOrders.length}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Washing or drying</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <div className="text-xs font-semibold text-teal-600">Ready to Pick Up</div>
                  <div className="text-2xl font-black text-teal-700 mt-1">{readyOrders.length}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Waiting for customer</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <div className="text-xs font-semibold text-emerald-600">Completed</div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">{completedOrders.length}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Handed over today</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CUSTOMERS TAB */}
          {currentSidebarTab === "customers" && (
            <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900">Today&apos;s Active Customers</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customers who transacted or checked in at this branch today
                </p>

                <div className="pt-4 divide-y divide-slate-100">
                  {transactions.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      <Users size={36} className="mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">No customer records yet today.</p>
                    </div>
                  ) : (
                    transactions.map((tx) => (
                      <div key={tx.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{tx.customer_name}</div>
                          <div className="text-xs text-slate-500">{tx.customer_phone}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-mono font-bold text-slate-700">
                            {tx.tracking_number}
                          </div>
                          <div className="text-[11px] text-slate-400">{tx.service_name}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SERVICES & PRICING */}
          {currentSidebarTab === "services" && (
            <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900">Branch Services &amp; Load Rates</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Active rate catalog for {assignedShop?.name || "Main Branch"}
                </p>

                <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {staffShopServices.map((srv) => (
                    <div
                      key={srv.id || srv.service_name}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          <Shirt size={18} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{srv.service_name}</div>
                          <div className="text-[11px] text-slate-500">
                            Standard load allowance ({srv.kilos || 8} kg)
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-blue-600">₱{srv.price.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-400">per {srv.unit || "load"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: REPORTS (Live Database Connected Actual Report) */}
          {currentSidebarTab === "reports" && (
            <div className="max-w-6xl mx-auto space-y-5 animate-in fade-in duration-200">
              {/* Header Card with Shop Name, Live Status & Print Button */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <BarChart3 size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">Live Station Reports &amp; Financial Audit</h3>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Supabase Sync
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {assignedShop?.name || "Main Branch"} • Real-time order ledger &amp; counter collections
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={loadShopOrders}
                    disabled={isLoadingOrders}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                    title="Refresh Live Data"
                  >
                    <RefreshCw size={13} className={isLoadingOrders ? "animate-spin text-blue-600" : ""} />
                    <span>Refresh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Printer size={13} />
                    <span>Print Report</span>
                  </button>
                </div>
              </div>

              {/* Filters & Time-Range Bar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Date Range Selector Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    <div className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
                      <Calendar size={13} />
                      <span>Range:</span>
                    </div>
                    {[
                      { id: "today", label: "Today (Live)" },
                      { id: "yesterday", label: "Yesterday" },
                      { id: "7days", label: "Last 7 Days" },
                      { id: "month", label: "This Month" },
                      { id: "all", label: "All Records" },
                    ].map((rng) => (
                      <button
                        key={rng.id}
                        type="button"
                        onClick={() => setReportRange(rng.id as any)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 border ${
                          reportRange === rng.id
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        {rng.label}
                      </button>
                    ))}
                  </div>

                  {/* Status & Search Filter */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-44">
                      <select
                        value={reportStatusFilter}
                        onChange={(e) => setReportStatusFilter(e.target.value as any)}
                        className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="all">All Statuses</option>
                        <option value="completed">Completed Only</option>
                        <option value="active">Active (Washing / Ready)</option>
                        <option value="paid">Paid Transactions</option>
                        <option value="unpaid">Unpaid Receivables</option>
                      </select>
                    </div>

                    <div className="relative flex-1 sm:w-56">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search audit ledger..."
                        value={reportSearchQuery}
                        onChange={(e) => setReportSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {reportSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setReportSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Live KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Gross Paid Revenue */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Gross Paid Revenue</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <DollarSign size={16} />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900">
                    ₱{reportStats.grossPaid.toFixed(2)}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 pt-1">
                    <span className="font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                      {reportStats.cashCount + reportStats.gcashCount} settled
                    </span>
                    <span className="text-slate-400">orders</span>
                  </div>
                </div>

                {/* 2. Uncollected Receivables */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Uncollected / Unpaid</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Clock size={16} />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-amber-600">
                    ₱{reportStats.uncollected.toFixed(2)}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-700 pt-1">
                    <span className="font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md">
                      {reportFilteredTransactions.filter((t) => t.payment_status !== "Paid").length} unpaid
                    </span>
                    <span className="text-slate-400">pay at pickup</span>
                  </div>
                </div>

                {/* 3. Total Laundry Weight */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Total Weight Handled</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Shirt size={16} />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900">
                    {reportStats.totalWeight.toFixed(1)} <span className="text-sm font-bold text-slate-500">kg</span>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1">
                    Avg{" "}
                    {reportStats.totalOrders > 0
                      ? (reportStats.totalWeight / reportStats.totalOrders).toFixed(1)
                      : "0.0"}{" "}
                    kg per customer load
                  </div>
                </div>

                {/* 4. Completion Rate */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Completion Rate</span>
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                      <CheckCircle2 size={16} />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-teal-600">
                    {reportStats.completionRate}%
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1">
                    {reportStats.completedCount} completed of {reportStats.totalOrders} total in range
                  </div>
                </div>
              </div>

              {/* 2-Column Breakdown Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Card A: Settlement Breakdown (Cash vs GCash) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Payment Settlement Methods</h4>
                      <p className="text-xs text-slate-500">Breakdown of gross collected counter revenue</p>
                    </div>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                      ₱{reportStats.grossPaid.toFixed(2)} Total
                    </span>
                  </div>

                  {/* Split Visual Progress Bar */}
                  {reportStats.grossPaid > 0 ? (
                    <div className="space-y-2">
                      <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex">
                        <div
                          style={{
                            width: `${(reportStats.cashPaid / reportStats.grossPaid) * 100}%`,
                          }}
                          className="bg-emerald-500 h-full transition-all"
                          title={`Cash: ₱${reportStats.cashPaid.toFixed(2)}`}
                        />
                        <div
                          style={{
                            width: `${(reportStats.gcashPaid / reportStats.grossPaid) * 100}%`,
                          }}
                          className="bg-blue-500 h-full transition-all"
                          title={`GCash: ₱${reportStats.gcashPaid.toFixed(2)}`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span>Cash: ₱{reportStats.cashPaid.toFixed(2)}</span>
                          <span className="text-slate-400 text-[11px]">
                            ({Math.round((reportStats.cashPaid / reportStats.grossPaid) * 100)}% • {reportStats.cashCount} orders)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          <span>GCash: ₱{reportStats.gcashPaid.toFixed(2)}</span>
                          <span className="text-slate-400 text-[11px]">
                            ({Math.round((reportStats.gcashPaid / reportStats.grossPaid) * 100)}% • {reportStats.gcashCount} orders)
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      No settled payments recorded in this period.
                    </div>
                  )}

                  {/* Receivables Callout */}
                  {reportStats.uncollected > 0 && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-amber-900 font-medium">
                        <Clock size={14} className="text-amber-600 shrink-0" />
                        <span>Pending collection at counter upon laundry pickup</span>
                      </div>
                      <span className="font-extrabold text-amber-900">₱{reportStats.uncollected.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Card B: Service Distribution & Workload */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Service Mix &amp; Workload</h4>
                      <p className="text-xs text-slate-500">Distribution by laundry service category</p>
                    </div>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                      {reportStats.servicesRanked.length} Categories
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {reportStats.servicesRanked.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 text-xs">
                        No service transactions logged for this range.
                      </div>
                    ) : (
                      reportStats.servicesRanked.map((srv) => {
                        const pct = reportStats.totalOrders > 0
                          ? Math.round((srv.count / reportStats.totalOrders) * 100)
                          : 0;
                        return (
                          <div key={srv.name} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-slate-900">{srv.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500 text-[11px]">{srv.totalWeight.toFixed(1)} kg</span>
                                <span className="font-bold text-emerald-600">₱{srv.revenue.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                <div
                                  style={{ width: `${pct}%` }}
                                  className="h-full bg-blue-600 rounded-full"
                                />
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 w-12 text-right">
                                {srv.count} ({pct}%)
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Database Transaction Audit Log Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Transaction Audit Log</h4>
                    <p className="text-xs text-slate-500">
                      Synchronized database transactions ({reportFilteredTransactions.length} records)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">
                      Filtered: {reportFilteredTransactions.length} of {transactions.length} total
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-bold">
                        <th className="py-3 px-4">Order #</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Service &amp; Weight</th>
                        <th className="py-3 px-4">Machine</th>
                        <th className="py-3 px-4">Amount &amp; Payment</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date / Time</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportFilteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            <FileText size={32} className="mx-auto mb-2 text-slate-300" />
                            <p className="font-semibold text-slate-600">No matching transactions found.</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Try adjusting your date range or clearing your search filter.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        reportFilteredTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Tracking # */}
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-150 px-2 py-0.5 rounded-md text-[11px]">
                                #{tx.tracking_number}
                              </span>
                            </td>

                            {/* Customer */}
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{tx.customer_name}</div>
                              <div className="text-[11px] text-slate-500">{tx.customer_phone}</div>
                            </td>

                            {/* Service & Weight */}
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-800">{tx.service_name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {tx.weight_kg ? `${tx.weight_kg} kg` : "N/A"}
                              </div>
                            </td>

                            {/* Machine Number */}
                            <td className="py-3 px-4">
                              {tx.machine_number ? (
                                <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] border border-slate-200">
                                  {tx.machine_number}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">—</span>
                              )}
                            </td>

                            {/* Amount & Payment */}
                            <td className="py-3 px-4">
                              <div className="font-black text-slate-900">
                                ₱{(tx.total_amount || 0).toFixed(2)}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md border ${
                                    tx.payment_status === "Paid"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  {tx.payment_status}
                                </span>
                                {tx.payment_method && (
                                  <span className="text-[10px] text-slate-500">
                                    via {tx.payment_method}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Order Status */}
                            <td className="py-3 px-4">
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                  tx.status === "Completed"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : tx.status === "Ready"
                                    ? "bg-teal-50 text-teal-700 border-teal-200"
                                    : tx.status === "Washing" || tx.status === "Processing"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                              >
                                {tx.status}
                              </span>
                            </td>

                            {/* Date / Time */}
                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                              <div>{new Date(tx.created_at).toLocaleDateString()}</div>
                              <div className="text-[10px] text-slate-400">
                                {new Date(tx.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </td>

                            {/* Action */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {tx.payment_status !== "Paid" && (
                                  <button
                                    type="button"
                                    onClick={() => setPaymentRecordTx(tx)}
                                    className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-2xs transition-colors cursor-pointer"
                                  >
                                    Pay
                                  </button>
                                )}
                                {tx.payment_proof_url && (
                                  <button
                                    type="button"
                                    onClick={() => setProofModalTx(tx)}
                                    className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold text-[10px] transition-colors cursor-pointer"
                                  >
                                    Proof
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleProcessScan(tx.tracking_number)}
                                  className="px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[10px] transition-colors cursor-pointer shadow-2xs"
                                >
                                  View
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: NOTIFICATIONS */}
          {currentSidebarTab === "notifications" && (
            <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900">Station Alerts &amp; Notifications</h3>
                <p className="text-xs text-slate-500 mt-0.5">System notifications and status alerts</p>

                <div className="pt-4 space-y-2.5">
                  <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Bell size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Station online and synchronized</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Connected to {assignedShop?.name || "LabadaGO Laundry - Main Branch"}. All orders are syncing live.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/40 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {readyOrders.length} order(s) ready for customer pickup
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Customers with ready orders have been notified on their order tracker.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Package size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Fast Pass Counter System active</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Customer QR codes scan instantly to tag orders as Processing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: SETTINGS */}
          {currentSidebarTab === "settings" && (
            <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Counter Station Settings</h3>
                <div className="space-y-3 pt-1">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="text-xs font-bold text-slate-800">Assigned Branch</div>
                    <div className="text-sm font-bold text-blue-600 mt-0.5">
                      {assignedShop?.name || "LabadaGO Laundry - Main Branch"}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {assignedShop?.address || "123 Laundry St., Barangay San Isidro, Cityville 1234"}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="text-xs font-bold text-slate-800">Logged In Staff</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">{staffUser.full_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{staffUser.email || staffUser.phone_number}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* SCAN ACTION MODAL (Light Modern SaaS Design) */}
      {activeScannedTx && autoActionType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                {autoActionType === "receive" && (
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                    <ScanLine size={20} />
                  </div>
                )}
                {autoActionType === "give" && (
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                )}
                {autoActionType === "progress" && (
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                    <Shirt size={20} />
                  </div>
                )}
                {autoActionType === "completed" && (
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check size={20} />
                  </div>
                )}
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight">
                    {autoActionType === "receive" && "Receive Laundry Intake"}
                    {autoActionType === "give" && "Handover & Release Laundry"}
                    {autoActionType === "progress" && "Order In Progress"}
                    {autoActionType === "completed" && "Order Already Completed"}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-150">
                      Tracking: #{activeScannedTx.tracking_number}
                    </span>
                    {activeScannedTx.shop_name && (
                      <span className="text-[11px] text-slate-500 font-medium truncate max-w-[150px]">
                        • {activeScannedTx.shop_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveScannedTx(null);
                  setAutoActionType(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
              {/* Customer & Order Summary Card */}
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px]">
                      <User size={13} />
                    </div>
                    <span className="text-sm font-bold text-slate-900">{activeScannedTx.customer_name}</span>
                  </div>
                  {activeScannedTx.customer_phone && (
                    <a
                      href={`tel:${activeScannedTx.customer_phone}`}
                      className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 font-semibold text-xs transition-colors"
                    >
                      <Phone size={12} />
                      <span>{activeScannedTx.customer_phone}</span>
                    </a>
                  )}
                </div>

                <div className="flex items-start justify-between text-xs pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium shrink-0 mr-2">Service Selected:</span>
                  <span className="text-slate-800 font-semibold text-right">{activeScannedTx.service_name}</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500 font-medium">Total Due:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-emerald-600 font-black text-base sm:text-lg">
                      ₱{activeScannedTx.total_amount.toFixed(2)}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                        activeScannedTx.payment_status === "Paid"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
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
                        className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center gap-1 cursor-pointer transition-colors"
                        title="View GCash transfer proof"
                      >
                        <Receipt size={12} />
                        Receipt
                      </button>
                    )}

                    {/* Pay now button if unpaid */}
                    {activeScannedTx.payment_status === "Unpaid" && (
                      <button
                        type="button"
                        onClick={() => setPaymentRecordTx(activeScannedTx)}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                        title="Record Cash or GCash payment"
                      >
                        <Banknote size={12} />
                        Receive Pay
                      </button>
                    )}
                  </div>
                </div>

                {activeScannedTx.special_notes && (
                  <div className="text-xs bg-white p-3 rounded-xl text-slate-700 border border-slate-200 mt-2 shadow-2xs">
                    <span className="text-slate-500 font-bold block text-[10px] uppercase tracking-wider mb-0.5">
                      Customer Note / Instructions
                    </span>
                    <p className="leading-relaxed">{activeScannedTx.special_notes}</p>
                  </div>
                )}
              </div>

              {/* ACTION FORM 1: RECEIVE (INTAKE) */}
              {autoActionType === "receive" && (
                <div className="space-y-4 pt-1">
                  {/* MACHINE NUMBER (OPTIONAL) */}
                  <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Shirt size={14} className="text-blue-600" />
                        Machine Number <span className="text-slate-400 text-[11px] font-normal">(Optional)</span>
                      </label>
                      <span className="text-[11px] text-slate-400">Where is this load placed?</span>
                    </div>

                    <input
                      type="text"
                      placeholder="e.g. Washer 1, Dryer 2, or leave blank"
                      value={machineNumber}
                      onChange={(e) => setMachineNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs"
                    />

                    {/* Quick Preset Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {MACHINE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setMachineNumber(preset)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all border cursor-pointer ${
                            machineNumber === preset
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                      {machineNumber && (
                        <button
                          type="button"
                          onClick={() => setMachineNumber("")}
                          className="text-xs px-2 py-1 rounded-lg font-medium text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 cursor-pointer"
                        >
                          Clear Machine
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Weight & Payment confirmation */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Actual Scale Weight (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={weightInput}
                        onChange={(e) => setWeightInput(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Payment Timing
                      </label>
                      <select
                        value={paymentChoice}
                        onChange={(e) => setPaymentChoice(e.target.value as "unpaid" | "paid")}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      >
                        <option value="unpaid">Pay on Pickup</option>
                        <option value="paid">Paid Now (Counter)</option>
                      </select>
                    </div>
                  </div>

                  {/* If Paid Now is selected, render PaymentInputSection with light theme */}
                  {paymentChoice === "paid" && (
                    <div className="pt-1 animate-in fade-in">
                      <PaymentInputSection
                        theme="light"
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
                  <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveScannedTx(null)}
                      className="flex-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-3 rounded-2xl order-2 sm:order-1 transition-colors cursor-pointer shadow-2xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmReceive}
                      disabled={isProcessing}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-3 rounded-2xl flex items-center justify-center gap-1.5 order-1 sm:order-2 shadow-md transition-all cursor-pointer active:scale-[0.99]"
                    >
                      <CheckCircle2 size={16} />
                      {isProcessing ? "Processing..." : "Confirm & Start Processing"}
                    </button>
                  </div>
                </div>
              )}

              {/* ACTION FORM 2: GIVE / DISPATCH (HANDOVER) */}
              {autoActionType === "give" && (
                <div className="space-y-4 pt-1">
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs sm:text-sm">
                      <Sparkles size={16} className="text-emerald-600" />
                      Laundry is done and ready for handover!
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Confirm that all clothes, folded items, and hangers are handed over to{" "}
                      <b className="text-slate-900">{activeScannedTx.customer_name}</b>.
                    </p>
                    {activeScannedTx.machine_number && (
                      <p className="text-xs text-emerald-700 font-semibold pt-1">
                        Washed in: {activeScannedTx.machine_number}
                      </p>
                    )}
                  </div>

                  {/* Payment settlement check */}
                  {activeScannedTx.payment_status === "Unpaid" ? (
                    <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <DollarSign size={15} className="text-amber-600" />
                          Collect Payment at Counter
                        </span>
                        <span className="text-base font-black text-amber-900">
                          ₱{activeScannedTx.total_amount.toFixed(2)}
                        </span>
                      </div>
                      <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer pt-1 font-medium">
                        <input
                          type="checkbox"
                          checked={collectPaymentOnGive}
                          onChange={(e) => setCollectPaymentOnGive(e.target.checked)}
                          className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500 cursor-pointer"
                        />
                        <span>Payment collected in full (Cash / GCash)</span>
                      </label>

                      {/* If collect on give is checked, render PaymentInputSection */}
                      {collectPaymentOnGive && (
                        <div className="pt-2 animate-in fade-in">
                          <PaymentInputSection
                            theme="light"
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
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs text-emerald-800 font-semibold">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      Order was already prepaid. No payment required.
                    </div>
                  )}

                  {/* Give Confirmation Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveScannedTx(null)}
                      className="flex-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-3 rounded-2xl order-2 sm:order-1 transition-colors cursor-pointer shadow-2xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmGive}
                      disabled={isProcessing}
                      className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-teal-700/20 order-1 sm:order-2 transition-all cursor-pointer active:scale-[0.99]"
                    >
                      <Check size={16} />
                      {isProcessing ? "Releasing..." : "Confirm Handover & Release"}
                    </button>
                  </div>
                </div>
              )}

              {/* ACTION FORM 3: PROGRESS UPDATE (Shown in Screenshot!) */}
              {autoActionType === "progress" && (
                <div className="space-y-4 pt-1">
                  <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Current Status:</span>
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 capitalize">
                        {activeScannedTx.status}
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1.5">
                        Assigned Machine Number <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Washer 2 or Dryer 1"
                        value={machineNumber}
                        onChange={(e) => setMachineNumber(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs transition-all"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {MACHINE_PRESETS.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setMachineNumber(p)}
                            className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all border cursor-pointer ${
                              machineNumber === p
                                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
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
                            className="text-xs px-2 py-1 rounded-lg font-medium text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateProgress("Ready")}
                      disabled={isProcessing}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-teal-700/20 transition-all active:scale-[0.99] cursor-pointer"
                    >
                      <Sparkles size={16} />
                      Laundry is Done! Advance to &quot;Ready to Pick Up&quot;
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateProgress()}
                      disabled={isProcessing}
                      className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-sm py-3 rounded-2xl transition-all cursor-pointer shadow-2xs"
                    >
                      Save Machine Number Only
                    </button>
                  </div>
                </div>
              )}

              {/* ACTION FORM 4: ALREADY COMPLETED */}
              {autoActionType === "completed" && (
                <div className="py-6 text-center space-y-3.5">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Order Already Completed</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      This laundry order has already been finalized and delivered to the customer.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveScannedTx(null)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                  >
                    Close
                  </button>
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
