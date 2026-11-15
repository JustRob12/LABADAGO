import { supabase } from "./client";
import {
  RegisterFormData,
  LoginFormData,
  UserProfile,
  UserRole,
  LaundryShop,
  ShopService,
  LaundryTransaction,
  WalkInQRPayload,
  OrderStatus,
  PaymentStatus,
  BranchStaffMember,
  ShopReview,
  PartnerApplication,
  ShopMessage,
  ShopConversation,
} from "@/types/auth";

// Default pre-seeded registered shops (Ensures customer map, services, and fast pass work seamlessly)
export const DEFAULT_REGISTERED_SHOPS: LaundryShop[] = [
  {
    id: "shop-001",
    name: "CleanWave Laundry - Main Branch",
    description: "Full-service laundry offering wash, dry, fold, express drop-offs, and blanket care.",
    address: "123 Laundry St., Barangay San Isidro, Cityville 1234",
    latitude: 14.5805,
    longitude: 121.0360,
    phone_number: "0917 123 4567",
    open_time: "07:00",
    close_time: "21:00",
    queue_status: "Low",
    is_open: true,
    rating: 4.9,
    total_reviews: 128,
    washer_count: 12,
    dryer_count: 12,
    max_kilo_per_load: 8.0,
    images: [
      "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=800&q=80",
    ],
    services: [
      {
        id: "srv-001",
        shop_id: "shop-001",
        service_name: "Wash & Fold (Regular)",
        description: "Up to 8kg load, thoroughly washed, fresh scented, and neatly folded.",
        price: 60,
        unit: "kg",
        kilos: 8,
        estimated_minutes: 120,
        is_available: true,
      },
      {
        id: "srv-002",
        shop_id: "shop-001",
        service_name: "Blanket & Comforter Wash",
        description: "Deep sanitized wash and high-heat drying for king/queen comforters.",
        price: 250,
        unit: "piece",
        kilos: 1,
        estimated_minutes: 180,
        is_available: true,
      },
      {
        id: "srv-003",
        shop_id: "shop-001",
        service_name: "Express Wash & Fold",
        description: "Priority 3-hour turnaround for urgent laundry needs.",
        price: 80,
        unit: "kg",
        kilos: 8,
        estimated_minutes: 90,
        is_available: true,
      },
      {
        id: "srv-004",
        shop_id: "shop-001",
        service_name: "Dry Cleaning (Per Item)",
        description: "Gentle professional chemical dry clean for delicate garments and suits.",
        price: 120,
        unit: "item",
        estimated_minutes: 240,
        is_available: true,
      },
    ],
  },
  {
    id: "shop-002",
    name: "Fresh Spin Laundry & Dry Clean",
    description: "Premium garment care, self-service commercial washers, and same-day pressing.",
    address: "45 Rizal Avenue, Downtown Commercial District, Cityville",
    latitude: 14.5862,
    longitude: 121.0425,
    phone_number: "0918 234 5678",
    open_time: "08:00",
    close_time: "20:00",
    queue_status: "Moderate",
    is_open: true,
    rating: 4.8,
    total_reviews: 84,
    washer_count: 8,
    dryer_count: 8,
    max_kilo_per_load: 8.0,
    images: [
      "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=800&q=80",
    ],
    services: [
      {
        id: "srv-005",
        shop_id: "shop-002",
        service_name: "Wash & Dry",
        description: "Standard wash and dry cycle with fabric conditioner.",
        price: 55,
        unit: "kg",
        kilos: 8,
        estimated_minutes: 100,
        is_available: true,
      },
      {
        id: "srv-006",
        shop_id: "shop-002",
        service_name: "Wash, Dry & Iron",
        description: "Complete laundry service with wrinkle-free steam pressing.",
        price: 75,
        unit: "kg",
        kilos: 8,
        estimated_minutes: 150,
        is_available: true,
      },
      {
        id: "srv-007",
        shop_id: "shop-002",
        service_name: "Heavy Duvet Wash",
        description: "Specialized large-drum wash for thick winter blankets and duvets.",
        price: 220,
        unit: "piece",
        kilos: 1,
        estimated_minutes: 160,
        is_available: true,
      },
    ],
  },
  {
    id: "shop-003",
    name: "Bubble Care Self-Service & Full Laundry",
    description: "Modern touch-screen washers, fast drying cycles, and drop-off lockers.",
    address: "88 University Belt Way, Near Tech Campus, Cityville",
    latitude: 14.5745,
    longitude: 121.0285,
    phone_number: "0921 345 6789",
    open_time: "06:00",
    close_time: "22:00",
    queue_status: "Low",
    is_open: true,
    rating: 4.7,
    total_reviews: 64,
    washer_count: 10,
    dryer_count: 10,
    max_kilo_per_load: 10.0,
    images: [
      "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?auto=format&fit=crop&w=800&q=80",
    ],
    services: [
      {
        id: "srv-008",
        shop_id: "shop-003",
        service_name: "Self-Service Wash (10kg)",
        description: "Use our heavy duty front-load washers with automatic detergent dispenser.",
        price: 70,
        unit: "load",
        kilos: 10,
        estimated_minutes: 45,
        is_available: true,
      },
      {
        id: "srv-009",
        shop_id: "shop-003",
        service_name: "Self-Service Dryer (10kg)",
        description: "Quick dry cycle with adjustable temperature settings.",
        price: 60,
        unit: "load",
        kilos: 10,
        estimated_minutes: 40,
        is_available: true,
      },
      {
        id: "srv-010",
        shop_id: "shop-003",
        service_name: "Full Drop-off Service",
        description: "Drop your clothes off and pick them up freshly cleaned and packed.",
        price: 65,
        unit: "kg",
        kilos: 8,
        estimated_minutes: 120,
        is_available: true,
      },
    ],
  },
];

const DEFAULT_PLATFORM_USERS: UserProfile[] = [
  // Shop Owners (Role = 1)
  {
    id: "usr-owner-001",
    email: "maria.santos@email.com",
    full_name: "Maria Elena Santos",
    date_of_birth: "1988-04-12",
    phone_number: "0917 123 4567",
    gender: "Female",
    role: UserRole.OWNER,
    assigned_shop_id: "shop-001",
    assigned_shop_name: "AquaPure Clean Express",
    created_at: "2026-01-15T08:30:00Z",
  },
  {
    id: "usr-owner-002",
    email: "juan.reyes@email.com",
    full_name: "Juan Carlo Reyes",
    date_of_birth: "1985-09-23",
    phone_number: "0918 234 5678",
    gender: "Male",
    role: UserRole.OWNER,
    assigned_shop_id: "shop-002",
    assigned_shop_name: "Fresh Spin Laundry & Dry Clean",
    created_at: "2026-02-10T10:15:00Z",
  },
  {
    id: "usr-owner-003",
    email: "ricardo.lim@email.com",
    full_name: "Ricardo Lim",
    date_of_birth: "1990-11-05",
    phone_number: "0921 345 6789",
    gender: "Male",
    role: UserRole.OWNER,
    assigned_shop_id: "shop-003",
    assigned_shop_name: "Bubble Care Self-Service & Full Laundry",
    created_at: "2026-03-01T14:20:00Z",
  },
  // Customers (Role = 2)
  {
    id: "usr-cust-001",
    email: "beatrice.g@email.com",
    full_name: "Beatrice Gomez",
    date_of_birth: "1996-07-19",
    phone_number: "0915 882 1234",
    gender: "Female",
    role: UserRole.COSTUMER,
    created_at: "2026-02-20T09:00:00Z",
  },
  {
    id: "usr-cust-002",
    email: "daniel.padilla@email.com",
    full_name: "Daniel Padilla",
    date_of_birth: "1994-03-14",
    phone_number: "0927 345 7890",
    gender: "Male",
    role: UserRole.COSTUMER,
    created_at: "2026-03-05T11:45:00Z",
  },
  {
    id: "usr-cust-003",
    email: "angela.mercado@email.com",
    full_name: "Angela Mercado",
    date_of_birth: "1998-12-02",
    phone_number: "0919 456 1234",
    gender: "Female",
    role: UserRole.COSTUMER,
    created_at: "2026-03-12T16:10:00Z",
  },
  {
    id: "usr-cust-004",
    email: "mark.tan@email.com",
    full_name: "Mark Kenneth Tan",
    date_of_birth: "1992-06-28",
    phone_number: "0922 890 1234",
    gender: "Male",
    role: UserRole.COSTUMER,
    created_at: "2026-03-18T13:25:00Z",
  },
  {
    id: "usr-cust-005",
    email: "sofia.rodriguez@email.com",
    full_name: "Sofia Rodriguez",
    date_of_birth: "1999-01-30",
    phone_number: "0930 123 4567",
    gender: "Female",
    role: UserRole.COSTUMER,
    created_at: "2026-04-02T15:40:00Z",
  },
  {
    id: "usr-cust-006",
    email: "christian.baut@email.com",
    full_name: "Christian Bautista",
    date_of_birth: "1993-08-15",
    phone_number: "0917 555 4321",
    gender: "Male",
    role: UserRole.COSTUMER,
    created_at: "2026-04-10T10:05:00Z",
  },
];

// In-memory fallback stores for session
let localShopsStore: LaundryShop[] = [...DEFAULT_REGISTERED_SHOPS];
let localTransactionsStore: LaundryTransaction[] = [];
let localStaffStore: BranchStaffMember[] = [];
let localReviewsStore: ShopReview[] = [];
let localProfilesStore: UserProfile[] = [...DEFAULT_PLATFORM_USERS];
let localPartnerApplicationsStore: PartnerApplication[] = [];

/**
 * Register a new user with Supabase Auth
 * Automatically assigns role = 2 (Costumer)
 */
export async function signUpUser(data: RegisterFormData): Promise<{
  success: boolean;
  user: UserProfile | null;
  error: string | null;
  needsEmailConfirmation?: boolean;
}> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        data: {
          full_name: data.fullName.trim(),
          date_of_birth: data.dateOfBirth,
          phone_number: data.phoneNumber.trim(),
          gender: data.gender,
          role: UserRole.COSTUMER, // Default role: 2 (Costumer)
        },
      },
    });

    if (authError) {
      return { success: false, user: null, error: authError.message };
    }

    if (!authData.user) {
      return {
        success: false,
        user: null,
        error: "Unable to create account. Please try again.",
      };
    }

    const userId = authData.user.id;
    const userEmail = authData.user.email || data.email.trim();

    const profile: UserProfile = {
      id: userId,
      email: userEmail,
      full_name: data.fullName.trim(),
      date_of_birth: data.dateOfBirth,
      phone_number: data.phoneNumber.trim(),
      gender: data.gender,
      role: UserRole.COSTUMER,
    };

    // Keep in local profiles store for quick lookups
    const pIdx = localProfilesStore.findIndex((p) => p.id === userId);
    if (pIdx >= 0) localProfilesStore[pIdx] = profile;
    else localProfilesStore.push(profile);

    try {
      await supabase.from("profiles").upsert(
        {
          id: userId,
          email: userEmail,
          full_name: profile.full_name,
          date_of_birth: profile.date_of_birth,
          phone_number: profile.phone_number,
          gender: profile.gender,
          role: UserRole.COSTUMER,
        },
        { onConflict: "id" }
      );
    } catch {
      // ignore
    }

    return {
      success: true,
      user: profile,
      error: null,
      needsEmailConfirmation: !authData.session,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred during registration.";
    return { success: false, user: null, error: message };
  }
}

