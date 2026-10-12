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
} from "@/types/auth";

// In-memory fallback stores for session
let localShopsStore: LaundryShop[] = [];
let localTransactionsStore: LaundryTransaction[] = [];
let localStaffStore: BranchStaffMember[] = [];
let localReviewsStore: ShopReview[] = [];
let localProfilesStore: UserProfile[] = [];

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
 * Regular customers CANNOT switch to Owner!
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

    // Regular customers cannot self-switch to shop owner
    if (dbProfile?.role === UserRole.COSTUMER && newRole === UserRole.OWNER) {
      return {
        success: false,
        role: UserRole.COSTUMER,
        error: "Customers cannot switch to Shop Owner mode. An authorized owner account is required.",
      };
    }

    if (newRole === UserRole.STAFF) {
      return {
        success: false,
        role: dbProfile?.role || UserRole.COSTUMER,
        error: "Staff role cannot be self-assigned. A shop owner must recruit and assign you to a specific branch.",
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
      // If user in DB is a customer, ensure localStorage savedRole cannot elevate them
      if (dbProfile.role === UserRole.COSTUMER && typeof window !== "undefined") {
        localStorage.removeItem(`labadago_active_role_${user.id}`);
        localStorage.removeItem("labadago_active_role");
      }

      const effectiveRole = isStaff
        ? UserRole.STAFF
        : dbProfile.role === UserRole.COSTUMER
        ? UserRole.COSTUMER
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
      : Number(meta.role) === UserRole.COSTUMER
      ? UserRole.COSTUMER
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
        images: Array.isArray(shop.images) ? shop.images : [],
        services: shop.shop_services || [],
      }));
    }
  } catch (err) {
    console.error("Error fetching shops:", err);
  }

  if (ownerId) {
    return localShopsStore.filter((s) => s.owner_id === ownerId);
  }
  return localShopsStore;
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
      images: Array.isArray(shop.images) ? shop.images : [],
      owner_id: user.id,
      updated_at: new Date().toISOString(),
    };

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
      // Update existing shop (guarantee owner_id matches)
      payload.id = shop.id;
      const { error: updateError } = await supabase
        .from("laundry_shops")
        .upsert(payload, { onConflict: "id" });

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
    await supabase.from("transactions").insert({
      tracking_number: newTx.tracking_number,
      customer_id: newTx.customer_id,
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
    if (!error && data && data.length > 0) {
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
  const updatePayload: Record<string, unknown> = {
    status: newStatus,
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
  if (machineNumber !== undefined) {
    updatePayload.machine_number = machineNumber;
  }
  if (staffId !== undefined) {
    updatePayload.staff_id = staffId;
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
        "id, shop_id, user_id, role_title, assigned_by, created_at, laundry_shops(name, owner_id), profiles(full_name, email, phone_number)"
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
        .map((item: any) => ({
          id: item.id,
          shop_id: item.shop_id,
          shop_name: item.laundry_shops?.name || "Laundry Shop",
          user_id: item.user_id,
          full_name: item.profiles?.full_name || "Branch Staff",
          email: item.profiles?.email || null,
          phone_number: item.profiles?.phone_number || "",
          role_title: item.role_title || "Counter Staff",
          assigned_by: item.assigned_by,
          created_at: item.created_at,
        }));
      return list;
    }
  } catch (err) {
    console.warn("Error fetching branch staff from Supabase:", err);
  }

  if (shopId) {
    return localStaffStore.filter((s) => s.shop_id === shopId);
  }
  return localStaffStore;
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
