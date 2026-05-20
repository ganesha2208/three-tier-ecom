import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { ordersApi } from "@/api/endpoints";
import { PageLoader } from "@/components/ui/Spinner";
import { formatCents } from "@/utils/format";

export default function OrderSuccessPage() {
  const { id = "" } = useParams();
  const order = useQuery({
    queryKey: ["order", id],
    queryFn: () => ordersApi.get(Number(id)).then((r) => r.data),
  });

  if (order.isLoading) return <PageLoader />;
  if (!order.data) return <div className="p-10">Order not found.</div>;
  const o = order.data;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight">Thank you for your order!</h1>
      <p className="mt-2 text-slate-600">
        Order <span className="font-semibold">#{o.id}</span> · {formatCents(o.total_cents)}
      </p>
      <p className="mt-4 text-slate-500">
        A confirmation email has been sent. Track your order in your account at any time.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to={`/orders/${o.id}`} className="btn-primary">View order</Link>
        <Link to="/products" className="btn-secondary">Keep shopping</Link>
      </div>
    </div>
  );
}
