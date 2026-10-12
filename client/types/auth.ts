export enum UserRole {
  ADMIN = 0,
  OWNER = 1,
  COSTUMER = 2,
  STAFF = 3,
}

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: "Admin",
  [UserRole.OWNER]: "Owner",
  [UserRole.COSTUMER]: "Costumer",
  [UserRole.STAFF]: "Branch Staff",
};

export const ROLE_BADGE_COLORS: Record<UserRole, { bg: string; text: string; border: string }> = {
  [UserRole.ADMIN]: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
  },
  [UserRole.OWNER]: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  [UserRole.COSTUMER]: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  [UserRole.STAFF]: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
  },
};

export type Gender = "Male" | "Female" | "Other" | "Prefer not to say";

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string;
  date_of_birth: string;
  phone_number: string;
  gender: Gender;
  role: UserRole;
  assigned_shop_id?: string | null;
  assigned_shop_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BranchStaffMember {
  id: string;
  shop_id: string;
  shop_name?: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone_number: string;
  role_title?: string;
  assigned_by?: string;
  created_at: string;
}

export interface ShopReview {
  id: string;
  shop_id: string;
  customer_id?: string | null;
  customer_name: string;
  rating: number;
  comment?: string;
  order_id?: string | null;
  created_at: string;
}

export interface RegisterFormData {
  fullName: string;
  dateOfBirth: string;
  phoneNumber: string;
  gender: Gender;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

// -----------------------------------------------------------------------------
// Laundry Shop & Services Types
// -----------------------------------------------------------------------------

export type QueueStatus = "Low" | "Moderate" | "Busy" | "Full" | "Closed";

export interface ShopService {
  id: string;
  shop_id: string;
  service_name: string;
  description?: string;
  price: number;
  unit: string; // 'kg', 'piece', 'load'
  kilos?: number | null; // e.g. 8 for an 8kg load limit or standard weight allowance
  estimated_minutes: number;
  is_available?: boolean;
}

export interface LaundryShop {
  id: string;
  owner_id?: string | null;
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  phone_number: string;
  open_time: string;
  close_time: string;
  queue_status: QueueStatus;
  is_open: boolean;
  rating: number;
  total_reviews: number;
  washer_count: number;
  dryer_count: number;
  max_kilo_per_load?: number;
  images?: string[];
  services?: ShopService[];
  distance_km?: number;
}

// -----------------------------------------------------------------------------
// Transactions & QR Walk-In Types
// -----------------------------------------------------------------------------

export type OrderStatus =
  | "Pending"
  | "Received"
  | "Washing"
  | "Drying"
  | "Folding"
  | "Ready"
  | "Completed"
  | "Cancelled";

export type PaymentStatus = "Unpaid" | "Paid" | "Refunded";
export type PaymentMethod = "Cash" | "GCash" | "Bank Transfer";

export interface LaundryTransaction {
  id: string;
  tracking_number: string;
  customer_id?: string | null;
  shop_id: string;
  shop_name?: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  weight_kg: number;
  total_amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod | string;
  payment_proof_url?: string;
  payment_reference_no?: string;
  paid_at?: string;
  is_walkin: boolean;
  qr_data?: string;
  special_notes?: string;
  machine_number?: string;
  staff_id?: string;
  staff_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface WalkInQRPayload {
  trackingNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  shopId: string;
  shopName: string;
  serviceName: string;
  estimatedWeight: number;
  estimatedAmount: number;
  specialNotes?: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Business Analytics Types
// -----------------------------------------------------------------------------

export interface AnalyticsSummary {
  totalRevenue: number;
  todayRevenue: number;
  revenueGrowthPct: number;
  totalOrders: number;
  activeOrders: number;
  completedToday: number;
  revenueTrend: { day: string; revenue: number; orders: number }[];
  serviceDistribution: { service: string; count: number; percentage: number; color: string }[];
  customerMetrics: {
    newCustomers: number;
    returningCustomers: number;
    retentionRate: number;
  };
  forecast: {
    expectedTomorrowLoads: number;
    projectedWeeklyRevenue: number;
    peakHour: string;
    confidenceLevel: string;
  };
}
