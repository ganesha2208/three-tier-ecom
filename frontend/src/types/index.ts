export type UserRole = "customer" | "admin";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
}

export interface ProductImage {
  id: number;
  url: string;
  alt: string;
  position: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price_cents: number;
  compare_at_cents: number | null;
  currency: string;
  sku: string;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  rating_avg: number;
  rating_count: number;
  category: Category;
  images: ProductImage[];
  created_at: string;
}

export interface ProductList {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface CartItem {
  id: number;
  quantity: number;
  product: Product;
}

export interface Cart {
  items: CartItem[];
  subtotal_cents: number;
  item_count: number;
}

export interface Address {
  full_name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  is_default?: boolean;
}

export interface SavedAddress extends Address {
  id: number;
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export interface OrderItem {
  id: number;
  product_id: number;
  name_snapshot: string;
  sku_snapshot: string;
  image_snapshot: string;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
}

export interface Order {
  id: number;
  user_id: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal_cents: number;
  tax_cents: number;
  shipping_cents: number;
  total_cents: number;
  currency: string;
  shipping_full_name: string;
  shipping_line1: string;
  shipping_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  shipping_phone: string;
  payment_intent_id: string;
  created_at: string;
  items: OrderItem[];
}

export interface CheckoutResponse {
  order: Order;
  client_secret: string | null;
  mock_payment: boolean;
}

export interface Review {
  id: number;
  user_id: number;
  product_id: number;
  rating: number;
  title: string;
  body: string;
  created_at: string;
  user_name: string;
}

export interface WishlistItem {
  id: number;
  product: Product;
}

export interface AdminStats {
  total_users: number;
  total_products: number;
  total_orders: number;
  revenue_cents: number;
  low_stock_products: number;
}
