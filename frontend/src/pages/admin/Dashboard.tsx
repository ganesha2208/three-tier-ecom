import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { adminApi } from "@/api/endpoints";
import { PageLoader } from "@/components/ui/Spinner";
import { formatCents } from "@/utils/format";

export default function AdminDashboardPage() {
  const stats = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => adminApi.stats().then((r) => r.data),
  });

  if (stats.isLoading) return <PageLoader />;
  const s = stats.data!;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Admin dashboard</h1>
        <nav className="flex gap-2 text-sm">
          <Link to="/admin/products" className="btn-secondary">Products</Link>
          <Link to="/admin/categories" className="btn-secondary">Categories</Link>
          <Link to="/admin/orders" className="btn-secondary">Orders</Link>
        </nav>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Revenue" value={formatCents(s.revenue_cents)} accent />
        <StatCard label="Orders" value={s.total_orders} />
        <StatCard label="Products" value={s.total_products} />
        <StatCard label="Users" value={s.total_users} />
        <StatCard
          label="Low stock"
          value={s.low_stock_products}
          warning={s.low_stock_products > 0}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  warning,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`card p-5 ${
        accent ? "bg-gradient-to-br from-brand-600 to-brand-500 text-white" : ""
      } ${warning ? "ring-1 ring-amber-300" : ""}`}
    >
      <div className={`text-xs uppercase tracking-wider ${accent ? "text-brand-100" : "text-slate-500"}`}>
        {label}
      </div>
      <div className="mt-2 text-3xl font-extrabold">{value}</div>
    </div>
  );
}
