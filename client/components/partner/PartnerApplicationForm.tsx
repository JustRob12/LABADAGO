"use client";

import React, { useState, useEffect } from "react";
import { UserProfile, ShopService, PartnerApplication } from "@/types/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ShopLocationPicker } from "@/components/owner/ShopLocationPicker";
import { ShopImageUploader } from "@/components/owner/ShopImageUploader";
import {
  submitPartnerApplication,
  getUserPartnerApplication,
} from "@/lib/supabase/auth";
import {
  Store,
  MapPin,
  Clock,
  Phone,
  Settings,
  Plus,
  Trash2,
  CheckCircle2,
  Building2,
  Image as ImageIcon,
  ArrowRight,
  Pencil,
  AlertTriangle,
  X,
  Scale,
  Handshake,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  FileText,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";

export function formatTo12Hour(timeStr?: string): string {
  if (!timeStr) return "";
  if (timeStr.includes("AM") || timeStr.includes("PM")) return timeStr;
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return timeStr;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
}

interface PartnerApplicationFormProps {
  user: UserProfile | null;
  onApplicationSubmitted?: (app: PartnerApplication) => void;
}

export const PartnerApplicationForm: React.FC<PartnerApplicationFormProps> = ({
  user,
  onApplicationSubmitted,
}) => {
  const [existingApp, setExistingApp] = useState<PartnerApplication | null>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(true);

  // Applicant info
  const [applicantName, setApplicantName] = useState(user?.full_name || "");
  const [applicantPhone, setApplicantPhone] = useState(user?.phone_number || "");
  const [applicantEmail, setApplicantEmail] = useState(user?.email || "");

  // Shop info (exact same fields as Add Shop in ShopSetupForm)
  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState(14.5995);
  const [longitude, setLongitude] = useState(120.9842);
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || "");
  const [openTime, setOpenTime] = useState("07:00");
  const [closeTime, setCloseTime] = useState("21:00");
  const [washerCount, setWasherCount] = useState(6);
  const [dryerCount, setDryerCount] = useState(6);
  const [maxKiloPerLoad, setMaxKiloPerLoad] = useState(8);
  const [images, setImages] = useState<string[]>([]);

  // Services offered (standard load presets)
  const [services, setServices] = useState<ShopService[]>([
    {
      id: "srv-default-1",
      shop_id: "pending-shop",
      service_name: "Wash, Dry & Fold",
      price: 200,
      unit: "load",
      kilos: 8,
      description: "Full service wash, dry, and clean fold per load (up to 8kg)",
      estimated_minutes: 90,
      is_available: true,
    },
    {
      id: "srv-default-2",
      shop_id: "pending-shop",
      service_name: "Wash & Dry Only",
      price: 160,
      unit: "load",
      kilos: 8,
      description: "Self or assisted wash & dry cycle (up to 8kg)",
      estimated_minutes: 75,
      is_available: true,
    },
    {
      id: "srv-default-3",
      shop_id: "pending-shop",
      service_name: "Blanket & Comforter Wash",
      price: 220,
      unit: "load",
      kilos: 8,
      description: "Thorough deep wash for heavy comforters and beddings",
      estimated_minutes: 120,
      is_available: true,
    },
  ]);

  // Add service mini-inputs
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceKilos, setNewServiceKilos] = useState("8");
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Notes / permit info for admin
  const [adminNotes, setAdminNotes] = useState("");

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing application if any
  useEffect(() => {
    async function checkExisting() {
      if (!user) {
        setIsLoadingExisting(false);
        return;
      }
      try {
        const app = await getUserPartnerApplication(user.id);
        if (app) {
          setExistingApp(app);
          // If approved or pending, keep form collapsed by default
          if (app.status === "pending" || app.status === "approved") {
            setIsFormVisible(false);
          }
        }
      } catch (err) {
        console.error("Error loading partner application:", err);
      } finally {
        setIsLoadingExisting(false);
      }
    }
    checkExisting();
  }, [user]);

  // Keep applicant info synced with user
  useEffect(() => {
    if (user) {
      if (!applicantName) setApplicantName(user.full_name || "");
      if (!applicantPhone) setApplicantPhone(user.phone_number || "");
      if (!applicantEmail) setApplicantEmail(user.email || "");
      if (!phoneNumber) setPhoneNumber(user.phone_number || "");
    }
  }, [user, applicantName, applicantPhone, applicantEmail, phoneNumber]);

  // Service Management
  const handleAddOrUpdateService = () => {
    if (!newServiceName.trim()) return;
    const priceNum = parseFloat(newServicePrice);
    const kilosNum = parseFloat(newServiceKilos);
    const kilosVal = isNaN(kilosNum) || kilosNum <= 0 ? null : kilosNum;

    if (editingServiceId) {
      setServices((prev) =>
        prev.map((s) =>
          s.id === editingServiceId
            ? {
                ...s,
                service_name: newServiceName.trim(),
                price: isNaN(priceNum) ? 0 : priceNum,
                unit: "load",
                kilos: kilosVal,
                description: kilosVal ? `Up to ${kilosVal} kg per load` : s.description,
              }
            : s
        )
      );
      setEditingServiceId(null);
    } else {
      const newSrv: ShopService = {
        id: `srv-${Date.now()}`,
        shop_id: "pending-shop",
        service_name: newServiceName.trim(),
        price: isNaN(priceNum) ? 0 : priceNum,
        unit: "load",
        kilos: kilosVal,
        description: kilosVal ? `Up to ${kilosVal} kg per load` : "",
        estimated_minutes: 90,
        is_available: true,
      };
      setServices((prev) => [...prev, newSrv]);
    }

    setNewServiceName("");
    setNewServicePrice("");
    setNewServiceKilos("8");
  };

  const handleEditService = (srv: ShopService) => {
    setNewServiceName(srv.service_name);
    setNewServicePrice(srv.price ? String(srv.price) : "");
    setNewServiceKilos(srv.kilos ? String(srv.kilos) : "8");
    setEditingServiceId(srv.id);
  };

  const handleRemoveService = (id: string) => {
    if (editingServiceId === id) {
      setEditingServiceId(null);
      setNewServiceName("");
      setNewServicePrice("");
      setNewServiceKilos("8");
    }
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  // Submit Application
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!shopName.trim()) {
      setErrorMessage("Please enter your laundry shop's official business name.");
      return;
    }
    if (!address.trim()) {
      setErrorMessage("Please provide your complete shop physical address.");
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorMessage("Please provide a shop contact phone number.");
      return;
    }
    if (services.length === 0) {
      setErrorMessage("Please add at least one laundry service with load pricing.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitPartnerApplication({
        applicant_id: user?.id || `applicant-${Date.now()}`,
        applicant_name: applicantName.trim() || user?.full_name || "Valued Applicant",
        applicant_email: applicantEmail.trim() || user?.email || "",
        applicant_phone: applicantPhone.trim() || user?.phone_number || "",
        shop_name: shopName.trim(),
        shop_description: description.trim() || "Quality laundry services by our certified partner.",
        shop_address: address.trim(),
        latitude,
        longitude,
        phone_number: phoneNumber.trim(),
        open_time: openTime,
        close_time: closeTime,
        washer_count: washerCount,
        dryer_count: dryerCount,
        max_kilo_per_load: maxKiloPerLoad,
        images,
        services,
        admin_notes: adminNotes.trim() || undefined,
      });

      if (!res.success || !res.application) {
        setErrorMessage(res.error || "Failed to submit application. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setExistingApp(res.application);
      setIsFormVisible(false);
      setSuccessMessage(
        "🎉 Partnership application submitted successfully! Our administrative team will review your shop details. Once approved, your account will gain instant Owner access."
      );

      if (onApplicationSubmitted) {
        onApplicationSubmitted(res.application);
      }
    } catch (err) {
      console.error("Error submitting partner application:", err);
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Existing Application Status Card */}
      {existingApp && (
        <div
          className={`p-5 rounded-2xl border transition-all ${
            existingApp.status === "approved"
              ? "bg-emerald-50/60 border-emerald-300 text-emerald-950"
              : existingApp.status === "rejected"
              ? "bg-rose-50/60 border-rose-300 text-rose-950"
              : "bg-amber-50/70 border-amber-300 text-amber-950"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  existingApp.status === "approved"
                    ? "bg-emerald-600 text-white border-emerald-700"
                    : existingApp.status === "rejected"
                    ? "bg-rose-600 text-white border-rose-700"
                    : "bg-amber-500 text-white border-amber-600"
                }`}
              >
                {existingApp.status === "approved" ? (
                  <CheckCircle2 size={22} />
                ) : existingApp.status === "rejected" ? (
                  <AlertTriangle size={22} />
                ) : (
                  <Clock size={22} className="animate-pulse" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900">
                    {existingApp.shop_name}
                  </h3>
                  <span
                    className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${
                      existingApp.status === "approved"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : existingApp.status === "rejected"
                        ? "bg-rose-100 text-rose-800 border-rose-300"
                        : "bg-amber-100 text-amber-800 border-amber-300"
                    }`}
                  >
                    {existingApp.status === "approved"
                      ? "Approved Partner"
                      : existingApp.status === "rejected"
                      ? "Application Rejected"
                      : "Pending Admin Approval"}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-1">
                  Submitted by <strong>{existingApp.applicant_name}</strong> on{" "}
                  {new Date(existingApp.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>

                {existingApp.admin_notes && (
                  <div className="mt-2 text-xs bg-white/80 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="font-bold text-slate-700 block">Admin Feedback:</span>
                    <span className="text-slate-600">{existingApp.admin_notes}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {existingApp.status === "approved" ? (
                <Link
                  href="/owner"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Store size={14} />
                  <span>Go to Shop Owner Portal</span>
                  <ArrowRight size={13} />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsFormVisible(!isFormVisible)}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  {isFormVisible ? "Hide Application Form" : "Edit & Resubmit Details"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {successMessage && <Alert type="success" message={successMessage} />}
      {errorMessage && <Alert type="error" message={errorMessage} />}

      {/* The Application Form (Matches Add Shop fields exactly) */}
      {isFormVisible && (
        <form onSubmit={handleSubmitApplication} className="space-y-6">
          {/* SECTION 1: APPLICANT DETAILS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Handshake size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">1. Applicant Information</h3>
                <p className="text-xs text-slate-500">
                  Your registered customer account details used for partner verification
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Applicant Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="text-xs h-9"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Applicant Phone Number <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="tel"
                  value={applicantPhone}
                  onChange={(e) => setApplicantPhone(e.target.value)}
                  placeholder="0917 123 4567"
                  className="text-xs h-9"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Applicant Email Address
                </label>
                <Input
                  type="email"
                  value={applicantEmail}
                  onChange={(e) => setApplicantEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: SHOP IDENTITY */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Store size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">2. Laundry Shop Identity</h3>
                <p className="text-xs text-slate-500">
                  Business name, contact hotline, and customer-facing profile description
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Shop / Business Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. LabadaGo Express - Magsaysay Branch"
                  className="text-xs h-9"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Shop Contact Hotline <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 0917 555 4321 or (02) 8123 4567"
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Shop Bio / Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your laundry amenities, detergent choices, turnaround guarantees, and specialized fabric handling..."
                className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 resize-none"
              />
            </div>
          </div>

          {/* SECTION 3: PHYSICAL LOCATION & GPS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">3. Shop Address &amp; Navigation Coordinates</h3>
                <p className="text-xs text-slate-500">
                  Provide exact street address and set your shop map pin for turn-by-turn customer routing
                </p>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Complete Street Address <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Unit/House #, Street Name, Barangay, City, Province"
                className="text-xs h-9"
              />
            </div>

            {/* Interactive Location Picker Map */}
            <div className="pt-1">
              <label className="text-[11px] font-bold text-slate-700 block mb-2">
                Pin Location on Map (Latitude: {latitude.toFixed(4)}, Longitude: {longitude.toFixed(4)})
              </label>
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <ShopLocationPicker
                  latitude={latitude}
                  longitude={longitude}
                  address={address}
                  onChangeCoords={(lat, lng) => {
                    setLatitude(lat);
                    setLongitude(lng);
                  }}
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: OPERATING HOURS & CAPACITY */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">4. Operating Hours &amp; Machine Capacity</h3>
                <p className="text-xs text-slate-500">
                  Store operating times, number of commercial machines, and standard load weight limit
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Opening Time</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="text-xs h-9 flex-1"
                  />
                  <span className="text-xs font-semibold text-slate-500 min-w-[70px]">
                    ({formatTo12Hour(openTime)})
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Closing Time</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="text-xs h-9 flex-1"
                  />
                  <span className="text-xs font-semibold text-slate-500 min-w-[70px]">
                    ({formatTo12Hour(closeTime)})
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Washer Machines</label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={washerCount}
                  onChange={(e) => setWasherCount(parseInt(e.target.value) || 1)}
                  className="text-xs h-9 font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Dryer Machines</label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={dryerCount}
                  onChange={(e) => setDryerCount(parseInt(e.target.value) || 1)}
                  className="text-xs h-9 font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Standard Load Limit (kg)
                </label>
                <Input
                  type="number"
                  min="5"
                  max="25"
                  value={maxKiloPerLoad}
                  onChange={(e) => setMaxKiloPerLoad(parseInt(e.target.value) || 8)}
                  className="text-xs h-9 font-bold"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: SERVICES OFFERED & PRICING */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">5. Laundry Services &amp; Load Pricing</h3>
                  <p className="text-xs text-slate-500">
                    Define the services you will provide to customers with per-load rates
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                {services.length} services configured
              </span>
            </div>

            {/* Configured Services List */}
            <div className="space-y-2">
              {services.map((srv) => (
                <div
                  key={srv.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900">{srv.service_name}</span>
                    <span className="text-[11px] text-slate-500 block">
                      {srv.description || `Standard ${srv.kilos || 8}kg load capacity`}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      ₱{srv.price.toFixed(2)}
                      <span className="text-[10px] text-slate-400 font-normal"> / {srv.unit}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEditService(srv)}
                      className="p-1 rounded text-slate-400 hover:text-blue-600 cursor-pointer"
                      title="Edit Service"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveService(srv.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Delete Service"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add / Edit Service Form Row */}
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
              <span className="text-xs font-bold text-blue-900 block">
                {editingServiceId ? "Edit Service" : "+ Add New Laundry Service"}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                <div className="sm:col-span-6">
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Service Name</label>
                  <input
                    type="text"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="e.g. Wash & Iron, Shoe Cleaning"
                    className="w-full text-xs h-8 px-2.5 rounded-lg bg-white border border-slate-300 focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Price (₱ / load)</label>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    placeholder="₱ Price"
                    className="w-full text-xs h-8 px-2.5 rounded-lg bg-white border border-slate-300 focus:outline-none focus:border-blue-500 text-slate-800 font-bold"
                  />
                </div>

                <div className="sm:col-span-3 flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={handleAddOrUpdateService}
                    className="w-full text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    {editingServiceId ? "Save Edit" : "Add Service"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 6: SHOP PHOTOS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <ImageIcon size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">6. Shop Showcase Photos</h3>
                <p className="text-xs text-slate-500">
                  Upload storefront, interior, and washing equipment photos to showcase your facility
                </p>
              </div>
            </div>

            <ShopImageUploader
              images={images}
              onChange={setImages}
              maxImages={6}
            />
          </div>

          {/* SECTION 7: APPLICANT NOTES / VERIFICATION */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">7. Verification Notes &amp; Permits (Optional)</h3>
                <p className="text-xs text-slate-500">
                  Provide DTI / Mayor&apos;s Permit number or any message for the administrator
                </p>
              </div>
            </div>

            <textarea
              rows={2}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="e.g. DTI Registration #1234567, established in 2024. Ready to operate as an official LabadaGO partner counter."
              className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 resize-none"
            />
          </div>

          {/* SUBMIT BUTTON BAR */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
              <span>By submitting, you apply to become an official LabadaGO Laundry Shop Partner.</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer self-end sm:self-auto"
            >
              <Handshake size={15} />
              <span>{isSubmitting ? "Submitting Application..." : "Submit Partner Application"}</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
