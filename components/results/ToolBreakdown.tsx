'use client';

/**
 * ToolBreakdown — Per-tool recommendation cards.
 *
 * Each card is a structured row showing:
 * - Tool name + current plan label
 * - Spend flow: current → recommended (with right arrow)
 * - Savings badge (amber) or "Already optimal" badge (neutral)
 * - Action type chip (downgrade / switch / review-usage / etc.)
 * - Reasoning text (1-2 sentences, finance-literate)
 *
 * Design intent: think financial statement. Data-dense but scannable.
 * Color used sparingly — savings in amber, optimal in neutral.
 * Arrow divider between "current" and "recommended" spend is visual anchor.
 */

import { Badge } from '@/components/ui/badge';
import { PRICING } from '@/lib/audit-engine/pricing';
import type { RecommendationAction, ToolRecommendation } from '@/lib/audit-engine/types';
import { formatCurrency, cn } from '@/lib/utils';

interface ToolBreakdownProps {
  recommendations: ToolRecommendation[];
}

// ── Action labels ─────────────────────────────────────────────────────────────

const ACTION_META: Record<
  RecommendationAction,
  { label: string; className: string }
> = {
  downgrade: {
    label: 'Downgrade',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
  upgrade: {
    label: 'Upgrade',
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  },
  switch: {
    label: 'Switch tool',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
  'use-credits': {
    label: 'Use credits',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
  optimal: {
    label: 'Already optimal',
    className: 'border-white/10 bg-white/5 text-neutral-500',
  },
  'review-usage': {
    label: 'Review usage',
    className: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
  },
};

// ── Single card ───────────────────────────────────────────────────────────────

function ToolCard({ rec, index }: { rec: ToolRecommendation; index: number }) {
  const toolPricing = PRICING[rec.toolId];
  const displayName = toolPricing?.displayName ?? rec.toolId;
  const isOptimal = rec.recommendedAction === 'optimal';
  const hasSavings = rec.monthlySavings > 0;
  const actionMeta = ACTION_META[rec.recommendedAction];

  // Determine "recommended spend" label
  let recommendedLabel: string;
  if (rec.recommendedAction === 'switch' && rec.recommendedToolId) {
    const altTool = PRICING[rec.recommendedToolId];
    recommendedLabel = altTool
      ? `${altTool.displayName} — ${formatCurrency(rec.projectedMonthlySpend)}/mo`
      : formatCurrency(rec.projectedMonthlySpend);
  } else {
    recommendedLabel = `${formatCurrency(rec.projectedMonthlySpend)}/mo`;
  }

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-xl border transition-all duration-200',
        isOptimal
          ? 'border-white/8 bg-white/[0.02]'
          : 'border-white/10 bg-white/[0.03] hover:border-[#f97316]/25 hover:bg-[#f97316]/[0.02]',
      )}
      // Staggered entry animation via inline delay
      style={{ animationDelay: `${index * 60}ms` }}
      aria-label={`${displayName}: ${isOptimal ? 'already optimal' : `potential savings of ${formatCurrency(rec.monthlySavings)} per month`}`}
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-6">
        {/* ── Left: tool name + action chip ─────────────────────────────── */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-neutral-100">{displayName}</h3>
            {/* Action type chip */}
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider',
                actionMeta.className,
              )}
            >
              {actionMeta.label}
            </span>
          </div>

          {/* Reasoning */}
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            {rec.reasoning}
          </p>
        </div>

        {/* ── Right: spend flow + savings badge ──────────────────────────── */}
        <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
          {/* Spend flow */}
          <div
            className="flex items-center gap-2 font-mono text-sm"
            aria-label={`Current spend: ${formatCurrency(rec.currentSpend)} per month, recommended: ${recommendedLabel}`}
          >
            {/* Current spend */}
            <span
              className={cn(
                'font-bold',
                isOptimal ? 'text-neutral-400' : 'text-neutral-300',
              )}
            >
              {formatCurrency(rec.currentSpend)}
            </span>

            {/* Arrow separator */}
            {!isOptimal && (
              <>
                <svg
                  width="16"
                  height="10"
                  viewBox="0 0 16 10"
                  fill="none"
                  aria-hidden="true"
                  className="shrink-0 text-neutral-600"
                >
                  <path
                    d="M1 5h13M10 1l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {/* Recommended spend */}
                <span className="font-bold text-[#f97316]">
                  {formatCurrency(rec.projectedMonthlySpend)}
                </span>
              </>
            )}
            <span className="text-[10px] font-normal text-neutral-600">/mo</span>
          </div>

          {/* Savings badge */}
          {hasSavings ? (
            <Badge
              className="border-[#f97316]/30 bg-[#f97316]/10 font-mono text-[11px] font-bold text-[#f97316]"
              aria-label={`Save ${formatCurrency(rec.monthlySavings)} per month`}
            >
              −{formatCurrency(rec.monthlySavings)}/mo
            </Badge>
          ) : (
            <Badge
              className="border-white/10 bg-white/5 font-mono text-[11px] font-normal text-neutral-600"
              aria-label="No savings — already on optimal plan"
            >
              Optimal
            </Badge>
          )}
        </div>
      </div>

      {/* Amber left-border accent for actionable items */}
      {!isOptimal && (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-[2px] bg-[#f97316]/40"
          aria-hidden="true"
        />
      )}
    </article>
  );
}

// ── ToolBreakdown ─────────────────────────────────────────────────────────────

export function ToolBreakdown({ recommendations }: ToolBreakdownProps) {
  if (recommendations.length === 0) return null;

  // Sort: actionable first, optimal last
  const sorted = [...recommendations].sort((a, b) => {
    if (a.recommendedAction === 'optimal' && b.recommendedAction !== 'optimal') return 1;
    if (a.recommendedAction !== 'optimal' && b.recommendedAction === 'optimal') return -1;
    return b.monthlySavings - a.monthlySavings;
  });

  return (
    <section aria-labelledby="breakdown-heading">
      <div className="mb-4 flex items-center justify-between">
        <h2
          id="breakdown-heading"
          className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-neutral-500"
        >
          Per-tool breakdown
        </h2>
        <span className="font-mono text-[11px] text-neutral-700">
          {recommendations.length} tool{recommendations.length !== 1 ? 's' : ''} audited
        </span>
      </div>

      <div className="space-y-2">
        {sorted.map((rec, i) => (
          <ToolCard key={rec.toolId} rec={rec} index={i} />
        ))}
      </div>
    </section>
  );
}
