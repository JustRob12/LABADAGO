"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { LaundryShop, BranchStaffMember, UserRole } from "@/types/auth";
import {
  searchMembers,
  assignStaffToBranch,
  removeStaffFromBranch,
  getBranchStaff,
  MemberSearchResult,
} from "@/lib/supabase/auth";
import { Button } from "@/components/ui/Button";
import { RoleBadge } from "@/components/ui/Badge";
import {
  Users,
  UserPlus,
  UserCheck,
  Search,
  Store,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ScanLine,
  Mail,
  Phone,
  ShieldAlert,
  Loader2,
  ExternalLink,
  ChevronDown,
  Info,
} from "lucide-react";

interface BranchStaffManagementProps {
  shops: LaundryShop[];
  currentShop: LaundryShop | null;
  ownerId?: string;
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
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Recruitment modal / action state
  const [selectedUserToRecruit, setSelectedUserToRecruit] = useState<MemberSearchResult | null>(null);
  const [roleTitle, setRoleTitle] = useState("Counter Staff");
  const [isAssigning, setIsAssigning] = useState(false);

  // Removal confirmation state
  const [staffToRemove, setStaffToRemove] = useState<BranchStaffMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Status banner
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const activeShop = shops.find((s) => s.id === selectedShopId) || shops[0] || null;

