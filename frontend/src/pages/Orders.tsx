import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { ordersApi } from "@/api/endpoints";
import { PageLoader } from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { formatCents, formatDate } from "@/utils/format";
import { OrderStatusChip } from "@/components/ui/OrderStatusChip";

export default function OrdersPage() {
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: () => ordersApi.list().then((r) => r.data),
  });

  if (orders.isLoading) return <PageLoader />;
  if (!orders.data || orders.data.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          title="No orders yet"
          description="When you place an order, you'll find it here."
          action={<Link to="/products" className="btn-primary">Shop now</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Your orders</h1>
      <div className="mt-6 space-y-3">
        {orders.data.map((o) => (
          <Link
            key={o.id}
            to={`/orders/${o.id}`}
            className="card flex flex-wrap items-center justify-between gap-4 p-4 hover:ring-brand-200"
          >
            <div>
              <div className="font-semibold">Order #{o.id}</div>
              <div className="text-sm text-slate-500">{formatDate(o.created_at)}</div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <OrderStatusChip status={o.status} />
              <div className="text-sm text-slate-500">{o.items.length} item(s)</div>
              <div className="text-lg font-bold">{formatCents(o.total_cents)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
