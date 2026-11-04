import { useState } from 'react';
import { checkout } from '../billing';

type Plan = { id: string; name: string; seats: number; monthly: number };

// Prices come from the billing service so the page never disagrees with the invoice.
export function Pricing({ plans }: { plans: Plan[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!plans.length) return <p className="text-zinc-600">Pricing is loading. If this stays, refresh the page.</p>;

  return (
    <section aria-labelledby="pricing-title" className="mx-auto max-w-4xl px-6 py-16">
      <h2 id="pricing-title" className="font-serif text-3xl text-zinc-900">Pay per seat, cancel any month</h2>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2">
        {plans.map((plan) => (
          <li key={plan.id} className="rounded-md border border-zinc-300 p-6">
            <h3 className="text-xl font-semibold">{plan.name}</h3>
            <p className="mt-2 text-zinc-700">Up to {plan.seats} seats, {plan.monthly} € per seat each month.</p>
            <button
              type="button"
              disabled={busy === plan.id}
              onClick={async () => {
                setBusy(plan.id);
                await checkout(plan.id);
                setBusy(null);
              }}
              className="mt-4 rounded bg-zinc-900 px-4 py-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {busy === plan.id ? 'Opening checkout…' : `Choose ${plan.name}`}
            </button>
          </li>
        ))}
      </ul>
      <img src="/img/invoice-sample.png" width="640" height="400" alt="A sample invoice listing seats and the monthly total" />
    </section>
  );
}