/**
 * Log in an existing user
 */
export async function signInUser(data: LoginFormData): Promise<{
  success: boolean;
  user: UserProfile | null;
  error: string | null;
}> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email.trim(),
      password: data.password,
    });

    if (authError) {
      return { success: false, user: null, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, user: null, error: "No user found with these credentials." };
    }

    const profile = await getCurrentUserProfile();

    return {
      success: true,
      user: profile,
      error: null,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred during sign in.";
    return { success: false, user: null, error: message };
  }
}

/**
 * Sign out the current user
 */
export async function signOutUser(): Promise<{ error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (typeof window !== "undefined") {
      localStorage.removeItem("labadago_cached_profile");
      localStorage.removeItem("labadago_active_role");
      if (user?.id) {
        localStorage.removeItem(`labadago_active_role_${user.id}`);
      }
    }
    const { error } = await supabase.auth.signOut();
    return { error: error ? error.message : null };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred while signing out.";
    return { error: message };
  }
}

/**
 * Synchronous client-side cached profile lookup to prevent navigation flicker
 */
export function getCachedUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("labadago_cached_profile");
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Switch the active user role (Customer <-> Owner)
 * Note: Staff members are locked and CANNOT switch roles unless removed by the owner!
 */
export async function switchUserRole(newRole: UserRole): Promise<{
  success: boolean;
  role: UserRole;
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, role: newRole, error: "Not authenticated" };
    }

    // 1. Check if user is an active STAFF member
    const { data: dbProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const { data: staffRecord } = await supabase
      .from("branch_staff")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const isLockedStaff =
      dbProfile?.role === UserRole.STAFF ||
      !!staffRecord ||
      localStaffStore.some((s) => s.user_id === user.id);

    if (isLockedStaff) {
      return {
        success: false,
        role: UserRole.STAFF,
        error: "Staff role is locked. You cannot switch roles while assigned as Branch Staff. Only your shop owner can remove your staff role.",
      };
    }

    if (newRole === UserRole.STAFF) {
      return {
        success: false,
        role: dbProfile?.role || UserRole.COSTUMER,
        error: "Staff role cannot be self-assigned. A shop owner must recruit and assign you to a specific branch.",
      };
    }

    // 2. Check if user is a Laundry Shop OWNER - Owner role is permanent!
    const isOwner =
      dbProfile?.role === UserRole.OWNER ||
      localProfilesStore.some((p) => p.id === user.id && p.role === UserRole.OWNER) ||
      localShopsStore.some((s) => s.owner_id === user.id);

    if (isOwner && newRole === UserRole.COSTUMER) {
      return {
        success: false,
        role: UserRole.OWNER,
        error: "Owner accounts are permanent and cannot be changed back to Customer.",
      };
    }

    // 2. Update Supabase profiles table
    await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", user.id);

    // 3. Also update user metadata
    await supabase.auth.updateUser({
      data: { role: newRole },
    });

    // Save active role to localStorage scoped to current user ID
    if (typeof window !== "undefined") {
      localStorage.setItem(`labadago_active_role_${user.id}`, String(newRole));
      localStorage.setItem("labadago_active_role", String(newRole));
      const cached = getCachedUserProfile();
      if (cached) {
        cached.role = newRole;
        localStorage.setItem("labadago_cached_profile", JSON.stringify(cached));
      }
    }

    return { success: true, role: newRole };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to switch role.";
    return { success: false, role: newRole, error: message };
  }
}

/**
 * Get current authenticated user profile with active role detection and staff lock
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      // Do not allow guest browsing on authenticated pages - return null so auth guards require an account
      return null;
    }

    // Check if user is assigned as staff in branch_staff
    let staffRecord: { shop_id: string; laundry_shops?: { name?: string } } | null = null;
    try {
      const { data } = await supabase
        .from("branch_staff")
        .select("shop_id, laundry_shops(name)")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        staffRecord = data as any;
      }
    } catch {
      // ignore
    }

    const localStaff = localStaffStore.find((s) => s.user_id === user.id);

    // Check localStorage fallback for role switch persistence scoped to current user
    let savedRole: UserRole | null = null;
    if (typeof window !== "undefined") {
      const userStored = localStorage.getItem(`labadago_active_role_${user.id}`);
      if (userStored !== null) {
        savedRole = Number(userStored) as UserRole;
      }
    }

    // Try fetching from public.profiles table
    const { data: dbProfile } = await supabase
      .from("profiles")
      .select("*, laundry_shops(name)")
      .eq("id", user.id)
      .maybeSingle();

    const isStaff = dbProfile?.role === UserRole.STAFF || !!staffRecord || !!localStaff;
    const assignedShopId = staffRecord?.shop_id || localStaff?.shop_id || dbProfile?.assigned_shop_id || null;
    const assignedShopName =
      (staffRecord?.laundry_shops as any)?.name ||
      localStaff?.shop_name ||
      (dbProfile?.laundry_shops as any)?.name ||
      null;

    // If active staff, enforce staff role and remove conflicting saved role in localStorage
    if (isStaff && typeof window !== "undefined") {
      localStorage.removeItem(`labadago_active_role_${user.id}`);
      localStorage.removeItem("labadago_active_role");
    }

    if (dbProfile) {
      const effectiveRole = isStaff
        ? UserRole.STAFF
        : savedRole !== null
        ? savedRole
        : dbProfile.role !== undefined && dbProfile.role !== null
        ? (dbProfile.role as UserRole)
        : UserRole.COSTUMER;

      const profileObj: UserProfile = {
        id: dbProfile.id,
        email: dbProfile.email || user.email || null,
        full_name: dbProfile.full_name || user.user_metadata?.full_name || "User",
        date_of_birth: dbProfile.date_of_birth || user.user_metadata?.date_of_birth || "",
        phone_number: dbProfile.phone_number || user.user_metadata?.phone_number || "",
        gender: dbProfile.gender || user.user_metadata?.gender || "Prefer not to say",
        role: effectiveRole,
        assigned_shop_id: assignedShopId,
        assigned_shop_name: assignedShopName,
        created_at: dbProfile.created_at,
        updated_at: dbProfile.updated_at,
      };

      const pIdx = localProfilesStore.findIndex((p) => p.id === user.id);
      if (pIdx >= 0) localProfilesStore[pIdx] = profileObj;
      else localProfilesStore.push(profileObj);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("labadago_cached_profile", JSON.stringify(profileObj));
        } catch {
          // ignore
        }
      }

      return profileObj;
    }

    const meta = user.user_metadata || {};
    const metaRole = isStaff
      ? UserRole.STAFF
      : savedRole !== null
      ? savedRole
      : meta.role !== undefined
      ? (Number(meta.role) as UserRole)
      : UserRole.COSTUMER;

    const fallbackProfile: UserProfile = {
      id: user.id,
      email: user.email || null,
      full_name: meta.full_name || "Customer",
      date_of_birth: meta.date_of_birth || "",
      phone_number: meta.phone_number || "",
      gender: meta.gender || "Prefer not to say",
      role: metaRole,
      assigned_shop_id: assignedShopId,
      assigned_shop_name: assignedShopName,
    };

    const fIdx = localProfilesStore.findIndex((p) => p.id === user.id);
    if (fIdx >= 0) localProfilesStore[fIdx] = fallbackProfile;
    else localProfilesStore.push(fallbackProfile);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("labadago_cached_profile", JSON.stringify(fallbackProfile));
      } catch {
        // ignore
      }
    }

    return fallbackProfile;
  } catch (err) {
    console.error("Error fetching user profile:", err);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Laundry Shops & Services Helpers
// -----------------------------------------------------------------------------

export async function getLaundryShops(ownerId?: string): Promise<LaundryShop[]> {
  try {
    let query = supabase
      .from("laundry_shops")
      .select("*, shop_services(*)");

    if (ownerId) {
      query = query.eq("owner_id", ownerId);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      return data.map((shop) => ({
        ...shop,
        max_kilo_per_load: shop.max_kilo_per_load ? Number(shop.max_kilo_per_load) : 8.0,
        images: Array.isArray(shop.images) && shop.images.length > 0
          ? shop.images
          : ["https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80"],
        services: (shop.shop_services || []).map((srv: any) => {
          let kilos: number | null =
            srv.kilos !== undefined && srv.kilos !== null ? Number(srv.kilos) : null;
          if ((kilos === null || isNaN(kilos)) && srv.description) {
            const match = String(srv.description).match(/(\d+(\.\d+)?)\s*kg/i);
            if (match) kilos = parseFloat(match[1]);
          }
          return {
            ...srv,
            kilos: kilos && !isNaN(kilos) ? kilos : undefined,
          };
        }),
      }));
    }
  } catch (err) {
    console.error("Error fetching shops:", err);
  }

  if (ownerId) {
    const ownerShops = localShopsStore.filter((s) => s.owner_id === ownerId);
    return ownerShops.length > 0 ? ownerShops : DEFAULT_REGISTERED_SHOPS.filter((s) => s.owner_id === ownerId);
  }
  return localShopsStore.length > 0 ? localShopsStore : DEFAULT_REGISTERED_SHOPS;
}

export async function getShopServices(shopId: string): Promise<ShopService[]> {
  if (!shopId) return [];
  try {
    const { data, error } = await supabase
      .from("shop_services")
      .select("*")
      .eq("shop_id", shopId)
      .order("price", { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((srv: any) => ({
        id: srv.id,
        shop_id: srv.shop_id || shopId,
        service_name: srv.service_name || srv.name || "Laundry Service",
        price: Number(srv.price) || 0,
        unit: srv.unit || "load",
        kilos: srv.kilos ? Number(srv.kilos) : undefined,
        description: srv.description || "",
        estimated_minutes: Number(srv.estimated_minutes) || 60,
        is_available: srv.is_available !== false,
      }));
    }
  } catch (err) {
    console.error("Error fetching shop services:", err);
  }

  // Fallback to localShopsStore
  const localShop = localShopsStore.find((s) => s.id === shopId);
  return localShop?.services || [];
}

/**
 * Save or update a laundry shop in Supabase
 * Persists shop details, location, hours, queue status, and Cloudinary image URLs
 * Enforces strict ownership checks: owners can only update their own shops.
 */
