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
} from "@/types/auth";

// In-memory fallback stores for session
let localShopsStore: LaundryShop[] = [];
let localTransactionsStore: LaundryTransaction[] = [];

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
      // Return clean guest profile for unauthenticated browsing
      return {
        id: "guest-customer",
        email: null,
        full_name: "Guest Customer",
        date_of_birth: "",
        phone_number: "",
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
        images: Array.isArray(shop.images) ? shop.images : [],
        services: shop.shop_services || [],
      }));
    }
  } catch (err) {
    console.error("Error fetching shops:", err);
  }

  return localShopsStore;
}

/**
 * Save or update a laundry shop in Supabase
 * Persists shop details, location, hours, queue status, and Cloudinary image URLs
 */
export async function saveLaundryShop(shop: LaundryShop): Promise<{
  success: boolean;
  shop: LaundryShop;
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Check if shop has a valid UUID (not a temporary client string like 'owner-shop-001' or 'shop-123')
    const isTempId =
      !shop.id ||
      shop.id.startsWith("shop-") ||
      shop.id.startsWith("owner-") ||
      !shop.id.includes("-");

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
      images: Array.isArray(shop.images) ? shop.images : [],
      updated_at: new Date().toISOString(),
    };

    if (user) {
      payload.owner_id = user.id;
    }

    let savedShopId = shop.id;

    if (isTempId) {
      // Insert new shop
      const { data: inserted, error: insertError } = await supabase
        .from("laundry_shops")
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        console.warn("Supabase insert shop notice:", insertError.message);
      } else if (inserted) {
        savedShopId = inserted.id;
      }
    } else {
      // Update existing shop
      payload.id = shop.id;
      const { error: updateError } = await supabase
        .from("laundry_shops")
        .upsert(payload, { onConflict: "id" });

      if (updateError) {
        console.warn("Supabase upsert shop notice:", updateError.message);
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
            const item: Record<string, any> = {
              shop_id: savedShopId,
              service_name: srv.service_name.trim(),
              description: srv.description || "",
              price: Number(srv.price) || 0,
              unit: srv.unit || "kg",
              estimated_minutes: srv.estimated_minutes || 90,
              is_available: srv.is_available !== false,
            };
            // Only preserve UUID if it's already a valid 36-char Postgres UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (srv.id && uuidRegex.test(srv.id)) {
              item.id = srv.id;
            }
            return item;
          });

          const { data: insertedServices, error: srvError } = await supabase
            .from("shop_services")
            .insert(servicesPayload)
            .select();

          if (srvError) {
            console.warn("Supabase save services error:", srvError.message);
          } else if (insertedServices && insertedServices.length > 0) {
            savedServices = insertedServices;
          }
        }
      } catch (srvErr) {
        console.warn("Error saving services:", srvErr);
      }
    }

    const finalShop: LaundryShop = {
      ...shop,
      id: savedShopId,
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
  newStatus: OrderStatus,
  weightKg?: number,
  paymentStatus?: PaymentStatus,
  totalAmount?: number,
  specialNotes?: string
): Promise<boolean> {
  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (weightKg !== undefined && !isNaN(weightKg)) {
    updatePayload.weight_kg = weightKg;
  }
  if (paymentStatus !== undefined) {
    updatePayload.payment_status = paymentStatus;
  }
  if (totalAmount !== undefined && !isNaN(totalAmount)) {
    updatePayload.total_amount = totalAmount;
  }
  if (specialNotes !== undefined) {
    updatePayload.special_notes = specialNotes;
  }

  try {
    // Try matching by id first
    const res = await supabase
      .from("transactions")
      .update(updatePayload)
      .eq("id", txId);

    // If not found by uuid, try matching by tracking_number
    if (res.error || !res.count) {
      await supabase
        .from("transactions")
        .update(updatePayload)
        .eq("tracking_number", txId);
    }
  } catch {
    // ignore
  }

  localTransactionsStore = localTransactionsStore.map((tx) =>
    tx.id === txId || tx.tracking_number === txId
      ? {
          ...tx,
          status: newStatus,
          weight_kg: weightKg !== undefined && !isNaN(weightKg) ? weightKg : tx.weight_kg,
          payment_status: paymentStatus !== undefined ? paymentStatus : tx.payment_status,
          total_amount: totalAmount !== undefined && !isNaN(totalAmount) ? totalAmount : tx.total_amount,
          special_notes: specialNotes !== undefined ? specialNotes : tx.special_notes,
          updated_at: new Date().toISOString(),
        }
      : tx
  );

  return true;
}

export async function updateTransactionPayment(
  txId: string,
  paymentStatus: PaymentStatus,
  specialNotes?: string
): Promise<boolean> {
  const updatePayload: Record<string, unknown> = {
    payment_status: paymentStatus,
    updated_at: new Date().toISOString(),
  };
  if (specialNotes !== undefined) {
    updatePayload.special_notes = specialNotes;
  }

  try {
    const res = await supabase
      .from("transactions")
      .update(updatePayload)
      .eq("id", txId);

    if (res.error || !res.count) {
      await supabase
        .from("transactions")
        .update(updatePayload)
        .eq("tracking_number", txId);
    }
  } catch {
    // ignore
  }

  localTransactionsStore = localTransactionsStore.map((tx) =>
    tx.id === txId || tx.tracking_number === txId
      ? {
          ...tx,
          payment_status: paymentStatus,
          special_notes: specialNotes !== undefined ? specialNotes : tx.special_notes,
          updated_at: new Date().toISOString(),
        }
      : tx
  );

  return true;
}
