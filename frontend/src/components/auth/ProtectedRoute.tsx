import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuthStore } from "@/store/auth";

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.accessToken);
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}

export function AdminRoute() {
  const { accessToken, user } = useAuthStore();
  const location = useLocation();
  if (!accessToken) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (user?.role !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
}
