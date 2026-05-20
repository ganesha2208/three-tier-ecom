import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { usersApi } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { useAuthStore } from "@/store/auth";
import { PageLoader } from "@/components/ui/Spinner";
import type { Address } from "@/types";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const qc = useQueryClient();
  const [name, setName] = useState(user?.full_name ?? "");

  const addresses = useQuery({
    queryKey: ["addresses"],
    queryFn: () => usersApi.listAddresses().then((r) => r.data),
  });

  const updateProfile = useMutation({
    mutationFn: () => usersApi.updateMe({ full_name: name }),
    onSuccess: ({ data }) => {
      setUser(data);
      toast.success("Profile updated");
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const [newAddr, setNewAddr] = useState<Address>({
    full_name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
    phone: "",
    is_default: false,
  });

  const addAddress = useMutation({
    mutationFn: () => usersApi.addAddress(newAddr),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["addresses"] });
      setNewAddr({
        full_name: "", line1: "", line2: "", city: "", state: "",
        postal_code: "", country: "US", phone: "", is_default: false,
      });
      toast.success("Address added");
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const removeAddr = useMutation({
    mutationFn: (id: number) => usersApi.deleteAddress(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });

  if (!user) return <PageLoader />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Your profile</h1>

      <section className="card mt-6 p-6">
        <h2 className="text-lg font-semibold">Personal info</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Email</label>
            <input className="input" value={user.email} disabled />
          </div>
          <div>
            <label className="label">Full name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <button
          className="btn-primary mt-4"
          onClick={() => updateProfile.mutate()}
          disabled={updateProfile.isPending || name === user.full_name}
        >
          Save changes
        </button>
      </section>

      <section className="card mt-6 p-6">
        <h2 className="text-lg font-semibold">Addresses</h2>
        <div className="mt-4 space-y-3">
          {addresses.isLoading ? (
            <PageLoader />
          ) : addresses.data && addresses.data.length > 0 ? (
            addresses.data.map((a) => (
              <div key={a.id} className="flex items-start justify-between rounded-lg border border-slate-200 p-4">
                <div className="text-sm text-slate-700">
                  <div className="font-semibold">{a.full_name} {a.is_default && <span className="chip ml-2 bg-brand-100 text-brand-700">Default</span>}</div>
                  {a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />
                  {a.city}, {a.state} {a.postal_code}, {a.country}
                  {a.phone && <><br />{a.phone}</>}
                </div>
                <button className="text-sm text-red-600 hover:underline" onClick={() => removeAddr.mutate(a.id)}>
                  Remove
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No saved addresses.</p>
          )}
        </div>

        <details className="mt-6 rounded-lg border border-slate-200">
          <summary className="cursor-pointer p-4 text-sm font-semibold">+ Add new address</summary>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <input className="input" placeholder="Full name" value={newAddr.full_name} onChange={(e) => setNewAddr({ ...newAddr, full_name: e.target.value })} />
            <input className="input" placeholder="Phone" value={newAddr.phone} onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })} />
            <input className="input sm:col-span-2" placeholder="Address line 1" value={newAddr.line1} onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })} />
            <input className="input sm:col-span-2" placeholder="Address line 2" value={newAddr.line2} onChange={(e) => setNewAddr({ ...newAddr, line2: e.target.value })} />
            <input className="input" placeholder="City" value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} />
            <input className="input" placeholder="State" value={newAddr.state} onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })} />
            <input className="input" placeholder="Postal code" value={newAddr.postal_code} onChange={(e) => setNewAddr({ ...newAddr, postal_code: e.target.value })} />
            <input className="input" placeholder="Country (2 letters)" value={newAddr.country} maxLength={2} onChange={(e) => setNewAddr({ ...newAddr, country: e.target.value.toUpperCase() })} />
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!newAddr.is_default} onChange={(e) => setNewAddr({ ...newAddr, is_default: e.target.checked })} />
              Set as default
            </label>
            <button className="btn-primary sm:col-span-2" onClick={() => addAddress.mutate()} disabled={addAddress.isPending}>
              Save address
            </button>
          </div>
        </details>
      </section>
    </div>
  );
}
