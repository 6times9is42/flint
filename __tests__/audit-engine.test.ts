import { describe, it, expect } from 'vitest';
import { runAudit } from '@/lib/audit-engine';
import type { AuditInput } from '@/lib/audit-engine/types';

describe('runAudit', () => {
  it('recommends downgrade from GitHub Copilot Business to Individual for small teams', () => {
    const input: AuditInput = {
      tools: [{ toolId: 'github-copilot', planId: 'business', monthlySpend: 38, seats: 2 }],
      teamSize: 2,
      useCase: 'coding',
    };
    const result = runAudit(input);
    const rec = result.recommendations[0];
    expect(rec.recommendedAction).toBe('downgrade');
    expect(rec.recommendedPlanId).toBe('individual');
    expect(rec.monthlySavings).toBe(18); // (19 - 10) * 2
  });

  it('returns optimal for Claude Pro single seat writing use case', () => {
    const input: AuditInput = {
      tools: [{ toolId: 'claude', planId: 'pro', monthlySpend: 20, seats: 1 }],
      teamSize: 1,
      useCase: 'writing',
    };
    const result = runAudit(input);
    const rec = result.recommendations[0];
    expect(rec.recommendedAction).toBe('optimal');
    expect(rec.monthlySavings).toBe(0);
  });

  it('recommends a coding-specific tool when ChatGPT Plus is used for coding', () => {
    const input: AuditInput = {
      tools: [{ toolId: 'chatgpt', planId: 'plus', monthlySpend: 20, seats: 1 }],
      teamSize: 1,
      useCase: 'coding',
    };
    const result = runAudit(input);
    const rec = result.recommendations[0];
    expect(rec.recommendedAction).toBe('switch');
    expect(rec.monthlySavings).toBeGreaterThan(0);
  });

  it('flags redundancy when paying for both Anthropic API and Claude Pro', () => {
    const input: AuditInput = {
      tools: [
        { toolId: 'anthropic-api', planId: 'api', monthlySpend: 80, seats: 1 },
        { toolId: 'claude', planId: 'pro', monthlySpend: 20, seats: 1 },
      ],
      teamSize: 1,
      useCase: 'mixed',
    };
    const result = runAudit(input);
    const claudeRec = result.recommendations.find(r => r.toolId === 'claude');
    expect(claudeRec?.recommendedAction).toBe('downgrade');
    expect(claudeRec?.monthlySavings).toBe(20);
  });

  it('sets isHighSavings when total monthly savings exceed $500', () => {
    const input: AuditInput = {
      tools: [
        { toolId: 'github-copilot', planId: 'enterprise', monthlySpend: 780, seats: 20 },
        { toolId: 'chatgpt', planId: 'team', monthlySpend: 300, seats: 10 },
        { toolId: 'cursor', planId: 'business', monthlySpend: 400, seats: 10 },
      ],
      teamSize: 20,
      useCase: 'coding',
    };
    const result = runAudit(input);
    expect(result.isHighSavings).toBe(true);
    expect(result.totalMonthlySavings).toBeGreaterThan(500);
  });

  it('totalMonthlySavings equals sum of all recommendation savings', () => {
    const input: AuditInput = {
      tools: [
        { toolId: 'github-copilot', planId: 'business', monthlySpend: 38, seats: 2 },
        { toolId: 'claude', planId: 'max', monthlySpend: 100, seats: 1 },
      ],
      teamSize: 2,
      useCase: 'writing',
    };
    const result = runAudit(input);
    const sumOfRecs = result.recommendations.reduce((sum, r) => sum + r.monthlySavings, 0);
    expect(result.totalMonthlySavings).toBe(sumOfRecs);
  });

  it('returns valid AuditResult with isOptimal true for empty tools array', () => {
    const input: AuditInput = {
      tools: [],
      teamSize: 1,
      useCase: 'mixed',
    };
    const result = runAudit(input);
    expect(result.isOptimal).toBe(true);
    expect(result.totalMonthlySavings).toBe(0);
    expect(result.recommendations).toHaveLength(0);
  });
});
