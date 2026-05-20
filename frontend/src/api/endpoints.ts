import { api } from "./client";
import type {
  AdminStats,
  Address,
  Cart,
  Category,
  CheckoutResponse,
  Order,
  Product,
  ProductList,
  Review,
  SavedAddress,
  User,
  WishlistItem,
} from "@/types";

// ---------- Auth ----------
export const authApi = {
  register: (email: string, password: string, full_name: string) =>
    api.post<{ access_token: string; refresh_token: string }>("/auth/register", {
      email,
      password,
      full_name,
    }),
  login: (email: string, password: string) =>
    api.post<{ access_token: string; refresh_token: string }>("/auth/login-json", {
      email,
      password,
    }),
  me: () => api.get<User>("/auth/me"),
};

// ---------- Products ----------
export interface ProductQuery {
  q?: string;
  category?: string;
  min_cents?: number;
  max_cents?: number;
  sort?: "new" | "price_asc" | "price_desc" | "rating" | "popular";
  featured?: boolean;
  page?: number;
  page_size?: number;
}

export const productsApi = {
  list: (params?: ProductQuery) => api.get<ProductList>("/products", { params }),
  get: (idOrSlug: string | number) => api.get<Product>(`/products/${idOrSlug}`),
  create: (data: Partial<Product> & { images: { url: string; alt?: string; position?: number }[]; category_id: number }) =>
    api.post<Product>("/products", data),
  update: (id: number, data: Partial<Product> & { images?: { url: string; alt?: string; position?: number }[] }) =>
    api.patch<Product>(`/products/${id}`, data),
  remove: (id: number) => api.delete(`/products/${id}`),
};

// ---------- Categories ----------
export const categoriesApi = {
  list: () => api.get<Category[]>("/categories"),
  create: (data: Partial<Category>) => api.post<Category>("/categories", data),
  update: (id: number, data: Partial<Category>) =>
    api.patch<Category>(`/categories/${id}`, data),
  remove: (id: number) => api.delete(`/categories/${id}`),
};

// ---------- Reviews ----------
export const reviewsApi = {
  listForProduct: (productId: number) =>
    api.get<Review[]>(`/reviews/product/${productId}`),
  create: (productId: number, payload: { rating: number; title?: string; body?: string }) =>
    api.post<Review>(`/reviews/product/${productId}`, payload),
};

// ---------- Cart ----------
export const cartApi = {
  get: () => api.get<Cart>("/cart"),
  add: (product_id: number, quantity: number) =>
    api.post<Cart>("/cart/items", { product_id, quantity }),
  update: (item_id: number, quantity: number) =>
    api.patch<Cart>(`/cart/items/${item_id}`, { quantity }),
  remove: (item_id: number) => api.delete<Cart>(`/cart/items/${item_id}`),
  clear: () => api.delete<Cart>("/cart"),
};

// ---------- Wishlist ----------
export const wishlistApi = {
  list: () => api.get<WishlistItem[]>("/wishlist"),
  add: (product_id: number) => api.post<WishlistItem>("/wishlist", { product_id }),
  remove: (product_id: number) => api.delete(`/wishlist/${product_id}`),
};

// ---------- Orders ----------
export const ordersApi = {
  list: () => api.get<Order[]>("/orders"),
  get: (id: number) => api.get<Order>(`/orders/${id}`),
  checkout: (shipping_address: Address, save_address = false) =>
    api.post<CheckoutResponse>("/orders/checkout", { shipping_address, save_address }),
  confirmMock: (orderId: number) =>
    api.post<Order>(`/orders/${orderId}/confirm-mock-payment`),
};

// ---------- Users ----------
export const usersApi = {
  me: () => api.get<User>("/users/me"),
  updateMe: (data: { full_name?: string }) => api.patch<User>("/users/me", data),
  listAddresses: () => api.get<SavedAddress[]>("/users/me/addresses"),
  addAddress: (data: Address) => api.post<SavedAddress>("/users/me/addresses", data),
  deleteAddress: (id: number) => api.delete(`/users/me/addresses/${id}`),
};

// ---------- Admin ----------
export const adminApi = {
  stats: () => api.get<AdminStats>("/admin/stats"),
  users: () => api.get<User[]>("/admin/users"),
  orders: () => api.get<Order[]>("/admin/orders"),
  updateOrderStatus: (id: number, status: Order["status"]) =>
    api.patch<Order>(`/admin/orders/${id}/status`, { status }),
};
