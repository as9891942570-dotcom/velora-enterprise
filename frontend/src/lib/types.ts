export type UserRole = "customer" | "admin";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancellation_requested"
  | "cancelled"
  | "returned";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "cod_pending";

export type PaymentMethod = "cod" | "online" | "upi" | "card" | "netbanking";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface MessageResponse {
  message: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  url: string;
  cloudinary_public_id: string | null;
  alt_text: string | null;
  sort_order: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: string;
  compare_at_price: string | null;
  stock_quantity: number;
  category_id: string;
  is_active: boolean;
  is_featured: boolean;
  material: string | null;
  images: ProductImage[];
  category: Category | null;
  created_at: string;
  updated_at: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  price: string;
  compare_at_price: string | null;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  primary_image_url: string | null;
  category_slug: string | null;
}

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  unit_price: string;
  quantity: number;
  line_total: string;
  image_url: string | null;
  stock_quantity: number;
  in_stock: boolean;
}

export interface Cart {
  id: string;
  items: CartItem[];
  item_count: number;
  subtotal: string;
  shipping_amount?: string;
  total_amount?: string;
}

export type AddressType = "home" | "work" | "other";

export interface Address {
  id: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  address_type: AddressType;
  is_default: boolean;
}

export interface AddressCreateInput {
  full_name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  address_type?: AddressType;
  is_default?: boolean;
}

export interface AddressUpdateInput extends Partial<AddressCreateInput> {}

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  note: string | null;
  created_at: string;
}

export interface PaymentVerifyRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface ShippingAddress {
  full_name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  address_type?: string | null;
}

export interface OrderPaymentInfo {
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  payment_record_status: string | null;
}

export interface CheckoutRequest {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address_id?: string | null;
  shipping_address?: ShippingAddress | null;
  payment_method: PaymentMethod;
  notes?: string | null;
}

export interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  product_slug: string;
  unit_price: string;
  compare_at_price: string | null;
  quantity: number;
  line_total: string;
  image_url: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  subtotal: string;
  shipping_amount: string;
  discount_amount: string;
  total_amount: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: ShippingAddress;
  notes: string | null;
  shipping_partner?: string | null;
  tracking_number?: string | null;
  confirmed_at?: string | null;
  processing_at?: string | null;
  shipped_at?: string | null;
  out_for_delivery_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  cancelled_by_user_id?: string | null;
  cancelled_by_role?: "customer" | "admin" | "system" | null;
  cancellation_reason?: string | null;
  status_before_cancel?: OrderStatus | null;
  cancellation_requested_at?: string | null;
  cancellation_reviewed_at?: string | null;
  cancellation_admin_note?: string | null;
  cancellation_decision?: "pending" | "approved" | "rejected" | null;
  payment?: OrderPaymentInfo | null;
  items: OrderItem[];
  status_history?: OrderStatusHistoryEntry[];
  created_at: string;
  updated_at: string;
}

export interface CheckoutValidation {
  valid: boolean;
  subtotal: string;
  shipping_amount: string;
  total_amount: string;
  item_count: number;
  errors: string[];
  online_payment_available?: boolean;
}

export interface RazorpayOrderInfo {
  razorpay_order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

export interface OrderCreateResponse extends Order {
  razorpay: RazorpayOrderInfo | null;
  online_payment_available: boolean;
  message: string | null;
}

export interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface DashboardStats {
  total_revenue: string;
  total_orders: number;
  total_customers: number;
  total_products: number;
  total_categories: number;
  pending_orders: number;
  revenue_today: string;
  revenue_this_month: string;
  orders_today: number;
  orders_this_month: number;
  inventory: {
    total_products: number;
    in_stock_count: number;
    low_stock_count: number;
    out_of_stock_count: number;
  };
  recent_orders: Order[];
  low_stock_products: {
    id: string;
    name: string;
    slug: string;
    stock_quantity: number;
    price: string;
    category_name?: string | null;
    is_out_of_stock?: boolean;
  }[];
}

export type ContactMessageStatus = "unread" | "read" | "resolved";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  created_at: string;
}

export interface ProductCreateInput {
  name: string;
  description?: string | null;
  short_description?: string | null;
  price: number;
  compare_at_price?: number | null;
  stock_quantity?: number;
  category_id: string;
  is_active?: boolean;
  is_featured?: boolean;
  material?: string | null;
  images?: {
    url: string;
    cloudinary_public_id?: string | null;
    alt_text?: string | null;
    sort_order?: number;
  }[];
}

export interface ProductUpdateInput extends Partial<ProductCreateInput> {}

export interface CategoryCreateInput {
  name: string;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
}

export interface CategoryUpdateInput extends Partial<CategoryCreateInput> {}

export interface OrderStatusUpdate {
  status: OrderStatus;
  note?: string | null;
  cancellation_reason?: string | null;
  shipping_partner?: string | null;
  tracking_number?: string | null;
}

export interface OrderCancelRequest {
  reason: string;
}

export interface ProductReview {
  id: string;
  user_id: string;
  product_id: string;
  order_id: string;
  rating: number;
  comment: string;
  admin_reply: string | null;
  is_read: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  customer_name?: string | null;
  product_name?: string | null;
  product_slug?: string | null;
  order_number?: string | null;
}

export interface ReviewEligibilityItem {
  product_id: string;
  product_name: string;
  product_slug: string;
  eligible: boolean;
  existing_review_id: string | null;
  reason: string | null;
}

export interface ReviewEligibility {
  order_id: string;
  order_status: string;
  items: ReviewEligibilityItem[];
}

export interface PaymentListItem {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total_amount: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  transaction_id: string | null;
  razorpay_order_id: string | null;
  payment_record_status: string | null;
  created_at: string;
}

export interface PaymentSummary {
  total_revenue: string;
  successful_payments: number;
  pending_payments: number;
  failed_payments: number;
  refunded_amount: string;
}

export interface PaymentListResponse {
  items: PaymentListItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  summary: PaymentSummary;
}

export interface AdminNotificationCounts {
  new_orders: number;
  unread_reviews: number;
  pending_cancellations: number;
  unread_messages: number;
}

export interface CloudinarySignResponse {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  signature: string;
  folder: string;
}

export interface ApiError {
  detail: string | { msg: string }[];
}
