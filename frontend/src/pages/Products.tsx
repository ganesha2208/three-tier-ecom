import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { categoriesApi, productsApi, ProductQuery } from "@/api/endpoints";
import ProductCard from "@/components/ui/ProductCard";
import { PageLoader } from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

const SORTS: { value: ProductQuery["sort"]; label: string }[] = [
  { value: "new", label: "Newest" },
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Top rated" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const sort = (params.get("sort") as ProductQuery["sort"]) ?? "new";
  const page = Number(params.get("page") ?? 1);

  const query: ProductQuery = useMemo(
    () => ({
      q: q || undefined,
      category: category || undefined,
      sort,
      page,
      page_size: 12,
    }),
    [q, category, sort, page]
  );

  const list = useQuery({
    queryKey: ["products", query],
    queryFn: () => productsApi.list(query).then((r) => r.data),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list().then((r) => r.data),
  });

  const setParam = (key: string, val: string) => {
    const next = new URLSearchParams(params);
    if (val) next.set(key, val);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shop</h1>
          {list.data && (
            <p className="mt-1 text-sm text-slate-500">{list.data.total} results</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="input w-64"
            placeholder="Search products…"
            defaultValue={q}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setParam("q", (e.target as HTMLInputElement).value);
              }
            }}
          />
          <select
            className="input w-44"
            value={sort}
            onChange={(e) => setParam("sort", e.target.value)}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px,1fr]">
        <aside className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Categories
            </h3>
            <ul className="space-y-1">
              <li>
                <button
                  className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                    !category ? "bg-brand-50 text-brand-700 font-semibold" : "hover:bg-slate-100"
                  }`}
                  onClick={() => setParam("category", "")}
                >
                  All
                </button>
              </li>
              {categories.data?.map((c) => (
                <li key={c.id}>
                  <button
                    className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                      category === c.slug ? "bg-brand-50 text-brand-700 font-semibold" : "hover:bg-slate-100"
                    }`}
                    onClick={() => setParam("category", c.slug)}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div>
          {list.isLoading ? (
            <PageLoader />
          ) : !list.data || list.data.items.length === 0 ? (
            <EmptyState
              title="No products match"
              description="Try removing a filter or searching for something else."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.data.items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {list.data.pages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    className="btn-secondary"
                    disabled={page <= 1}
                    onClick={() => setParam("page", String(page - 1))}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-600">
                    Page {page} of {list.data.pages}
                  </span>
                  <button
                    className="btn-secondary"
                    disabled={page >= list.data.pages}
                    onClick={() => setParam("page", String(page + 1))}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
