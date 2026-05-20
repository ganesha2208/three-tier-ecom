import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { categoriesApi, productsApi } from "@/api/endpoints";
import ProductCard from "@/components/ui/ProductCard";
import { PageLoader } from "@/components/ui/Spinner";

export default function HomePage() {
  const featured = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => productsApi.list({ featured: true, page_size: 8 }).then((r) => r.data),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list().then((r) => r.data),
  });

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-amber-50">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="flex flex-col justify-center">
            <span className="chip w-fit bg-brand-100 text-brand-700">New season</span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Things you love,<br /> delivered with care.
            </h1>
            <p className="mt-4 max-w-lg text-lg text-slate-600">
              Curated electronics, fashion, home, and more — at honest prices, with hassle-free
              returns and lightning-fast shipping.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/products" className="btn-primary">Shop everything</Link>
              <Link to="/products?sort=popular" className="btn-secondary">Popular picks</Link>
            </div>
          </div>
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800" className="aspect-[4/5] w-full rounded-2xl object-cover shadow-lg" loading="lazy" />
              <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800" className="mt-12 aspect-[4/5] w-full rounded-2xl object-cover shadow-lg" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Shop by category</h2>
          <Link to="/products" className="text-sm font-medium text-brand-700 hover:underline">
            View all →
          </Link>
        </div>
        {categories.isLoading ? (
          <PageLoader />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categories.data?.map((c) => (
              <Link
                key={c.id}
                to={`/products?category=${c.slug}`}
                className="card group relative aspect-square overflow-hidden"
              >
                {c.image_url && (
                  <img
                    src={c.image_url}
                    alt={c.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <div className="text-base font-semibold">{c.name}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Featured products</h2>
          <Link to="/products?featured=true" className="text-sm font-medium text-brand-700 hover:underline">
            See all →
          </Link>
        </div>
        {featured.isLoading ? (
          <PageLoader />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.data?.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
