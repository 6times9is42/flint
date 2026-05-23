'use client';

/**
 * SavingsCTA — Only shown when isHighSavings === true (savings > $500/mo).
 *
 * Amber-bordered callout box. Content is direct and actionable — not salesy.
 * The message acknowledges the user is at a meaningful spend level and gives
 * a concrete next action (review contracts, negotiate annual pricing).
 *
 * Design intent: amber border with dim amber background makes it stand out
 * from the neutral breakdown cards without feeling like a marketing insert.
 * No buttons, no "click here" — just honest advice.
 */

import { formatCurrency } from '@/lib/utils';

interface SavingsCTAProps {
  totalMonthlySavings: number;
}

export function SavingsCTA({ totalMonthlySavings }: SavingsCTAProps) {
  return (
    <section
      className="relative overflow-hidden rounded-xl border border-[#f97316]/30 bg-[#f97316]/[0.04] p-5"
      aria-labelledby="savings-cta-heading"
    >
      {/* Subtle top-left corner glow */}
      <div
        className="pointer-events-none absolute -left-4 -top-4 h-24 w-24 rounded-full"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative flex gap-4">
        {/* Icon mark */}
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#f97316]/30 bg-[#f97316]/10"
          aria-hidden="true"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="#f97316"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="7" cy="7" r="6" />
            <path d="M7 4v3.5M7 10h.01" />
          </svg>
        </div>

        <div className="space-y-2">
          <h2
            id="savings-cta-heading"
            className="text-sm font-semibold text-neutral-100"
          >
            At {formatCurrency(totalMonthlySavings)}/mo in potential savings, this is worth
            an hour of your time.
          </h2>
          <p className="text-sm leading-relaxed text-neutral-400">
            Review your current vendor contracts and ask about annual billing — most SaaS
            vendors offer 10–20% off for annual commitment. For tools with per-seat pricing,
            confirm your actual active seat count before your next renewal. The ROI on a
            single pricing call is immediate at this spend level.
          </p>
          <p className="font-mono text-xs text-neutral-600">
            These are estimates based on public pricing. Actual savings depend on your
            contract terms.
          </p>
        </div>
      </div>
    </section>
  );
}
