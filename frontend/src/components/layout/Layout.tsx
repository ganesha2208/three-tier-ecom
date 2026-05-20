import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import Header from "./Header";
import Footer from "./Footer";
import { useAuthStore } from "@/store/auth";
import { authApi } from "@/api/endpoints";

export default function Layout() {
  const { accessToken, user, setUser, clear } = useAuthStore();

  useEffect(() => {
    if (accessToken && !user) {
      authApi
        .me()
        .then((r) => setUser(r.data))
        .catch(() => clear());
    }
  }, [accessToken, user, setUser, clear]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
