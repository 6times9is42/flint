'use client';

/**
 * HeroSavings — The first thing a user sees after their audit.
 *
 * Two states:
 * 1. isOptimal === true  → green "You're spending well" treatment
 * 2. isOptimal === false → large amber savings number, annual callout below
 *
 * Design intent: monospaced numbers at display scale create immediate
 * impact. The number IS the message — no decoration needed beyond contrast.
 */

import { formatCurrency, formatAnnual } from '@/lib/utils';

interface HeroSavingsProps {
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  totalCurrentSpend: number;
  isOptimal: boolean;
}

export function HeroSavings({
  totalMonthlySavings,
  totalAnnualSavings,
  totalCurrentSpend,
  isOptimal,
}: HeroSavingsProps) {
  if (isOptimal) {
    return (
      <section
        className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-950/30 px-8 py-10 sm:py-12"
        aria-label="Audit result: spending is well-optimised"
      >
        {/* Subtle emerald glow */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.07) 0%, transparent 70%)',
          }}
        />

        <div className="relative space-y-4">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span
              className="flex h-2 w-2 rounded-full bg-emerald-400"
              aria-hidden="true"
            />
            <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
              Already optimal
            </span>
          </div>

          <div>
            <h1 className="text-3xl font-bold leading-tight text-neutral-50 sm:text-4xl">
              You&rsquo;re spending well.
            </h1>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-neutral-400">
              Your current AI tool stack looks well-matched to your team size and
              use case. No significant savings identified at this time.
            </p>
          </div>

          <div
            className="flex items-baseline gap-2 pt-1"
            aria-label={`Current monthly spend: ${formatCurrency(totalCurrentSpend)} per month`}
          >
            <span className="font-mono text-4xl font-bold text-emerald-300 sm:text-5xl">
              {formatCurrency(totalCurrentSpend)}
            </span>
            <span className="text-sm font-medium text-neutral-500">/ month</span>
          </div>
          <p className="text-xs text-neutral-600">
            Total current spend — no changes recommended
          </p>
        </div>
      </section>
    );
  }

  // ── Savings hero ──────────────────────────────────────────────────────────
  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-[#f97316]/20 bg-[#f97316]/[0.04] px-8 py-10 sm:py-12"
      aria-label={`Audit result: ${formatCurrency(totalMonthlySavings)} per month in potential savings found`}
    >
      {/* Amber glow */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse at 50% -10%, rgba(249,115,22,0.10) 0%, transparent 65%)',
        }}
      />

      <div className="relative space-y-1">
        {/* Label */}
        <div className="flex items-center gap-2">
          <span
            className="flex h-2 w-2 animate-pulse rounded-full bg-[#f97316]"
            aria-hidden="true"
          />
          <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#f97316]">
            Savings found
          </span>
        </div>

        {/* Big number */}
        <div className="pt-3">
          <p
            className="font-mono text-6xl font-black leading-none tracking-tight text-neutral-50 sm:text-7xl lg:text-8xl"
            aria-label={`${formatCurrency(totalMonthlySavings)} per month in potential savings`}
          >
            {formatCurrency(totalMonthlySavings)}
          </p>
          <p className="mt-2 text-lg font-medium text-neutral-400 sm:text-xl">
            per month in potential savings
          </p>
        </div>

        {/* Annual callout */}
        <div className="pt-4">
          <p
            className="inline-flex items-baseline gap-1.5 rounded-lg border border-[#f97316]/25 bg-[#f97316]/10 px-4 py-2"
            aria-label={`${formatCurrency(totalAnnualSavings)} per year in potential savings`}
          >
            <span className="font-mono text-2xl font-bold text-[#f97316] sm:text-3xl">
              {formatCurrency(totalAnnualSavings)}
            </span>
            <span className="text-sm font-medium text-neutral-500">/ year</span>
          </p>
        </div>
      </div>
    </section>
  );
}
