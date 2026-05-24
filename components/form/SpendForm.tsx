'use client';

import React, { useRef, useState } from 'react';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { useAudit } from '@/hooks/useAudit';
import { ToolRow, type ToolRowValue, type ToolRowErrors } from './ToolRow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PRICING } from '@/lib/audit-engine/pricing';
import type { ToolId, UseCase } from '@/lib/audit-engine/types';
import { formatCurrency, cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const TOOL_IDS: ToolId[] = [
  'cursor',
  'github-copilot',
  'claude',
  'chatgpt',
  'anthropic-api',
  'openai-api',
  'gemini',
  'windsurf',
];

const USE_CASES: { id: UseCase; label: string; description: string }[] = [
  { id: 'coding', label: 'Coding', description: 'Writing & reviewing code' },
  { id: 'writing', label: 'Writing', description: 'Docs, copy, content' },
  { id: 'data', label: 'Data', description: 'Analysis & SQL' },
  { id: 'research', label: 'Research', description: 'Synthesis & summarisation' },
  { id: 'mixed', label: 'Mixed', description: 'A bit of everything' },
];

// ─── Form State Types ─────────────────────────────────────────────────────────

interface FormState {
  teamSize: string;
  useCase: UseCase;
  tools: Record<ToolId, ToolRowValue>;
}

type FormErrors = {
  teamSize?: string;
  useCase?: string;
  tools?: Record<string, ToolRowErrors>;
  general?: string;
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

function defaultToolValue(toolId: ToolId): ToolRowValue {
  const pricing = PRICING[toolId];
  // Pick the first non-free, non-enterprise plan as default selection
  const defaultPlan =
    pricing.plans.find(p => p.monthlyPricePerSeat > 0 && p.id !== 'enterprise') ??
    pricing.plans[0];
  return {
    enabled: false,
    planId: defaultPlan?.id ?? pricing.plans[0]?.id ?? '',
    monthlySpend: '',
    seats: '1',
  };
}

function defaultFormState(): FormState {
  const tools = {} as Record<ToolId, ToolRowValue>;
  for (const id of TOOL_IDS) {
    tools[id] = defaultToolValue(id);
  }
  return {
    teamSize: '',
    useCase: 'mixed',
    tools,
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateForm(state: FormState): FormErrors {
  const errors: FormErrors = {};

  const teamSizeNum = parseInt(state.teamSize, 10);
  if (!state.teamSize || isNaN(teamSizeNum) || teamSizeNum < 1) {
    errors.teamSize = 'Enter your team size (at least 1)';
  }

  const enabledTools = TOOL_IDS.filter(id => state.tools[id].enabled);
  if (enabledTools.length === 0) {
    errors.general = 'Select at least one tool to audit.';
  }

  const toolErrors: Record<string, ToolRowErrors> = {};
  for (const id of enabledTools) {
    const row = state.tools[id];
    const rowErrors: ToolRowErrors = {};
    const pricing = PRICING[id];
    const isApiTool = pricing.category === 'api';
    const selectedPlan = pricing.plans.find(p => p.id === row.planId);
    const isApiPlan = selectedPlan?.id === 'api' || isApiTool;

    if (!row.planId) {
      rowErrors.planId = 'Select a plan';
    }

    const spend = parseFloat(row.monthlySpend);
    if (row.monthlySpend === '' || isNaN(spend) || spend <= 0) {
      rowErrors.monthlySpend = 'Enter monthly spend > $0';
    }

    if (!isApiPlan) {
      const seats = parseInt(row.seats, 10);
      if (row.seats === '' || isNaN(seats) || seats < 1) {
        rowErrors.seats = 'At least 1 seat';
      }
    }

    if (Object.keys(rowErrors).length > 0) {
      toolErrors[id] = rowErrors;
    }
  }

  if (Object.keys(toolErrors).length > 0) {
    errors.tools = toolErrors;
  }

  return errors;
}

// ─── Running Total ────────────────────────────────────────────────────────────

function computeTotal(tools: Record<ToolId, ToolRowValue>): number {
  return TOOL_IDS.reduce((sum, id) => {
    const row = tools[id];
    if (!row.enabled) return sum;
    const spend = parseFloat(row.monthlySpend);
    return sum + (isNaN(spend) ? 0 : spend);
  }, 0);
}

// ─── SpendForm ─────────────────────────────────────────────────────────────────

export function SpendForm() {
  const [formState, setFormState] = useFormPersistence<FormState>(
    'spend-audit-form-v1',
    defaultFormState(),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<1 | 2>(1);
  const { state: auditState, error: auditError, submitAudit } = useAudit();

  // Honeypot ref (never set by real users)
  const honeypotRef = useRef<HTMLInputElement>(null);

  const monthlyTotal = computeTotal(formState.tools);
  const enabledCount = TOOL_IDS.filter(id => formState.tools[id].enabled).length;

  // ── Step 1 → 2 validation ─────────────────────────────────────────────────
  function handleStep1Continue() {
    const errs: FormErrors = {};
    const teamSizeNum = parseInt(formState.teamSize, 10);
    if (!formState.teamSize || isNaN(teamSizeNum) || teamSizeNum < 1) {
      errs.teamSize = 'Enter your team size (at least 1)';
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep(2);
  }

  // ── Tool row change ───────────────────────────────────────────────────────
  function handleToolChange(toolId: ToolId, next: ToolRowValue) {
    setFormState(prev => ({
      ...prev,
      tools: { ...prev.tools, [toolId]: next },
    }));
    // Clear per-tool errors when user changes values
    if (errors.tools?.[toolId]) {
      setErrors(prev => {
        const tools = { ...prev.tools };
        delete tools[toolId];
        return { ...prev, tools };
      });
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Honeypot check
    if (honeypotRef.current?.value) return;

    const errs = validateForm(formState);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    const enabledTools = TOOL_IDS.filter(id => formState.tools[id].enabled);
    const pricing_map = PRICING;

    await submitAudit({
      teamSize: parseInt(formState.teamSize, 10),
      useCase: formState.useCase,
      tools: enabledTools.map(id => {
        const row = formState.tools[id];
        const p = pricing_map[id];
        const isApiTool = p.category === 'api';
        return {
          toolId: id,
          planId: row.planId,
          monthlySpend: parseFloat(row.monthlySpend) || 0,
          seats: isApiTool ? 1 : parseInt(row.seats, 10) || 1,
        };
      }),
      website: honeypotRef.current?.value,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Honeypot — hidden from real users, visible to bots */}
      <input
        ref={honeypotRef}
        type="text"
        name="website"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
      />

      {/* ── Step 1 — Context ───────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-8">
          {/* Team size */}
          <fieldset className="space-y-3">
            <legend className="text-base font-semibold text-neutral-100">
              Team size
            </legend>
            <p className="text-sm text-[var(--flint-text-dim)]">
              How many people on your team actively use AI tools?
            </p>
            <div className="max-w-[160px]">
              <Label htmlFor="team-size" className="sr-only">
                Team size
              </Label>
              <Input
                id="team-size"
                type="number"
                min={1}
                step={1}
                placeholder="e.g. 5"
                value={formState.teamSize}
                onChange={e =>
                  setFormState(prev => ({ ...prev, teamSize: e.target.value }))
                }
                className={cn(
                  'h-11 border-white/10 bg-white/5 font-mono text-base text-neutral-100 placeholder:text-white/20 focus-visible:border-[var(--flint-amber)] focus-visible:ring-[var(--flint-amber-glow)]',
                  errors.teamSize && 'border-red-500/60',
                )}
                aria-describedby={errors.teamSize ? 'team-size-error' : undefined}
                aria-invalid={!!errors.teamSize}
              />
            </div>
            {errors.teamSize && (
              <p id="team-size-error" className="text-xs text-red-400" role="alert">
                {errors.teamSize}
              </p>
            )}
          </fieldset>

          {/* Use case */}
          <fieldset className="space-y-3">
            <legend className="text-base font-semibold text-neutral-100">
              Primary use case
            </legend>
            <p className="text-sm text-[var(--flint-text-dim)]">
              What does your team mainly use AI for?
            </p>
            <div
              aria-describedby={errors.useCase ? 'use-case-error' : undefined}
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
            >
              {USE_CASES.map(uc => {
                const isSelected = formState.useCase === uc.id;
                return (
                  <label
                    key={uc.id}
                    className={cn(
                      'relative flex cursor-pointer flex-col gap-1 rounded-lg border px-4 py-3 transition-all duration-150',
                      isSelected
                        ? 'border-[var(--flint-amber)] bg-[var(--flint-amber-dim)] text-neutral-100'
                        : 'border-white/8 bg-white/[0.03] text-[var(--flint-text-dim)] hover:border-white/20 hover:bg-white/[0.05]',
                    )}
                  >
                    <input
                      type="radio"
                      name="useCase"
                      value={uc.id}
                      checked={isSelected}
                      onChange={() =>
                        setFormState(prev => ({ ...prev, useCase: uc.id }))
                      }
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isSelected ? 'text-neutral-100' : 'text-neutral-300',
                      )}
                    >
                      {uc.label}
                    </span>
                    <span className="text-[11px] leading-tight text-[var(--flint-text-dim)]">
                      {uc.description}
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.useCase && (
              <p id="use-case-error" className="text-xs text-red-400" role="alert">
                {errors.useCase}
              </p>
            )}
          </fieldset>

          <Button
            type="button"
            onClick={handleStep1Continue}
            className="h-11 px-8 bg-[var(--flint-amber)] text-black font-semibold hover:bg-[#ca80ff] focus-visible:ring-[var(--flint-amber-glow)] transition-colors"
          >
            Continue →
          </Button>
        </div>
      )}

      {/* ── Step 2 — Tools ─────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Step 2 header with back link */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-100">
                Which tools do you pay for?
              </h2>
              <p className="mt-0.5 text-sm text-[var(--flint-text-dim)]">
                Toggle each tool you use, then fill in your plan and spend.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setErrors({});
              }}
              className="text-xs text-[var(--flint-text-dim)] underline underline-offset-4 hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flint-amber)] focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 rounded"
            >
              ← Edit context
            </button>
          </div>

          {/* Tool rows */}
          <div className="space-y-2" aria-label="AI tools to audit">
            {TOOL_IDS.map((id, i) => (
              <ToolRow
                key={id}
                toolId={id}
                value={formState.tools[id]}
                errors={errors.tools?.[id]}
                onChange={handleToolChange}
                index={i}
              />
            ))}
          </div>

          {/* General tool selection error */}
          {errors.general && (
            <p className="text-sm text-red-400" role="alert" aria-live="polite">
              {errors.general}
            </p>
          )}

          {/* Submit error from API */}
          {auditError && (
            <p className="text-sm text-red-400" role="alert" aria-live="polite">
              {auditError}
            </p>
          )}

          {/* Footer: running total + submit */}
          <div className="flex flex-col gap-4 rounded-lg border border-white/8 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5" aria-live="polite" aria-atomic="true">
              <p className="text-xs font-medium uppercase tracking-widest text-[var(--flint-text-dim)]">
                Current monthly spend
              </p>
              <p
                className="font-mono text-2xl font-bold text-neutral-100"
                aria-label={`Current monthly spend: ${formatCurrency(monthlyTotal)}`}
              >
                {formatCurrency(monthlyTotal)}
                <span className="ml-2 font-mono text-sm font-normal text-[var(--flint-text-dim)]">
                  / mo
                </span>
              </p>
              {enabledCount > 0 && (
                <p className="text-xs text-[var(--flint-text-dim)]">
                  across {enabledCount} tool{enabledCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={auditState === 'submitting'}
              className={cn(
                'h-11 min-w-[180px] bg-[var(--flint-amber)] font-semibold text-black transition-all hover:bg-[#ca80ff] focus-visible:ring-[var(--flint-amber-glow)] disabled:opacity-60',
              )}
            >
              {auditState === 'submitting' ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Auditing…
                </span>
              ) : (
                'Run Audit →'
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
