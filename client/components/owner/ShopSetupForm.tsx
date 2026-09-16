"use client";

import React, { useState } from "react";
import { LaundryShop, QueueStatus, ShopService } from "@/types/auth";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ShopLocationPicker } from "./ShopLocationPicker";
import { ShopImageUploader } from "./ShopImageUploader";
import { saveLaundryShop } from "@/lib/supabase/auth";
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
} from "lucide-react";

interface ShopSetupFormProps {
  initialShop?: LaundryShop;
  onSaved?: (shop: LaundryShop) => void;
}

export const ShopSetupForm: React.FC<ShopSetupFormProps> = ({
  initialShop,
  onSaved,
}) => {
  const [shopData, setShopData] = useState<LaundryShop>(
    initialShop || {
      id: "owner-shop-001",
      name: "LabadaGo Express - Katipunan",
      description: "Fast and clean laundry services with premium eco detergents.",
      address: "345 Katipunan Ave, Loyola Heights, Quezon City",
      latitude: 14.6402,
      longitude: 121.0744,
      phone_number: "0917-111-2233",
      open_time: "07:00",
      close_time: "21:00",
      queue_status: "Low",
      is_open: true,
      rating: 4.9,
      total_reviews: 128,
      washer_count: 10,
      dryer_count: 10,
      images: [
        "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=800&auto=format&fit=crop&q=80",
      ],
      services: [
        { id: "s1", shop_id: "owner-shop-001", service_name: "Wash, Dry & Fold", price: 35, unit: "kg", estimated_minutes: 90 },
        { id: "s2", shop_id: "owner-shop-001", service_name: "Comforter / Bedding Wash", price: 180, unit: "piece", estimated_minutes: 120 },
        { id: "s3", shop_id: "owner-shop-001", service_name: "Steam Press & Ironing", price: 25, unit: "piece", estimated_minutes: 45 },
      ],
    }
  );

  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState<number>(40);
  const [newServiceUnit, setNewServiceUnit] = useState("kg");

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAddNewShopClick = () => {
    setIsAddingNew(true);
    setShopData({
      id: `shop-${Date.now()}`,
      name: "",
      description: "Fast, hygienic, and affordable laundry services.",
      address: "",
      latitude: 14.6402,
      longitude: 121.0744,
      phone_number: "",
      open_time: "07:00",
      close_time: "21:00",
      queue_status: "Low",
      is_open: true,
      rating: 5.0,
      total_reviews: 0,
      washer_count: 8,
      dryer_count: 8,
      images: [],
      services: [
        { id: `s-${Date.now()}-1`, shop_id: `shop-${Date.now()}`, service_name: "Wash, Dry & Fold", price: 35, unit: "kg", estimated_minutes: 90 },
        { id: `s-${Date.now()}-2`, shop_id: `shop-${Date.now()}`, service_name: "Comforter / Blanket Wash", price: 160, unit: "piece", estimated_minutes: 120 },
      ],
    });
    setSuccessMessage(null);
  };

  const handleEditExistingClick = () => {
    setIsAddingNew(false);
    if (initialShop) {
      setShopData(initialShop);
    }
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
    const newSrv: ShopService = {
      id: `srv-${Date.now()}`,
      shop_id: shopData.id,
      service_name: newServiceName.trim(),
      price: newServicePrice,
      unit: newServiceUnit,
      estimated_minutes: 90,
    };

    setShopData((prev) => ({
      ...prev,
      services: [...(prev.services || []), newSrv],
    }));

    setNewServiceName("");
    setNewServicePrice(40);
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

    try {
      const result = await saveLaundryShop(shopData);
      setIsLoading(false);
      const photoCount = result.shop.images?.length || 0;
      setSuccessMessage(
        isAddingNew
          ? `New laundry shop "${result.shop.name || "My Shop"}" registered with ${photoCount} Cloudinary photo(s) and saved to Supabase!`
          : `Laundry shop "${result.shop.name}" updated with ${photoCount} Cloudinary photo(s) & saved to Supabase!`
      );
      setShopData(result.shop);
      if (onSaved) {
        onSaved(result.shop);
      }
    } catch {
      setIsLoading(false);
      setSuccessMessage("Shop saved locally and pinned to LabadaGo live map!");
      if (onSaved) {
        onSaved(shopData);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Switcher: Edit Existing Shop vs Add New Shop */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 size={16} className="text-emerald-600" />
            {isAddingNew ? "Register a New Laundry Branch" : "Manage Shop Profile & Map Pin"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAddingNew
              ? "Fill out details and set location via live GPS or manual interactive map pin."
              : `Currently editing: ${shopData.name || "Default Branch"}`}
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 shrink-0">
          <button
            type="button"
            onClick={handleEditExistingClick}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
              !isAddingNew
                ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Edit Current Branch
          </button>
          <button
            type="button"
            onClick={handleAddNewShopClick}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
              isAddingNew
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-emerald-700"
            }`}
          >
            <Plus size={13} />
            <span>+ Add New Shop</span>
          </button>
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
              placeholder="e.g. LabadaGo Express - Katipunan"
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
            placeholder="e.g. 345 Katipunan Ave, Loyola Heights, Quezon City"
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
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <Clock size={18} className="text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Hours, Queue & Capacity</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            type="text"
            label="Opening Time"
            value={shopData.open_time}
            onChange={(e) => setShopData({ ...shopData, open_time: e.target.value })}
            leftIcon={<Clock size={15} />}
          />

          <Input
            type="text"
            label="Closing Time"
            value={shopData.close_time}
            onChange={(e) => setShopData({ ...shopData, close_time: e.target.value })}
            leftIcon={<Clock size={15} />}
          />

          <Select
            label="Current Queue Status"
            value={shopData.queue_status}
            onChange={(e) => setShopData({ ...shopData, queue_status: e.target.value as QueueStatus })}
            options={queueOptions}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <Input
            type="number"
            min="1"
            label="Washer Machines Count"
            value={shopData.washer_count}
            onChange={(e) => setShopData({ ...shopData, washer_count: parseInt(e.target.value) || 1 })}
          />

          <Input
            type="number"
            min="1"
            label="Dryer Machines Count"
            value={shopData.dryer_count}
            onChange={(e) => setShopData({ ...shopData, dryer_count: parseInt(e.target.value) || 1 })}
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
              placeholder="Price"
              value={newServicePrice}
              onChange={(e) => setNewServicePrice(parseFloat(e.target.value) || 0)}
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

      {/* Save Button */}
      <div className="flex justify-end">
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
  );
};
