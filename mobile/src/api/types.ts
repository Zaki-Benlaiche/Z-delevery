/** أنواع TypeScript تعكس مخططات الـ Backend (Pydantic) */

export type UserRole = "customer" | "merchant" | "driver" | "admin";
export type MerchantType = "food" | "fresh" | "market" | "clinic";

export type AppointmentStatus = "waiting" | "serving" | "done" | "cancelled";

export interface QueueInfo {
  now_serving: number;
  ahead: number;
  est_wait_min: number;
  total_in_queue: number;
}

export interface Appointment {
  id: string;
  clinic_id: string;
  clinic_name: string | null;
  clinic_phone: string | null;
  clinic_lat: number | null;
  clinic_lng: number | null;
  day: string;            // ISO date
  queue_number: number;
  status: AppointmentStatus;
  created_at: string;
  queue: QueueInfo | null;
}

export interface ClinicQueueItem {
  id: string;
  queue_number: number;
  status: AppointmentStatus;
  patient_name: string | null;
  created_at: string;
}

export interface ClinicQueue {
  day: string;
  now_serving: number;
  waiting_count: number;
  items: ClinicQueueItem[];
}
export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "cancelled";
export type PaymentMethod = "cash" | "card";
export type PaymentStatus = "pending" | "paid" | "refunded";

export interface Location {
  lat: number;
  lng: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: string;
  role: UserRole;
  is_new_user: boolean;
}

export interface Merchant {
  id: string;
  name: string;
  type: MerchantType;
  description: string | null;
  logo_url: string | null;
  open_hours: string | null;
  is_open: boolean;
  rating: number;
  location: Location | null;
  distance_km: number | null;
}

export interface Product {
  id: string;
  merchant_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  available: boolean;
}

export interface MerchantDetail extends Merchant {
  products: Product[];
}

export interface Offer {
  id: string;
  merchant_id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  discount_pct: number | null;
  badge_text: string | null;
  is_active: boolean;
  merchant_name: string | null;
}

export interface Address {
  id: string;
  label: string;
  details: string | null;
  location: Location | null;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  qty: number;
  unit_price: number;
  options: string | null;
}

/** معلومات السائق المُسنَد — تُعرض للزبون في شاشة التتبّع */
export interface DriverBrief {
  name: string | null;
  phone: string | null;
  vehicle_type: string | null;
  rating: number;
  location: Location | null;
}

export interface Order {
  id: string;
  customer_id: string;
  merchant_id: string;
  driver_id: string | null;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  commission: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  delivery_location: Location | null;
  delivery_details: string | null;
  items: OrderItem[];
  created_at: string;
  driver: DriverBrief | null;
}

export interface TrackingEntry {
  status: OrderStatus;
  location: Location | null;
  timestamp: string;
}

export interface OrderCreatePayload {
  merchant_id: string;
  items: { product_id: string; qty: number; options?: string | null }[];
  payment_method: PaymentMethod;
  address_id?: string;
  lat?: number;
  lng?: number;
  delivery_details?: string | null;
}

/** رسائل WebSocket التي يبثّها الـ Backend على غرفة الطلب */
export type TrackingMessage =
  | { type: "connected"; order_id: string }
  | { type: "status"; order_id: string; status: OrderStatus; location: Location | null }
  | { type: "driver_location"; order_id: string; lat: number; lng: number }
  | { type: "driver_assigned"; order_id: string; driver_id: string };
