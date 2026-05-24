'use client';

import React, { useId } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PRICING } from '@/lib/audit-engine/pricing';
import type { ToolId } from '@/lib/audit-engine/types';
import { cn } from '@/lib/utils';

// ─── Tool category labels & icons ────────────────────────────────────────────

const TOOL_CATEGORY_LABELS: Record<string, string> = {
  'coding-assistant': 'Coding',
  'general-llm': 'LLM',
  api: 'API',
};

// Small indicator dot colors per category
const CATEGORY_COLORS: Record<string, string> = {
  'coding-assistant': 'bg-sky-400',
  'general-llm': 'bg-emerald-400',
  api: 'bg-[#be64ff]',
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ToolRowValue {
  enabled: boolean;
  planId: string;
  monthlySpend: string; // kept as string in the form for controlled input
  seats: string;
}

export interface ToolRowErrors {
  planId?: string;
  monthlySpend?: string;
  seats?: string;
}

interface ToolRowProps {
  toolId: ToolId;
  value: ToolRowValue;
  errors?: ToolRowErrors;
  onChange: (toolId: ToolId, next: ToolRowValue) => void;
  /** Animation stagger index for the reveal animation */
  index?: number;
}

// ─── ToolRow ─────────────────────────────────────────────────────────────────

export function ToolRow({ toolId, value, errors, onChange, index = 0 }: ToolRowProps) {
  const pricing = PRICING[toolId];
  const isApiTool = pricing.category === 'api';
  const selectedPlan = pricing.plans.find(p => p.id === value.planId);
  const isApiPlan = selectedPlan?.id === 'api' || isApiTool;

  // Unique IDs for accessibility
  const uid = useId();
  const checkboxId = `${uid}-checkbox`;
  const planId = `${uid}-plan`;
  const spendId = `${uid}-spend`;
  const seatsId = `${uid}-seats`;
  const planErrId = `${uid}-plan-err`;
  const spendErrId = `${uid}-spend-err`;
  const seatsErrId = `${uid}-seats-err`;

  function set(patch: Partial<ToolRowValue>) {
    onChange(toolId, { ...value, ...patch });
  }

  return (
    <div
      className={cn(
        'group relative rounded-lg border transition-all duration-200',
        value.enabled
          ? 'border-[var(--flint-border-active)] bg-[var(--flint-surface-raised)]'
          : 'border-[var(--flint-border)] bg-transparent hover:border-white/[0.12]',
      )}
      style={{
        animationDelay: `${index * 40}ms`,
      }}
    >
      {/* Left amber accent bar — visible when enabled */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-0.5 rounded-l-lg transition-all duration-200',
          value.enabled ? 'bg-[var(--flint-amber)]' : 'bg-transparent',
        )}
        aria-hidden="true"
      />

      <div className="flex flex-col gap-0 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
        {/* ── Checkbox + tool name ───────────────────────────────────────── */}
        <div className="flex items-center gap-3 sm:w-48 sm:shrink-0">
          <Checkbox
            id={checkboxId}
            checked={value.enabled}
            onCheckedChange={checked => set({ enabled: !!checked })}
            className={cn(
              'border-white/20 data-[state=checked]:border-[var(--flint-amber)] data-[state=checked]:bg-[var(--flint-amber)] data-[state=checked]:text-black',
            )}
            aria-label={`Include ${pricing.displayName} in audit`}
          />
          <label
            htmlFor={checkboxId}
            className={cn(
              'flex cursor-pointer select-none flex-col gap-0.5',
              !value.enabled && 'opacity-60',
            )}
          >
            <span className="text-sm font-medium leading-tight text-neutral-100">
              {pricing.displayName}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-block h-1.5 w-1.5 rounded-full',
                  CATEGORY_COLORS[pricing.category],
                )}
                aria-hidden="true"
              />
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--flint-text-dim)]">
                {TOOL_CATEGORY_LABELS[pricing.category]}
              </span>
            </span>
          </label>
        </div>

        {/* ── Input fields — only shown when enabled ─────────────────────── */}
        <div
          className={cn(
            'grid gap-3 transition-all duration-200 sm:flex-1 sm:grid-cols-3',
            value.enabled
              ? 'mt-3 opacity-100 sm:mt-0'
              : 'pointer-events-none mt-0 max-h-0 overflow-hidden opacity-0 sm:max-h-none sm:overflow-visible sm:opacity-0',
          )}
          aria-hidden={!value.enabled}
        >
          {/* Plan selector */}
          <div className="flex flex-col gap-1">
            <Label
              htmlFor={planId}
              className="text-xs font-medium uppercase tracking-widest text-[var(--flint-text-dim)]"
            >
              Plan
            </Label>
            <Select
              value={value.planId}
              onValueChange={v => set({ planId: v })}
              disabled={!value.enabled}
            >
              <SelectTrigger
                id={planId}
                className={cn(
                  'h-9 w-full border-white/10 bg-white/5 text-sm text-neutral-100 focus-visible:border-[var(--flint-amber)] focus-visible:ring-[var(--flint-amber-glow)]',
                  errors?.planId && 'border-red-500/60',
                )}
                aria-describedby={errors?.planId ? planErrId : undefined}
                aria-invalid={!!errors?.planId}
              >
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-neutral-900 text-neutral-100">
                {pricing.plans
                  .filter(p => p.monthlyPricePerSeat > 0 || p.id === 'api') // hide free unless api
                  .map(plan => (
                    <SelectItem
                      key={plan.id}
                      value={plan.id}
                      className="text-sm focus:bg-white/10 focus:text-white"
                    >
                      <span>{plan.name}</span>
                      {plan.monthlyPricePerSeat > 0 && (
                        <span className="ml-1 font-mono text-[var(--flint-text-dim)]">
                          {plan.isFlat
                            ? `$${plan.monthlyPricePerSeat}/mo`
                            : `$${plan.monthlyPricePerSeat}/seat`}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                {/* Always show free/hobby plan at end */}
                {pricing.plans
                  .filter(p => p.monthlyPricePerSeat === 0 && p.id !== 'api')
                  .map(plan => (
                    <SelectItem
                      key={plan.id}
                      value={plan.id}
                      className="text-sm focus:bg-white/10 focus:text-white"
                    >
                      <span>{plan.name}</span>
                      <span className="ml-1 font-mono text-[var(--flint-text-dim)]">Free</span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors?.planId && (
              <p id={planErrId} className="text-xs text-red-400" role="alert">
                {errors.planId}
              </p>
            )}
          </div>

          {/* Monthly spend */}
          <div className="flex flex-col gap-1">
            <Label
              htmlFor={spendId}
              className="text-xs font-medium uppercase tracking-widest text-[var(--flint-text-dim)]"
            >
              {isApiPlan ? 'Monthly Bill' : 'Monthly Spend'}
            </Label>
            <div className="relative">
              <span
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-[var(--flint-text-dim)]"
                aria-hidden="true"
              >
                $
              </span>
              <Input
                id={spendId}
                type="number"
                min={0}
                step={1}
                placeholder="0"
                value={value.monthlySpend}
                onChange={e => set({ monthlySpend: e.target.value })}
                disabled={!value.enabled}
                className={cn(
                  'h-9 border-white/10 bg-white/5 pl-6 font-mono text-sm text-neutral-100 placeholder:text-white/20 focus-visible:border-[var(--flint-amber)] focus-visible:ring-[var(--flint-amber-glow)]',
                  errors?.monthlySpend && 'border-red-500/60',
                )}
                aria-describedby={
                  [errors?.monthlySpend ? spendErrId : '', isApiPlan ? `${uid}-api-note` : '']
                    .filter(Boolean)
                    .join(' ') || undefined
                }
                aria-invalid={!!errors?.monthlySpend}
                aria-label={`Monthly spend for ${pricing.displayName} in USD`}
              />
            </div>
            {isApiPlan && (
              <p id={`${uid}-api-note`} className="text-[11px] text-[var(--flint-text-dim)]">
                Usage-based — enter your avg monthly bill
              </p>
            )}
            {errors?.monthlySpend && (
              <p id={spendErrId} className="text-xs text-red-400" role="alert">
                {errors.monthlySpend}
              </p>
            )}
          </div>

          {/* Seats (hidden for pure API tools) */}
          {!isApiPlan ? (
            <div className="flex flex-col gap-1">
              <Label
                htmlFor={seatsId}
                className="text-xs font-medium uppercase tracking-widest text-[var(--flint-text-dim)]"
              >
                Seats
              </Label>
              <Input
                id={seatsId}
                type="number"
                min={1}
                step={1}
                placeholder="1"
                value={value.seats}
                onChange={e => set({ seats: e.target.value })}
                disabled={!value.enabled}
                className={cn(
                  'h-9 border-white/10 bg-white/5 font-mono text-sm text-neutral-100 placeholder:text-white/20 focus-visible:border-[var(--flint-amber)] focus-visible:ring-[var(--flint-amber-glow)]',
                  errors?.seats && 'border-red-500/60',
                )}
                aria-describedby={errors?.seats ? seatsErrId : undefined}
                aria-invalid={!!errors?.seats}
                aria-label={`Number of seats for ${pricing.displayName}`}
              />
              {errors?.seats && (
                <p id={seatsErrId} className="text-xs text-red-400" role="alert">
                  {errors.seats}
                </p>
              )}
            </div>
          ) : (
            /* Spacer to keep 3-col grid consistent */
            <div aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
}
