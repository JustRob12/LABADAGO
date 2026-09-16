import { supabase } from "./client";
import {
  RegisterFormData,
  LoginFormData,
  UserProfile,
  UserRole,
  LaundryShop,
  LaundryTransaction,
  WalkInQRPayload,
  OrderStatus,
} from "@/types/auth";

// Default fallback mock shops (realistic Metro Manila locations)
export const MOCK_SHOPS: LaundryShop[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "LabadaGo Express - Katipunan",
    description: "Premium express wash, dry, and fold service with eco-friendly detergent and fast turnaround.",
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
    services: [
      {
        id: "s1",
        shop_id: "11111111-1111-1111-1111-111111111111",
        service_name: "Wash, Dry & Fold",
        description: "Standard everyday clothes washing and crisp folding.",
        price: 35,
        unit: "kg",
        estimated_minutes: 90,
      },
      {
        id: "s2",
        shop_id: "11111111-1111-1111-1111-111111111111",
        service_name: "Comforter / Bedding Wash",
        description: "Heavy duvet and blanket sanitizing & drying.",
        price: 180,
        unit: "piece",
        estimated_minutes: 120,
      },
      {
        id: "s3",
        shop_id: "11111111-1111-1111-1111-111111111111",
        service_name: "Pressing & Ironing",
        description: "Steam press for formal shirts and uniform trousers.",
        price: 25,
        unit: "piece",
        estimated_minutes: 45,
      },
    ],
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "FreshBubble Laundromat - BGC",
    description: "Self-service coin-op and drop-off full service. Free high-speed WiFi and coffee lounge.",
    address: "7th Ave cor 30th St, Bonifacio Global City, Taguig",
    latitude: 14.5518,
    longitude: 121.0503,
    phone_number: "0917-444-5566",
    open_time: "06:00",
    close_time: "23:00",
    queue_status: "Moderate",
    is_open: true,
    rating: 4.8,
    total_reviews: 95,
    washer_count: 14,
    dryer_count: 12,
    services: [
      {
        id: "s4",
        shop_id: "22222222-2222-2222-2222-222222222222",
        service_name: "Full Service Premium Wash",
        description: "Hypoallergenic detergent with fabric conditioner.",
        price: 40,
        unit: "kg",
        estimated_minutes: 90,
      },
      {
        id: "s5",
        shop_id: "22222222-2222-2222-2222-222222222222",
        service_name: "Express Wash (Under 1 Hr)",
        description: "Priority queue machine wash and rapid warm air dry.",
        price: 55,
        unit: "kg",
        estimated_minutes: 50,
      },
    ],
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "LabadaGo Central Hub - Makati",
    description: "Commercial and household laundry with sanitization and steam pressing. Same-day pickup.",
    address: "120 Dela Rosa St, Legazpi Village, Makati City",
    latitude: 14.5562,
    longitude: 121.0168,
    phone_number: "0917-777-8899",
    open_time: "07:00",
    close_time: "20:00",
    queue_status: "Busy",
    is_open: true,
    rating: 4.7,
    total_reviews: 210,
    washer_count: 12,
    dryer_count: 12,
    services: [
      {
        id: "s6",
        shop_id: "33333333-3333-3333-3333-333333333333",
        service_name: "Wash & Fold Standard",
        description: "Thorough wash and precision folded.",
        price: 38,
        unit: "kg",
        estimated_minutes: 90,
      },
    ],
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    name: "CleanSpin Laundry Station - Taft",
    description: "Student-friendly prices, student discounts, and fast QR code walk-in drop off service.",
    address: "2400 Taft Ave, Malate, Manila",
    latitude: 14.5678,
    longitude: 120.9934,
    phone_number: "0918-222-3344",
    open_time: "06:30",
    close_time: "22:00",
    queue_status: "Low",
    is_open: true,
    rating: 4.9,
    total_reviews: 142,
    washer_count: 8,
    dryer_count: 8,
    services: [
      {
        id: "s7",
        shop_id: "44444444-4444-4444-4444-444444444444",
        service_name: "Student Wash & Fold",
        description: "Budget-friendly student package.",
        price: 30,
        unit: "kg",
        estimated_minutes: 90,
      },
    ],
  },
];

// Initial mock orders to demonstrate live order tracking and owner queue
let localTransactionsStore: LaundryTransaction[] = [
  {
    id: "tx-1001",
    tracking_number: "LBD-84920",
    customer_id: "demo-customer",
    shop_id: "11111111-1111-1111-1111-111111111111",
    shop_name: "LabadaGo Express - Katipunan",
    customer_name: "Juan Dela Cruz",
    customer_phone: "0912 345 6789",
    service_name: "Wash, Dry & Fold",
    weight_kg: 6.5,
    total_amount: 227.5,
    status: "Washing",
    payment_status: "Paid",
    is_walkin: true,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    special_notes: "Please use hypoallergenic fabric softener",
  },
  {
    id: "tx-1002",
    tracking_number: "LBD-84915",
    customer_id: "demo-customer",
    shop_id: "11111111-1111-1111-1111-111111111111",
    shop_name: "LabadaGo Express - Katipunan",
    customer_name: "Maria Santos",
    customer_phone: "0917 888 9900",
    service_name: "Comforter / Bedding Wash",
    weight_kg: 4.0,
    total_amount: 180.0,
    status: "Drying",
    payment_status: "Paid",
    is_walkin: true,
    created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
  {
    id: "tx-1003",
    tracking_number: "LBD-84880",
    customer_id: "demo-customer",
    shop_id: "22222222-2222-2222-2222-222222222222",
    shop_name: "FreshBubble Laundromat - BGC",
    customer_name: "Juan Dela Cruz",
    customer_phone: "0912 345 6789",
    service_name: "Full Service Premium Wash",
    weight_kg: 8.0,
    total_amount: 320.0,
    status: "Completed",
    payment_status: "Paid",
    is_walkin: false,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
];

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
    const { error } = await supabase.auth.signOut();
    return { error: error ? error.message : null };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred while signing out.";
    return { error: message };
  }
}

