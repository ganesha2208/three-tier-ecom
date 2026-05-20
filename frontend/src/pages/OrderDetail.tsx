import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { ordersApi } from "@/api/endpoints";
import { PageLoader } from "@/components/ui/Spinner";
import { OrderStatusChip } from "@/components/ui/OrderStatusChip";
import { formatCents, formatDate } from "@/utils/format";

export default function OrderDetailPage() {
  const { id = "" } = useParams();
  const order = useQuery({
    queryKey: ["order", id],
    queryFn: () => ordersApi.get(Number(id)).then((r) => r.data),
  });

  if (order.isLoading) return <PageLoader />;
  if (!order.data) return <div className="p-10">Order not found.</div>;
  const o = order.data;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/orders" className="text-sm text-brand-700 hover:underline">← Back to orders</Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Order #{o.id}</h1>
        <div className="flex items-center gap-3">
          <OrderStatusChip status={o.status} />
          <span className="text-sm text-slate-500">{formatDate(o.created_at)}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,360px]">
        <div className="card divide-y divide-slate-100">
          {o.items.map((it) => (
            <div key={it.id} className="flex gap-4 p-4">
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {it.image_snapshot && (
                  <img src={it.image_snapshot} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex flex-1 flex-col">
                <div className="font-semibold">{it.name_snapshot}</div>
                <div className="text-xs text-slate-500">SKU {it.sku_snapshot}</div>
                <div className="mt-auto flex justify-between text-sm">
                  <span>Qty {it.quantity}</span>
                  <span className="font-semibold">{formatCents(it.line_total_cents)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Shipping
            </h3>
            <div className="mt-2 text-sm leading-relaxed text-slate-700">
              {o.shipping_full_name}<br />
              {o.shipping_line1}{o.shipping_line2 && `, ${o.shipping_line2}`}<br />
              {o.shipping_city}, {o.shipping_state} {o.shipping_postal_code}<br />
              {o.shipping_country}
              {o.shipping_phone && <><br />{o.shipping_phone}</>}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Payment summary
            </h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Subtotal" value={formatCents(o.subtotal_cents)} />
              <Row label="Tax" value={formatCents(o.tax_cents)} />
              <Row label="Shipping" value={formatCents(o.shipping_cents)} />
              <Row label="Total" value={formatCents(o.total_cents)} bold />
            </dl>
            <div className="mt-3 text-xs text-slate-500">
              Payment: <span className="font-medium text-slate-700">{o.payment_status}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-bold" : ""}`}>
      <dt className={bold ? "" : "text-slate-500"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
