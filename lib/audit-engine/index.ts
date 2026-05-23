// Main audit engine entry point.
// runAudit() is the only public export — it takes the full form input and
// returns a deterministic AuditResult. No AI is used here; AI is reserved
// for the personalized summary paragraph generated server-side.

import type { AuditInput, AuditResult } from './types';
import { evaluateTool } from './rules';

/**
 * Run the full audit for a given AuditInput.
 *
 * Steps:
 *  1. Evaluate each tool against the rule set (passing the full context so
 *     cross-tool rules — e.g. double-pay detection — have access to all tools).
 *  2. Aggregate spend and savings across all recommendations.
 *  3. Set summary flags (isOptimal, isHighSavings).
 *
 * The returned AuditResult has aiSummary: null — the caller (API route) is
 * responsible for calling generateSummary() and attaching the result.
 */
export function runAudit(input: AuditInput): AuditResult {
  // Step 1: evaluate each tool with the full AuditInput as context
  const recommendations = input.tools.map(tool => evaluateTool(tool, input));

  // Step 2: aggregate spend numbers
  const totalCurrentSpend = recommendations.reduce(
    (sum, r) => sum + r.currentSpend,
    0
  );
  const totalProjectedSpend = recommendations.reduce(
    (sum, r) => sum + r.projectedMonthlySpend,
    0
  );
  const totalMonthlySavings = recommendations.reduce(
    (sum, r) => sum + r.monthlySavings,
    0
  );
  const totalAnnualSavings = totalMonthlySavings * 12;

  // Step 3: flags
  // isOptimal: savings are negligible (< $10/mo) — don't show a savings hero
  // isHighSavings: savings are significant (> $500/mo) — show the high-savings CTA
  const isOptimal = totalMonthlySavings < 10;
  const isHighSavings = totalMonthlySavings > 500;

  return {
    input,
    recommendations,
    totalCurrentSpend,
    totalProjectedSpend,
    totalMonthlySavings,
    totalAnnualSavings,
    isOptimal,
    isHighSavings,
    aiSummary: null,
    createdAt: new Date().toISOString(),
  };
}
