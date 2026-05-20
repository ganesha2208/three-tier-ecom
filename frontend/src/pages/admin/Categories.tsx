import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { categoriesApi } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { PageLoader } from "@/components/ui/Spinner";
import type { Category } from "@/types";

interface Draft {
  id?: number;
  name: string;
  description: string;
  image_url: string;
}

const empty: Draft = { name: "", description: "", image_url: "" };

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const list = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list().then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      if (draft.id) {
        await categoriesApi.update(draft.id, draft);
      } else {
        await categoriesApi.create(draft);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setDraft(null);
      toast.success("Saved");
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => categoriesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Deleted");
    },
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <button className="btn-primary" onClick={() => setDraft({ ...empty })}>
          + New category
        </button>
      </div>

      {list.isLoading ? (
        <PageLoader />
      ) : (
        <div className="mt-6 card divide-y divide-slate-100">
          {list.data?.map((c: Category) => (
            <div key={c.id} className="flex items-center gap-4 p-4">
              {c.image_url && (
                <img src={c.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
              )}
              <div className="flex-1">
                <div className="font-semibold">{c.name}</div>
                <div className="text-sm text-slate-500">{c.description}</div>
              </div>
              <button className="text-sm text-brand-700 hover:underline" onClick={() => setDraft({ id: c.id, name: c.name, description: c.description, image_url: c.image_url })}>
                Edit
              </button>
              <button
                className="text-sm text-red-600 hover:underline"
                onClick={() => confirm("Delete this category?") && remove.mutate(c.id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold">{draft.id ? "Edit category" : "New category"}</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Name</label>
                <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input min-h-[80px]" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div>
                <label className="label">Image URL</label>
                <input className="input" value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} />
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
