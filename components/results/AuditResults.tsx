'use client';

/**
 * AuditResults — Main client-side results layout.
 *
 * Assembly order (per spec):
 * 1. HeroSavings
 * 2. ToolBreakdown
 * 3. AISummary
 * 4. SavingsCTA (only if isHighSavings)
 * 5. ShareButton
 *
 * Also renders the audit metadata bar (team size, use case, timestamp) between
 * the hero and breakdown — it provides context for the numbers without cluttering
 * the hero section itself.
 *
 * Design continuity: same grid background and amber glow as form page.
 * The outer wrapper is a server component (page.tsx); this is client-only
 * because ShareButton requires navigator.clipboard.
 */

import { HeroSavings } from './HeroSavings';
import { ToolBreakdown } from './ToolBreakdown';
import { AISummary } from './AISummary';
import { SavingsCTA } from './SavingsCTA';
import { ShareButton } from './ShareButton';
import type { AuditResult } from '@/lib/audit-engine/types';
import { formatCurrency } from '@/lib/utils';

interface AuditResultsProps {
  result: AuditResult;
  shareUrl: string;
}

const USE_CASE_LABELS: Record<string, string> = {
  coding: 'Coding',
  writing: 'Writing',
  data: 'Data',
  research: 'Research',
  mixed: 'Mixed',
};

export function AuditResults({ result, shareUrl }: AuditResultsProps) {
  const {
    totalMonthlySavings,
    totalAnnualSavings,
    totalCurrentSpend,
    totalProjectedSpend,
    isOptimal,
    isHighSavings,
    recommendations,
    aiSummary,
    input,
    createdAt,
  } = result;

  const auditDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-8">
      {/* ── 1. Hero ──────────────────────────────────────────────────────────── */}
      <HeroSavings
        totalMonthlySavings={totalMonthlySavings}
        totalAnnualSavings={totalAnnualSavings}
        totalCurrentSpend={totalCurrentSpend}
        isOptimal={isOptimal}
      />

      {/* ── Metadata bar ─────────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-white/8 pb-4"
        aria-label="Audit context"
      >
        <MetaItem label="Team" value={`${input.teamSize} ${input.teamSize === 1 ? 'person' : 'people'}`} />
        <MetaItem label="Use case" value={USE_CASE_LABELS[input.useCase] ?? input.useCase} />
        <MetaItem
          label="Tools audited"
          value={`${recommendations.length}`}
        />
        {!isOptimal && (
          <MetaItem
            label="Projected spend"
            value={`${formatCurrency(totalProjectedSpend)}/mo`}
          />
        )}
        <MetaItem label="Audited" value={auditDate} />
      </div>

      {/* ── 2. Tool Breakdown ────────────────────────────────────────────────── */}
      <ToolBreakdown recommendations={recommendations} />

      {/* ── 3. AI Summary ────────────────────────────────────────────────────── */}
      <AISummary summary={aiSummary} />

      {/* ── 4. High-savings CTA (conditional) ────────────────────────────────── */}
      {isHighSavings && (
        <SavingsCTA totalMonthlySavings={totalMonthlySavings} />
      )}

      {/* ── 5. Share ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2 border-t border-white/8 pt-8">
        <p className="mb-1 font-mono text-xs font-bold uppercase tracking-[0.2em] text-neutral-600">
          Share this audit
        </p>
        <ShareButton url={shareUrl} />
        <p className="text-[11px] text-neutral-700">
          Public link — no account required to view
        </p>
      </div>
    </div>
  );
}

// ── Small metadata chip ───────────────────────────────────────────────────────

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-600">
        {label}
      </span>
      <span className="font-mono text-xs font-semibold text-neutral-400">{value}</span>
    </div>
  );
}