export async function saveLaundryShop(shop: LaundryShop): Promise<{
  success: boolean;
  shop: LaundryShop;
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        shop,
        error: "You must be signed in to register or modify a laundry shop.",
      };
    }

    // Check if shop has a valid UUID (not a temporary client string like 'owner-shop-001' or 'shop-123')
    const isTempId =
      !shop.id ||
      shop.id.startsWith("shop-") ||
      shop.id.startsWith("owner-") ||
      !shop.id.includes("-");

    // Strict ownership verification: Prevent editing shops owned by another user
    if (!isTempId) {
      const { data: existingShop } = await supabase
        .from("laundry_shops")
        .select("id, owner_id")
        .eq("id", shop.id)
        .maybeSingle();

      if (existingShop && existingShop.owner_id && existingShop.owner_id !== user.id) {
        return {
          success: false,
          shop,
          error: "Permission denied: You cannot edit another user's laundry shop.",
        };
      }

      const localExisting = localShopsStore.find((s) => s.id === shop.id);
      if (localExisting && localExisting.owner_id && localExisting.owner_id !== user.id) {
        return {
          success: false,
          shop,
          error: "Permission denied: You cannot edit another user's laundry shop.",
        };
      }
    }

    const payload: Record<string, any> = {
      name: shop.name.trim(),
      description: shop.description || "",
      address: shop.address.trim(),
      latitude: shop.latitude,
      longitude: shop.longitude,
      phone_number: shop.phone_number.trim(),
      open_time: shop.open_time || "07:00",
      close_time: shop.close_time || "21:00",
      queue_status: shop.queue_status || "Low",
      washer_count: shop.washer_count || 6,
      dryer_count: shop.dryer_count || 6,
      max_kilo_per_load: shop.max_kilo_per_load ? Number(shop.max_kilo_per_load) : 8.0,
      images: Array.isArray(shop.images) ? shop.images : [],
      owner_id: user.id,
      updated_at: new Date().toISOString(),
    };

    let savedShopId = shop.id;

    if (isTempId) {
      // Insert new shop
      let { data: inserted, error: insertError } = await supabase
        .from("laundry_shops")
        .insert(payload)
        .select()
        .single();

      if (insertError && insertError.message.includes("max_kilo_per_load")) {
        delete payload.max_kilo_per_load;
        const retry = await supabase
          .from("laundry_shops")
          .insert(payload)
          .select()
          .single();
        inserted = retry.data;
        insertError = retry.error;
      }

      if (insertError) {
        console.warn("Supabase insert shop notice:", insertError.message);
      } else if (inserted) {
        savedShopId = inserted.id;
      }
    } else {
      // Update existing shop (guarantee owner_id matches)
      payload.id = shop.id;
      let { error: updateError } = await supabase
        .from("laundry_shops")
        .upsert(payload, { onConflict: "id" });

      if (updateError && updateError.message.includes("max_kilo_per_load")) {
        delete payload.max_kilo_per_load;
        const retry = await supabase
          .from("laundry_shops")
          .upsert(payload, { onConflict: "id" });
        updateError = retry.error;
      }

      if (updateError) {
        console.warn("Supabase upsert shop notice:", updateError.message);
        return {
          success: false,
          shop,
          error: updateError.message || "Failed to update laundry shop in database.",
        };
      }
    }

    // Save shop services if provided (for both new and existing shops)
    let savedServices: ShopService[] = shop.services || [];

    if (savedShopId && shop.services) {
      try {
        // Cleanly delete previous services for this shop to avoid duplicates
        await supabase.from("shop_services").delete().eq("shop_id", savedShopId);

        if (shop.services.length > 0) {
          const servicesPayload = shop.services.map((srv) => {
            const parsedKilos =
              srv.kilos !== undefined && srv.kilos !== null ? Number(srv.kilos) : null;
            const desc =
              srv.description || (parsedKilos ? `Up to ${parsedKilos} kg` : "");
            const item: Record<string, any> = {
              shop_id: savedShopId,
              service_name: srv.service_name.trim(),
              description: desc,
              price: Number(srv.price) || 0,
              unit: "load",
              estimated_minutes: srv.estimated_minutes || 90,
              is_available: srv.is_available !== false,
            };
            if (parsedKilos !== null && !isNaN(parsedKilos)) {
              item.kilos = parsedKilos;
            }
            // Only preserve UUID if it's already a valid 36-char Postgres UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (srv.id && uuidRegex.test(srv.id)) {
              item.id = srv.id;
            }
            return item;
          });

          let { data: insertedServices, error: srvError } = await supabase
            .from("shop_services")
            .insert(servicesPayload)
            .select();

          // If 'kilos' column does not exist yet in Supabase table, retry gracefully without it
          if (srvError && srvError.message.includes("kilos")) {
            console.warn("Retrying services insert without 'kilos' column:", srvError.message);
            const fallbackPayload = servicesPayload.map((it) => {
              const copy = { ...it };
              delete copy.kilos;
              return copy;
            });
            const retry = await supabase
              .from("shop_services")
              .insert(fallbackPayload)
              .select();
            insertedServices = retry.data;
            srvError = retry.error;
          }

          if (srvError) {
            console.warn("Supabase save services error:", srvError.message);
          } else if (insertedServices && insertedServices.length > 0) {
            savedServices = insertedServices.map((ins, idx) => ({
              ...ins,
              kilos: shop.services![idx]?.kilos ?? ins.kilos,
            }));
          }
        }
      } catch (srvErr) {
        console.warn("Error saving services:", srvErr);
      }
    }

    const finalShop: LaundryShop = {
      ...shop,
      id: savedShopId,
      owner_id: user.id,
      images: payload.images,
      services: savedServices,
    };

    // Update local store so current session reflects it immediately
    const existingIdx = localShopsStore.findIndex((s) => s.id === shop.id || s.id === savedShopId);
    if (existingIdx >= 0) {
      localShopsStore[existingIdx] = finalShop;
    } else {
      localShopsStore.unshift(finalShop);
    }

    return { success: true, shop: finalShop };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save shop.";
    console.error("Save laundry shop exception:", err);
    return { success: false, shop, error: message };
  }
}

/**
 * Delete a laundry shop owned by the user
 */
export async function deleteLaundryShop(shopId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "You must be signed in to delete a shop." };
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from("laundry_shops")
      .select("id, owner_id")
      .eq("id", shopId)
      .maybeSingle();

    if (existing && existing.owner_id && existing.owner_id !== user.id) {
      return { success: false, error: "Unauthorized: You cannot delete another owner's shop." };
    }

    const { error: delError } = await supabase
      .from("laundry_shops")
      .delete()
      .eq("id", shopId)
      .eq("owner_id", user.id);

    if (delError) {
      return { success: false, error: delError.message };
    }

    localShopsStore = localShopsStore.filter((s) => s.id !== shopId);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete shop";
    return { success: false, error: message };
  }
}

export async function createWalkInTransaction(
  payload: WalkInQRPayload
): Promise<{ success: boolean; transaction: LaundryTransaction }> {
  const newTx: LaundryTransaction = {
    id: `tx-${Date.now()}`,
    tracking_number: payload.trackingNumber,
    customer_id: payload.customerId,
    shop_id: payload.shopId,
    shop_name: payload.shopName,
    customer_name: payload.customerName,
    customer_phone: payload.customerPhone,
    service_name: payload.serviceName,
    weight_kg: payload.estimatedWeight,
    total_amount: payload.estimatedAmount,
    status: "Pending", // Initially Pending until scanned by owner at counter!
    payment_status: "Unpaid",
    is_walkin: true,
    qr_data: JSON.stringify(payload),
    special_notes: payload.specialNotes,
    created_at: new Date().toISOString(),
  };

  try {
    const dbCustomerId =
      newTx.customer_id &&
      newTx.customer_id !== "guest-customer" &&
      newTx.customer_id.length > 20
        ? newTx.customer_id
        : null;

    await supabase.from("transactions").insert({
      tracking_number: newTx.tracking_number,
      customer_id: dbCustomerId,
      shop_id: newTx.shop_id,
      customer_name: newTx.customer_name,
      customer_phone: newTx.customer_phone,
      service_name: newTx.service_name,
      weight_kg: newTx.weight_kg,
      total_amount: newTx.total_amount,
      status: newTx.status,
      payment_status: newTx.payment_status,
      is_walkin: true,
      qr_data: newTx.qr_data,
      special_notes: newTx.special_notes,
    });
  } catch {
    // fallback to local state
  }

  localTransactionsStore = [newTx, ...localTransactionsStore];
  return { success: true, transaction: newTx };
}

export async function createManualWalkInTransaction(data: {
  customer_name: string;
  customer_phone: string;
  shop_id: string;
  shop_name: string;
  service_name: string;
  weight_kg: number;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_method?: "Cash" | "GCash";
  payment_proof_url?: string;
  payment_reference_no?: string;
  machine_number?: string;
  special_notes?: string;
  staff_id?: string;
}): Promise<{ success: boolean; transaction: LaundryTransaction }> {
  const trackingNumber = `LBD-${Math.floor(10000 + Math.random() * 90000)}`;
  const newTx: LaundryTransaction = {
    id: `tx-${Date.now()}`,
    tracking_number: trackingNumber,
    customer_id: null,
    shop_id: data.shop_id,
    shop_name: data.shop_name,
    customer_name: data.customer_name.trim(),
    customer_phone: data.customer_phone.trim(),
    service_name: data.service_name,
    weight_kg: data.weight_kg,
    total_amount: data.total_amount,
    status: "Washing", // Immediately starts processing!
    payment_status: data.payment_status,
    payment_method: data.payment_method,
    payment_proof_url: data.payment_proof_url,
    payment_reference_no: data.payment_reference_no,
    paid_at: data.payment_status === "Paid" ? new Date().toISOString() : undefined,
    machine_number: data.machine_number,
    special_notes: data.special_notes,
    staff_id: data.staff_id,
    is_walkin: true,
    created_at: new Date().toISOString(),
  };

  try {
    const insertPayload: Record<string, unknown> = {
      tracking_number: newTx.tracking_number,
      customer_id: null,
      shop_id: newTx.shop_id,
      customer_name: newTx.customer_name,
      customer_phone: newTx.customer_phone,
      service_name: newTx.service_name,
      weight_kg: newTx.weight_kg,
      total_amount: newTx.total_amount,
      status: "Washing",
      payment_status: newTx.payment_status,
      is_walkin: true,
      special_notes: newTx.special_notes,
    };

    if (newTx.payment_method) insertPayload.payment_method = newTx.payment_method;
    if (newTx.payment_proof_url) insertPayload.payment_proof_url = newTx.payment_proof_url;
    if (newTx.payment_reference_no) insertPayload.payment_reference_no = newTx.payment_reference_no;
    if (newTx.machine_number) insertPayload.machine_number = newTx.machine_number;
    if (newTx.staff_id) insertPayload.staff_id = newTx.staff_id;

    const { data: dbData, error } = await supabase
      .from("transactions")
      .insert(insertPayload)
      .select()
      .maybeSingle();

    if (!error && dbData) {
      newTx.id = dbData.id;
    }
  } catch {
    // fallback to local state
  }

  localTransactionsStore = [newTx, ...localTransactionsStore];
  return { success: true, transaction: newTx };
}

