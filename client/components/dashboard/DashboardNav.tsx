"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { signOutUser, switchUserRole, getCachedUserProfile, getUnreadMessagesCount } from "@/lib/supabase/auth";
import { UserProfile, UserRole } from "@/types/auth";
import {
  Menu,
  X,
  LogOut,
  User as UserIcon,
  MapPin,
  QrCode,
  Package,
  BarChart3,
  Settings,
  ScanLine,
  ArrowRightLeft,
  ChevronDown,
  Loader2,
  Users,
  Lock,
  Store,
  Handshake,
  ShieldCheck,
  LayoutDashboard,
  FileText,
  Clock,
  Shirt,
  Sparkles,
  MessageSquare,
} from "lucide-react";

interface DashboardNavProps {
  user?: UserProfile | null;
  hasShops?: boolean;
  onLoggedOut?: () => void;
  onRoleSwitched?: (role: UserRole) => void;
}

const DashboardNavFallback: React.FC<DashboardNavProps> = () => {
  return (
    <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 h-screen sticky top-0 shrink-0 flex-col justify-between p-5">
      <div className="flex items-center gap-3">
        <BrandLogo href="/" />
      </div>
      <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
    </aside>
  );
};

const DashboardNavContent: React.FC<DashboardNavProps> = ({
  user,
  hasShops = true,
  onLoggedOut,
  onRoleSwitched,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "";

  // Mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cachedUser, setCachedUser] = useState<UserProfile | null>(null);

  // Read cached profile after mount to prevent SSR hydration mismatch
  useEffect(() => {
    setMounted(true);
    const cached = getCachedUserProfile();
    if (cached) {
      setCachedUser(cached);
    }
  }, []);

  // During SSR and initial client hydration pass, use user prop safely.
  // After mount, safely fallback to localStorage cached profile if user prop is missing.
  const activeUser = user || (mounted ? cachedUser : null);

  const [unreadCount, setUnreadCount] = useState<number>(0);

  const isAdmin = activeUser?.role === UserRole.ADMIN || (!activeUser && pathname?.startsWith("/admin"));
  const isStaff = !isAdmin && (activeUser?.role === UserRole.STAFF || (!activeUser && pathname?.startsWith("/staff")));
  const isOwner =
    !isStaff &&
    !isAdmin &&
    (activeUser?.role === UserRole.OWNER || (!activeUser && pathname?.startsWith("/owner")));

  // Live count of unread messages across Owner, Staff, and Customer portals
  useEffect(() => {
    let isMounted = true;
    async function fetchUnread() {
      if (!activeUser?.id) {
        setUnreadCount(0);
        return;
      }
      try {
        const count = await getUnreadMessagesCount(
          activeUser.id,
          activeUser.role,
          activeUser.assigned_shop_id || undefined
        );
        if (isMounted) setUnreadCount(count);
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
  }, [activeUser?.id, activeUser?.role, activeUser?.assigned_shop_id]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname, searchParams]);

  const handleLogout = async () => {
    setMobileDrawerOpen(false);
    await signOutUser();
    if (onLoggedOut) {
      onLoggedOut();
    } else {
      router.push("/login");
    }
  };

  const handleToggleRole = async () => {
    // Owner role and Staff role are permanent; cannot switch back to customer
    if (isStaff || isOwner) return;
  };

  // Nav Items Builder
  const getNavItems = () => {
    if (isAdmin) {
      return [
        {
          id: "admin-apps",
          href: "/admin?tab=applications",
          label: "Partner Applications",
          icon: FileText,
          active: pathname === "/admin" && (!currentTab || currentTab === "applications"),
        },
        {
          id: "admin-shops",
          href: "/admin?tab=shops",
          label: "Shops View",
          icon: Store,
          active: pathname === "/admin" && currentTab === "shops",
        },
        {
          id: "admin-owners",
          href: "/admin?tab=owners",
          label: "Shop Owners",
          icon: Users,
          active: pathname === "/admin" && currentTab === "owners",
        },
        {
          id: "admin-customers",
          href: "/admin?tab=customers",
          label: "Customers",
          icon: UserIcon,
          active: pathname === "/admin" && currentTab === "customers",
        },
        {
          id: "admin-map",
          href: "/admin?tab=map",
          label: "Platform Map",
          icon: MapPin,
          active: pathname === "/admin" && currentTab === "map",
        },
        {
          id: "admin-hub",
          href: "/dashboard",
          label: "Admin Profile & Hub",
          icon: ShieldCheck,
          active: pathname === "/dashboard",
        },
      ];
    }

    if (isStaff) {
      return [
        {
          id: "staff-scanner",
          href: "/staff",
          label: "Counter Scanner",
          icon: ScanLine,
          active: pathname === "/staff" && currentTab !== "messages",
        },
        {
          id: "staff-messages",
          href: "/staff?tab=messages",
          label: "Customer Inquiries",
          icon: MessageSquare,
          active: pathname === "/staff" && currentTab === "messages",
          badge: unreadCount,
        },
        {
          id: "staff-profile",
          href: "/dashboard",
          label: "Staff Account Profile",
          icon: UserIcon,
          active: pathname === "/dashboard",
        },
      ];
    }

    if (isOwner) {
      const items = [];
      if (hasShops) {
        items.push(
          {
            id: "owner-analytics",
            href: "/owner",
            label: "Dashboard",
            icon: LayoutDashboard,
            active: pathname === "/owner" && (!currentTab || currentTab === "analytics"),
          },
          {
            id: "owner-intake",
            href: "/owner?tab=scanner",
            label: "QR Intake & Orders",
            icon: ScanLine,
            active: pathname === "/owner" && currentTab === "scanner",
          },
          {
            id: "owner-messages",
            href: "/owner?tab=messages",
            label: "Customer Messages",
            icon: MessageSquare,
            active: pathname === "/owner" && currentTab === "messages",
            badge: unreadCount,
          },
          {
            id: "owner-staff",
            href: "/owner?tab=staff",
            label: "Branch Staff",
            icon: Users,
            active: pathname === "/owner" && currentTab === "staff",
          }
        );
      }
      items.push(
        {
          id: "owner-setup",
          href: "/owner?tab=setup",
          label: "Shop Setup & Pricing",
          icon: Settings,
          active: pathname === "/owner" && currentTab === "setup",
        },
        {
          id: "owner-hub",
          href: "/dashboard",
          label: "Owner Profile",
          icon: UserIcon,
          active: pathname === "/dashboard",
        }
      );
      return items;
    }

    // Customer Items
    return [
      {
        id: "cust-home",
        href: "/customer",
        label: "Home & Shops",
        icon: Store,
        active: pathname === "/customer" && (!currentTab || currentTab === "home"),
      },
      {
        id: "cust-map",
        href: "/customer?tab=map",
        label: "Laundry Map",
        icon: MapPin,
        active: pathname === "/customer" && currentTab === "map",
      },
      {
        id: "cust-qr",
        href: "/customer?tab=qr",
        label: "Walk-In Fast Pass (QR)",
        icon: QrCode,
        active: pathname === "/customer" && currentTab === "qr",
      },
      {
        id: "cust-orders",
        href: "/customer?tab=orders",
        label: "Live Order Tracker",
        icon: Package,
        active: pathname === "/customer" && currentTab === "orders",
      },
      {
        id: "cust-messages",
        href: "/customer?tab=messages",
        label: "Messages & Inquiries",
        icon: MessageSquare,
        active: pathname === "/customer" && currentTab === "messages",
        badge: unreadCount,
      },
      {
        id: "cust-hub",
        href: "/dashboard",
        label: "My Profile & Hub",
        icon: UserIcon,
        active: pathname === "/dashboard",
      },
    ];
  };

  const navItems = getNavItems();

  // Role Pill Tag
  const getRoleBadge = () => {
    if (isAdmin) {
      return { label: "Platform Admin", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" };
    }
    if (isStaff) {
      return { label: "Branch Staff", bg: "bg-teal-50 text-teal-700 border-teal-200" };
    }
    if (isOwner) {
      return { label: "Laundry Shop Owner", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
    return { label: "Customer", bg: "bg-blue-50 text-blue-700 border-blue-200" };
  };

  const roleBadge = getRoleBadge();

  // Reusable Sidebar Content JSX
  const renderSidebarInner = () => (
    <div className="flex flex-col h-full justify-between">
      {/* Top: Logo & Nav Links */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <BrandLogo size="md" />
          {mobileDrawerOpen && (
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Active Role Status Banner */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Portal</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${roleBadge.bg}`}>
              {roleBadge.label}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${item.active
                  ? "bg-blue-600 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon size={16} className={item.active ? "text-white" : "text-slate-500"} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-500 text-white min-w-5 text-center shadow-xs animate-pulse shrink-0">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Profile & Actions */}
      <div className="p-3 border-t border-slate-100 space-y-2 shrink-0 bg-white" suppressHydrationWarning>
        {/* User Card */}
        {activeUser ? (
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
              {activeUser.full_name ? activeUser.full_name.charAt(0).toUpperCase() : <UserIcon size={14} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">
                {activeUser.full_name || "Valued User"}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {activeUser.email || activeUser.phone_number || "Signed In"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 p-1">
            <Link
              href={`/login?redirect=${encodeURIComponent(pathname || "/customer")}`}
              className="w-full block text-center py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="w-full block text-center py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              Create Account
            </Link>
          </div>
        )}

        {/* Status / Partner Button */}
        {activeUser && !isStaff && (
          <div>
            {isOwner ? (
              <div className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-800 text-xs font-bold select-none shadow-2xs">
                <Store size={14} className="text-emerald-600" />
                <span>Verified Shop Owner</span>
              </div>
            ) : !isAdmin ? (
              <Link
                href="/partner"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors shadow-2xs"
              >
                <Handshake size={14} className="text-emerald-600" />
                <span>Partner with this website</span>
              </Link>
            ) : null}
          </div>
        )}

        {/* Sign Out Button */}
        {activeUser && (
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ==============================================================================
          1. DESKTOP SIDEBAR (Permanent Left Navigation for lg+ screens)
          ============================================================================== */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 h-screen sticky top-0 shrink-0 flex-col justify-between z-40 select-none shadow-xs">
        {renderSidebarInner()}
      </aside>

      {/* ==============================================================================
          2. MOBILE TOP HEADER (Sticky Bar for screens < lg - Hidden on full map mobile view)
          ============================================================================== */}
      <header className={`lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200 ${pathname === "/customer" && currentTab === "map" ? "hidden" : ""}`}>
        <div className="px-4 h-15 flex items-center justify-between gap-3">
          {/* Hamburger Menu & Brand */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs"
              aria-label="Open navigation sidebar"
            >
              <Menu size={18} />
            </button>
            <BrandLogo size="sm" />
          </div>

          {/* Right: Quick User Avatar or Sign In */}
          <div suppressHydrationWarning>
            {activeUser ? (
              <Link href="/dashboard" className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                  {activeUser.full_name ? activeUser.full_name.charAt(0).toUpperCase() : <UserIcon size={14} />}
                </div>
              </Link>
            ) : (
              <Link
                href={`/login?redirect=${encodeURIComponent(pathname || "/customer")}`}
                className="px-2.5 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ==============================================================================
          3. MOBILE SLIDE-OUT SIDEBAR DRAWER (When hamburger is clicked)
          ============================================================================== */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Sliding Panel */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderSidebarInner()}
          </div>
        </div>
      )}

      {/* ==============================================================================
          4. MOBILE FLOATING BOTTOM NAV (Visible on mobile screens)
          ============================================================================== */}
      <div className="lg:hidden fixed bottom-3 inset-x-3 max-w-sm mx-auto z-40 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl px-2 py-1 flex items-center justify-around">
        {isAdmin ? (
          <>
            <Link
              href="/admin?tab=applications"
              className={`flex flex-col items-center gap-0.5 text-[9px] font-medium py-1 px-1.5 rounded-xl transition-colors ${pathname === "/admin" && (!currentTab || currentTab === "applications")
                ? "text-indigo-600 font-bold bg-indigo-50"
                : "text-slate-500"
                }`}
            >
              <FileText size={15} />
              <span>Partners</span>
            </Link>
            <Link
              href="/admin?tab=shops"
              className={`flex flex-col items-center gap-0.5 text-[9px] font-medium py-1 px-1.5 rounded-xl transition-colors ${pathname === "/admin" && currentTab === "shops"
                ? "text-indigo-600 font-bold bg-indigo-50"
                : "text-slate-500"
                }`}
            >
              <Store size={15} />
              <span>Shops</span>
            </Link>
            <Link
              href="/admin?tab=owners"
              className={`flex flex-col items-center gap-0.5 text-[9px] font-medium py-1 px-1.5 rounded-xl transition-colors ${pathname === "/admin" && currentTab === "owners"
                ? "text-indigo-600 font-bold bg-indigo-50"
                : "text-slate-500"
                }`}
            >
              <Users size={15} />
              <span>Owners</span>
            </Link>
            <Link
              href="/admin?tab=customers"
              className={`flex flex-col items-center gap-0.5 text-[9px] font-medium py-1 px-1.5 rounded-xl transition-colors ${pathname === "/admin" && currentTab === "customers"
                ? "text-indigo-600 font-bold bg-indigo-50"
                : "text-slate-500"
                }`}
            >
              <UserIcon size={15} />
              <span>Users</span>
            </Link>
            <Link
              href="/admin?tab=map"
              className={`flex flex-col items-center gap-0.5 text-[9px] font-medium py-1 px-1.5 rounded-xl transition-colors ${pathname === "/admin" && currentTab === "map"
                ? "text-indigo-600 font-bold bg-indigo-50"
                : "text-slate-500"
                }`}
            >
              <MapPin size={15} />
              <span>Map</span>
            </Link>
            <Link
              href="/dashboard"
              className={`flex flex-col items-center gap-0.5 text-[9px] font-medium py-1 px-1.5 rounded-xl transition-colors ${pathname === "/dashboard" ? "text-indigo-600 font-bold bg-indigo-50" : "text-slate-500"
                }`}
            >
              <ShieldCheck size={15} />
              <span>Hub</span>
            </Link>
          </>
        ) : isStaff ? (
          <>
            <Link
              href="/staff"
              className={`flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors ${
                pathname === "/staff" && currentTab !== "messages"
                  ? "text-teal-700 font-bold bg-teal-50"
                  : "text-slate-500"
              }`}
            >
              <ScanLine size={16} />
              <span>Scanner</span>
            </Link>
            <Link
              href="/staff?tab=messages"
              className={`flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors ${
                pathname === "/staff" && currentTab === "messages"
                  ? "text-teal-700 font-bold bg-teal-50"
                  : "text-slate-500"
              }`}
            >
              <div className="relative">
                <MessageSquare size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 text-[9px] font-extrabold bg-rose-500 text-white rounded-full min-w-4 h-4 flex items-center justify-center border border-white shadow-xs animate-pulse">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span>Messages</span>
            </Link>
            <Link
              href="/dashboard"
              className={`flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors ${
                pathname === "/dashboard" ? "text-teal-700 font-bold bg-teal-50" : "text-slate-500"
              }`}
            >
              <UserIcon size={16} />
              <span>Profile</span>
            </Link>
          </>
        ) : isOwner ? (
          <>
            <Link
              href="/owner"
              className={`flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-2 rounded-xl transition-colors ${
                pathname === "/owner" && (!currentTab || currentTab === "analytics")
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-slate-500"
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/owner?tab=scanner"
              className={`flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-2 rounded-xl transition-colors ${
                pathname === "/owner" && currentTab === "scanner"
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-slate-500"
              }`}
            >
              <ScanLine size={16} />
              <span>Intake</span>
            </Link>
            <Link
              href="/owner?tab=messages"
              className={`flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-2 rounded-xl transition-colors ${
                pathname === "/owner" && currentTab === "messages"
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-slate-500"
              }`}
            >
              <div className="relative">
                <MessageSquare size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 text-[9px] font-extrabold bg-rose-500 text-white rounded-full min-w-4 h-4 flex items-center justify-center border border-white shadow-xs animate-pulse">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span>Messages</span>
            </Link>
            <Link
              href="/owner?tab=staff"
              className={`flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-2 rounded-xl transition-colors ${
                pathname === "/owner" && currentTab === "staff"
                  ? "text-teal-600 font-bold bg-teal-50"
                  : "text-slate-500"
              }`}
            >
              <Users size={16} />
              <span>Staff</span>
            </Link>
            <Link
              href="/owner?tab=setup"
              className={`flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-2 rounded-xl transition-colors ${
                pathname === "/owner" && currentTab === "setup"
                  ? "text-slate-900 font-bold bg-slate-100"
                  : "text-slate-500"
              }`}
            >
              <Settings size={16} />
              <span>Setup</span>
            </Link>
            <Link
              href="/dashboard"
              className={`flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-2 rounded-xl transition-colors ${
                pathname === "/dashboard"
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-slate-500"
              }`}
            >
              <UserIcon size={16} />
              <span>Profile</span>
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/customer"
              className={`flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-2 rounded-xl transition-colors ${
                pathname === "/customer" && (!currentTab || currentTab === "home")
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-slate-500"
              }`}
            >
              <Store size={16} />
              <span>Shops</span>
            </Link>
            <Link
              href="/customer?tab=map"
              className={`flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-2 rounded-xl transition-colors ${
                pathname === "/customer" && currentTab === "map"
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-slate-500"
              }`}
            >
              <MapPin size={16} />
              <span>Map</span>
            </Link>
            <Link
              href="/customer?tab=qr"
              className={`flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-2 rounded-xl transition-colors ${
                pathname === "/customer" && currentTab === "qr"
                  ? "text-emerald-600 font-bold bg-emerald-50"
                  : "text-slate-500"
              }`}
            >
              <QrCode size={16} />
              <span>Pass</span>
            </Link>
            <Link
              href="/customer?tab=orders"
              className={`flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-2 rounded-xl transition-colors ${
                pathname === "/customer" && currentTab === "orders"
                  ? "text-purple-600 font-bold bg-purple-50"
                  : "text-slate-500"
              }`}
            >
              <Package size={16} />
              <span>Orders</span>
            </Link>
            <Link
              href="/customer?tab=messages"
              className={`flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-2 rounded-xl transition-colors ${
                pathname === "/customer" && currentTab === "messages"
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-slate-500"
              }`}
            >
              <div className="relative">
                <MessageSquare size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 text-[9px] font-extrabold bg-rose-500 text-white rounded-full min-w-4 h-4 flex items-center justify-center border border-white shadow-xs animate-pulse">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span>Messages</span>
            </Link>
          </>
        )}
      </div>
    </>
  );
};

export const DashboardNav: React.FC<DashboardNavProps> = (props) => {
  return (
    <React.Suspense fallback={<DashboardNavFallback {...props} />}>
      <DashboardNavContent {...props} />
    </React.Suspense>
  );
};
