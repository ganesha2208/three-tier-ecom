import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import type { Product } from "@/types";
import { cartApi, wishlistApi } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { useAuthStore } from "@/store/auth";
import { formatCents } from "@/utils/format";

export default function ProductCard({ product }: { product: Product }) {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const image = product.images[0]?.url ?? "";

  const addCart = useMutation({
    mutationFn: () => cartApi.add(product.id, 1),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      toast.success(`Added ${product.name}`);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const addWish = useMutation({
    mutationFn: () => wishlistApi.add(product.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success("Saved to wishlist");
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const discount =
    product.compare_at_cents && product.compare_at_cents > product.price_cents
      ? Math.round(
          ((product.compare_at_cents - product.price_cents) / product.compare_at_cents) * 100
        )
      : 0;

  return (
    <div className="card group flex h-full flex-col overflow-hidden">
      <Link to={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-slate-100">
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-slate-400">No image</div>
        )}
        {discount > 0 && (
          <span className="absolute left-2 top-2 chip bg-red-100 text-red-700">-{discount}%</span>
        )}
        {product.stock <= 5 && product.stock > 0 && (
          <span className="absolute right-2 top-2 chip bg-amber-100 text-amber-800">Low stock</span>
        )}
        {product.stock === 0 && (
          <span className="absolute right-2 top-2 chip bg-slate-800 text-white">Sold out</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="text-xs uppercase tracking-wider text-slate-500">
          {product.category.name}
        </div>
        <Link to={`/products/${product.slug}`} className="mt-1 line-clamp-2 font-semibold text-slate-900 hover:text-brand-700">
          {product.name}
        </Link>
        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <Stars value={product.rating_avg} />
          <span>({product.rating_count})</span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <div className="text-lg font-bold text-slate-900">
            {formatCents(product.price_cents, product.currency)}
          </div>
          {product.compare_at_cents && product.compare_at_cents > product.price_cents && (
            <div className="text-sm text-slate-400 line-through">
              {formatCents(product.compare_at_cents, product.currency)}
            </div>
          )}
        </div>
        <div className="mt-auto flex gap-2 pt-4">
          <button
            disabled={product.stock === 0 || addCart.isPending}
            className="btn-primary flex-1"
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
            aria-label="Add to wishlist"
            title="Add to wishlist"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6c-1.8-1.8-4.8-1.8-6.6 0L12 6.8 9.8 4.6c-1.8-1.8-4.8-1.8-6.6 0-1.8 1.8-1.8 4.8 0 6.6l8.8 8.8 8.8-8.8c1.8-1.8 1.8-4.8 0-6.6Z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const filled = Math.round(value);
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i <= filled ? "#f59e0b" : "none"}
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeLinejoin="round"
        >
          <path d="M12 2 15 9l7 .6-5.3 4.6L18.2 22 12 18l-6.2 4 1.5-7.8L2 9.6 9 9z"/>
        </svg>
      ))}
    </span>
  );
}
