import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { cartApi } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { PageLoader } from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { useAuthStore } from "@/store/auth";
import { formatCents } from "@/utils/format";

export default function CartPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);

  const cart = useQuery({
    queryKey: ["cart"],
    queryFn: () => cartApi.get().then((r) => r.data),
    enabled: !!accessToken,
  });

  const updateItem = useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) =>
      cartApi.update(id, quantity),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
    onError: (e) => toast.error(extractError(e)),
  });

  const removeItem = useMutation({
    mutationFn: (id: number) => cartApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
    onError: (e) => toast.error(extractError(e)),
  });

  if (!accessToken) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          title="Your cart is waiting"
          description="Sign in to view your cart and saved items."
          action={
            <Link to="/login" className="btn-primary">Sign in</Link>
          }
        />
      </div>
    );
  }

  if (cart.isLoading) return <PageLoader />;
  if (!cart.data || cart.data.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          title="Your cart is empty"
          description="Browse our catalog and add something you love."
          action={
            <Link to="/products" className="btn-primary">Shop now</Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Your cart</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr,360px]">
        <div className="space-y-3">
          {cart.data.items.map((item) => (
            <div key={item.id} className="card flex gap-4 p-4">
              <Link
                to={`/products/${item.product.slug}`}
                className="block h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100"
              >
                {item.product.images[0] && (
                  <img
                    src={item.product.images[0].url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/products/${item.product.slug}`}
                    className="font-semibold text-slate-900 hover:text-brand-700"
                  >
                    {item.product.name}
                  </Link>
                  <div className="font-bold">
                    {formatCents(item.product.price_cents * item.quantity)}
                  </div>
                </div>
                <div className="text-xs text-slate-500">SKU {item.product.sku}</div>
                <div className="mt-auto flex items-center justify-between">
                  <div className="inline-flex items-center rounded-lg ring-1 ring-slate-200">
                    <button
                      className="px-3 py-1 text-slate-700 hover:bg-slate-50"
                      onClick={() =>
                        item.quantity > 1
                          ? updateItem.mutate({ id: item.id, quantity: item.quantity - 1 })
                          : removeItem.mutate(item.id)
                      }
                    >
                      −
                    </button>
                    <span className="px-3 text-sm">{item.quantity}</span>
                    <button
                      className="px-3 py-1 text-slate-700 hover:bg-slate-50"
                      onClick={() =>
                        updateItem.mutate({ id: item.id, quantity: item.quantity + 1 })
                      }
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="text-sm text-red-600 hover:underline"
                    onClick={() => removeItem.mutate(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="card sticky top-24 h-fit p-6">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-semibold">{formatCents(cart.data.subtotal_cents)}</dd>
            </div>
            <div className="flex justify-between text-slate-500">
              <dt>Shipping & tax</dt>
              <dd>Calculated at checkout</dd>
            </div>
          </dl>
          <button
            className="btn-primary mt-6 w-full"
            onClick={() => navigate("/checkout")}
          >
            Checkout
          </button>
          <Link to="/products" className="btn-secondary mt-2 w-full">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