export async function getLaundryTransactions(
  customerId?: string,
  shopId?: string,
  ownerShopIds?: string[]
): Promise<LaundryTransaction[]> {
  try {
    // If querying for an owner who has 0 registered shops, return empty list immediately
    if (ownerShopIds && ownerShopIds.length === 0) {
      return [];
    }

    let query = supabase.from("transactions").select("*").order("created_at", { ascending: false });

    if (customerId) {
      query = query.eq("customer_id", customerId);
    }
    if (shopId) {
      query = query.eq("shop_id", shopId);
    } else if (ownerShopIds && ownerShopIds.length > 0) {
      query = query.in("shop_id", ownerShopIds);
    }

    const { data, error } = await query;
    if (!error && data) {
      return data;
    }
  } catch {
    // fallback
  }

  if (customerId) {
    return localTransactionsStore.filter((tx) => tx.customer_id === customerId);
  }
  if (shopId) {
    return localTransactionsStore.filter((tx) => tx.shop_id === shopId);
  }
  if (ownerShopIds) {
    return localTransactionsStore.filter((tx) => ownerShopIds.includes(tx.shop_id));
  }
  return localTransactionsStore;
}

/**
 * Fetch transactions matching an array of tracking numbers (for guests and quick lookups)
 */
export async function getTransactionsByTrackingNumbers(
  trackingNumbers: string[]
): Promise<LaundryTransaction[]> {
  if (!trackingNumbers || trackingNumbers.length === 0) return [];
  const cleanList = trackingNumbers.map((t) => t.trim().toUpperCase());

  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .in("tracking_number", cleanList)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data;
    }
  } catch {
    // fallback
  }

  return localTransactionsStore.filter((tx) =>
    cleanList.includes(tx.tracking_number.toUpperCase())
  );
}

/**
 * Look up a transaction by tracking number across the database,
 * retrieving its associated shop name and details to verify shop affiliation.
 */
export async function getTransactionByTrackingNumber(
  trackingNumber: string
): Promise<{ transaction: LaundryTransaction | null; error?: string }> {
  const cleanQuery = trackingNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleanQuery) return { transaction: null };

  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*, laundry_shops(name, address)")
      .ilike("tracking_number", cleanQuery)
      .maybeSingle();

    if (!error && data) {
      const shopInfo = data.laundry_shops as { name?: string; address?: string } | null;
      const resolvedShopName = shopInfo?.name || data.shop_name || "Another Laundry Shop";
      return {
        transaction: {
          ...data,
          shop_name: resolvedShopName,
        },
      };
    }
  } catch (err) {
    console.error("Error looking up transaction by tracking number:", err);
  }

  // Fallback search in localTransactionsStore
  const localFound = localTransactionsStore.find(
    (t) => t.tracking_number.toUpperCase().replace(/[^A-Z0-9]/g, "") === cleanQuery
  );

  if (localFound) {
    return { transaction: localFound };
  }

  return { transaction: null };
}



export async function updateTransactionStatus(
  txId: string,
  newStatus: OrderStatus,
  weightKg?: number,
  paymentStatus?: PaymentStatus,
  totalAmount?: number,
  specialNotes?: string,
  machineNumber?: string,
  staffId?: string,
  staffName?: string,
  paymentMethod?: string,
  paymentProofUrl?: string,
  paymentReferenceNo?: string
): Promise<boolean> {
  // Map "Processing" to "Washing" in the database to satisfy the postgres check constraint
  const dbStatus = newStatus === "Processing" ? "Washing" : newStatus;
  const updatePayload: Record<string, unknown> = {
    status: dbStatus,
    updated_at: new Date().toISOString(),
  };
  if (weightKg !== undefined && !isNaN(weightKg)) {
    updatePayload.weight_kg = weightKg;
  }
  if (paymentStatus !== undefined) {
    updatePayload.payment_status = paymentStatus;
    if (paymentStatus === "Paid") {
      updatePayload.paid_at = new Date().toISOString();
    }
  }
  if (paymentMethod !== undefined) {
    updatePayload.payment_method = paymentMethod;
  }
  if (paymentProofUrl !== undefined) {
    updatePayload.payment_proof_url = paymentProofUrl;
  }
  if (paymentReferenceNo !== undefined) {
    updatePayload.payment_reference_no = paymentReferenceNo;
  }
  if (totalAmount !== undefined && !isNaN(totalAmount)) {
    updatePayload.total_amount = totalAmount;
  }
  if (specialNotes !== undefined) {
    updatePayload.special_notes = specialNotes;
  }
  const isUuid = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  if (machineNumber !== undefined) {
    updatePayload.machine_number = machineNumber;
  }
  if (staffId !== undefined && isUuid(staffId)) {
    updatePayload.staff_id = staffId;
  }

  try {
    const isTxUuid = isUuid(txId);
    const primaryField = isTxUuid ? "id" : "tracking_number";

    // 1. Primary update attempt
    let res = await supabase
      .from("transactions")
      .update(updatePayload)
      .eq(primaryField, txId)
      .select();

    // 2. If foreign key check failed on staff_id (code 23503), retry without staff_id
    if (res.error && (res.error.code === "23503" || res.error.message.includes("staff_id"))) {
      console.warn("Foreign key check failed on staff_id, retrying without it:", res.error.message);
      delete updatePayload.staff_id;
      res = await supabase
        .from("transactions")
        .update(updatePayload)
        .eq(primaryField, txId)
        .select();
    }

    // 3. Fallback on alternate field if 0 rows updated
    if (!res.data || res.data.length === 0) {
      const fallbackField = isTxUuid ? "tracking_number" : "id";
      if (!fallbackField.includes("id") || isUuid(txId)) {
        let fallbackRes = await supabase
          .from("transactions")
          .update(updatePayload)
          .eq(fallbackField, txId)
          .select();
        if (fallbackRes.error && (fallbackRes.error.code === "23503" || fallbackRes.error.message.includes("staff_id"))) {
          delete updatePayload.staff_id;
          await supabase
            .from("transactions")
            .update(updatePayload)
            .eq(fallbackField, txId)
            .select();
        }
      }
    }
  } catch (err) {
    console.warn("Error updating transaction status in Supabase:", err);
  }

  localTransactionsStore = localTransactionsStore.map((tx) =>
    tx.id === txId || tx.tracking_number === txId
      ? {
          ...tx,
          status: newStatus,
          weight_kg: weightKg !== undefined && !isNaN(weightKg) ? weightKg : tx.weight_kg,
          payment_status: paymentStatus !== undefined ? paymentStatus : tx.payment_status,
          payment_method: paymentMethod !== undefined ? paymentMethod : tx.payment_method,
          payment_proof_url: paymentProofUrl !== undefined ? paymentProofUrl : tx.payment_proof_url,
          payment_reference_no: paymentReferenceNo !== undefined ? paymentReferenceNo : tx.payment_reference_no,
          paid_at: paymentStatus === "Paid" ? new Date().toISOString() : tx.paid_at,
          total_amount: totalAmount !== undefined && !isNaN(totalAmount) ? totalAmount : tx.total_amount,
          special_notes: specialNotes !== undefined ? specialNotes : tx.special_notes,
          machine_number: machineNumber !== undefined ? machineNumber : tx.machine_number,
          staff_id: staffId !== undefined ? staffId : tx.staff_id,
          staff_name: staffName !== undefined ? staffName : tx.staff_name,
          updated_at: new Date().toISOString(),
        }
      : tx
  );

  return true;
}

/**
 * Permanently delete a transaction by id or tracking number
 */
export async function deleteTransaction(txId: string): Promise<boolean> {
  const isUuid = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  try {
    const isTxUuid = isUuid(txId);
    const primaryField = isTxUuid ? "id" : "tracking_number";

    const res = await supabase
      .from("transactions")
      .delete()
      .eq(primaryField, txId)
      .select();

    if ((!res.data || res.data.length === 0) && isTxUuid) {
      await supabase
        .from("transactions")
        .delete()
        .eq("tracking_number", txId)
        .select();
    }
  } catch (err) {
    console.warn("Error deleting transaction in Supabase:", err);
  }

  localTransactionsStore = localTransactionsStore.filter(
    (tx) => tx.id !== txId && tx.tracking_number !== txId
  );

  return true;
}

export async function updateTransactionPayment(
  txId: string,
  paymentStatus: PaymentStatus,
  specialNotes?: string,
  paymentMethod?: string,
  paymentProofUrl?: string,
  paymentReferenceNo?: string
): Promise<boolean> {
  const updatePayload: Record<string, unknown> = {
    payment_status: paymentStatus,
    updated_at: new Date().toISOString(),
  };
  if (paymentStatus === "Paid") {
    updatePayload.paid_at = new Date().toISOString();
  }
  if (paymentMethod !== undefined) {
    updatePayload.payment_method = paymentMethod;
  }
  if (paymentProofUrl !== undefined) {
    updatePayload.payment_proof_url = paymentProofUrl;
  }
  if (paymentReferenceNo !== undefined) {
    updatePayload.payment_reference_no = paymentReferenceNo;
  }
  if (specialNotes !== undefined) {
    updatePayload.special_notes = specialNotes;
  }

  const isUuid = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  try {
    const isTxUuid = isUuid(txId);
    const primaryField = isTxUuid ? "id" : "tracking_number";

    const res = await supabase
      .from("transactions")
      .update(updatePayload)
      .eq(primaryField, txId)
      .select();

    if ((!res.data || res.data.length === 0) && isTxUuid) {
      await supabase
        .from("transactions")
        .update(updatePayload)
        .eq("tracking_number", txId)
        .select();
    }
  } catch (err) {
    console.warn("Error updating transaction payment in Supabase:", err);
  }

  localTransactionsStore = localTransactionsStore.map((tx) =>
    tx.id === txId || tx.tracking_number === txId
      ? {
          ...tx,
          payment_status: paymentStatus,
          payment_method: paymentMethod !== undefined ? paymentMethod : tx.payment_method,
          payment_proof_url: paymentProofUrl !== undefined ? paymentProofUrl : tx.payment_proof_url,
          payment_reference_no: paymentReferenceNo !== undefined ? paymentReferenceNo : tx.payment_reference_no,
          paid_at: paymentStatus === "Paid" ? new Date().toISOString() : tx.paid_at,
          special_notes: specialNotes !== undefined ? specialNotes : tx.special_notes,
          updated_at: new Date().toISOString(),
        }
      : tx
  );

  return true;
}

/**
 * Compresses an image file client-side and uploads it to Supabase Storage
 * bucket 'payment_proofs'. If upload fails or bucket is not yet created,
 * falls back to a compressed Base64 data URI so transactions never fail.
 */
export async function uploadPaymentProof(
  file: File,
  trackingNumber: string
): Promise<string> {
  // Compress image client-side via canvas
  const compressedDataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });

  if (!compressedDataUrl) {
    throw new Error("Failed to read image file");
  }

  // Attempt upload to Supabase Storage
  try {
    const cleanNum = trackingNumber.replace(/[^a-zA-Z0-9]/g, "");
    const fileName = `${cleanNum}-${Date.now()}.jpg`;

    const res = await fetch(compressedDataUrl);
    const blob = await res.blob();

    const uploadRes = await supabase.storage
      .from("payment_proofs")
      .upload(fileName, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (!uploadRes.error && uploadRes.data?.path) {
      const { data: urlData } = supabase.storage
        .from("payment_proofs")
        .getPublicUrl(uploadRes.data.path);
      if (urlData?.publicUrl) {
        return urlData.publicUrl;
      }
    }
  } catch {
    // If Supabase storage is not configured or errors, fallback to Base64
  }

  // Graceful fallback to data URL
  return compressedDataUrl;
}

