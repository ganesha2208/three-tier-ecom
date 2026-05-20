import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "@/components/layout/Layout";
import HomePage from "@/pages/Home";
import ProductsPage from "@/pages/Products";
import ProductDetailPage from "@/pages/ProductDetail";
import CartPage from "@/pages/Cart";
import CheckoutPage from "@/pages/Checkout";
import OrderSuccessPage from "@/pages/OrderSuccess";
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import OrdersPage from "@/pages/Orders";
import OrderDetailPage from "@/pages/OrderDetail";
import ProfilePage from "@/pages/Profile";
import WishlistPage from "@/pages/Wishlist";
import AdminDashboardPage from "@/pages/admin/Dashboard";
import AdminProductsPage from "@/pages/admin/Products";
import AdminCategoriesPage from "@/pages/admin/Categories";
import AdminOrdersPage from "@/pages/admin/Orders";
import { ProtectedRoute, AdminRoute } from "@/components/auth/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/orders/:id/success" element={<OrderSuccessPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/products" element={<AdminProductsPage />} />
          <Route path="/admin/categories" element={<AdminCategoriesPage />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