  // Load staff for the active shop
  const loadStaff = async () => {
    if (!selectedShopId && shops.length === 0) return;
    setIsLoadingStaff(true);
    try {
      const data = await getBranchStaff(selectedShopId || undefined, ownerId);
      setStaffList(data);
    } catch (err) {
      console.error("Failed to load branch staff:", err);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [selectedShopId]);

  // Handle member search with debouncing
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchMembers(trimmed);
        setSearchResults(results);
        setHasSearched(true);
      } catch (err) {
        console.error("Failed to search members:", err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleRecruitSubmit = async () => {
    if (!selectedUserToRecruit || !activeShop) return;
    setIsAssigning(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      const res = await assignStaffToBranch(
        activeShop.id,
        selectedUserToRecruit.id,
        roleTitle.trim() || "Counter Staff"
      );

      if (res.success) {
        setSuccessBanner(
          `Successfully recruited ${selectedUserToRecruit.full_name} as staff for ${activeShop.name}!`
        );
        setSelectedUserToRecruit(null);
        setSearchQuery("");
        setSearchResults([]);
        setHasSearched(false);
        await loadStaff();
      } else {
        setErrorBanner(res.error || "Failed to assign staff member.");
      }
    } catch (err: any) {
      setErrorBanner(err.message || "An unexpected error occurred.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveSubmit = async () => {
    if (!staffToRemove || !activeShop) return;
    setIsRemoving(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      const res = await removeStaffFromBranch(staffToRemove.user_id, activeShop.id);
      if (res.success) {
        setSuccessBanner(
          `Removed ${staffToRemove.full_name} from staff. Their account role has reverted back to Customer.`
        );
        setStaffToRemove(null);
        await loadStaff();
      } else {
        setErrorBanner(res.error || "Failed to remove staff member.");
      }
    } catch (err: any) {
      setErrorBanner(err.message || "An unexpected error occurred.");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Branch Staff Recruitment & Counter Access
                </h2>
                <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  Staff Role (3)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Recruit existing LabadaGo members as counter staff for your specific branch. Recruited
                staff can <strong>only scan walk-in QR passes</strong> to receive clothes or dispatch finished
                laundry. They cannot create branches, recruit members, or view your private business analytics.
              </p>
            </div>
          </div>

          <Link href="/staff" target="_blank">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ScanLine size={14} className="text-teal-600" />}
              rightIcon={<ExternalLink size={12} className="text-slate-400" />}
              className="text-xs whitespace-nowrap cursor-pointer shrink-0"
            >
              Open Staff Scanner
            </Button>
          </Link>
        </div>
      </div>

      {/* Success / Error Banners */}
      {successBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold text-sm px-1 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {errorBanner && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-red-600 hover:text-red-800 font-bold text-sm px-1 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Branch Selection Bar */}
      {shops.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Store size={16} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-700">Managing Staff for Branch:</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.address.slice(0, 30)}...)
                </option>
              ))}
            </select>
            <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-1 rounded-md">
              {staffList.length} Active Staff
            </span>
          </div>
        </div>
      )}

      {/* Main Grid: Search & Recruit on Left, Active Roster on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recruit Existing LabadaGo Member */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <UserPlus size={16} className="text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Recruit Existing Member
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Search for anyone who registered an account on LabadaGo. Once added, their account role will
              instantly change to <strong>Branch Staff</strong>, locking them to scanning only.
            </p>

            {/* Search Input Box */}
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member by full name, email, or phone..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-slate-400"
              />
              {isSearching && (
                <Loader2
                  size={14}
                  className="animate-spin text-teal-600 absolute right-3 top-1/2 -translate-y-1/2"
                />
              )}
            </div>

            {/* Search Results Display */}
            {hasSearched && (
              <div className="space-y-2.5 pt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Search Results ({searchResults.length})
                </span>

                {searchResults.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    No registered members found matching &quot;{searchQuery}&quot;. Please check the spelling or ask them to register on LabadaGo first.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {searchResults.map((member) => {
                      const isAlreadyThisShopStaff = staffList.some(
                        (s) => s.user_id === member.id
                      );
                      return (
                        <div
                          key={member.id}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-300 transition-all flex items-start justify-between gap-3 shadow-2xs"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {member.full_name}
                              </h4>
                              <RoleBadge role={member.role} size="sm" showIcon={false} />
                            </div>

                            {member.email && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                                <Mail size={11} className="text-slate-400 shrink-0" />
                                <span className="truncate">{member.email}</span>
                              </p>
                            )}

                            {member.phone_number && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                <Phone size={11} className="text-slate-400 shrink-0" />
                                <span>{member.phone_number}</span>
                              </p>
                            )}

                            {member.assigned_shop_name && !isAlreadyThisShopStaff && (
                              <span className="inline-block text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                Currently Staff of {member.assigned_shop_name}
                              </span>
                            )}
                          </div>

                          <div className="shrink-0 pt-0.5">
                            {isAlreadyThisShopStaff ? (
                              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-200 inline-flex items-center gap-1">
                                <UserCheck size={11} /> Already Staff
                              </span>
                            ) : (
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => setSelectedUserToRecruit(member)}
                                className="text-[11px] px-2.5 py-1 bg-teal-600 hover:bg-teal-700"
                              >
                                Recruit
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Role Lock Notice */}
            <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100 flex items-start gap-2.5 text-xs text-teal-900">
              <Info size={16} className="text-teal-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>Role Lock Enforcement:</strong> Once recruited, the staff user is locked from switching to Customer or Owner. Only you as the branch owner can remove them.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Staff Roster for Selected Branch */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Active Staff for &quot;{activeShop?.name || "Selected Branch"}&quot;
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {staffList.length} Staff Member{staffList.length !== 1 ? "s" : ""}
              </span>
            </div>

            {isLoadingStaff ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 size={20} className="animate-spin text-teal-600" />
                <p className="text-xs">Loading branch staff roster...</p>
              </div>
            ) : staffList.length === 0 ? (
              <div className="py-12 rounded-xl border border-dashed border-slate-200 text-center space-y-2 p-6">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Users size={20} />
                </div>
                <h4 className="text-sm font-bold text-slate-700">No Staff Assigned Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  You haven&apos;t recruited any staff for this branch. Search a registered member on the left to add them as counter staff.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {staffList.map((staff) => (
                  <div
                    key={staff.id || staff.user_id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {staff.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{staff.full_name}</h4>
                          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {staff.role_title || "Counter Staff"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          {staff.email && (
                            <span className="flex items-center gap-1">
                              <Mail size={11} className="text-slate-400" />
                              {staff.email}
                            </span>
                          )}
                          {staff.phone_number && (
                            <span className="flex items-center gap-1">
                              <Phone size={11} className="text-slate-400" />
                              {staff.phone_number}
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-slate-400">
                          Branch: <strong className="text-slate-600">{staff.shop_name || activeShop?.name}</strong> • Added {new Date(staff.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setStaffToRemove(staff)}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 cursor-pointer"
                      >
                        <Trash2 size={13} className="mr-1 text-red-500" />
                        Remove Staff
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recruitment Confirmation Modal */}
      {selectedUserToRecruit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-200">
                <UserCheck size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Confirm Staff Recruitment</h4>
                <p className="text-xs text-slate-500">Branch: {activeShop?.name}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Member:</span>
                <strong className="text-slate-900">{selectedUserToRecruit.full_name}</strong>
              </div>
              {selectedUserToRecruit.email && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="text-slate-700 truncate max-w-[180px]">{selectedUserToRecruit.email}</span>
                </div>
              )}
              {selectedUserToRecruit.phone_number && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="text-slate-700">{selectedUserToRecruit.phone_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Branch:</span>
                <strong className="text-teal-700">{activeShop?.name}</strong>
              </div>
            </div>

            {/* Role Title input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Staff Title / Position
              </label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. Counter Staff, Scanner Attendant"
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 leading-relaxed">
              <strong>Notice:</strong> When you recruit {selectedUserToRecruit.full_name}, their active role will change to <strong>Branch Staff</strong>. They will only have access to scan walk-in QRs and cannot switch roles until you remove them.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedUserToRecruit(null)}
                className="flex-1 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isAssigning}
                onClick={handleRecruitSubmit}
                className="flex-1 text-xs bg-teal-600 hover:bg-teal-700"
              >
                {isAssigning ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={13} className="animate-spin" /> Assigning...
                  </span>
                ) : (
                  "Confirm & Recruit"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Staff Confirmation Modal */}
      {staffToRemove && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                <Trash2 size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Remove Branch Staff</h4>
                <p className="text-xs text-slate-500">Revoke scanner privileges</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <strong>{staffToRemove.full_name}</strong> from <strong>{activeShop?.name}</strong>?
            </p>

            <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              Their role will automatically revert back to <strong>Customer (Costumer)</strong>, restoring normal customer privileges.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStaffToRemove(null)}
                className="flex-1 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRemoving}
                onClick={handleRemoveSubmit}
                className="flex-1 text-xs bg-red-600 hover:bg-red-700 text-white border-transparent"
              >
                {isRemoving ? "Removing..." : "Remove Staff"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
