import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { cartApi, wishlistApi } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { PageLoader } from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { formatCents } from "@/utils/format";

export default function WishlistPage() {
  const qc = useQueryClient();
  const wishes = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => wishlistApi.list().then((r) => r.data),
  });

  const remove = useMutation({
    mutationFn: (productId: number) => wishlistApi.remove(productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  const addCart = useMutation({
    mutationFn: (productId: number) => cartApi.add(productId, 1),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to cart");
    },
    onError: (e) => toast.error(extractError(e)),
  });

  if (wishes.isLoading) return <PageLoader />;
  if (!wishes.data || wishes.data.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it for later."
          action={<Link to="/products" className="btn-primary">Browse products</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Your wishlist</h1>
      <div className="mt-6 space-y-3">
        {wishes.data.map((w) => (
          <div key={w.id} className="card flex flex-wrap items-center gap-4 p-4">
            <Link
              to={`/products/${w.product.slug}`}
              className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100"
            >
              {w.product.images[0] && (
                <img src={w.product.images[0].url} alt="" className="h-full w-full object-cover" />
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link to={`/products/${w.product.slug}`} className="font-semibold hover:text-brand-700">
                {w.product.name}
              </Link>
              <div className="text-sm text-slate-500">{formatCents(w.product.price_cents)}</div>
            </div>
            <button className="btn-primary" onClick={() => addCart.mutate(w.product.id)}>
              Add to cart
            </button>
            <button className="btn-ghost" onClick={() => remove.mutate(w.product.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
