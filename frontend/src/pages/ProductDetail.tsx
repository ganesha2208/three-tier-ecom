import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { cartApi, productsApi, reviewsApi, wishlistApi } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { useAuthStore } from "@/store/auth";
import { PageLoader } from "@/components/ui/Spinner";
import { Stars } from "@/components/ui/ProductCard";
import { formatCents, formatDate } from "@/utils/format";

export default function ProductDetailPage() {
  const { slug = "" } = useParams();
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const product = useQuery({
    queryKey: ["product", slug],
    queryFn: () => productsApi.get(slug).then((r) => r.data),
  });

  const reviews = useQuery({
    queryKey: ["reviews", product.data?.id],
    queryFn: () =>
      product.data ? reviewsApi.listForProduct(product.data.id).then((r) => r.data) : Promise.resolve([]),
    enabled: !!product.data,
  });

  const addCart = useMutation({
    mutationFn: () => cartApi.add(product.data!.id, qty),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to cart");
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const addWish = useMutation({
    mutationFn: () => wishlistApi.add(product.data!.id),
    onSuccess: () => toast.success("Saved to wishlist"),
    onError: (e) => toast.error(extractError(e)),
  });

  if (product.isLoading) return <PageLoader />;
  if (!product.data) return <div className="p-8">Product not found.</div>;

  const p = product.data;
  const image = p.images[activeImage]?.url ?? p.images[0]?.url ?? "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-sm text-slate-500">
        <Link to="/" className="hover:underline">Home</Link> /{" "}
        <Link to="/products" className="hover:underline">Shop</Link> /{" "}
        <Link to={`/products?category=${p.category.slug}`} className="hover:underline">
          {p.category.name}
        </Link>{" "}
        / <span className="text-slate-700">{p.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="card aspect-square overflow-hidden">
            {image ? (
              <img src={image} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-slate-400">No image</div>
            )}
          </div>
          {p.images.length > 1 && (
            <div className="mt-4 grid grid-cols-5 gap-2">
              {p.images.map((img, i) => (
                <button
                  key={img.id}
                  className={`aspect-square overflow-hidden rounded-lg ring-2 ${
                    i === activeImage ? "ring-brand-500" : "ring-transparent"
                  }`}
                  onClick={() => setActiveImage(i)}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">{p.category.name}</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{p.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <Stars value={p.rating_avg} />
            <span>
              {p.rating_avg.toFixed(1)} · {p.rating_count} reviews
            </span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <div className="text-3xl font-bold">{formatCents(p.price_cents, p.currency)}</div>
            {p.compare_at_cents && p.compare_at_cents > p.price_cents && (
              <div className="text-lg text-slate-400 line-through">
                {formatCents(p.compare_at_cents, p.currency)}
              </div>
            )}
          </div>

          <p className="mt-4 text-slate-700">{p.description}</p>

          <div className="mt-6 flex items-center gap-3">
            <label className="label mb-0">Qty</label>
            <input
              type="number"
              className="input w-24"
              value={qty}
              min={1}
              max={p.stock}
              onChange={(e) => setQty(Math.max(1, Math.min(p.stock, Number(e.target.value) || 1)))}
            />
            <span className="text-sm text-slate-500">
              {p.stock > 0 ? `${p.stock} in stock` : "Sold out"}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="btn-primary"
              disabled={p.stock === 0 || addCart.isPending}
              onClick={() => {
                if (!accessToken) {
                  toast.error("Please sign in first");
                  return;
                }
                addCart.mutate();
              }}
            >
              Add to cart
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                if (!accessToken) {
                  toast.error("Please sign in first");
                  return;
                }
                addWish.mutate();
              }}
            >
              ♡ Add to wishlist
            </button>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 text-sm">
            <div className="card p-3">
              <div className="font-semibold">Free shipping</div>
              <div className="text-slate-500">over $50</div>
            </div>
            <div className="card p-3">
              <div className="font-semibold">30-day returns</div>
              <div className="text-slate-500">no questions asked</div>
            </div>
            <div className="card p-3">
              <div className="font-semibold">Secure payment</div>
              <div className="text-slate-500">Stripe protected</div>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight">Reviews</h2>
        {reviews.isLoading ? (
          <PageLoader />
        ) : reviews.data && reviews.data.length > 0 ? (
          <div className="mt-4 space-y-4">
            {reviews.data.map((r) => (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{r.user_name || "Customer"}</div>
                  <div className="text-xs text-slate-500">{formatDate(r.created_at)}</div>
                </div>
                <div className="mt-1">
                  <Stars value={r.rating} />
                </div>
                {r.title && <div className="mt-2 font-semibold">{r.title}</div>}
                {r.body && <p className="mt-1 text-slate-700">{r.body}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-slate-500">No reviews yet — be the first after purchase.</p>
        )}
      </section>
    </div>
  );
}
