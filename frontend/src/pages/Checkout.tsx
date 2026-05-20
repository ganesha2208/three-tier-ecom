import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { cartApi, ordersApi } from "@/api/endpoints";
import { extractError } from "@/api/client";
import { PageLoader } from "@/components/ui/Spinner";
import { formatCents } from "@/utils/format";
import type { Address } from "@/types";

const TAX_RATE_BPS = 800;
const FREE_SHIP_OVER = 5000;
const FLAT_SHIP = 499;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const cart = useQuery({
    queryKey: ["cart"],
    queryFn: () => cartApi.get().then((r) => r.data),
  });

  const [addr, setAddr] = useState<Address>({
    full_name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
    phone: "",
    is_default: true,
  });
  const [save, setSave] = useState(true);

  const checkout = useMutation({
    mutationFn: () => ordersApi.checkout(addr, save),
    onSuccess: async ({ data }) => {
      if (data.mock_payment) {
        await ordersApi.confirmMock(data.order.id);
      }
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      navigate(`/orders/${data.order.id}/success`);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  if (cart.isLoading) return <PageLoader />;
  if (!cart.data || cart.data.items.length === 0) {
    navigate("/cart");
    return null;
  }

  const subtotal = cart.data.subtotal_cents;
  const tax = Math.floor((subtotal * TAX_RATE_BPS) / 10_000);
  const shipping = subtotal >= FREE_SHIP_OVER ? 0 : FLAT_SHIP;
  const total = subtotal + tax + shipping;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addr.full_name || !addr.line1 || !addr.city || !addr.state || !addr.postal_code) {
      toast.error("Please fill all required fields");
      return;
    }
    checkout.mutate();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
      <form onSubmit={onSubmit} className="mt-6 grid gap-8 lg:grid-cols-[1fr,400px]">
        <div className="card p-6">
          <h2 className="text-lg font-semibold">Shipping address</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name *">
              <input className="input" value={addr.full_name} onChange={(e) => setAddr({ ...addr, full_name: e.target.value })} required />
            </Field>
            <Field label="Phone">
              <input className="input" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} />
            </Field>
            <Field label="Address line 1 *" wide>
              <input className="input" value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} required />
            </Field>
            <Field label="Address line 2" wide>
              <input className="input" value={addr.line2} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} />
            </Field>
            <Field label="City *">
              <input className="input" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} required />
            </Field>
            <Field label="State *">
              <input className="input" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} required />
            </Field>
            <Field label="Postal code *">
              <input className="input" value={addr.postal_code} onChange={(e) => setAddr({ ...addr, postal_code: e.target.value })} required />
            </Field>
            <Field label="Country">
              <input className="input" maxLength={2} value={addr.country} onChange={(e) => setAddr({ ...addr, country: e.target.value.toUpperCase() })} />
            </Field>
          </div>
          <label className="mt-4 inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
            Save this address to my profile
          </label>

          <h2 className="mt-8 text-lg font-semibold">Payment</h2>
          <p className="mt-2 text-sm text-slate-500">
            For this demo, payment is confirmed automatically. Configure Stripe keys to switch to
            real card payments.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            Demo mode — no real charge
          </div>
        </div>

        <aside className="card h-fit p-6">
          <h2 className="text-lg font-semibold">Summary</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {cart.data.items.map((i) => (
              <li key={i.id} className="flex justify-between">
                <span className="line-clamp-1">{i.product.name} × {i.quantity}</span>
                <span>{formatCents(i.product.price_cents * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <hr className="my-4 border-slate-200" />
          <dl className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatCents(subtotal)} />
            <Row label="Tax (8%)" value={formatCents(tax)} />
            <Row label={shipping === 0 ? "Shipping (free)" : "Shipping"} value={formatCents(shipping)} />
            <Row label="Total" value={formatCents(total)} bold />
          </dl>
          <button type="submit" className="btn-primary mt-6 w-full" disabled={checkout.isPending}>
            {checkout.isPending ? "Placing order…" : `Place order — ${formatCents(total)}`}
          </button>
        </aside>
      </form>
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-bold" : ""}`}>
      <dt className={bold ? "" : "text-slate-500"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
