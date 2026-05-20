import type { OrderStatus } from "@/types";

const STYLES: Record<OrderStatus, string> = {
  pending: "bg-slate-100 text-slate-700",
  paid: "bg-emerald-100 text-emerald-700",
  shipped: "bg-blue-100 text-blue-700",
  delivered: "bg-brand-100 text-brand-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-amber-100 text-amber-700",
};

export function OrderStatusChip({ status }: { status: OrderStatus }) {
  return <span className={`chip ${STYLES[status]}`}>{status}</span>;
}
