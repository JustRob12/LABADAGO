"use client";

import React, { useState, useEffect, useMemo } from "react";
import { LaundryShop, BranchStaffMember } from "@/types/auth";
import {
  getBranchStaff,
  registerStaffMember,
  updateStaffMember,
  deleteStaffMember,
} from "@/lib/supabase/auth";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import {
  Users,
  UserCheck,
  Clock,
  Shield,
  Plus,
  Search,
  Download,
  Eye,
  Pencil,
  Trash2,
  Calendar,
  Bell,
  User,
  Lock,
  Key,
  Phone,
  Mail,
  X,
  Check,
  Store,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  UserPlus,
  RefreshCw,
  Camera,
  UploadCloud,
  Loader2,
  Sparkles,
} from "lucide-react";

interface BranchStaffManagementProps {
  shops: LaundryShop[];
  currentShop: LaundryShop | null;
  ownerId?: string;
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-slate-200 text-slate-700",
  "bg-sky-100 text-sky-700",
  "bg-pink-100 text-pink-700",
  "bg-orange-100 text-orange-700",
];

function getInitials(name: string): string {
  if (!name) return "ST";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "May 12, 2024";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export const BranchStaffManagement: React.FC<BranchStaffManagementProps> = ({
  shops,
  currentShop,
  ownerId,
}) => {
  const [selectedShopId, setSelectedShopId] = useState<string>(
    currentShop?.id || (shops.length > 0 ? shops[0].id : "")
  );

  const [staffList, setStaffList] = useState<BranchStaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State (Matches Screenshot)
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All Roles");
  const [statusFilter, setStatusFilter] = useState<string>("All Status");

  // Modal 1: + Add New Staff (Registration with Username & Password)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newBirthdate, setNewBirthdate] = useState("");
  const [newGender, setNewGender] = useState("Female");
  const [newProfilePicture, setNewProfilePicture] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [newRole, setNewRole] = useState("Counter Staff");
  const [newStatus, setNewStatus] = useState<"Active" | "Inactive" | "On Leave">("Active");
  const [newAssignedShopId, setNewAssignedShopId] = useState(selectedShopId || (shops[0]?.id || ""));
  const [isRegistering, setIsRegistering] = useState(false);

  // Modal 2: Edit Staff
  const [editingStaff, setEditingStaff] = useState<BranchStaffMember | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState("Counter Staff");
  const [editStatus, setEditStatus] = useState<"Active" | "Inactive" | "On Leave">("Active");
  const [editPhone, setEditPhone] = useState("");
  const [editBirthdate, setEditBirthdate] = useState("");
  const [editGender, setEditGender] = useState("Female");
  const [editProfilePicture, setEditProfilePicture] = useState("");
  const [isUploadingEditPhoto, setIsUploadingEditPhoto] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal 3: View Staff
  const [viewingStaff, setViewingStaff] = useState<BranchStaffMember | null>(null);

  // Modal 4: Delete Confirmation
  const [deletingStaff, setDeletingStaff] = useState<BranchStaffMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cloudinary Photo Upload Handler
  const handleUploadPhoto = async (file: File, isEdit: boolean = false) => {
    if (isEdit) setIsUploadingEditPhoto(true);
    else setIsUploadingPhoto(true);

    try {
      const url = await uploadImageToCloudinary(file);
      if (isEdit) {
        setEditProfilePicture(url);
      } else {
        setNewProfilePicture(url);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to upload image to Cloudinary.");
    } finally {
      if (isEdit) setIsUploadingEditPhoto(false);
      else setIsUploadingPhoto(false);
    }
  };

  // Feedback Banners
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load Staff
  const loadStaffData = async () => {
    setIsLoading(true);
    try {
      const data = await getBranchStaff(selectedShopId || undefined, ownerId);
      setStaffList(data);
    } catch (err) {
      console.error("Failed to load staff:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaffData();
  }, [selectedShopId]);

  // Ensure assigned shop ID is updated if selected shop changes
  useEffect(() => {
    if (selectedShopId) {
      setNewAssignedShopId(selectedShopId);
    }
  }, [selectedShopId]);

  // Filtered List
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      // Role filter
      if (roleFilter !== "All Roles") {
        if (s.role_title?.toLowerCase() !== roleFilter.toLowerCase()) return false;
      }
      // Status filter
      if (statusFilter !== "All Status") {
        if (s.status?.toLowerCase() !== statusFilter.toLowerCase()) return false;
      }
      // Search query (name, email, role)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.full_name.toLowerCase().includes(q);
        const matchesEmail = (s.email || "").toLowerCase().includes(q);
        const matchesRole = (s.role_title || "").toLowerCase().includes(q);
        const matchesCode = (s.staff_id_code || "").toLowerCase().includes(q);
        const matchesContact = s.phone_number.includes(q);
        if (!matchesName && !matchesEmail && !matchesRole && !matchesCode && !matchesContact) {
          return false;
        }
      }
      return true;
    });
  }, [staffList, roleFilter, statusFilter, searchQuery]);

  // Metric counts (Matching Screenshot Tiles)
  const totalStaffCount = staffList.length;
  const activeStaffCount = staffList.filter((s) => (s.status || "Active") === "Active").length;
  const onLeaveStaffCount = staffList.filter((s) => s.status === "On Leave").length;

  // Count unique roles
  const uniqueRolesCount = useMemo(() => {
    const roles = new Set(staffList.map((s) => s.role_title || "Staff"));
    return Math.max(roles.size, 3);
  }, [staffList]);

  // Handle Register New Staff with Username & Password
  const handleRegisterStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) {
      alert("Please enter the staff member's full name.");
      return;
    }
    if (!newEmail.trim()) {
      alert("Please enter staff username or email address.");
      return;
    }
    if (!newPassword.trim() || newPassword.length < 6) {
      alert("Please enter a login password (at least 6 characters).");
      return;
    }
    if (!newPhone.trim()) {
      alert("Please enter staff contact phone number.");
      return;
    }

    setIsRegistering(true);
    try {
      const res = await registerStaffMember({
        shopId: newAssignedShopId || selectedShopId || shops[0]?.id || "",
        fullName: newFullName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        phoneNumber: newPhone.trim(),
        birthdate: newBirthdate || undefined,
        gender: newGender,
        profilePicture: newProfilePicture || undefined,
        roleTitle: newRole,
        status: newStatus,
      });

      if (res.success && res.staff) {
        setToastMessage({
          type: "success",
          text: `🎉 Staff account registered! ${res.staff.full_name} (${res.staff.email}) can now log into /login with their password to operate the counter scanner station.`,
        });
        setIsAddModalOpen(false);

        // Reset form
        setNewFullName("");
        setNewEmail("");
        setNewPassword("");
        setNewPhone("");
        setNewBirthdate("");
        setNewGender("Female");
        setNewProfilePicture("");
        setNewRole("Counter Staff");
        setNewStatus("Active");

        await loadStaffData();
      } else {
        setToastMessage({ type: "error", text: res.error || "Failed to register staff account." });
      }
    } catch {
      setToastMessage({ type: "error", text: "An error occurred while creating staff account." });
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle Edit Staff
  const handleOpenEdit = (staff: BranchStaffMember) => {
    setEditingStaff(staff);
    setEditFullName(staff.full_name);
    setEditRole(staff.role_title || "Counter Staff");
    setEditStatus(staff.status || "Active");
    setEditPhone(staff.phone_number);
    setEditBirthdate(staff.birthdate || "");
    setEditGender(staff.gender || "Female");
    setEditProfilePicture(staff.profile_picture || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setIsUpdating(true);
    try {
      const res = await updateStaffMember(editingStaff.id, {
        full_name: editFullName.trim(),
        role_title: editRole,
        status: editStatus,
        phone_number: editPhone.trim(),
        birthdate: editBirthdate || null,
        gender: editGender || null,
        profile_picture: editProfilePicture || null,
      });

      if (res.success) {
        setToastMessage({
          type: "success",
          text: `Updated details for ${editFullName}.`,
        });
        setEditingStaff(null);
        await loadStaffData();
      } else {
        setToastMessage({ type: "error", text: res.error || "Failed to update staff." });
      }
    } catch {
      setToastMessage({ type: "error", text: "An error occurred while updating." });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Delete Staff
  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    setIsDeleting(true);
    try {
      const res = await deleteStaffMember(deletingStaff.id);
      if (res.success) {
        setToastMessage({
          type: "success",
          text: `Removed staff member ${deletingStaff.full_name}.`,
        });
        setDeletingStaff(null);
        await loadStaffData();
      } else {
        setToastMessage({ type: "error", text: res.error || "Failed to remove staff." });
      }
    } catch {
      setToastMessage({ type: "error", text: "An error occurred while removing staff." });
    } finally {
      setIsDeleting(false);
    }
  };

  // Export Staff Table to CSV
  const handleExportCSV = () => {
    if (staffList.length === 0) return;
    const headers = ["Staff ID", "Full Name", "Email", "Role", "Status", "Contact", "Date Joined"];
    const rows = staffList.map((s) => [
      s.staff_id_code || s.id,
      s.full_name,
      s.email || "",
      s.role_title || "Staff",
      s.status || "Active",
      s.phone_number,
      formatDate(s.created_at),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `staff_members_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-md ${
            toastMessage.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle size={18} className="text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* TOP HEADER (Matches Screenshot) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Staff Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Manage your staff accounts, roles, and access permissions.
            </p>
          </div>

          {/* Top Right Controls: Date Pill, Notification Bell, User Avatar, and + Add New Staff Button */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Branch Switcher Dropdown */}
            {shops.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
                <Store size={13} className="text-blue-600 shrink-0" />
                <select
                  value={selectedShopId}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="">All Branches</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Display Pill */}
            <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700">
              <Calendar size={14} className="text-slate-400" />
              <span>
                {new Date().toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  weekday: "short",
                })}
              </span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                title="Notifications"
              >
                <Bell size={16} />
              </button>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                1
              </span>
            </div>

            {/* Shop Owner Avatar Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                <User size={12} />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">Owner</div>
                <div className="text-[10px] text-slate-400">Shop Owner</div>
              </div>
            </div>

            {/* + Add New Staff Primary Button (Matching Royal Blue #2563EB) */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer hover:shadow-md"
            >
              <Plus size={15} />
              <span>+ Add New Staff</span>
            </button>
          </div>
        </div>

        {/* 4 METRIC TILES (Matches Screenshot Exactly) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {/* Tile 1: Total Staff */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users size={17} />
              </div>
              <span className="text-xs text-slate-400 font-medium">All accounts</span>
            </div>
            <div className="text-2xl font-black text-slate-900 pt-1">{totalStaffCount}</div>
            <div className="text-xs font-semibold text-slate-600">Total Staff</div>
          </div>

          {/* Tile 2: Active Staff */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheck size={17} />
              </div>
              <span className="text-xs text-slate-400 font-medium">Currently active</span>
            </div>
            <div className="text-2xl font-black text-slate-900 pt-1">{activeStaffCount}</div>
            <div className="text-xs font-semibold text-slate-600">Active Staff</div>
          </div>

          {/* Tile 3: On Leave */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={17} />
              </div>
              <span className="text-xs text-slate-400 font-medium">On leave today</span>
            </div>
            <div className="text-2xl font-black text-slate-900 pt-1">{onLeaveStaffCount}</div>
            <div className="text-xs font-semibold text-slate-600">On Leave</div>
          </div>

          {/* Tile 4: Roles */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Shield size={17} />
              </div>
              <span className="text-xs text-slate-400 font-medium">System roles</span>
            </div>
            <div className="text-2xl font-black text-slate-900 pt-1">{uniqueRolesCount}</div>
            <div className="text-xs font-semibold text-slate-600">Roles</div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR (Matches Screenshot) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by name, email, or role..."
            className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 text-slate-800 transition-colors"
          />
        </div>

        {/* Filters and Export Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Roles Dropdown */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="All Roles">All Roles</option>
            <option value="Staff">Staff</option>
            <option value="Manager">Manager</option>
            <option value="Administrator">Administrator</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="All Status">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="On Leave">On Leave</option>
          </select>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download CSV export"
          >
            <Download size={14} className="text-slate-500" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* STAFF MEMBERS TABLE (Matches Screenshot Table Format) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-bold">Staff ID</th>
                <th className="py-3.5 px-4 font-bold">Staff Name</th>
                <th className="py-3.5 px-4 font-bold">Role</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold">Contact</th>
                <th className="py-3.5 px-4 font-bold">Date Joined</th>
                <th className="py-3.5 px-4 font-bold text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users size={36} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-700">No staff members found.</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Click &quot;+ Add New Staff&quot; above to register your first staff account.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff, idx) => {
                  const initials = getInitials(staff.full_name);
                  const colorClass = staff.avatar_color || AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  const staffCode = staff.staff_id_code || `STF-${String(idx + 1).padStart(3, "0")}`;

                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* 1. Staff ID */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                        {staffCode}
                      </td>

                      {/* 2. Staff Name with Cloudinary / Initials Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {staff.profile_picture ? (
                            <img
                              src={staff.profile_picture}
                              alt={staff.full_name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${colorClass}`}
                            >
                              {initials}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 leading-tight flex items-center gap-1.5 flex-wrap">
                              <span>{staff.full_name}</span>
                              {staff.gender && (
                                <span className="text-[10px] text-slate-500 font-semibold px-1.5 py-0.2 rounded bg-slate-100">
                                  {staff.gender}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                              {staff.email || "No email specified"}
                              {staff.birthdate && (
                                <span className="text-slate-400"> • Born {formatDate(staff.birthdate)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                            staff.role_title === "Manager"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : staff.role_title === "Administrator"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {staff.role_title || "Staff"}
                        </span>
                      </td>

                      {/* 4. Status (Dot + Label) */}
                      <td className="py-3.5 px-4">
                        <span className="flex items-center gap-1.5 font-semibold text-[11px]">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              staff.status === "Inactive"
                                ? "bg-rose-500"
                                : staff.status === "On Leave"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                          />
                          <span
                            className={
                              staff.status === "Inactive"
                                ? "text-rose-600"
                                : staff.status === "On Leave"
                                ? "text-amber-600"
                                : "text-emerald-700"
                            }
                          >
                            {staff.status || "Active"}
                          </span>
                        </span>
                      </td>

                      {/* 5. Contact Phone */}
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {staff.phone_number || "—"}
                      </td>

                      {/* 6. Date Joined */}
                      <td className="py-3.5 px-4 text-slate-500">
                        {formatDate(staff.created_at)}
                      </td>

                      {/* 7. Action Icons (View, Edit, Delete) */}
                      <td className="py-3.5 px-4 text-right pr-6">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => setViewingStaff(staff)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer"
                            title="View Staff Profile"
                          >
                            <Eye size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(staff)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-amber-600 hover:bg-slate-50 transition-colors cursor-pointer"
                            title="Edit Staff Member"
                          >
                            <Pencil size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingStaff(staff)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove Staff"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER (Matches Screenshot) */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing 1 to {filteredStaff.length} of {staffList.length} entries
          </div>

          <div className="flex items-center gap-1 self-end sm:self-auto">
            <button
              type="button"
              disabled
              className="p-1.5 rounded-lg border border-slate-200 text-slate-300 cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
              1
            </span>
            <button
              type="button"
              disabled
              className="p-1.5 rounded-lg border border-slate-200 text-slate-300 cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MODAL 1: REGISTER NEW STAFF (With Details, Username & Password)      */}
      {/* =================================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Register New Staff Member
                  </h3>
                  <p className="text-xs text-slate-500">
                    Create staff login credentials and assign to your laundry shop counter.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleRegisterStaff} className="space-y-4">
              {/* Profile Picture Uploader (Cloudinary) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                  <span>Profile Picture (Optional)</span>
                  <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                    <Sparkles size={11} /> Cloudinary CDN
                  </span>
                </label>
                <div className="flex items-center gap-3.5 p-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70">
                  {newProfilePicture ? (
                    <div className="relative group shrink-0">
                      <img
                        src={newProfilePicture}
                        alt="Staff Preview"
                        className="w-14 h-14 rounded-full object-cover border-2 border-blue-500 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setNewProfilePicture("")}
                        className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-1 shadow-sm hover:bg-rose-600 cursor-pointer"
                        title="Remove photo"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-300">
                      {isUploadingPhoto ? (
                        <Loader2 size={18} className="animate-spin text-blue-600" />
                      ) : (
                        <User size={22} />
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs cursor-pointer transition-colors">
                      <Camera size={13} className="text-blue-600" />
                      <span>{isUploadingPhoto ? "Uploading to Cloudinary..." : newProfilePicture ? "Change Photo" : "Upload Photo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploadingPhoto}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadPhoto(file, false);
                        }}
                      />
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1">Image uploads directly to Cloudinary.</p>
                  </div>
                </div>
              </div>

              {/* Branch Assignment */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Assigned Branch / Shop <span className="text-red-500">*</span>
                </label>
                <select
                  value={newAssignedShopId}
                  onChange={(e) => setNewAssignedShopId(e.target.value)}
                  className="w-full text-xs h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  required
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.address})
                    </option>
                  ))}
                </select>
              </div>

              {/* Full Name & Phone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Staff Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="text-xs h-9"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Contact Phone Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="0917 123 4567"
                    className="text-xs h-9"
                  />
                </div>
              </div>

              {/* Birthdate & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Birthdate <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newBirthdate}
                    onChange={(e) => setNewBirthdate(e.target.value)}
                    className="w-full text-xs h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 text-slate-800 font-medium cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value)}
                    className="w-full text-xs h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    required
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Username / Email Address */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Staff Email / Login Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. maria.santos@lavadago.com"
                    className="w-full text-xs pl-9 pr-3 h-9 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 text-slate-800 font-medium"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Staff will use this username/email to sign in at the login page.
                </span>
              </div>

              {/* Login Password */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Login Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full text-xs pl-9 pr-10 h-9 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 text-slate-800 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Provide this password to your staff member for counter access.
                </span>
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    System Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full text-xs h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Counter Staff">Counter Staff (Counter Scanner &amp; Check-In)</option>
                    <option value="Manager">Manager (Supervisory &amp; Reports)</option>
                    <option value="Administrator">Administrator (Branch Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Employment Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full text-xs h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Active">Active (Can log in &amp; scan)</option>
                    <option value="Inactive">Inactive (Access suspended)</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isRegistering}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 shadow-xs"
                >
                  Register Staff &amp; Create Credentials
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: EDIT STAFF MEMBER                                          */}
      {/* =================================================================== */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Pencil size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Edit Staff: {editingStaff.full_name}
                  </h3>
                  <p className="text-[11px] text-slate-500">ID: {editingStaff.staff_id_code || editingStaff.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              {/* Profile Picture Uploader (Cloudinary) */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                  <span>Profile Picture</span>
                  <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                    <Sparkles size={11} /> Cloudinary
                  </span>
                </label>
                <div className="flex items-center gap-3 p-2.5 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70">
                  {editProfilePicture ? (
                    <div className="relative group shrink-0">
                      <img
                        src={editProfilePicture}
                        alt="Staff Preview"
                        className="w-12 h-12 rounded-full object-cover border-2 border-blue-500 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setEditProfilePicture("")}
                        className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 shadow-sm hover:bg-rose-600 cursor-pointer"
                        title="Remove photo"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-300">
                      {isUploadingEditPhoto ? (
                        <Loader2 size={16} className="animate-spin text-blue-600" />
                      ) : (
                        <User size={18} />
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold shadow-2xs cursor-pointer transition-colors">
                      <Camera size={12} className="text-blue-600" />
                      <span>{isUploadingEditPhoto ? "Uploading..." : editProfilePicture ? "Change Photo" : "Upload Photo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploadingEditPhoto}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadPhoto(file, true);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Full Name</label>
                <Input
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Contact Number</label>
                  <Input
                    required
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Gender</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full text-xs h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Birthdate</label>
                <input
                  type="date"
                  value={editBirthdate}
                  onChange={(e) => setEditBirthdate(e.target.value)}
                  className="w-full text-xs h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Role Title</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full text-xs h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Counter Staff">Counter Staff</option>
                    <option value="Manager">Manager</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full text-xs h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingStaff(null)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700 font-bold"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: VIEW STAFF MEMBER PROFILE                                  */}
      {/* =================================================================== */}
      {viewingStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 text-center">
            {viewingStaff.profile_picture ? (
              <img
                src={viewingStaff.profile_picture}
                alt={viewingStaff.full_name}
                className="w-20 h-20 rounded-2xl mx-auto object-cover border-2 border-blue-500 shadow-md"
              />
            ) : (
              <div
                className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center font-extrabold text-xl shadow-xs ${
                  viewingStaff.avatar_color || "bg-blue-100 text-blue-700"
                }`}
              >
                {getInitials(viewingStaff.full_name)}
              </div>
            )}

            <div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                {viewingStaff.staff_id_code || viewingStaff.id}
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1.5">{viewingStaff.full_name}</h3>
              <p className="text-xs text-slate-500">{viewingStaff.email || "No email"}</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned Branch:</span>
                <span className="font-bold text-slate-800">{viewingStaff.shop_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">System Role:</span>
                <span className="font-bold text-slate-800">{viewingStaff.role_title || "Counter Staff"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-emerald-700">{viewingStaff.status || "Active"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gender:</span>
                <span className="font-bold text-slate-800">{viewingStaff.gender || "Not specified"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Birthdate:</span>
                <span className="font-bold text-slate-800">
                  {viewingStaff.birthdate ? formatDate(viewingStaff.birthdate) : "Not specified"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Contact Number:</span>
                <span className="font-bold text-slate-800">{viewingStaff.phone_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date Joined:</span>
                <span className="font-bold text-slate-800">{formatDate(viewingStaff.created_at)}</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewingStaff(null)}
              className="w-full text-xs font-bold"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: DELETE CONFIRMATION                                        */}
      {/* =================================================================== */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 size={24} />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Remove Staff Member?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to remove <strong>{deletingStaff.full_name}</strong> from{" "}
                {deletingStaff.shop_name}? Their counter station access will be immediately revoked.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingStaff(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 font-bold"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
