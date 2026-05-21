import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { categoriesApi, productsApi } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { PageLoader } from "@/components/ui/Spinner";
import { formatCents } from "@/utils/format";
import type { Product } from "@/types";

interface Draft {
  id?: number;
  name: string;
  description: string;
  price_cents: number;
  compare_at_cents?: number | null;
  sku: string;
  stock: number;
  category_id: number | "";
  is_active: boolean;
  is_featured: boolean;
  images: { url: string; alt: string; position: number }[];
}

const empty: Draft = {
  name: "",
  description: "",
  price_cents: 0,
  compare_at_cents: null,
  sku: "",
  stock: 0,
  category_id: "",
  is_active: true,
  is_featured: false,
  images: [],
};

export default function AdminProductsPage() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list().then((r) => r.data),
  });
  const products = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => productsApi.list({ page_size: 60 }).then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      if (!draft.category_id) throw new Error("Pick a category");
      const payload = { ...draft, category_id: Number(draft.category_id) };
      if (draft.id) {
        await productsApi.update(draft.id, payload);
      } else {
        await productsApi.create(payload as any);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setDraft(null);
      toast.success("Saved");
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => productsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Deleted");
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const edit = (p: Product) => {
    setDraft({
      id: p.id,
      name: p.name,
      description: p.description,
      price_cents: p.price_cents,
      compare_at_cents: p.compare_at_cents,
      sku: p.sku,
      stock: p.stock,
      category_id: p.category.id,
      is_active: p.is_active,
      is_featured: p.is_featured,
      images: p.images.map((i) => ({ url: i.url, alt: i.alt, position: i.position })),
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <button className="btn-primary" onClick={() => setDraft({ ...empty })}>
          + New product
        </button>
      </div>

      {products.isLoading ? (
        <PageLoader />
      ) : (
        <div className="mt-6 overflow-x-auto card">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Featured</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.data?.items.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-md bg-slate-100">
                        {p.images[0] && <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div>
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-slate-500">{p.category.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.sku}</td>
                  <td className="px-4 py-3 font-semibold">{formatCents(p.price_cents)}</td>
                  <td className="px-4 py-3">
                    <span className={p.stock <= 5 ? "font-semibold text-amber-700" : ""}>{p.stock}</span>
                  </td>
                  <td className="px-4 py-3">{p.is_featured ? "Yes" : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-sm text-brand-700 hover:underline" onClick={() => edit(p)}>
                      Edit
                    </button>
                    <button
                      className="ml-3 text-sm text-red-600 hover:underline"
                      onClick={() => confirm("Delete this product?") && remove.mutate(p.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4">
          <div className="card w-full max-w-2xl overflow-y-auto p-6 max-h-[90vh]">
            <h2 className="text-lg font-semibold">{draft.id ? "Edit product" : "New product"}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Name" wide>
                <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </Field>
              <Field label="Description" wide>
                <textarea className="input min-h-[80px]" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </Field>
              <Field label="SKU">
                <input className="input" value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} />
              </Field>
              <Field label="Category">
                <select className="input" value={draft.category_id} onChange={(e) => setDraft({ ...draft, category_id: e.target.value ? Number(e.target.value) : "" })}>
                  <option value="">Select…</option>
                  {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Price (cents)">
                <input type="number" className="input" value={draft.price_cents} onChange={(e) => setDraft({ ...draft, price_cents: Number(e.target.value) })} />
              </Field>
              <Field label="Compare-at (cents)">
                <input type="number" className="input" value={draft.compare_at_cents ?? ""} onChange={(e) => setDraft({ ...draft, compare_at_cents: e.target.value ? Number(e.target.value) : null })} />
              </Field>
              <Field label="Stock">
                <input type="number" className="input" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })} />
              </Field>
              <Field label="Flags">
                <div className="flex items-center gap-4 pt-2 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />
                    Active
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={draft.is_featured} onChange={(e) => setDraft({ ...draft, is_featured: e.target.checked })} />
                    Featured
                  </label>
                </div>
              </Field>
              <div className="sm:col-span-2">
                <label className="label">Image URLs (one per line)</label>
                <textarea
                  className="input min-h-[80px]"
                  value={draft.images.map((i) => i.url).join("\n")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      images: e.target.value
                        .split("\n")
                        .map((u) => u.trim())
                        .filter(Boolean)
                        .map((url, position) => ({ url, alt: draft.name, position })),
                    })
                  }
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setDraft(null)}>Cancel</button>
              <button className="btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