/**
 * Switch the active user role (Customer <-> Owner)
 */
export async function switchUserRole(newRole: UserRole): Promise<{
  success: boolean;
  role: UserRole;
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // 1. Update Supabase profiles table
      await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", user.id);

      // 2. Also update user metadata
      await supabase.auth.updateUser({
        data: { role: newRole },
      });
    }

    // Save active role to localStorage for instant UI responsiveness
    if (typeof window !== "undefined") {
      localStorage.setItem("labadago_active_role", String(newRole));
    }

    return { success: true, role: newRole };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to switch role.";
    return { success: false, role: newRole, error: message };
  }
}

/**
 * Get current authenticated user profile with active role detection
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Check localStorage fallback for role switch persistence
    let savedRole: UserRole | null = null;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("labadago_active_role");
      if (stored !== null) {
        savedRole = Number(stored) as UserRole;
      }
    }

    if (authError || !user) {
      // Return guest demo user if available
      return {
        id: "guest-costumer-001",
        email: "demo.user@labadago.com",
        full_name: "Valued Customer",
        date_of_birth: "2000-01-01",
        phone_number: "0912 345 6789",
        gender: "Prefer not to say",
        role: savedRole !== null ? savedRole : UserRole.COSTUMER,
      };
    }

    // Try fetching from public.profiles table
    const { data: dbProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (dbProfile) {
      const effectiveRole = savedRole !== null
        ? savedRole
        : (dbProfile.role !== undefined && dbProfile.role !== null)
        ? (dbProfile.role as UserRole)
        : UserRole.COSTUMER;

      return {
        id: dbProfile.id,
        email: dbProfile.email || user.email || null,
        full_name: dbProfile.full_name || user.user_metadata?.full_name || "User",
        date_of_birth: dbProfile.date_of_birth || user.user_metadata?.date_of_birth || "",
        phone_number: dbProfile.phone_number || user.user_metadata?.phone_number || "",
        gender: dbProfile.gender || user.user_metadata?.gender || "Prefer not to say",
        role: effectiveRole,
        created_at: dbProfile.created_at,
        updated_at: dbProfile.updated_at,
      };
    }

    const meta = user.user_metadata || {};
    return {
      id: user.id,
      email: user.email || null,
      full_name: meta.full_name || "Customer",
      date_of_birth: meta.date_of_birth || "",
      phone_number: meta.phone_number || "",
      gender: meta.gender || "Prefer not to say",
      role: savedRole !== null ? savedRole : (meta.role !== undefined ? Number(meta.role) as UserRole : UserRole.COSTUMER),
    };
  } catch (err) {
    console.error("Error fetching user profile:", err);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Laundry Shops & Services Helpers
// -----------------------------------------------------------------------------

export async function getLaundryShops(): Promise<LaundryShop[]> {
  try {
    const { data, error } = await supabase
      .from("laundry_shops")
      .select("*, shop_services(*)");

    if (!error && data && data.length > 0) {
      return data.map((shop) => ({
        ...shop,
        services: shop.shop_services || [],
      }));
    }
  } catch {
    // fallback
  }

  return MOCK_SHOPS;
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
    status: "Received",
    payment_status: "Unpaid",
    is_walkin: true,
    qr_data: JSON.stringify(payload),
    special_notes: payload.specialNotes,
    created_at: new Date().toISOString(),
  };

  try {
    await supabase.from("transactions").insert({
      tracking_number: newTx.tracking_number,
      customer_id: newTx.customer_id === "guest-costumer-001" ? null : newTx.customer_id,
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

export async function getLaundryTransactions(
  customerId?: string,
  shopId?: string
): Promise<LaundryTransaction[]> {
  try {
    let query = supabase.from("transactions").select("*").order("created_at", { ascending: false });

    if (customerId && customerId !== "guest-costumer-001") {
      query = query.eq("customer_id", customerId);
    }
    if (shopId) {
      query = query.eq("shop_id", shopId);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch {
    // fallback
  }

  if (shopId) {
    return localTransactionsStore.filter((tx) => tx.shop_id === shopId);
  }
  return localTransactionsStore;
}

export async function updateTransactionStatus(
  txId: string,
  newStatus: OrderStatus
): Promise<boolean> {
  try {
    await supabase
      .from("transactions")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", txId);
  } catch {
    // ignore
  }

  localTransactionsStore = localTransactionsStore.map((tx) =>
    tx.id === txId || tx.tracking_number === txId
      ? { ...tx, status: newStatus, updated_at: new Date().toISOString() }
      : tx
  );

  return true;
}