// -----------------------------------------------------------------------------
// Staff Management Helpers (Owner / Admin Side)
// -----------------------------------------------------------------------------

export interface MemberSearchResult {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string;
  role: UserRole;
  assigned_shop_id?: string | null;
  assigned_shop_name?: string | null;
}

/**
 * Search existing registered LabadaGo members so the owner can recruit them as staff.
 */
export async function searchMembers(query: string): Promise<MemberSearchResult[]> {
  const term = query.trim().toLowerCase();
  if (!term) return [];

  try {
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Try Supabase RPC search function if available
    const { data: rpcData, error: rpcError } = await supabase.rpc("search_labadago_members", {
      search_term: term,
    });

    if (!rpcError && rpcData && Array.isArray(rpcData)) {
      return rpcData
        .filter((m: any) => m.id !== user?.id)
        .map((m: any) => ({
          id: m.id,
          full_name: m.full_name,
          email: m.email || null,
          phone_number: m.phone_number || "",
          role: Number(m.role) as UserRole,
          assigned_shop_id: m.assigned_shop_id || null,
          assigned_shop_name: m.assigned_shop_name || null,
        }));
    }

    // 2. Direct profiles table query
    const { data: profiles, error: profError } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone_number, role, assigned_shop_id, laundry_shops(name)")
      .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone_number.ilike.%${term}%`)
      .limit(15);

    if (!profError && profiles && profiles.length > 0) {
      return profiles
        .filter((p) => p.id !== user?.id)
        .map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          phone_number: p.phone_number,
          role: Number(p.role) as UserRole,
          assigned_shop_id: p.assigned_shop_id,
          assigned_shop_name: p.laundry_shops?.name || null,
        }));
    }
  } catch (err) {
    console.warn("Member search database notice, checking local profiles:", err);
  }

  // 3. Fallback search in local profiles store
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  return localProfilesStore
    .filter((p) => p.id !== currentUser?.id)
    .filter(
      (p) =>
        p.full_name.toLowerCase().includes(term) ||
        (p.email && p.email.toLowerCase().includes(term)) ||
        p.phone_number.includes(term)
    )
    .map((p) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      phone_number: p.phone_number,
      role: p.role,
      assigned_shop_id: p.assigned_shop_id,
      assigned_shop_name: p.assigned_shop_name,
    }));
}

// =============================================================================
// Branch Staff Management & Registration Functions
// =============================================================================

const LOCAL_STORAGE_STAFF_KEY = "labadago_branch_staff_list";

function getStoredBranchStaff(): BranchStaffMember[] {
  if (typeof window === "undefined") {
    return localStaffStore;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_STAFF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Purge any legacy static mock data that starts with 'stf-rec-' or belongs to 'default-shop-main'
        const cleanList = parsed.filter(
          (s) => !s.id?.startsWith("stf-rec-") && s.shop_id !== "default-shop-main"
        );
        localStaffStore = cleanList;
        return cleanList;
      }
    }
  } catch {
    // fallback
  }
  return localStaffStore;
}

function saveStoredBranchStaff(list: BranchStaffMember[]) {
  localStaffStore = list;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_STAFF_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }
}

/**
 * Fetch staff assigned to a specific shop, or all staff across an owner's branches
 */
export async function getBranchStaff(
  shopId?: string,
  ownerId?: string
): Promise<BranchStaffMember[]> {
  try {
    let query = supabase
      .from("branch_staff")
      .select(
        "id, staff_id_code, shop_id, user_id, role_title, status, birthdate, gender, profile_picture, assigned_by, created_at, laundry_shops(name, owner_id), profiles(full_name, email, phone_number, date_of_birth, gender, avatar_url)"
      );

    if (shopId) {
      query = query.eq("shop_id", shopId);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const list: BranchStaffMember[] = data
        .filter((item: any) => {
          if (ownerId && item.laundry_shops?.owner_id !== ownerId) return false;
          return true;
        })
        .map((item: any, idx: number) => ({
          id: item.id,
          staff_id_code: item.staff_id_code || `STF-${String(idx + 1).padStart(3, "0")}`,
          shop_id: item.shop_id,
          shop_name: item.laundry_shops?.name || "Laundry Shop",
          user_id: item.user_id,
          full_name: item.profiles?.full_name || item.full_name || "Branch Staff",
          email: item.profiles?.email || item.email || null,
          phone_number: item.profiles?.phone_number || item.phone_number || "",
          birthdate: item.birthdate || item.profiles?.date_of_birth || null,
          gender: item.gender || item.profiles?.gender || null,
          profile_picture: item.profile_picture || item.profiles?.avatar_url || null,
          role_title: item.role_title || "Counter Staff",
          status: item.status || "Active",
          avatar_color: "bg-blue-100 text-blue-700",
          assigned_by: item.assigned_by,
          created_at: item.created_at,
        }));
      return list;
    }

    // Fallback if custom columns not yet migrated in Supabase
    if (error && error.message?.includes("column")) {
      const fallbackQuery = supabase
        .from("branch_staff")
        .select(
          "id, shop_id, user_id, role_title, assigned_by, created_at, laundry_shops(name, owner_id), profiles(full_name, email, phone_number, date_of_birth, gender, avatar_url)"
        );
      if (shopId) fallbackQuery.eq("shop_id", shopId);
      const { data: fbData } = await fallbackQuery;
      if (fbData && fbData.length > 0) {
        return fbData.map((item: any, idx: number) => ({
          id: item.id,
          staff_id_code: `STF-${String(idx + 1).padStart(3, "0")}`,
          shop_id: item.shop_id,
          shop_name: item.laundry_shops?.name || "Laundry Shop",
          user_id: item.user_id,
          full_name: item.profiles?.full_name || "Branch Staff",
          email: item.profiles?.email || null,
          phone_number: item.profiles?.phone_number || "",
          birthdate: item.profiles?.date_of_birth || null,
          gender: item.profiles?.gender || null,
          profile_picture: item.profiles?.avatar_url || null,
          role_title: item.role_title || "Counter Staff",
          status: "Active",
          avatar_color: "bg-blue-100 text-blue-700",
          assigned_by: item.assigned_by,
          created_at: item.created_at,
        }));
      }
    }
  } catch (err) {
    console.warn("Error fetching branch staff from Supabase:", err);
  }

  const stored = getStoredBranchStaff();
  if (shopId) {
    return stored.filter((s) => s.shop_id === shopId);
  }
  return stored;
}

export interface RegisterStaffParams {
  shopId: string;
  fullName: string;
  email: string;
  password?: string;
  phoneNumber: string;
  birthdate?: string;
  gender?: string;
  profilePicture?: string;
  roleTitle?: string;
  status?: "Active" | "Inactive" | "On Leave";
  staffIdCode?: string;
}

/**
 * Register a new staff member for a laundry shop with full account details, username & password
 */
export async function registerStaffMember(
  params: RegisterStaffParams
): Promise<{ success: boolean; staff?: BranchStaffMember; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const stored = getStoredBranchStaff();
    const nextNum = stored.length + 1;
    const staffIdCode = params.staffIdCode?.trim() || `STF-${String(nextNum).padStart(3, "0")}`;
    const generatedUserId = `usr-staff-${Date.now()}`;

    // Get shop name
    const allShops = await getLaundryShops();
    const targetShop = allShops.find((s) => s.id === params.shopId) || allShops[0];
    const shopName = targetShop?.name || "LabadaGO Laundry Branch";

    // 1. Try to create account in Supabase Auth if password is provided
    let authUserId = generatedUserId;
    if (params.password && params.email) {
      try {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: params.email.trim(),
          password: params.password,
          options: {
            data: {
              full_name: params.fullName.trim(),
              phone_number: params.phoneNumber.trim(),
              date_of_birth: params.birthdate || null,
              gender: params.gender || "Prefer not to say",
              avatar_url: params.profilePicture || null,
              role: UserRole.STAFF,
              assigned_shop_id: params.shopId,
              assigned_shop_name: shopName,
            },
          },
        });

        if (!signUpErr && signUpData?.user) {
          authUserId = signUpData.user.id;
        }
      } catch {
        // Continue with local / database fallback
      }
    }

    // 2. Try inserting into Supabase branch_staff table
    try {
      const staffInsertPayload: any = {
        shop_id: params.shopId,
        user_id: authUserId,
        role_title: params.roleTitle || "Staff",
        assigned_by: user?.id || null,
      };

      if (staffIdCode) staffInsertPayload.staff_id_code = staffIdCode;
      if (params.status) staffInsertPayload.status = params.status;
      if (params.birthdate) staffInsertPayload.birthdate = params.birthdate;
      if (params.gender) staffInsertPayload.gender = params.gender;
      if (params.profilePicture) staffInsertPayload.profile_picture = params.profilePicture;

      const { error: insErr } = await supabase.from("branch_staff").insert([staffInsertPayload]);
      if (insErr && insErr.message?.includes("column")) {
        // Fallback for minimal table if custom columns not yet added to DB
        await supabase.from("branch_staff").insert([
          {
            shop_id: params.shopId,
            user_id: authUserId,
            role_title: params.roleTitle || "Staff",
            assigned_by: user?.id || null,
          },
        ]);
      }

      // Ensure profile role is set to STAFF (3) with birthdate, gender, avatar_url
      await supabase.from("profiles").upsert([
        {
          id: authUserId,
          full_name: params.fullName.trim(),
          email: params.email.trim(),
          phone_number: params.phoneNumber.trim(),
          role: UserRole.STAFF,
          assigned_shop_id: params.shopId,
          date_of_birth: params.birthdate || "2000-01-01",
          gender: params.gender || "Prefer not to say",
          avatar_url: params.profilePicture || null,
        },
      ]);
    } catch {
      // Table may not exist yet; handled via fallback
    }

    // Avatar color determination
    const initials = params.fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

    const colors = [
      "bg-blue-100 text-blue-700",
      "bg-purple-100 text-purple-700",
      "bg-amber-100 text-amber-700",
      "bg-rose-100 text-rose-700",
      "bg-teal-100 text-teal-700",
      "bg-pink-100 text-pink-700",
      "bg-orange-100 text-orange-700",
    ];
    const pickedColor = colors[stored.length % colors.length];

    const newStaff: BranchStaffMember = {
      id: `staff-${Date.now()}`,
      staff_id_code: staffIdCode,
      shop_id: params.shopId,
      shop_name: shopName,
      user_id: authUserId,
      full_name: params.fullName.trim(),
      email: params.email.trim(),
      phone_number: params.phoneNumber.trim(),
      birthdate: params.birthdate || null,
      gender: params.gender || null,
      profile_picture: params.profilePicture || null,
      role_title: params.roleTitle || "Counter Staff",
      status: params.status || "Active",
      avatar_color: pickedColor,
      assigned_by: user?.id || "owner",
      created_at: new Date().toISOString(),
    };

    const updated = [newStaff, ...stored];
    saveStoredBranchStaff(updated);

    return { success: true, staff: newStaff };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to register staff member.";
    return { success: false, error: message };
  }
}

/**
 * Update a staff member's role, status, contact, or assignment
 */
export async function updateStaffMember(
  staffId: string,
  updates: Partial<BranchStaffMember>
): Promise<{ success: boolean; staff?: BranchStaffMember; error?: string }> {
  try {
    const stored = getStoredBranchStaff();
    const idx = stored.findIndex((s) => s.id === staffId || s.staff_id_code === staffId);
    if (idx === -1) {
      return { success: false, error: "Staff member not found." };
    }

    const updatedStaff = { ...stored[idx], ...updates };

    // Update in Supabase if possible
    try {
      const staffUpdatePayload: any = {
        role_title: updatedStaff.role_title,
        status: updatedStaff.status,
      };
      if (updatedStaff.birthdate !== undefined) staffUpdatePayload.birthdate = updatedStaff.birthdate;
      if (updatedStaff.gender !== undefined) staffUpdatePayload.gender = updatedStaff.gender;
      if (updatedStaff.profile_picture !== undefined) staffUpdatePayload.profile_picture = updatedStaff.profile_picture;

      await supabase
        .from("branch_staff")
        .update(staffUpdatePayload)
        .eq("id", staffId);

      // Also update linked profile
      if (updatedStaff.user_id) {
        await supabase
          .from("profiles")
          .update({
            full_name: updatedStaff.full_name,
            phone_number: updatedStaff.phone_number,
            date_of_birth: updatedStaff.birthdate || undefined,
            gender: updatedStaff.gender || undefined,
            avatar_url: updatedStaff.profile_picture || undefined,
          })
          .eq("id", updatedStaff.user_id);
      }
    } catch {
      // ignore
    }

    stored[idx] = updatedStaff;
    saveStoredBranchStaff(stored);

    return { success: true, staff: updatedStaff };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update staff member.";
    return { success: false, error: message };
  }
}

/**
 * Delete / Remove a staff member from branch
 */
export async function deleteStaffMember(
  staffId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete in Supabase
    try {
      await supabase.from("branch_staff").delete().eq("id", staffId);
    } catch {
      // ignore
    }

    const stored = getStoredBranchStaff();
    const filtered = stored.filter((s) => s.id !== staffId && s.staff_id_code !== staffId);
    saveStoredBranchStaff(filtered);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete staff member.";
    return { success: false, error: message };
  }
}

/**
 * Assign a registered LabadaGo member as staff of a specific branch
 */
export async function assignStaffToBranch(
  shopId: string,
  userId: string,
  roleTitle: string = "Counter Staff"
): Promise<{ success: boolean; staff?: BranchStaffMember; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // 1. Try Supabase RPC
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("assign_branch_staff", {
        target_shop_id: shopId,
        target_user_id: userId,
        p_role_title: roleTitle,
      });

      if (!rpcErr && rpcRes?.success) {
        // RPC handled it cleanly
      } else {
        // Direct database upsert
        await supabase.from("branch_staff").upsert(
          {
            shop_id: shopId,
            user_id: userId,
            assigned_by: user.id,
            role_title: roleTitle,
            created_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

        await supabase
          .from("profiles")
          .update({ role: UserRole.STAFF, assigned_shop_id: shopId })
          .eq("id", userId);
      }
    } catch {
      // ignore
    }

    // Resolve shop name
    const allShops = await getLaundryShops();
    const shop = allShops.find((s) => s.id === shopId);

    // Update in-memory fallback stores
    const profile = localProfilesStore.find((p) => p.id === userId);
    if (profile) {
      profile.role = UserRole.STAFF;
      profile.assigned_shop_id = shopId;
      profile.assigned_shop_name = shop?.name || "Laundry Shop";
    }

    const staffMember: BranchStaffMember = {
      id: `staff-${Date.now()}`,
      shop_id: shopId,
      shop_name: shop?.name || "Laundry Shop",
      user_id: userId,
      full_name: profile?.full_name || "Branch Staff",
      email: profile?.email || null,
      phone_number: profile?.phone_number || "",
      role_title: roleTitle,
      assigned_by: user.id,
      created_at: new Date().toISOString(),
    };

    localStaffStore = localStaffStore.filter((s) => s.user_id !== userId);
    localStaffStore.push(staffMember);

    return { success: true, staff: staffMember };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to assign staff member.";
    return { success: false, error: message };
  }
}

/**
 * Remove a staff member from a branch, reverting their role back to Customer
 */
export async function removeStaffFromBranch(
  userId: string,
  shopId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // 1. Try Supabase RPC
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("remove_branch_staff", {
        target_user_id: userId,
        target_shop_id: shopId,
      });

      if (!rpcErr && rpcRes?.success) {
        // RPC handled it cleanly
      } else {
        // Direct database deletes
        await supabase
          .from("branch_staff")
          .delete()
          .eq("user_id", userId)
          .eq("shop_id", shopId);

        await supabase
          .from("profiles")
          .update({ role: UserRole.COSTUMER, assigned_shop_id: null })
          .eq("id", userId);
      }
    } catch {
      // ignore
    }

    // Revert local stores
    localStaffStore = localStaffStore.filter((s) => s.user_id !== userId);
    const profile = localProfilesStore.find((p) => p.id === userId);
    if (profile) {
      profile.role = UserRole.COSTUMER;
      profile.assigned_shop_id = null;
      profile.assigned_shop_name = null;
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to remove staff.";
    return { success: false, error: message };
  }
}

/**
 * Get the shop details assigned to a staff member
 */
export async function getStaffAssignedShop(userId: string): Promise<LaundryShop | null> {
  try {
    const { data: staffData } = await supabase
      .from("branch_staff")
      .select("shop_id, laundry_shops(*, shop_services(*))")
      .eq("user_id", userId)
      .maybeSingle();

    if (staffData && staffData.laundry_shops) {
      const shop = staffData.laundry_shops as any;
      return {
        ...shop,
        images: Array.isArray(shop.images) ? shop.images : [],
        services: shop.shop_services || [],
      };
    }
  } catch {
    // fallback
  }

  const localAssigned = localStaffStore.find((s) => s.user_id === userId);
  if (localAssigned) {
    const shops = await getLaundryShops();
    return shops.find((s) => s.id === localAssigned.shop_id) || null;
  }

  return null;
}

// -----------------------------------------------------------------------------
// Reviews and Rating Helpers
// -----------------------------------------------------------------------------

/**
 * Submit a customer review and rating, then recalculate shop average rating
 */
export async function submitShopReview(params: {
  shopId: string;
  rating: number;
  comment?: string;
  orderId?: string | null;
  customerName?: string;
}): Promise<{ success: boolean; newRating?: number; totalReviews?: number; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const customerId = user?.id || null;
    const customerName = params.customerName || user?.user_metadata?.full_name || "Valued Customer";
    const clampedRating = Math.max(1, Math.min(5, Math.round(params.rating)));

    const newReview: ShopReview = {
      id: `rev-${Date.now()}`,
      shop_id: params.shopId,
      customer_id: customerId,
      customer_name: customerName,
      rating: clampedRating,
      comment: params.comment?.trim() || "",
      order_id: params.orderId || null,
      created_at: new Date().toISOString(),
    };

    let calculatedAvg = clampedRating;
    let calculatedTotal = 1;

    // 1. Try Supabase insert
    try {
      await supabase.from("reviews").insert({
        shop_id: newReview.shop_id,
        customer_id: newReview.customer_id,
        customer_name: newReview.customer_name,
        rating: newReview.rating,
        comment: newReview.comment,
        order_id: newReview.order_id,
      });

      // Recalculate average rating & total reviews from reviews table
      const { data: allReviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("shop_id", params.shopId);

      if (allReviews && allReviews.length > 0) {
        calculatedTotal = allReviews.length;
        const sum = allReviews.reduce((acc, r) => acc + (r.rating || 5), 0);
        calculatedAvg = Math.round((sum / calculatedTotal) * 10) / 10;

        await supabase
          .from("laundry_shops")
          .update({ rating: calculatedAvg, total_reviews: calculatedTotal })
          .eq("id", params.shopId);
      }
    } catch (dbErr) {
      console.warn("Direct reviews table update notice, applying local store:", dbErr);
    }

    // Local fallback update
    localReviewsStore.unshift(newReview);
    const shopReviews = localReviewsStore.filter((r) => r.shop_id === params.shopId);
    if (shopReviews.length > 0) {
      calculatedTotal = shopReviews.length;
      const sum = shopReviews.reduce((acc, r) => acc + r.rating, 0);
      calculatedAvg = Math.round((sum / calculatedTotal) * 10) / 10;
    }

    const shopIdx = localShopsStore.findIndex((s) => s.id === params.shopId);
    if (shopIdx >= 0) {
      localShopsStore[shopIdx].rating = calculatedAvg;
      localShopsStore[shopIdx].total_reviews = calculatedTotal;
    }

    return { success: true, newRating: calculatedAvg, totalReviews: calculatedTotal };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit review.";
    return { success: false, error: message };
  }
}

/**
 * Fetch reviews for a specific laundry shop
 */
export async function getShopReviews(shopId: string): Promise<ShopReview[]> {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch {
    // fallback
  }
  return localReviewsStore.filter((r) => r.shop_id === shopId);
}

// =============================================================================
// PARTNER APPLICATION FUNCTIONS ("Partner with this website" & Admin Portal)
// =============================================================================

/**
 * Get partner application submitted by a specific user
 */
export async function getUserPartnerApplication(userId: string): Promise<PartnerApplication | null> {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from("partner_applications")
      .select("*")
      .eq("applicant_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return data as PartnerApplication;
    }
  } catch (err) {
    console.warn("Could not query partner_applications from Supabase, checking local store:", err);
  }

  const local = localPartnerApplicationsStore.find((a) => a.applicant_id === userId);
  return local || null;
}

/**
 * Submit a new partner application to register a laundry shop
 */
export async function submitPartnerApplication(
  params: Omit<PartnerApplication, "id" | "status" | "created_at">
): Promise<{ success: boolean; application?: PartnerApplication; error?: string }> {
  try {
    const newApp: PartnerApplication = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `app-${Date.now()}`,
      ...params,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from("partner_applications")
        .insert({
          applicant_id: newApp.applicant_id,
          applicant_name: newApp.applicant_name,
          applicant_email: newApp.applicant_email,
          applicant_phone: newApp.applicant_phone,
          shop_name: newApp.shop_name,
          shop_description: newApp.shop_description || null,
          shop_address: newApp.shop_address,
          latitude: newApp.latitude,
          longitude: newApp.longitude,
          phone_number: newApp.phone_number,
          open_time: newApp.open_time,
          close_time: newApp.close_time,
          washer_count: newApp.washer_count,
          dryer_count: newApp.dryer_count,
          max_kilo_per_load: newApp.max_kilo_per_load || 8,
          images: newApp.images || [],
          services: newApp.services || [],
          status: "pending",
          admin_notes: newApp.admin_notes || null,
        })
        .select()
        .single();

      if (!error && data) {
        newApp.id = data.id;
      }
    } catch (dbErr) {
      console.warn("Direct partner_applications table insert notice, saving to local store:", dbErr);
    }

    // Update local fallback store
    const existingIdx = localPartnerApplicationsStore.findIndex(
      (a) => a.applicant_id === newApp.applicant_id
    );
    if (existingIdx >= 0) {
      localPartnerApplicationsStore[existingIdx] = newApp;
    } else {
      localPartnerApplicationsStore.unshift(newApp);
    }

    return { success: true, application: newApp };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit partner application.";
    return { success: false, error: message };
  }
}

/**
 * Fetch all partner applications for Platform Admin review
 */
export async function getPartnerApplications(): Promise<PartnerApplication[]> {
  try {
    const { data, error } = await supabase
      .from("partner_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data as PartnerApplication[];
    }
  } catch (err) {
    console.warn("Could not query partner_applications from Supabase, checking local store:", err);
  }

  // Seed sample application if store is empty so admin UI is never blank
  if (localPartnerApplicationsStore.length === 0) {
    localPartnerApplicationsStore = [
      {
        id: "app-seed-001",
        applicant_id: "user-seed-applicant-1",
        applicant_name: "Roberto Dela Cruz",
        applicant_email: "roberto.delacruz@gmail.com",
        applicant_phone: "0917 888 1234",
        shop_name: "Spin & Glow Laundry Hub",
        shop_description: "Modern self-service and drop-off laundromat equipped with high-efficiency heavy-duty commercial washers.",
        shop_address: "Central Boulevard, Mati City, Davao Oriental",
        latitude: 6.9585,
        longitude: 126.2185,
        phone_number: "0917 888 1234",
        open_time: "07:00",
        close_time: "21:00",
        washer_count: 8,
        dryer_count: 8,
        max_kilo_per_load: 8,
        images: ["https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80"],
        services: [
          {
            id: "srv-1",
            shop_id: "app-seed-001",
            service_name: "Wash, Dry & Fold",
            price: 200,
            unit: "load",
            kilos: 8,
            estimated_minutes: 120,
            is_available: true,
          },
          {
            id: "srv-2",
            shop_id: "app-seed-001",
            service_name: "Wash & Dry",
            price: 160,
            unit: "load",
            kilos: 8,
            estimated_minutes: 90,
            is_available: true,
          },
        ],
        status: "pending",
        admin_notes: "Mayor's Permit and DTI registration submitted and verified.",
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
    ];
  }

  return localPartnerApplicationsStore;
}

/**
 * Approve or reject a partner application
 */
export async function reviewPartnerApplication(
  applicationId: string,
  status: "approved" | "rejected",
  adminNotes?: string
): Promise<{ success: boolean; shop?: LaundryShop; error?: string }> {
  try {
    let targetApp: PartnerApplication | undefined = localPartnerApplicationsStore.find(
      (a) => a.id === applicationId
    );

    try {
      const { data } = await supabase
        .from("partner_applications")
        .select("*")
        .eq("id", applicationId)
        .single();
      if (data) {
        targetApp = data as PartnerApplication;
      }
    } catch {
      // fallback
    }

    if (!targetApp) {
      return { success: false, error: "Application not found." };
    }

    targetApp.status = status;
    targetApp.admin_notes = adminNotes || targetApp.admin_notes;
    targetApp.reviewed_at = new Date().toISOString();

    // 1. Update status in partner_applications table
    try {
      await supabase
        .from("partner_applications")
        .update({
          status,
          admin_notes: targetApp.admin_notes,
          reviewed_at: targetApp.reviewed_at,
        })
        .eq("id", applicationId);
    } catch (dbErr) {
      console.warn("Notice updating partner_applications status in Supabase:", dbErr);
    }

    let createdShop: LaundryShop | undefined;

    // 2. If approved, provision the shop and upgrade the applicant to Owner (role = 1)
    if (status === "approved") {
      const newShopId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `shop-${Date.now()}`;
      const newShop: LaundryShop = {
        id: newShopId,
        owner_id: targetApp.applicant_id,
        name: targetApp.shop_name,
        description: targetApp.shop_description || "Quality laundry services by our certified partner.",
        address: targetApp.shop_address,
        phone_number: targetApp.phone_number,
        latitude: targetApp.latitude,
        longitude: targetApp.longitude,
        open_time: targetApp.open_time,
        close_time: targetApp.close_time,
        queue_status: "Low",
        is_open: true,
        washer_count: targetApp.washer_count,
        dryer_count: targetApp.dryer_count,
        max_kilo_per_load: targetApp.max_kilo_per_load || 8,
        images:
          targetApp.images && targetApp.images.length > 0
            ? targetApp.images
            : ["https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80"],
        rating: 5.0,
        total_reviews: 0,
        services: targetApp.services || [],
      };
      createdShop = newShop;

      try {
        const { data: dbShop } = await supabase
          .from("laundry_shops")
          .insert({
            owner_id: newShop.owner_id,
            name: newShop.name,
            address: newShop.address,
            phone_number: newShop.phone_number,
            latitude: newShop.latitude,
            longitude: newShop.longitude,
            open_time: newShop.open_time,
            close_time: newShop.close_time,
            washer_count: newShop.washer_count,
            dryer_count: newShop.dryer_count,
            max_kilo_per_load: newShop.max_kilo_per_load,
            images: newShop.images,
            rating: 5.0,
            total_reviews: 0,
            queue_status: "Low",
            is_open: true,
          })
          .select()
          .single();

        if (dbShop) {
          createdShop.id = dbShop.id;
        }

        // Upgrade applicant's profile to Shop Owner (role = 1)
        await supabase
          .from("profiles")
          .update({ role: UserRole.OWNER, assigned_shop_id: createdShop.id })
          .eq("id", targetApp.applicant_id);
      } catch (shopErr) {
        console.warn("Notice inserting approved shop to Supabase:", shopErr);
      }

      // Also upgrade local profiles store
      const profileIdx = localProfilesStore.findIndex((p) => p.id === targetApp.applicant_id);
      if (profileIdx >= 0) {
        localProfilesStore[profileIdx].role = UserRole.OWNER;
        localProfilesStore[profileIdx].assigned_shop_id = createdShop.id;
      }

      // Add to local shop store
      localShopsStore.unshift(createdShop);

      // Upgrade local cached profile if current user is the applicant
      if (typeof window !== "undefined") {
        try {
          const cached = getCachedUserProfile();
          if (cached && cached.id === targetApp.applicant_id) {
            const upgraded = { ...cached, role: UserRole.OWNER, assigned_shop_id: createdShop.id };
            localStorage.setItem("labadago_user_profile", JSON.stringify(upgraded));
            localStorage.setItem("labadago_cached_profile", JSON.stringify(upgraded));
            localStorage.setItem(`labadago_active_role_${targetApp.applicant_id}`, String(UserRole.OWNER));
            localStorage.setItem("labadago_active_role", String(UserRole.OWNER));
          }
        } catch {
          // ignore
        }
      }
    }

    // Update in local store
    const localIdx = localPartnerApplicationsStore.findIndex((a) => a.id === applicationId);
    if (localIdx >= 0) {
      localPartnerApplicationsStore[localIdx] = targetApp;
    }

    return { success: true, shop: createdShop };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to review application.";
    return { success: false, error: message };
  }
}

/**
 * Fetch all platform users (Owners and Customers) for Admin inspection
 */
export async function getPlatformUsers(): Promise<UserProfile[]> {
  const userMap = new Map<string, UserProfile>();

  // 1. Seed defaults first
  DEFAULT_PLATFORM_USERS.forEach((u) => userMap.set(u.id, u));

  // 2. Query Supabase database profiles
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, laundry_shops(name)")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      data.forEach((p: any) => {
        const assignedName =
          p.laundry_shops?.name ||
          (p.assigned_shop_id ? localShopsStore.find((s) => s.id === p.assigned_shop_id)?.name : null) ||
          p.assigned_shop_name ||
          null;

        userMap.set(p.id, {
          id: p.id,
          email: p.email || null,
          full_name: p.full_name || "User",
          date_of_birth: p.date_of_birth || "",
          phone_number: p.phone_number || "",
          gender: p.gender || "Prefer not to say",
          role: Number(p.role) as UserRole,
          assigned_shop_id: p.assigned_shop_id || null,
          assigned_shop_name: assignedName,
          created_at: p.created_at,
          updated_at: p.updated_at,
        });
      });
    }
  } catch (err) {
    console.warn("Notice querying profiles from Supabase, checking local profiles store:", err);
  }

  // 3. Merge in-memory local profiles store
  localProfilesStore.forEach((u) => {
    // If shop name missing but assigned_shop_id exists, match with shop
    if (u.assigned_shop_id && !u.assigned_shop_name) {
      const matchShop = localShopsStore.find((s) => s.id === u.assigned_shop_id);
      if (matchShop) u.assigned_shop_name = matchShop.name;
    }
    userMap.set(u.id, u);
  });

  return Array.from(userMap.values());
}

// ==============================================================================
// Shop Messages & Real-Time Messenger System
// ==============================================================================

const LOCAL_MESSAGES_STORAGE_KEY = "labadago_shop_messages_store";

function getLocalMessagesStore(): ShopMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_MESSAGES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMessagesStore(messages: ShopMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_MESSAGES_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Ignore storage quota
  }
}

/**
 * Send an inquiry or reply message between Customer and Laundry Shop (Owner/Staff).
 */
export async function sendShopMessage(params: {
  shopId: string;
  shopName?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  senderId: string;
  senderName: string;
  senderRole: "customer" | "owner" | "staff";
  message: string;
}): Promise<{ success: boolean; data?: ShopMessage; error?: string }> {
  const {
    shopId,
    shopName,
    customerId,
    customerName,
    customerPhone,
    senderId,
    senderName,
    senderRole,
    message,
  } = params;

  if (!message.trim()) {
    return { success: false, error: "Message cannot be empty." };
  }

  const newId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}`;
  const nowIso = new Date().toISOString();

  const newMsg: ShopMessage = {
    id: newId,
    shop_id: shopId,
    shop_name: shopName || "Laundry Shop",
    customer_id: customerId,
    customer_name: customerName,
    customer_phone: customerPhone,
    sender_id: senderId,
    sender_name: senderName,
    sender_role: senderRole,
    message: message.trim(),
    is_read: false,
    created_at: nowIso,
  };

  // 1. Optimistically store in local storage
  const localList = getLocalMessagesStore();
  localList.push(newMsg);
  saveLocalMessagesStore(localList);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("labadago_messages_updated"));
  }

  // 2. Insert into Supabase table
  try {
    const { data, error } = await supabase
      .from("shop_messages")
      .insert({
        id: newMsg.id,
        shop_id: newMsg.shop_id,
        customer_id: newMsg.customer_id,
        customer_name: newMsg.customer_name,
        customer_phone: newMsg.customer_phone || null,
        sender_id: newMsg.sender_id,
        sender_name: newMsg.sender_name,
        sender_role: newMsg.sender_role,
        message: newMsg.message,
        is_read: false,
        created_at: newMsg.created_at,
      })
      .select()
      .single();

    if (!error && data) {
      newMsg.id = data.id;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("labadago_messages_updated"));
      }
      return { success: true, data: newMsg };
    } else if (error) {
      console.warn("Supabase shop_messages notice (local store used):", error.message);
    }
  } catch (err) {
    console.warn("Failed to insert message to Supabase, fallback to local:", err);
  }

  return { success: true, data: newMsg };
}

