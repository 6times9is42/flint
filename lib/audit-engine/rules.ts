// Audit engine rules — deterministic, no AI.
// Each rule must be defensible to a finance-literate person who knows these tools.
// Rules are applied in priority order; the first matching rule wins.
//
// Plan ID aliases handled here (not in pricing.ts) because test inputs may use
// legacy or alternate plan IDs that map to canonical pricing IDs:
//   - ChatGPT 'team' → treated identically to 'business' (renamed Aug 2025)
//   - Cursor 'business' → treated identically to 'teams'

import type { ToolInput, AuditInput, ToolRecommendation } from './types';
import { PRICING } from './pricing';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize plan IDs to handle legacy/alias names used in test inputs. */
function normalizePlanId(toolId: string, planId: string): string {
  // ChatGPT "Team" was renamed to "Business" in August 2025
  if (toolId === 'chatgpt' && planId === 'team') return 'business';
  // Cursor "Business" is an alias for "Teams" (no such plan exists officially)
  if (toolId === 'cursor' && planId === 'business') return 'teams';
  return planId;
}

type BaseRec = Pick<ToolRecommendation, 'toolId' | 'currentSpend'>;

function buildBase(tool: ToolInput): BaseRec {
  return { toolId: tool.toolId, currentSpend: tool.monthlySpend };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Evaluate a single tool and return the best recommendation.
 * Called once per tool in runAudit().
 */
export function evaluateTool(tool: ToolInput, context: AuditInput): ToolRecommendation {
  const base = buildBase(tool);
  const planId = normalizePlanId(tool.toolId, tool.planId);

  // -------------------------------------------------------------------------
  // Rule D: API usage flags (planId === 'api' — usage-based tools)
  // -------------------------------------------------------------------------
  if (planId === 'api') {
    return evaluateApiTool(tool, context, base);
  }

  // -------------------------------------------------------------------------
  // Rule: Double-pay — Anthropic API + Claude Pro
  // If the user is paying both for the Anthropic API (>$50/mo) AND a Claude.ai
  // subscription, the subscription is redundant. All interactive use can be
  // served through the API with a lightweight UI like Open WebUI.
  // -------------------------------------------------------------------------
  if (tool.toolId === 'claude' && planId === 'pro') {
    const anthropicApiSpend = context.tools
      .filter(t => t.toolId === 'anthropic-api')
      .reduce((sum, t) => sum + t.monthlySpend, 0);

    if (anthropicApiSpend > 50) {
      return {
        ...base,
        recommendedAction: 'downgrade',
        recommendedPlanId: null,
        recommendedToolId: null,
        projectedMonthlySpend: 0,
        monthlySavings: tool.monthlySpend,
        reasoning:
          `You're already spending $${anthropicApiSpend}/month on the Anthropic API. ` +
          `The Claude.ai Pro subscription ($${tool.monthlySpend}/mo) is redundant — ` +
          `all interactive use can be routed through the API with a lightweight UI like Open WebUI.`,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Rule: Double-pay — OpenAI API + ChatGPT subscription
  // Same logic as above for the OpenAI ecosystem.
  // -------------------------------------------------------------------------
  if (tool.toolId === 'chatgpt' && (planId === 'plus' || planId === 'business')) {
    const openaiApiSpend = context.tools
      .filter(t => t.toolId === 'openai-api')
      .reduce((sum, t) => sum + t.monthlySpend, 0);

    if (openaiApiSpend > 50) {
      return {
        ...base,
        recommendedAction: 'downgrade',
        recommendedPlanId: null,
        recommendedToolId: null,
        projectedMonthlySpend: 0,
        monthlySavings: tool.monthlySpend,
        reasoning:
          `You're already paying $${openaiApiSpend}/month for the OpenAI API. ` +
          `The ChatGPT subscription ($${tool.monthlySpend}/mo) is redundant — ` +
          `route interactive use through the API with a lightweight UI.`,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Rule C: Cursor for non-coding use cases
  // Cursor is an IDE coding assistant. Writers and researchers pay for a tool
  // that doesn't serve their primary workflow. Claude Pro is better suited.
  // -------------------------------------------------------------------------
  if (
    tool.toolId === 'cursor' &&
    (context.useCase === 'writing' || context.useCase === 'research')
  ) {
    const claudeProCost = 20 * tool.seats;
    const savings = Math.max(0, tool.monthlySpend - claudeProCost);
    if (savings > 0) {
      return {
        ...base,
        recommendedAction: 'switch',
        recommendedPlanId: 'pro',
        recommendedToolId: 'claude',
        projectedMonthlySpend: claudeProCost,
        monthlySavings: savings,
        reasoning:
          `Cursor is an IDE coding assistant. For ${context.useCase} workflows, ` +
          `Claude Pro ($20/user/mo) is purpose-built and costs less for your team size.`,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Rule C: GitHub Copilot for mixed/research use cases → switch to Cursor
  // At similar per-seat cost, Cursor has stronger completions and agentic coding.
  // If not using GitHub-native features, Copilot's IDE advantage is moot.
  // -------------------------------------------------------------------------
  if (
    tool.toolId === 'github-copilot' &&
    (context.useCase === 'mixed' || context.useCase === 'research') &&
    tool.seats <= 10
  ) {
    const cursorCost = 20 * tool.seats; // Cursor Individual
    if (cursorCost < tool.monthlySpend) {
      return {
        ...base,
        recommendedAction: 'switch',
        recommendedPlanId: 'individual',
        recommendedToolId: 'cursor',
        projectedMonthlySpend: cursorCost,
        monthlySavings: tool.monthlySpend - cursorCost,
        reasoning:
          `At similar per-seat cost, Cursor Individual has stronger completions and agentic coding. ` +
          `If you're not relying on GitHub-native features, switching saves ` +
          `$${tool.monthlySpend - cursorCost}/mo.`,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Rule C: ChatGPT for coding use cases → switch to Cursor Hobby (free)
  // For coding-heavy workflows, an IDE-native assistant outperforms a chat UI.
  // Cursor Hobby is free and handles in-IDE assistance; the savings are the full
  // ChatGPT spend because the replacement is $0.
  // -------------------------------------------------------------------------
  if (tool.toolId === 'chatgpt' && context.useCase === 'coding') {
    // Cursor Hobby is free — the full ChatGPT spend is saved
    return {
      ...base,
      recommendedAction: 'switch',
      recommendedPlanId: 'hobby',
      recommendedToolId: 'cursor',
      projectedMonthlySpend: 0,
      monthlySavings: tool.monthlySpend,
      reasoning:
        `For coding workflows, Cursor Hobby (free) handles in-IDE completions better than ` +
        `ChatGPT's chat interface. If you also need a general AI assistant, ` +
        `Claude Pro ($20/mo) covers that — and you'd still come out ahead.`,
    };
  }

  // -------------------------------------------------------------------------
  // Rule C: Gemini (consumer) for coding → switch to GitHub Copilot Pro
  // Gemini Advanced is a consumer product. For coding, purpose-built IDE tools win.
  // -------------------------------------------------------------------------
  if (
    tool.toolId === 'gemini' &&
    (planId === 'ai-pro' || planId === 'ai-ultra' || planId === 'ai-plus' || planId === 'ai-premium') &&
    context.useCase === 'coding'
  ) {
    const copilotCost = 10 * tool.seats;
    const savings = Math.max(0, tool.monthlySpend - copilotCost);
    if (savings > 0) {
      return {
        ...base,
        recommendedAction: 'switch',
        recommendedPlanId: 'individual',
        recommendedToolId: 'github-copilot',
        projectedMonthlySpend: copilotCost,
        monthlySavings: savings,
        reasoning:
          `Gemini Advanced is a consumer product. For coding, GitHub Copilot Pro ($10/seat) ` +
          `is purpose-built for IDE integration and delivers better in-editor completions.`,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Rule A: GitHub Copilot Business → Individual for small teams (≤5 seats)
  // Business adds organization policy management, audit logs, and IP indemnity.
  // These features don't add value for solo devs or tiny teams without enterprise
  // SSO needs. Individual ($10/seat) is functionally identical for coding.
  // -------------------------------------------------------------------------
  if (tool.toolId === 'github-copilot' && planId === 'business' && tool.seats <= 5) {
    const projectedSpend = 10 * tool.seats;
    return {
      ...base,
      recommendedAction: 'downgrade',
      recommendedPlanId: 'individual',
      recommendedToolId: null,
      projectedMonthlySpend: projectedSpend,
      monthlySavings: tool.monthlySpend - projectedSpend,
      reasoning:
        `Copilot Business adds centralized billing, audit logs, and enterprise SSO — ` +
        `features that don't add value for teams of ${tool.seats}. ` +
        `Pro ($10/seat) is functionally identical for most developers.`,
    };
  }

  // -------------------------------------------------------------------------
  // Rule A: GitHub Copilot Enterprise → Business for teams up to 25 seats
  // Enterprise requires GitHub Enterprise Cloud and adds enterprise-grade controls.
  // For teams that don't need GH Enterprise Cloud, Business covers the same
  // core coding assistance at $19/seat vs $39/seat.
  // -------------------------------------------------------------------------
  if (
    tool.toolId === 'github-copilot' &&
    planId === 'enterprise' &&
    tool.seats <= 25
  ) {
    const projectedSpend = 19 * tool.seats;
    if (projectedSpend < tool.monthlySpend) {
      return {
        ...base,
        recommendedAction: 'downgrade',
        recommendedPlanId: 'business',
        recommendedToolId: null,
        projectedMonthlySpend: projectedSpend,
        monthlySavings: tool.monthlySpend - projectedSpend,
        reasoning:
          `Copilot Enterprise requires GitHub Enterprise Cloud and adds enterprise-grade compliance. ` +
          `For teams of ${tool.seats}, Business ($19/seat) covers the same core coding assistance ` +
          `and saves $${tool.monthlySpend - projectedSpend}/mo.`,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Rule B: Claude Max → Pro for single users with non-heavy use cases
  // Max provides 5× the usage limits of Pro at 5× the price. For writing and
  // research users who aren't exhausting Pro's limits, the downgrade to Pro
  // ($20/mo) saves $80/mo. If they hit limits, they can re-upgrade.
  // -------------------------------------------------------------------------
  if (
    tool.toolId === 'claude' &&
    planId === 'max' &&
    tool.seats === 1 &&
    (context.useCase === 'writing' || context.useCase === 'research')
  ) {
    return {
      ...base,
      recommendedAction: 'downgrade',
      recommendedPlanId: 'pro',
      recommendedToolId: null,
      projectedMonthlySpend: 20,
      monthlySavings: tool.monthlySpend - 20,
      reasoning:
        `Claude Max ($${tool.monthlySpend}/mo) provides 5× the usage limits of Pro ($20/mo). ` +
        `For ${context.useCase} with 1 user, Pro limits are sufficient for most people. ` +
        `Try Pro — you can upgrade back if you regularly hit the limit.`,
    };
  }

  // -------------------------------------------------------------------------
  // Rule A: Claude Team → individual Pro accounts for very small teams (≤2 seats)
  // Team plan minimum is 5 seats but billed at $25/seat. Individual Pro at $20/user
  // is cheaper for teams that don't need admin controls or centralized billing.
  // -------------------------------------------------------------------------
  if (tool.toolId === 'claude' && planId === 'team' && tool.seats <= 2) {
    const projectedSpend = 20 * tool.seats;
    if (projectedSpend < tool.monthlySpend) {
      return {
        ...base,
        recommendedAction: 'downgrade',
        recommendedPlanId: 'pro',
        recommendedToolId: null,
        projectedMonthlySpend: projectedSpend,
        monthlySavings: tool.monthlySpend - projectedSpend,
        reasoning:
          `Claude Team adds admin controls and centralized billing. ` +
          `With only ${tool.seats} user(s), individual Pro accounts ($20/user) ` +
          `are cheaper and equally capable.`,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Rule A: ChatGPT Business → Plus for small productivity teams (≤2 seats)
  // Business adds workspace features and "no training on data" — useful for
  // companies with data sensitivity. For personal productivity with ≤2 users,
  // separate Plus accounts ($20/user) are cheaper.
  // -------------------------------------------------------------------------
  if (
    tool.toolId === 'chatgpt' &&
    planId === 'business' &&
    tool.seats <= 2 &&
    (context.useCase === 'writing' || context.useCase === 'research' || context.useCase === 'mixed')
  ) {
    const projectedSpend = 20 * tool.seats;
    if (projectedSpend < tool.monthlySpend) {
      return {
        ...base,
        recommendedAction: 'downgrade',
        recommendedPlanId: 'plus',
        recommendedToolId: null,
        projectedMonthlySpend: projectedSpend,
        monthlySavings: tool.monthlySpend - projectedSpend,
        reasoning:
          `ChatGPT Business adds workspace controls and data privacy assurances. ` +
          `For ${tool.seats} user(s) on personal productivity, ` +
          `separate Plus accounts ($20/user) are cheaper and equally capable.`,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Rule A: Cursor Teams → Individual for small dev teams (≤10 seats)
  // Teams adds centralized billing and admin features. For small dev teams
  // that don't need org-level admin controls, Individual ($20/seat) covers
  // all core features at $20/seat less.
  // Handles alias: planId 'business' is normalized to 'teams' above.
  // -------------------------------------------------------------------------
  if (tool.toolId === 'cursor' && planId === 'teams' && tool.seats <= 10) {
    const projectedSpend = 20 * tool.seats;
    if (projectedSpend < tool.monthlySpend) {
      return {
        ...base,
        recommendedAction: 'downgrade',
        recommendedPlanId: 'individual',
        recommendedToolId: null,
        projectedMonthlySpend: projectedSpend,
        monthlySavings: tool.monthlySpend - projectedSpend,
        reasoning:
          `Cursor Teams adds centralized billing and admin features. ` +
          `For ${tool.seats} developer(s), Individual ($20/seat) covers ` +
          `all core coding features at lower cost.`,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Rule A: Windsurf Teams → Pro for small dev teams (≤5 seats)
  // Same logic as Cursor Teams.
  // -------------------------------------------------------------------------
  if (tool.toolId === 'windsurf' && planId === 'teams' && tool.seats <= 5) {
    const projectedSpend = 20 * tool.seats;
    if (projectedSpend < tool.monthlySpend) {
      return {
        ...base,
        recommendedAction: 'downgrade',
        recommendedPlanId: 'pro',
        recommendedToolId: null,
        projectedMonthlySpend: projectedSpend,
        monthlySavings: tool.monthlySpend - projectedSpend,
        reasoning:
          `Windsurf Teams adds centralized billing and admin features. ` +
          `For ${tool.seats} developer(s), individual Pro accounts ($20/seat) ` +
          `cover all core features at lower cost.`,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Rule E: Already optimal
  // If no rule above fired, the tool is well-matched. Do NOT manufacture a
  // recommendation. The "You're spending well" result is a feature, not a failure.
  // -------------------------------------------------------------------------
  return {
    ...base,
    recommendedAction: 'optimal',
    recommendedPlanId: null,
    recommendedToolId: null,
    projectedMonthlySpend: tool.monthlySpend,
    monthlySavings: 0,
    reasoning:
      `${PRICING[tool.toolId]?.displayName ?? tool.toolId} looks well-matched ` +
      `to your team size and use case. No changes recommended.`,
  };
}

// ---------------------------------------------------------------------------
// API tool evaluator (Rule D)
// ---------------------------------------------------------------------------

function evaluateApiTool(
  tool: ToolInput,
  _context: AuditInput,
  base: BaseRec
): ToolRecommendation {
  // Low API spend: a flat subscription is probably cheaper
  // Only recommend if the API spend is ABOVE $20, otherwise the flat plan costs more
  if (tool.toolId === 'anthropic-api' && tool.monthlySpend > 20 && tool.monthlySpend < 30) {
    return {
      ...base,
      recommendedAction: 'downgrade',
      recommendedPlanId: 'pro',
      recommendedToolId: 'claude',
      projectedMonthlySpend: 20,
      monthlySavings: tool.monthlySpend - 20,
      reasoning:
        `At $${tool.monthlySpend}/month in API spend, a Claude Pro subscription ($20/mo) ` +
        `likely covers your usage at lower cost. Pro includes generous interactive limits.`,
    };
  }

  if (tool.toolId === 'openai-api' && tool.monthlySpend > 20 && tool.monthlySpend < 30) {
    return {
      ...base,
      recommendedAction: 'downgrade',
      recommendedPlanId: 'plus',
      recommendedToolId: 'chatgpt',
      projectedMonthlySpend: 20,
      monthlySavings: tool.monthlySpend - 20,
      reasoning:
        `At $${tool.monthlySpend}/month in API spend, a ChatGPT Plus subscription ($20/mo) ` +
        `may cover your interactive use cases at lower cost.`,
    };
  }

  // High API spend: can't recommend a different plan, but flag optimization levers
  return {
    ...base,
    recommendedAction: 'review-usage',
    recommendedPlanId: null,
    recommendedToolId: null,
    projectedMonthlySpend: tool.monthlySpend,
    monthlySavings: 0,
    reasoning:
      `At $${tool.monthlySpend}/month in API spend, the main savings levers are ` +
      `request batching, prompt caching, and model tier selection (e.g. Haiku vs Sonnet). ` +
      `No plan change is available for usage-based pricing.`,
  };
}
