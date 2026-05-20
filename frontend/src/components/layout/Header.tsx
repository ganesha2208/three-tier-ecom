import { Link, NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/store/auth";
import { cartApi } from "@/api/endpoints";

export default function Header() {
  const { accessToken, user, clear } = useAuthStore();
  const navigate = useNavigate();

  const { data: cart } = useQuery({
    queryKey: ["cart"],
    queryFn: () => cartApi.get().then((r) => r.data),
    enabled: !!accessToken,
  });

  const itemCount = cart?.item_count ?? 0;

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white font-extrabold">S</span>
          <span className="text-lg font-extrabold tracking-tight">ShopForge</span>
        </Link>

        <nav className="ml-6 hidden gap-1 md:flex">
          <NavLink
            to="/products"
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm font-medium ${
                isActive ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100"
              }`
            }
          >
            Shop
          </NavLink>
          {user?.role === "admin" && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100"
                }`
              }
            >
              Admin
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link to="/cart" className="relative rounded-md p-2 hover:bg-slate-100" aria-label="Cart">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-semibold text-white">
                {itemCount}
              </span>
            )}
          </Link>

          {accessToken ? (
            <div className="flex items-center gap-2">
              <Link to="/wishlist" className="hidden rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 md:inline-block">
                Wishlist
              </Link>
              <Link to="/orders" className="hidden rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 md:inline-block">
                Orders
              </Link>
              <Link to="/profile" className="hidden rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 md:inline-block">
                {user?.full_name || "Profile"}
              </Link>
              <button
                className="btn-ghost"
                onClick={() => {
                  clear();
                  navigate("/");
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Sign in</Link>
              <Link to="/register" className="btn-primary">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
