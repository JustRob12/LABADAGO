"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUserProfile,
  getStaffAssignedShop,
  getLaundryShops,
  signOutUser,
} from "@/lib/supabase/auth";
import { UserProfile, UserRole, LaundryShop } from "@/types/auth";
import { StaffScannerView } from "@/components/staff/StaffScannerView";
import { Loader2, ShieldAlert, Store, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function StaffPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [assignedShop, setAssignedShop] = useState<LaundryShop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);

  useEffect(() => {
    async function initStaff() {
      setIsLoading(true);
      try {
        const profile = await getCurrentUserProfile();
        if (!profile) {
          router.replace(
            "/login?redirect=/staff&message=" +
              encodeURIComponent("Please log in with your staff account.")
          );
          return;
        }

        setUser(profile);

        // Fetch the shop this staff member is assigned to
        let shop = await getStaffAssignedShop(profile.id);

        // If user is OWNER visiting the staff scanner, fall back to owner's first shop
        if (!shop && profile.role === UserRole.OWNER) {
          const allShops = await getLaundryShops();
          const ownerShops = allShops.filter((s) => s.owner_id === profile.id);
          shop = ownerShops[0] || allShops[0] || null;
        }

        // If user is a regular customer without a staff assignment
        if (!shop && profile.role === UserRole.COSTUMER) {
          setAccessDenied(
            "You are not assigned as a staff member for any laundry shop branch. If you are an employee, ask your shop owner to recruit you via their Staff Management portal."
          );
          setIsLoading(false);
          return;
        }

        setAssignedShop(shop);
      } catch (err) {
        console.error("Failed to load staff session:", err);
      } finally {
        setIsLoading(false);
      }
    }

    initStaff();
  }, [router]);

  const handleSignOut = async () => {
    await signOutUser();
    router.replace("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 p-4">
        <Loader2 className="animate-spin text-teal-400" size={32} />
        <p className="text-xs text-slate-400">Loading Staff Scanner Station...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert size={26} />
          </div>
          <h2 className="text-lg font-bold text-white">Staff Access Required</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{accessDenied}</p>
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/customer">
              <Button variant="primary" size="md" className="w-full text-xs">
                Go to Customer Portal
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="border-slate-800 text-slate-400 hover:text-white text-xs"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <StaffScannerView
      staffUser={user}
      assignedShop={assignedShop}
      onSignOut={handleSignOut}
    />
  );
}