/**
 * Fetch all messages for a specific conversation thread between a Shop and a Customer.
 */
export async function getShopMessages(
  shopId: string,
  customerId: string
): Promise<ShopMessage[]> {
  const messageMap = new Map<string, ShopMessage>();

  // 1. Query Supabase
  try {
    const { data, error } = await supabase
      .from("shop_messages")
      .select(
        "id, shop_id, customer_id, customer_name, customer_phone, sender_id, sender_name, sender_role, message, is_read, created_at, laundry_shops(name)"
      )
      .eq("shop_id", shopId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      data.forEach((row: any) => {
        messageMap.set(row.id, {
          id: row.id,
          shop_id: row.shop_id,
          shop_name: row.laundry_shops?.name || "Laundry Shop",
          customer_id: row.customer_id,
          customer_name: row.customer_name,
          customer_phone: row.customer_phone,
          sender_id: row.sender_id,
          sender_name: row.sender_name,
          sender_role: row.sender_role,
          message: row.message,
          is_read: Boolean(row.is_read),
          created_at: row.created_at,
        });
      });
    }
  } catch (err) {
    console.warn("Notice querying shop_messages from Supabase:", err);
  }

  // 2. Merge local storage for optimistic offline support
  const localList = getLocalMessagesStore();
  localList
    .filter((m) => m.shop_id === shopId && m.customer_id === customerId)
    .forEach((m) => {
      if (!messageMap.has(m.id)) {
        messageMap.set(m.id, m);
      }
    });

  return Array.from(messageMap.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

/**
 * Fetch all active conversation threads for a Laundry Shop (used by Owner and Branch Staff).
 */
export async function getShopConversations(
  shopId?: string,
  ownerId?: string
): Promise<ShopConversation[]> {
  const allMessages: ShopMessage[] = [];

  try {
    let query = supabase
      .from("shop_messages")
      .select(
        "id, shop_id, customer_id, customer_name, customer_phone, sender_id, sender_name, sender_role, message, is_read, created_at, laundry_shops(name, owner_id)"
      )
      .order("created_at", { ascending: false });

    if (shopId) {
      query = query.eq("shop_id", shopId);
    }

    const { data, error } = await query;
    if (!error && data) {
      data
        .filter((row: any) => {
          if (ownerId && row.laundry_shops?.owner_id !== ownerId) return false;
          return true;
        })
        .forEach((row: any) => {
          allMessages.push({
            id: row.id,
            shop_id: row.shop_id,
            shop_name: row.laundry_shops?.name || "Laundry Shop",
            customer_id: row.customer_id,
            customer_name: row.customer_name,
            customer_phone: row.customer_phone,
            sender_id: row.sender_id,
            sender_name: row.sender_name,
            sender_role: row.sender_role,
            message: row.message,
            is_read: Boolean(row.is_read),
            created_at: row.created_at,
          });
        });
    }
  } catch (err) {
    console.warn("Notice loading conversations from Supabase:", err);
  }

  // Merge local storage
  const localList = getLocalMessagesStore();
  localList.forEach((m) => {
    if (shopId && m.shop_id !== shopId) return;
    if (!allMessages.some((existing) => existing.id === m.id)) {
      allMessages.push(m);
    }
  });

  // Group by (shop_id + customer_id)
  const threadMap = new Map<string, ShopConversation>();

  allMessages.forEach((msg) => {
    const key = `${msg.shop_id}:::${msg.customer_id}`;
    const existing = threadMap.get(key);

    const isUnread = !msg.is_read && msg.sender_role === "customer";

    if (!existing) {
      threadMap.set(key, {
        shop_id: msg.shop_id,
        shop_name: msg.shop_name || "Laundry Shop",
        customer_id: msg.customer_id,
        customer_name: msg.customer_name,
        customer_phone: msg.customer_phone,
        last_message: msg.message,
        last_message_at: msg.created_at,
        last_sender_name: msg.sender_name,
        last_sender_role: msg.sender_role,
        unread_count: isUnread ? 1 : 0,
      });
    } else {
      // If this message is newer than existing record, update snippet
      if (new Date(msg.created_at).getTime() > new Date(existing.last_message_at).getTime()) {
        existing.last_message = msg.message;
        existing.last_message_at = msg.created_at;
        existing.last_sender_name = msg.sender_name;
        existing.last_sender_role = msg.sender_role;
      }
      if (isUnread) {
        existing.unread_count += 1;
      }
    }
  });

  return Array.from(threadMap.values()).sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  );
}

/**
 * Fetch all conversation threads for a Customer across all laundry shops they messaged.
 */
export async function getCustomerConversations(
  customerId: string
): Promise<ShopConversation[]> {
  const allMessages: ShopMessage[] = [];

  try {
    const { data, error } = await supabase
      .from("shop_messages")
      .select(
        "id, shop_id, customer_id, customer_name, customer_phone, sender_id, sender_name, sender_role, message, is_read, created_at, laundry_shops(name)"
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      data.forEach((row: any) => {
        allMessages.push({
          id: row.id,
          shop_id: row.shop_id,
          shop_name: row.laundry_shops?.name || "Laundry Shop",
          customer_id: row.customer_id,
          customer_name: row.customer_name,
          customer_phone: row.customer_phone,
          sender_id: row.sender_id,
          sender_name: row.sender_name,
          sender_role: row.sender_role,
          message: row.message,
          is_read: Boolean(row.is_read),
          created_at: row.created_at,
        });
      });
    }
  } catch (err) {
    console.warn("Notice loading customer conversations from Supabase:", err);
  }

  // Merge local storage
  const localList = getLocalMessagesStore();
  localList
    .filter((m) => m.customer_id === customerId)
    .forEach((m) => {
      if (!allMessages.some((existing) => existing.id === m.id)) {
        allMessages.push(m);
      }
    });

  // Group by shop_id
  const threadMap = new Map<string, ShopConversation>();

  allMessages.forEach((msg) => {
    const key = msg.shop_id;
    const existing = threadMap.get(key);
    const isUnread = !msg.is_read && msg.sender_role !== "customer";

    if (!existing) {
      threadMap.set(key, {
        shop_id: msg.shop_id,
        shop_name: msg.shop_name || "Laundry Shop",
        customer_id: msg.customer_id,
        customer_name: msg.customer_name,
        customer_phone: msg.customer_phone,
        last_message: msg.message,
        last_message_at: msg.created_at,
        last_sender_name: msg.sender_name,
        last_sender_role: msg.sender_role,
        unread_count: isUnread ? 1 : 0,
      });
    } else {
      if (new Date(msg.created_at).getTime() > new Date(existing.last_message_at).getTime()) {
        existing.last_message = msg.message;
        existing.last_message_at = msg.created_at;
        existing.last_sender_name = msg.sender_name;
        existing.last_sender_role = msg.sender_role;
      }
      if (isUnread) {
        existing.unread_count += 1;
      }
    }
  });

  return Array.from(threadMap.values()).sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  );
}

