"use client";

import React, { useState, useEffect } from "react";
import { LaundryShop, QueueStatus, ShopService } from "@/types/auth";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ShopLocationPicker } from "./ShopLocationPicker";
import { ShopImageUploader } from "./ShopImageUploader";
import { saveLaundryShop, getLaundryShops } from "@/lib/supabase/auth";
import {
  Store,
  MapPin,
  Clock,
  Phone,
  Settings,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  Layers,
  Sparkles,
  Building2,
  Image as ImageIcon,
  ArrowLeft,
  ArrowRight,
  Pencil,
  ChevronRight,
} from "lucide-react";

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

interface ShopSetupFormProps {
  shops?: LaundryShop[];
  initialShop?: LaundryShop;
  onSaved?: (shop: LaundryShop) => void;
}

export const ShopSetupForm: React.FC<ShopSetupFormProps> = ({
  shops,
  initialShop,
  onSaved,
}) => {
  const [branchList, setBranchList] = useState<LaundryShop[]>(() => {
    if (shops && shops.length > 0) return shops;
    if (initialShop) return [initialShop];
    return [];
  });

  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [shopData, setShopData] = useState<LaundryShop>(
    initialShop || {
      id: `shop-${Date.now()}`,
      name: "",
      description: "",
      address: "",
      latitude: 14.5995,
      longitude: 120.9842,
      phone_number: "",
      open_time: "07:00",
      close_time: "21:00",
      queue_status: "Low",
      is_open: true,
      rating: 5.0,
      total_reviews: 0,
      washer_count: 6,
      dryer_count: 6,
      images: [],
      services: [],
    }
  );

  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState<string>("");
  const [newServiceUnit, setNewServiceUnit] = useState("kg");

  // Keep branchList synchronized with props
  useEffect(() => {
    if (shops && shops.length > 0) {
      setBranchList(shops);
    }
  }, [shops]);

  // Fallback load if branchList is still empty
  useEffect(() => {
    if ((!shops || shops.length === 0) && (!initialShop || !initialShop.name)) {
      getLaundryShops().then((loaded) => {
        if (loaded && loaded.length > 0) {
          setBranchList(loaded);
          if (!initialShop) {
            setShopData(loaded[0]);
          }
        }
      });
    }
  }, [shops, initialShop]);

  const handleShowBranchesList = () => {
    setViewMode("list");
    setIsAddingNew(false);
    setSuccessMessage(null);
  };

  const handleSelectShopToEdit = (branch: LaundryShop) => {
    setShopData({
      ...branch,
      images: branch.images || [],
      services: branch.services || [],
      open_time: branch.open_time || "07:00",
      close_time: branch.close_time || "21:00",
      washer_count: branch.washer_count ?? 6,
      dryer_count: branch.dryer_count ?? 6,
    });
    setIsAddingNew(false);
    setViewMode("form");
    setSuccessMessage(null);
  };

  const handleAddNewShopClick = () => {
    setIsAddingNew(true);
    setViewMode("form");
    setShopData({
      id: `shop-${Date.now()}`,
      name: "",
      description: "",
      address: "",
      latitude: 14.5995,
      longitude: 120.9842,
      phone_number: "",
      open_time: "07:00",
      close_time: "21:00",
      queue_status: "Low",
      is_open: true,
      rating: 5.0,
      total_reviews: 0,
      washer_count: 6,
      dryer_count: 6,
      images: [],
      services: [],
    });
    setSuccessMessage(null);
  };

  const queueOptions: { value: QueueStatus; label: string }[] = [
    { value: "Low", label: "Low Queue • Fast Turnaround" },
    { value: "Moderate", label: "Moderate Queue • 2-3 Loads Waiting" },
    { value: "Busy", label: "Busy Queue • ~45+ mins wait" },
    { value: "Full", label: "Full Capacity • Queue Closed" },
    { value: "Closed", label: "Store Closed" },
  ];

  const handleAddService = () => {
    if (!newServiceName.trim()) return;
    const priceNum = parseFloat(newServicePrice);
    const newSrv: ShopService = {
      id: `srv-${Date.now()}`,
      shop_id: shopData.id,
      service_name: newServiceName.trim(),
      price: isNaN(priceNum) ? 0 : priceNum,
      unit: newServiceUnit,
      estimated_minutes: 90,
    };

    setShopData((prev) => ({
      ...prev,
      services: [...(prev.services || []), newSrv],
    }));

    setNewServiceName("");
    setNewServicePrice("");
  };

  const handleRemoveService = (serviceId: string) => {
    setShopData((prev) => ({
      ...prev,
      services: (prev.services || []).filter((s) => s.id !== serviceId),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage(null);

    // Auto-commit any typed service that wasn't submitted with the "+ Add" button yet
    let currentServices = [...(shopData.services || [])];
    if (newServiceName.trim()) {
      const priceNum = parseFloat(newServicePrice);
      currentServices.push({
        id: `srv-${Date.now()}`,
        shop_id: shopData.id,
        service_name: newServiceName.trim(),
        price: isNaN(priceNum) ? 0 : priceNum,
        unit: newServiceUnit,
        estimated_minutes: 90,
        is_available: true,
      });
      setNewServiceName("");
      setNewServicePrice("");
    }

    const dataToSave: LaundryShop = {
      ...shopData,
      services: currentServices,
    };

    try {
      const result = await saveLaundryShop(dataToSave);
      setIsLoading(false);
      const photoCount = result.shop.images?.length || 0;
      const srvCount = result.shop.services?.length || 0;
      setSuccessMessage(
        isAddingNew
          ? `New laundry shop "${result.shop.name || "My Shop"}" registered with ${srvCount} service(s) & ${photoCount} photo(s) saved to Supabase!`
          : `Laundry shop "${result.shop.name}" updated with ${srvCount} service(s) & saved to Supabase!`
      );
      setShopData(result.shop);
      setBranchList((prev) => {
        const idx = prev.findIndex((s) => s.id === result.shop.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = result.shop;
          return next;
        }
        return [result.shop, ...prev];
      });
      if (onSaved) {
        onSaved(result.shop);
      }
    } catch {
      setIsLoading(false);
      setSuccessMessage("Shop saved locally and pinned to LabadaGo live map!");
      setBranchList((prev) => {
        const idx = prev.findIndex((s) => s.id === dataToSave.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = dataToSave;
          return next;
        }
        return [dataToSave, ...prev];
      });
      if (onSaved) {
        onSaved(dataToSave);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 size={16} className="text-emerald-600" />
            {viewMode === "list"
              ? "Your Laundry Branches"
              : isAddingNew
              ? "Register a New Laundry Branch"
              : `Edit Branch: ${shopData.name || "Default Branch"}`}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {viewMode === "list"
              ? `Select a branch below to edit its profile, pricing, queue, or location (${branchList.length} branch${branchList.length === 1 ? "" : "es"} registered).`
              : isAddingNew
              ? "Fill out details and set location via live GPS or manual interactive map pin."
              : "Update branch profile, operating hours, active services, machines, or map pin."}
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 shrink-0">
          <button
            type="button"
            onClick={handleShowBranchesList}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
              viewMode === "list"
                ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Store size={13} />
            <span>Edit Current Branch</span>
            {branchList.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold border border-slate-200">
                {branchList.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={handleAddNewShopClick}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
              viewMode === "form" && isAddingNew
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-emerald-700"
            }`}
          >
            <Plus size={13} />
            <span>+ Add New Shop</span>
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        /* ==================== BRANCHES LIST VIEW ==================== */
        <div className="space-y-4">
          {successMessage && <Alert type="success" message={successMessage} />}

          {branchList.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                <Building2 size={28} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No Branches Registered Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  You haven&apos;t registered any laundry shop branch yet. Click below to add your first branch and pin it to the LabadaGo live map!
                </p>
              </div>
              <Button
                type="button"
                variant="success"
                size="md"
                onClick={handleAddNewShopClick}
                leftIcon={<Plus size={16} />}
              >
                Register First Branch
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {branchList.map((branch) => {
                const queueBadgeColor =
                  branch.queue_status === "Low"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : branch.queue_status === "Moderate"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : branch.queue_status === "Busy"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : branch.queue_status === "Full"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-slate-100 text-slate-700 border-slate-200";

                const hasImage = branch.images && branch.images.length > 0;

                return (
                  <div
                    key={branch.id}
                    onClick={() => handleSelectShopToEdit(branch)}
                    className="group bg-white rounded-2xl border border-slate-200 hover:border-emerald-500/80 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Branch Card Banner / Image */}
                      {hasImage ? (
                        <div className="relative h-40 w-full bg-slate-100 overflow-hidden">
                          <img
                            src={branch.images![0]}
                            alt={branch.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-black/20" />

                          {/* Status Pills */}
                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-xs ${
                                branch.is_open
                                  ? "bg-emerald-600 text-white"
                                  : "bg-rose-600 text-white"
                              }`}
                            >
                              {branch.is_open ? "Open" : "Closed"}
                            </span>
                          </div>

                          <div className="absolute top-3 right-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-xs shadow-xs ${queueBadgeColor}`}
                            >
                              {branch.queue_status || "Low"} Queue
                            </span>
                          </div>

                          {branch.images!.length > 1 && (
                            <div className="absolute bottom-2.5 right-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                              📷 {branch.images!.length} photos
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative h-32 w-full bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 p-4 flex flex-col justify-between text-white overflow-hidden">
                          <div className="absolute -right-4 -bottom-4 opacity-15 pointer-events-none">
                            <Store size={96} />
                          </div>

                          <div className="flex items-center justify-between z-10">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                                branch.is_open
                                  ? "bg-emerald-500/90 text-white"
                                  : "bg-rose-500/90 text-white"
                              }`}
                            >
                              {branch.is_open ? "Open" : "Closed"}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${queueBadgeColor}`}
                            >
                              {branch.queue_status || "Low"} Queue
                            </span>
                          </div>

                          <div className="z-10">
                            <h4 className="font-bold text-white text-sm line-clamp-1">
                              {branch.name || "Laundry Branch"}
                            </h4>
                          </div>
                        </div>
                      )}

                      {/* Card Details */}
                      <div className="p-4 space-y-2.5">
                        <div>
                          <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                            {branch.name || "Unnamed Branch"}
                          </h3>
                          <p className="text-xs text-slate-500 flex items-start gap-1.5 mt-1">
                            <MapPin size={13} className="shrink-0 text-slate-400 mt-0.5" />
                            <span className="line-clamp-2">{branch.address || "Address not set"}</span>
                          </p>
                        </div>

                        {branch.phone_number && (
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Phone size={12} className="text-slate-400 shrink-0" />
                            <span>{branch.phone_number}</span>
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <Clock size={12} className="text-emerald-600 shrink-0" />
                          <span className="font-medium">
                            {formatTo12Hour(branch.open_time) || "7:00 AM"} – {formatTo12Hour(branch.close_time) || "9:00 PM"}
                          </span>
                        </div>

                        {/* Machine & Services Info */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 text-center">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Capacity</span>
                            <span className="text-xs font-bold text-slate-800">
                              {branch.washer_count || 0}W • {branch.dryer_count || 0}D
                            </span>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 text-center">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Services</span>
                            <span className="text-xs font-bold text-emerald-700">
                              {branch.services?.length || 0} Active
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="p-4 pt-0">
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-600 group-hover:text-emerald-700 flex items-center gap-1.5">
                          <Pencil size={13} />
                          Click to Edit Branch
                        </span>
                        <span className="p-1.5 rounded-lg bg-slate-50 group-hover:bg-emerald-600 group-hover:text-white text-slate-400 transition-colors">
                          <ArrowRight size={13} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ==================== BRANCH EDIT / ADD FORM VIEW ==================== */
        <div className="space-y-4">
          {/* Top Return Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={handleShowBranchesList}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 cursor-pointer transition-all w-fit"
            >
              <ArrowLeft size={14} />
              <span>← Back to All Branches ({branchList.length})</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {isAddingNew ? "Mode: Registering New Branch" : "Currently Editing: "}
              </span>
              {!isAddingNew && (
                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                  {shopData.name || "Untitled Branch"}
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {successMessage && <Alert type="success" message={successMessage} />}

        {/* Basic Shop Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Store size={18} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              {isAddingNew ? "New Shop Profile & Contact" : "Shop Profile & Contact"}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Shop Name"
              placeholder="e.g. LabadaGo Laundry Hub"
              value={shopData.name}
              onChange={(e) => setShopData({ ...shopData, name: e.target.value })}
              leftIcon={<Store size={15} />}
              required
            />

            <Input
              label="Phone Number"
              placeholder="0917-123-4567"
              value={shopData.phone_number}
              onChange={(e) => setShopData({ ...shopData, phone_number: e.target.value })}
              leftIcon={<Phone size={15} />}
              required
            />
          </div>

          <Input
            label="Physical Address & Landmark"
            placeholder="e.g. 123 Main Street, Barangay San Antonio, City"
            value={shopData.address}
            onChange={(e) => setShopData({ ...shopData, address: e.target.value })}
            leftIcon={<MapPin size={15} />}
            required
          />

          {/* Location Picker (Live GPS vs Manual Map Pin) */}
          <div className="pt-2 border-t border-slate-100">
            <ShopLocationPicker
              latitude={shopData.latitude}
              longitude={shopData.longitude}
              address={shopData.address}
              onChangeCoords={(lat, lng) =>
                setShopData((prev) => ({
                  ...prev,
                  latitude: lat,
                  longitude: lng,
                }))
              }
            />
          </div>
        </div>

        {/* Shop Photos & Gallery (Cloudinary Unsigned Upload) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <ImageIcon size={18} className="text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Shop Photos & Facade (Cloudinary)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upload multiple images of your storefront, washing machines, and folding area. Links are saved directly to Supabase.
              </p>
            </div>
          </div>

          <ShopImageUploader
            images={shopData.images || []}
            onChange={(updatedImages) =>
              setShopData((prev) => ({
                ...prev,
                images: updatedImages,
              }))
            }
            maxImages={8}
          />
        </div>

      {/* Operating Hours & Live Queue Status */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Hours, Queue & Capacity</h3>
          </div>

          {/* Quick Schedule Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-medium">Quick Presets:</span>
            <button
              type="button"
              onClick={() => setShopData((prev) => ({ ...prev, open_time: "07:00", close_time: "21:00" }))}
              className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 cursor-pointer transition-colors"
            >
              7 AM – 9 PM
            </button>
            <button
              type="button"
              onClick={() => setShopData((prev) => ({ ...prev, open_time: "06:00", close_time: "22:00" }))}
              className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 cursor-pointer transition-colors"
            >
              6 AM – 10 PM
            </button>
            <button
              type="button"
              onClick={() => setShopData((prev) => ({ ...prev, open_time: "08:00", close_time: "20:00" }))}
              className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 cursor-pointer transition-colors"
            >
              8 AM – 8 PM
            </button>
            <button
              type="button"
              onClick={() => setShopData((prev) => ({ ...prev, open_time: "00:00", close_time: "23:59" }))}
              className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 cursor-pointer transition-colors"
            >
              24/7 Open
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Opening Time */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="open-time" className="text-xs font-medium text-slate-700">
                Opening Time
              </label>
              {shopData.open_time && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {formatTo12Hour(shopData.open_time)}
                </span>
              )}
            </div>
            <Input
              id="open-time"
              type="time"
              value={shopData.open_time}
              onChange={(e) => setShopData({ ...shopData, open_time: e.target.value })}
              leftIcon={<Clock size={15} />}
            />
            {/* Quick Opening Time Pills */}
            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              {["06:00", "07:00", "08:00", "09:00"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setShopData((prev) => ({ ...prev, open_time: t }))}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium border cursor-pointer transition-colors ${
                    shopData.open_time === t
                      ? "bg-emerald-600 text-white border-emerald-600 font-semibold"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {formatTo12Hour(t)}
                </button>
              ))}
            </div>
          </div>

          {/* Closing Time */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="close-time" className="text-xs font-medium text-slate-700">
                Closing Time
              </label>
              {shopData.close_time && (
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  {formatTo12Hour(shopData.close_time)}
                </span>
              )}
            </div>
            <Input
              id="close-time"
              type="time"
              value={shopData.close_time}
              onChange={(e) => setShopData({ ...shopData, close_time: e.target.value })}
              leftIcon={<Clock size={15} />}
            />
            {/* Quick Closing Time Pills */}
            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              {["19:00", "20:00", "21:00", "22:00"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setShopData((prev) => ({ ...prev, close_time: t }))}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium border cursor-pointer transition-colors ${
                    shopData.close_time === t
                      ? "bg-blue-600 text-white border-blue-600 font-semibold"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {formatTo12Hour(t)}
                </button>
              ))}
            </div>
          </div>

          {/* Current Queue Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Current Queue Status</label>
            <Select
              value={shopData.queue_status}
              onChange={(e) => setShopData({ ...shopData, queue_status: e.target.value as QueueStatus })}
              options={queueOptions}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <Input
            type="number"
            min="1"
            placeholder="e.g. 6"
            label="Washer Machines Count"
            value={shopData.washer_count === 0 ? "" : (shopData.washer_count ?? "")}
            onChange={(e) =>
              setShopData({
                ...shopData,
                washer_count: e.target.value === "" ? (undefined as any) : parseInt(e.target.value) || 0,
              })
            }
            onKeyDown={(e) => {
              if (
                (e.key === "Backspace" || e.key === "Delete") &&
                e.currentTarget.value === "0"
              ) {
                setShopData({ ...shopData, washer_count: undefined as any });
              }
            }}
            onFocus={(e) => {
              if (e.target.value === "0") {
                setShopData({ ...shopData, washer_count: undefined as any });
              } else {
                e.target.select();
              }
            }}
          />

          <Input
            type="number"
            min="1"
            placeholder="e.g. 6"
            label="Dryer Machines Count"
            value={shopData.dryer_count === 0 ? "" : (shopData.dryer_count ?? "")}
            onChange={(e) =>
              setShopData({
                ...shopData,
                dryer_count: e.target.value === "" ? (undefined as any) : parseInt(e.target.value) || 0,
              })
            }
            onKeyDown={(e) => {
              if (
                (e.key === "Backspace" || e.key === "Delete") &&
                e.currentTarget.value === "0"
              ) {
                setShopData({ ...shopData, dryer_count: undefined as any });
              }
            }}
            onFocus={(e) => {
              if (e.target.value === "0") {
                setShopData({ ...shopData, dryer_count: undefined as any });
              } else {
                e.target.select();
              }
            }}
          />
        </div>
      </div>

      {/* Services and Pricing Catalog */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Laundry Services & Pricing</h3>
          </div>
          <span className="text-xs text-slate-400">
            {shopData.services?.length || 0} active services
          </span>
        </div>

        {/* Existing Services List */}
        <div className="space-y-2">
          {shopData.services?.map((srv) => (
            <div
              key={srv.id}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/60"
            >
              <div>
                <span className="font-semibold text-xs text-slate-900">{srv.service_name}</span>
                <span className="text-xs text-slate-500 ml-2">
                  ₱{srv.price} per {srv.unit}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveService(srv.id)}
                className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                title="Remove Service"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] text-slate-400 font-medium">Quick Suggestions:</span>
          {[
            { name: "Wash, Dry & Fold", price: "45", unit: "kg" },
            { name: "Wash & Dry", price: "35", unit: "kg" },
            { name: "Wash Only", price: "25", unit: "kg" },
            { name: "Dry Only", price: "25", unit: "kg" },
            { name: "Comforter / Blanket", price: "180", unit: "piece" },
            { name: "Dry Cleaning", price: "150", unit: "piece" },
          ].map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                setNewServiceName(preset.name);
                setNewServicePrice(preset.price);
                setNewServiceUnit(preset.unit);
              }}
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 cursor-pointer transition-colors"
            >
              + {preset.name} (₱{preset.price})
            </button>
          ))}
        </div>

        {/* Add New Service Line */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="sm:col-span-6">
            <Input
              placeholder="e.g. Dry Cleaning / Delicate Wash"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
            />
          </div>
          <div className="sm:col-span-3">
            <Input
              type="number"
              placeholder="Price (₱)"
              value={newServicePrice}
              onChange={(e) => setNewServicePrice(e.target.value)}
              onKeyDown={(e) => {
                if (
                  (e.key === "Backspace" || e.key === "Delete") &&
                  (newServicePrice === "0" || newServicePrice === "0.0")
                ) {
                  e.preventDefault();
                  setNewServicePrice("");
                }
              }}
              onFocus={(e) => {
                if (e.target.value === "0") {
                  setNewServicePrice("");
                } else {
                  e.target.select();
                }
              }}
            />
          </div>
          <div className="sm:col-span-3 flex items-center gap-2">
            <select
              value={newServiceUnit}
              onChange={(e) => setNewServiceUnit(e.target.value)}
              className="h-9 px-2 text-xs rounded-lg border border-slate-200 bg-white"
            >
              <option value="kg">per kg</option>
              <option value="piece">per pc</option>
              <option value="load">per load</option>
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddService}
              leftIcon={<Plus size={14} />}
              className="text-xs shrink-0"
            >
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleShowBranchesList}
          leftIcon={<ArrowLeft size={16} />}
        >
          Back to Branches
        </Button>

        <Button
          type="submit"
          variant="success"
          size="lg"
          isLoading={isLoading}
          leftIcon={<Save size={16} />}
        >
          {isAddingNew ? "Register & Publish Shop" : "Save Shop Settings"}
        </Button>
      </div>
    </form>
    </div>
  )}
  </div>
  );
};

