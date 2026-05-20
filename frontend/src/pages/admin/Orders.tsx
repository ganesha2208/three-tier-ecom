import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { adminApi } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { PageLoader } from "@/components/ui/Spinner";
import { OrderStatusChip } from "@/components/ui/OrderStatusChip";
import { formatCents, formatDate } from "@/utils/format";
import type { OrderStatus } from "@/types";

const STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

export default function AdminOrdersPage() {
  const qc = useQueryClient();
  const orders = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => adminApi.orders().then((r) => r.data),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      adminApi.updateOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      toast.success("Updated");
    },
    onError: (e) => toast.error(extractError(e)),
  });

  if (orders.isLoading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
      <div className="mt-6 overflow-x-auto card">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.data?.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3 font-semibold">#{o.id}</td>
                <td className="px-4 py-3">{o.shipping_full_name}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(o.created_at)}</td>
                <td className="px-4 py-3 font-semibold">{formatCents(o.total_cents)}</td>
                <td className="px-4 py-3 text-slate-600">{o.payment_status}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <OrderStatusChip status={o.status} />
                    <select
                      className="input w-36 py-1"
                      value={o.status}
                      onChange={(e) =>
                        update.mutate({ id: o.id, status: e.target.value as OrderStatus })
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