/**
 * Mark all incoming messages in a thread as read.
 */
export async function markShopMessagesAsRead(
  shopId: string,
  customerId: string,
  readerRole: "customer" | "owner" | "staff"
): Promise<void> {
  // Update local store
  const localList = getLocalMessagesStore();
  let changed = false;
  localList.forEach((m) => {
    if (m.shop_id === shopId && m.customer_id === customerId) {
      if (readerRole === "customer" && m.sender_role !== "customer" && !m.is_read) {
        m.is_read = true;
        changed = true;
      } else if (readerRole !== "customer" && m.sender_role === "customer" && !m.is_read) {
        m.is_read = true;
        changed = true;
      }
    }
  });
  if (changed) {
    saveLocalMessagesStore(localList);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("labadago_messages_updated"));
    }
  }

  // Update Supabase
  try {
    let updateQuery = supabase
      .from("shop_messages")
      .update({ is_read: true })
      .eq("shop_id", shopId)
      .eq("customer_id", customerId);

    if (readerRole === "customer") {
      updateQuery = updateQuery.neq("sender_role", "customer");
    } else {
      updateQuery = updateQuery.eq("sender_role", "customer");
    }

    await updateQuery;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("labadago_messages_updated"));
    }
  } catch (err) {
    console.warn("Failed to mark messages read in Supabase:", err);
  }
}

/**
 * Get total count of unread messages for the given user, based on their role and shop assignment.
 * - Customer: incoming messages from shops (sender_role !== 'customer') where is_read is false
 * - Staff: incoming customer messages (sender_role === 'customer') for their assigned branch
 * - Owner: incoming customer messages (sender_role === 'customer') across their registered branches
 */
export async function getUnreadMessagesCount(
  userId?: string,
  role?: UserRole | number,
  shopId?: string
): Promise<number> {
  if (!userId) return 0;

  const isCustomer = role === UserRole.COSTUMER || role === 2;
  const isStaff = role === UserRole.STAFF || role === 3;
  const isOwner = role === UserRole.OWNER || role === 1;

  let count = 0;
  const countedIds = new Set<string>();

  // 1. Query Supabase
  try {
    let query = supabase
      .from("shop_messages")
      .select("id, shop_id, customer_id, sender_role, is_read, laundry_shops(owner_id)")
      .eq("is_read", false);

    if (isCustomer) {
      query = query.eq("customer_id", userId).neq("sender_role", "customer");
    } else if (isStaff && shopId) {
      query = query.eq("shop_id", shopId).eq("sender_role", "customer");
    } else if (isOwner) {
      query = query.eq("sender_role", "customer");
    }

    const { data, error } = await query;
    if (!error && data) {
      data.forEach((row: any) => {
        if (isOwner && row.laundry_shops?.owner_id && row.laundry_shops.owner_id !== userId) {
          return;
        }
        if (!countedIds.has(row.id)) {
          countedIds.add(row.id);
          count++;
        }
      });
    }
  } catch (err) {
    console.warn("Notice querying unread messages count from Supabase:", err);
  }

  // 2. Count from local store fallback
  const localList = getLocalMessagesStore();
  localList.forEach((m) => {
    if (m.is_read) return;
    if (countedIds.has(m.id)) return;

    if (isCustomer) {
      if (m.customer_id === userId && m.sender_role !== "customer") {
        countedIds.add(m.id);
        count++;
      }
    } else if (isStaff) {
      if ((!shopId || m.shop_id === shopId) && m.sender_role === "customer") {
        countedIds.add(m.id);
        count++;
      }
    } else if (isOwner) {
      if (m.sender_role === "customer") {
        countedIds.add(m.id);
        count++;
      }
    }
  });

  return count;
}


