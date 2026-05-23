# Flint — AI Spend Audit Tool: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Flint — a full-stack Next.js web app where startup founders audit their AI tool spending, get a shareable results page, and optionally capture their email.

**Architecture:** A Next.js 14 App Router app with a deterministic audit engine (`lib/audit-engine/`) that evaluates tool plans and generates `ToolRecommendation` objects. The results are stored in Supabase and served at SSR pages. Anthropic API provides a non-blocking ~100-word summary paragraph; Resend handles transactional email.

**Tech Stack:** Next.js 14 (App Router), TypeScript strict, Tailwind CSS, shadcn/ui, Supabase (Postgres), Anthropic SDK, Resend, React Email, Vitest, GitHub Actions, Vercel

---

## File Map

```
app/
  layout.tsx                         — root layout, fonts, metadata
  page.tsx                           — landing page + SpendForm
  audit/[auditId]/page.tsx           — SSR results page + OG metadata
  api/
    audit/route.ts                   — POST: validate, run audit, store, return slug
    leads/route.ts                   — POST: store lead, trigger email
lib/
  audit-engine/
    types.ts                         — all domain types (ToolId, AuditResult, etc.)
    pricing.ts                       — canonical pricing data per tool
    rules.ts                         — evaluateTool() per-tool recommendation logic
    index.ts                         — runAudit() orchestrator
  db/
    supabase.ts                      — Supabase client (server + browser)
    schema.sql                       — SQL to create tables
  email/
    resend.ts                        — Resend client
    templates/AuditConfirmation.tsx  — React Email transactional template
  anthropic.ts                       — Anthropic client + generateSummary()
  utils.ts                           — formatCurrency, cn(), generateSlug()
hooks/
  useFormPersistence.ts              — localStorage sync for form state
  useAudit.ts                        — client-side audit submission state machine
components/
  form/
    SpendForm.tsx                    — multi-step form (context + tools + submit)
    ToolRow.tsx                      — per-tool row: toggle, plan, spend, seats
  results/
    AuditResults.tsx                 — full results layout
    HeroSavings.tsx                  — hero section: big savings number
    ToolBreakdown.tsx                — per-tool card
    AISummary.tsx                    — async AI paragraph with skeleton
    SavingsCTA.tsx                   — CTA shown when savings > $500/mo
    ShareButton.tsx                  — copy URL button
  LeadCaptureModal.tsx               — email gate modal
__tests__/
  audit-engine.test.ts               — ≥5 tests covering audit logic
  utils.test.ts                      — formatCurrency tests
.github/
  workflows/ci.yml                   — lint + typecheck + tests on push
.env.example                         — all required env vars with placeholders
ARCHITECTURE.md
PRICING_DATA.md
PROMPTS.md
TESTS.md
```

---

## Task 1: Bootstrap Next.js Project

**Files:**
- Create: project root (via create-next-app)
- Create: `.env.example`
- Create: `.env.local` (gitignored, fill with placeholder values for now)

- [ ] **Step 1: Scaffold Next.js**

```bash
cd /Users/yashvardhan21/Documents/Projects/flint
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*" --no-git
```

When prompted: accept all defaults.

- [ ] **Step 2: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted: choose New York style, zinc base color, yes to CSS variables.

- [ ] **Step 3: Add required shadcn components**

```bash
npx shadcn@latest add button input label select checkbox badge card dialog skeleton toast
```

- [ ] **Step 4: Install additional dependencies**

```bash
npm install @anthropic-ai/sdk @supabase/supabase-js resend nanoid zod
npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @types/node
npm install @react-email/components react-email
```

- [ ] **Step 5: Add vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

Create `vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 6: Add test script to package.json**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Create .env.example**

```
# Anthropic
ANTHROPIC_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=audit@tryflint.app

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

- [ ] **Step 8: Create .env.local (gitignored)**

Copy `.env.example` to `.env.local`. Leave values empty for now — fill them in when setting up each service.

- [ ] **Step 9: Add .env.local to .gitignore**

Verify `.gitignore` already contains `.env.local` (create-next-app adds it). If not, add it.

- [ ] **Step 10: Create folder structure**

```bash
mkdir -p lib/audit-engine lib/db lib/email/templates hooks components/form components/results components/ui __tests__ .github/workflows docs/superpowers/specs docs/superpowers/plans
```

- [ ] **Step 11: Verify dev server starts**

```bash
npm run dev
```

Expected: Next.js dev server running at http://localhost:3000. Open it and confirm the default page loads.

- [ ] **Step 12: Initialize git**

```bash
git init
git add .
git commit -m "chore: initial project scaffold"
```

---

## Task 2: Define Domain Types

**Files:**
- Create: `lib/audit-engine/types.ts`
- Create: `types/index.ts`

- [ ] **Step 1: Create lib/audit-engine/types.ts**

```typescript
export type ToolId =
  | 'cursor'
  | 'github-copilot'
  | 'claude'
  | 'chatgpt'
  | 'anthropic-api'
  | 'openai-api'
  | 'gemini'
  | 'windsurf';

export type UseCase = 'coding' | 'writing' | 'data' | 'research' | 'mixed';

export interface ToolInput {
  toolId: ToolId;
  planId: string;
  monthlySpend: number;
  seats: number;
}

export interface AuditInput {
  tools: ToolInput[];
  teamSize: number;
  useCase: UseCase;
}

export type RecommendationAction =
  | 'downgrade'
  | 'upgrade'
  | 'switch'
  | 'use-credits'
  | 'optimal'
  | 'review-usage';

export interface ToolRecommendation {
  toolId: ToolId;
  currentSpend: number;
  recommendedAction: RecommendationAction;
  recommendedPlanId: string | null;
  recommendedToolId: ToolId | null;
  projectedMonthlySpend: number;
  monthlySavings: number;
  reasoning: string;
}

export interface AuditResult {
  input: AuditInput;
  recommendations: ToolRecommendation[];
  totalCurrentSpend: number;
  totalProjectedSpend: number;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  isOptimal: boolean;
  isHighSavings: boolean;
  aiSummary: string | null;
  createdAt: string;
}

export interface StoredAudit {
  id: string;
  audit_result: AuditResult;
  public_slug: string;
  email: string | null;
  company_name: string | null;
  role: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Create types/index.ts**

```typescript
export * from '@/lib/audit-engine/types';
```

- [ ] **Step 3: Commit**

```bash
git add lib/audit-engine/types.ts types/index.ts
git commit -m "feat: define domain types for audit engine"
```

---

## Task 3: Write Failing Audit Engine Tests (TDD)

**Files:**
- Create: `__tests__/audit-engine.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/audit-engine.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run __tests__/audit-engine.test.ts
```

Expected: all tests FAIL with "Cannot find module '@/lib/audit-engine'" or similar.

- [ ] **Step 3: Commit the failing tests**

```bash
git add __tests__/audit-engine.test.ts
git commit -m "test: write failing audit engine tests (TDD)"
```

---

## Task 4: Fetch and Record Pricing Data

**Files:**
- Create: `PRICING_DATA.md`

- [ ] **Step 1: Fetch current pricing from official vendor pages**

Fetch the following URLs and record the current plans and prices. Use `WebFetch` or a browser:
- https://cursor.com/pricing
- https://github.com/features/copilot
- https://claude.ai/pricing
- https://anthropic.com/pricing
- https://openai.com/chatgpt/pricing
- https://openai.com/api/pricing
- https://one.google.com/about/plans
- https://windsurf.com/pricing

- [ ] **Step 2: Create PRICING_DATA.md with verified data**

Format:

```markdown
# Pricing Data

All prices verified from official vendor pages. Last verified: 2026-05-23.

## Cursor
- Hobby: $0/month/user — https://cursor.com/pricing — verified 2026-05-23
- Pro: $20/month/user — https://cursor.com/pricing — verified 2026-05-23
- Business: $40/month/user — https://cursor.com/pricing — verified 2026-05-23

## GitHub Copilot
- Individual: $10/month/user — https://github.com/features/copilot — verified 2026-05-23
- Business: $19/month/user — https://github.com/features/copilot — verified 2026-05-23
- Enterprise: $39/month/user — https://github.com/features/copilot — verified 2026-05-23

## Claude (claude.ai)
- Free: $0/month — https://claude.ai/pricing — verified 2026-05-23
- Pro: $20/month (flat, 1 user) — https://claude.ai/pricing — verified 2026-05-23
- Max: $100/month (flat, 1 user, 5x usage) — https://claude.ai/pricing — verified 2026-05-23
- Team: $30/month/user (min 2 seats) — https://claude.ai/pricing — verified 2026-05-23
- Enterprise: custom pricing

## Anthropic API
- Usage-based (per token) — https://anthropic.com/pricing — verified 2026-05-23
- Input: varies by model. Treat as flat monthly bill (ask user).

## ChatGPT (openai.com)
- Free: $0/month — https://openai.com/chatgpt/pricing — verified 2026-05-23
- Plus: $20/month (flat) — https://openai.com/chatgpt/pricing — verified 2026-05-23
- Team: $30/month/user (min 2 seats) — https://openai.com/chatgpt/pricing — verified 2026-05-23
- Enterprise: custom pricing

## OpenAI API
- Usage-based (per token) — https://openai.com/api/pricing — verified 2026-05-23
- Treat as flat monthly bill (ask user).

## Gemini (Google)
- Free: $0/month — https://one.google.com/about/plans — verified 2026-05-23
- AI Premium (Gemini Advanced): $19.99/month (flat) via Google One — verified 2026-05-23
- API: usage-based — https://ai.google.dev/pricing — verified 2026-05-23

## Windsurf
- Free: $0/month — https://windsurf.com/pricing — verified 2026-05-23
- Pro: $15/month/user — https://windsurf.com/pricing — verified 2026-05-23
- Team: $35/month/user — https://windsurf.com/pricing — verified 2026-05-23
```

**IMPORTANT:** Fill in the actual current prices from the fetched pages. The values above are placeholders — verify each one.

- [ ] **Step 3: Commit**

```bash
git add PRICING_DATA.md
git commit -m "docs: verified pricing data from vendor pages"
```

---

## Task 5: Implement Pricing Data

**Files:**
- Create: `lib/audit-engine/pricing.ts`

- [ ] **Step 1: Create lib/audit-engine/pricing.ts**

Use the values verified in PRICING_DATA.md:

```typescript
import type { ToolId, UseCase } from './types';

export interface Plan {
  id: string;
  name: string;
  monthlyPricePerSeat: number;
  isFlat: boolean;
  minSeats?: number;
  maxSeats?: number;
  notes?: string;
}

export interface ToolPricing {
  toolId: ToolId;
  displayName: string;
  category: 'coding-assistant' | 'general-llm' | 'api';
  primaryUseCases: UseCase[];
  plans: Plan[];
  officialPricingUrl: string;
}

export const PRICING: Record<ToolId, ToolPricing> = {
  cursor: {
    toolId: 'cursor',
    displayName: 'Cursor',
    category: 'coding-assistant',
    primaryUseCases: ['coding'],
    officialPricingUrl: 'https://cursor.com/pricing',
    plans: [
      { id: 'hobby', name: 'Hobby', monthlyPricePerSeat: 0, isFlat: false },
      { id: 'pro', name: 'Pro', monthlyPricePerSeat: 20, isFlat: false },
      { id: 'business', name: 'Business', monthlyPricePerSeat: 40, isFlat: false },
    ],
  },
  'github-copilot': {
    toolId: 'github-copilot',
    displayName: 'GitHub Copilot',
    category: 'coding-assistant',
    primaryUseCases: ['coding'],
    officialPricingUrl: 'https://github.com/features/copilot',
    plans: [
      { id: 'individual', name: 'Individual', monthlyPricePerSeat: 10, isFlat: false },
      { id: 'business', name: 'Business', monthlyPricePerSeat: 19, isFlat: false },
      { id: 'enterprise', name: 'Enterprise', monthlyPricePerSeat: 39, isFlat: false },
    ],
  },
  claude: {
    toolId: 'claude',
    displayName: 'Claude (claude.ai)',
    category: 'general-llm',
    primaryUseCases: ['writing', 'research', 'mixed', 'coding'],
    officialPricingUrl: 'https://claude.ai/pricing',
    plans: [
      { id: 'free', name: 'Free', monthlyPricePerSeat: 0, isFlat: true },
      { id: 'pro', name: 'Pro', monthlyPricePerSeat: 20, isFlat: true, notes: 'Per user, flat rate' },
      { id: 'max', name: 'Max', monthlyPricePerSeat: 100, isFlat: true, notes: '5x Pro usage limits' },
      { id: 'team', name: 'Team', monthlyPricePerSeat: 30, isFlat: false, minSeats: 2 },
      { id: 'enterprise', name: 'Enterprise', monthlyPricePerSeat: 0, isFlat: false, notes: 'Custom pricing' },
    ],
  },
  'anthropic-api': {
    toolId: 'anthropic-api',
    displayName: 'Anthropic API',
    category: 'api',
    primaryUseCases: ['coding', 'writing', 'data', 'research', 'mixed'],
    officialPricingUrl: 'https://anthropic.com/pricing',
    plans: [
      { id: 'api', name: 'API (usage-based)', monthlyPricePerSeat: 0, isFlat: true, notes: 'Enter average monthly bill' },
    ],
  },
  chatgpt: {
    toolId: 'chatgpt',
    displayName: 'ChatGPT',
    category: 'general-llm',
    primaryUseCases: ['writing', 'research', 'mixed'],
    officialPricingUrl: 'https://openai.com/chatgpt/pricing',
    plans: [
      { id: 'free', name: 'Free', monthlyPricePerSeat: 0, isFlat: true },
      { id: 'plus', name: 'Plus', monthlyPricePerSeat: 20, isFlat: true },
      { id: 'team', name: 'Team', monthlyPricePerSeat: 30, isFlat: false, minSeats: 2 },
      { id: 'enterprise', name: 'Enterprise', monthlyPricePerSeat: 0, isFlat: false, notes: 'Custom pricing' },
    ],
  },
  'openai-api': {
    toolId: 'openai-api',
    displayName: 'OpenAI API',
    category: 'api',
    primaryUseCases: ['coding', 'writing', 'data', 'research', 'mixed'],
    officialPricingUrl: 'https://openai.com/api/pricing',
    plans: [
      { id: 'api', name: 'API (usage-based)', monthlyPricePerSeat: 0, isFlat: true, notes: 'Enter average monthly bill' },
    ],
  },
  gemini: {
    toolId: 'gemini',
    displayName: 'Gemini',
    category: 'general-llm',
    primaryUseCases: ['writing', 'research', 'mixed'],
    officialPricingUrl: 'https://one.google.com/about/plans',
    plans: [
      { id: 'free', name: 'Free', monthlyPricePerSeat: 0, isFlat: true },
      { id: 'ai-premium', name: 'AI Premium (Gemini Advanced)', monthlyPricePerSeat: 19.99, isFlat: true },
      { id: 'api', name: 'API (usage-based)', monthlyPricePerSeat: 0, isFlat: true, notes: 'Enter average monthly bill' },
    ],
  },
  windsurf: {
    toolId: 'windsurf',
    displayName: 'Windsurf',
    category: 'coding-assistant',
    primaryUseCases: ['coding'],
    officialPricingUrl: 'https://windsurf.com/pricing',
    plans: [
      { id: 'free', name: 'Free', monthlyPricePerSeat: 0, isFlat: false },
      { id: 'pro', name: 'Pro', monthlyPricePerSeat: 15, isFlat: false },
      { id: 'team', name: 'Team', monthlyPricePerSeat: 35, isFlat: false },
    ],
  },
};

export function getPlan(toolId: ToolId, planId: string): Plan | undefined {
  return PRICING[toolId]?.plans.find(p => p.id === planId);
}
```

**Update prices to match what you verified in PRICING_DATA.md before committing.**

- [ ] **Step 2: Commit**

```bash
git add lib/audit-engine/pricing.ts
git commit -m "feat: pricing data for all supported tools"
```

---

## Task 6: Implement Audit Engine Rules

**Files:**
- Create: `lib/audit-engine/rules.ts`

- [ ] **Step 1: Create lib/audit-engine/rules.ts**

```typescript
import type { ToolInput, AuditInput, ToolRecommendation } from './types';
import { PRICING, getPlan } from './pricing';

export function evaluateTool(tool: ToolInput, context: AuditInput): ToolRecommendation {
  const base: Omit<ToolRecommendation, 'recommendedAction' | 'recommendedPlanId' | 'recommendedToolId' | 'projectedMonthlySpend' | 'monthlySavings' | 'reasoning'> = {
    toolId: tool.toolId,
    currentSpend: tool.monthlySpend,
  };

  // Rule D: API usage flags
  if (tool.planId === 'api') {
    return evaluateApiTool(tool, context, base);
  }

  // Rule: Double-pay detection — Anthropic API + Claude Pro
  if (tool.toolId === 'claude' && tool.planId === 'pro') {
    const hasAnthropicApi = context.tools.some(
      t => t.toolId === 'anthropic-api' && t.monthlySpend > 50
    );
    if (hasAnthropicApi) {
      return {
        ...base,
        recommendedAction: 'downgrade',
        recommendedPlanId: null,
        recommendedToolId: null,
        projectedMonthlySpend: 0,
        monthlySavings: tool.monthlySpend,
        reasoning: `You're already spending over $50/month on the Anthropic API. The Claude.ai Pro subscription ($${tool.monthlySpend}/mo) is redundant — all Claude.ai use cases can be handled through the API with a lightweight interface like Open WebUI or TypingMind.`,
      };
    }
  }

  // Rule: Double-pay detection — OpenAI API + ChatGPT Plus
  if (tool.toolId === 'chatgpt' && (tool.planId === 'plus' || tool.planId === 'team')) {
    const hasOpenAiApi = context.tools.some(
      t => t.toolId === 'openai-api' && t.monthlySpend > 50
    );
    if (hasOpenAiApi) {
      return {
        ...base,
        recommendedAction: 'downgrade',
        recommendedPlanId: null,
        recommendedToolId: null,
        projectedMonthlySpend: 0,
        monthlySavings: tool.monthlySpend,
        reasoning: `You're already spending over $50/month on the OpenAI API. The ChatGPT subscription ($${tool.monthlySpend}/mo) is redundant — route all usage through the API with a lightweight UI.`,
      };
    }
  }

  // Rule C: Cursor Pro/Business for non-coding use case
  if (tool.toolId === 'cursor' && (context.useCase === 'writing' || context.useCase === 'research')) {
    const claudeProCost = 20;
    return {
      ...base,
      recommendedAction: 'switch',
      recommendedPlanId: 'pro',
      recommendedToolId: 'claude',
      projectedMonthlySpend: claudeProCost * tool.seats,
      monthlySavings: Math.max(0, tool.monthlySpend - claudeProCost * tool.seats),
      reasoning: `Cursor is a coding IDE assistant — for ${context.useCase} workflows, Claude Pro ($20/mo) is a better fit and likely cheaper. You'd get a purpose-built interface for your primary use case.`,
    };
  }

  // Rule C: GitHub Copilot for mixed/research — switch to Cursor
  if (tool.toolId === 'github-copilot' && (context.useCase === 'mixed' || context.useCase === 'research')) {
    const cursorProCost = 20;
    if (tool.seats <= 10) {
      const projectedSpend = cursorProCost * tool.seats;
      if (projectedSpend < tool.monthlySpend) {
        return {
          ...base,
          recommendedAction: 'switch',
          recommendedPlanId: 'pro',
          recommendedToolId: 'cursor',
          projectedMonthlySpend: projectedSpend,
          monthlySavings: tool.monthlySpend - projectedSpend,
          reasoning: `At similar per-seat cost, Cursor Pro has stronger completions and agentic coding features. If you're not relying on GitHub-native Copilot features, switching gives you more for your money.`,
        };
      }
    }
  }

  // Rule C: ChatGPT Plus for coding use case
  if (tool.toolId === 'chatgpt' && context.useCase === 'coding') {
    // Cursor Hobby is free; Claude Pro = $20/mo
    const projectedSpend = 20 * tool.seats;
    return {
      ...base,
      recommendedAction: 'switch',
      recommendedPlanId: 'pro',
      recommendedToolId: 'claude',
      projectedMonthlySpend: projectedSpend,
      monthlySavings: Math.max(0, tool.monthlySpend - projectedSpend),
      reasoning: `For coding workflows, an IDE-native assistant (Cursor, free tier) paired with Claude Pro ($20/mo) for non-coding AI needs outperforms ChatGPT's chat interface. Cursor Hobby is free.`,
    };
  }

  // Rule C: Gemini Advanced for coding
  if (tool.toolId === 'gemini' && tool.planId === 'ai-premium' && context.useCase === 'coding') {
    const copilotCost = 10 * tool.seats;
    return {
      ...base,
      recommendedAction: 'switch',
      recommendedPlanId: 'individual',
      recommendedToolId: 'github-copilot',
      projectedMonthlySpend: copilotCost,
      monthlySavings: Math.max(0, tool.monthlySpend - copilotCost),
      reasoning: `Gemini Advanced is a consumer product. For coding use cases, GitHub Copilot Individual ($10/seat) is purpose-built for IDE integration and delivers better in-editor completions.`,
    };
  }

  // Rule A: GitHub Copilot Business → Individual for small teams
  if (tool.toolId === 'github-copilot' && tool.planId === 'business' && tool.seats <= 5) {
    const projectedSpend = 10 * tool.seats;
    return {
      ...base,
      recommendedAction: 'downgrade',
      recommendedPlanId: 'individual',
      recommendedToolId: null,
      projectedMonthlySpend: projectedSpend,
      monthlySavings: tool.monthlySpend - projectedSpend,
      reasoning: `GitHub Copilot Business adds centralized billing, audit logs, and enterprise SSO — features that don't add value for teams of ${tool.seats}. Individual ($10/seat) is functionally identical for most developers.`,
    };
  }

  // Rule A: GitHub Copilot Enterprise → Business for non-enterprise teams
  if (tool.toolId === 'github-copilot' && tool.planId === 'enterprise' && tool.seats < 20) {
    const projectedSpend = 19 * tool.seats;
    return {
      ...base,
      recommendedAction: 'downgrade',
      recommendedPlanId: 'business',
      recommendedToolId: null,
      projectedMonthlySpend: projectedSpend,
      monthlySavings: tool.monthlySpend - projectedSpend,
      reasoning: `Copilot Enterprise adds GitHub.com integration and enterprise-grade controls. For teams under 20, Business ($19/seat) covers the same core coding assistance needs.`,
    };
  }

  // Rule B: Claude Max → Pro for low-intensity single user
  if (tool.toolId === 'claude' && tool.planId === 'max' && tool.seats === 1 &&
    (context.useCase === 'writing' || context.useCase === 'research')) {
    return {
      ...base,
      recommendedAction: 'downgrade',
      recommendedPlanId: 'pro',
      recommendedToolId: null,
      projectedMonthlySpend: 20,
      monthlySavings: 80,
      reasoning: `Claude Max ($100/mo) provides 5x the usage limits of Pro ($20/mo). For ${context.useCase} workflows with 1 user, Pro limits are sufficient for most people. Try Pro for a month — you can upgrade if you hit limits.`,
    };
  }

  // Rule A: Claude Team → Pro per user for very small teams
  if (tool.toolId === 'claude' && tool.planId === 'team' && tool.seats <= 2) {
    const projectedSpend = 20 * tool.seats;
    if (projectedSpend < tool.monthlySpend) {
      return {
        ...base,
        recommendedAction: 'downgrade',
        recommendedPlanId: 'pro',
        recommendedToolId: null,
        projectedMonthlySpend: projectedSpend,
        monthlySavings: tool.monthlySpend - projectedSpend,
        reasoning: `Claude Team adds admin controls and centralized billing. With only ${tool.seats} user(s), individual Pro accounts ($20/user) are cheaper and offer equivalent capability for your team size.`,
      };
    }
  }

  // Rule A: ChatGPT Team → Plus for small personal-productivity teams
  if (tool.toolId === 'chatgpt' && tool.planId === 'team' && tool.seats <= 2 &&
    (context.useCase === 'writing' || context.useCase === 'research' || context.useCase === 'mixed')) {
    const projectedSpend = 20 * tool.seats;
    if (projectedSpend < tool.monthlySpend) {
      return {
        ...base,
        recommendedAction: 'downgrade',
        recommendedPlanId: 'plus',
        recommendedToolId: null,
        projectedMonthlySpend: projectedSpend,
        monthlySavings: tool.monthlySpend - projectedSpend,
        reasoning: `ChatGPT Team adds workspace features and admin controls. For ${tool.seats} user(s) focused on individual productivity, separate Plus accounts ($20/user) are cheaper and equally capable.`,
      };
    }
  }

  // Rule A: Cursor Business → Pro for small teams
  if (tool.toolId === 'cursor' && tool.planId === 'business' && tool.seats <= 3) {
    const projectedSpend = 20 * tool.seats;
    if (projectedSpend < tool.monthlySpend) {
      return {
        ...base,
        recommendedAction: 'downgrade',
        recommendedPlanId: 'pro',
        recommendedToolId: null,
        projectedMonthlySpend: projectedSpend,
        monthlySavings: tool.monthlySpend - projectedSpend,
        reasoning: `Cursor Business adds centralized billing and audit logs. For ${tool.seats} developer(s), Pro ($20/seat) covers all core features — the Business tier's admin controls aren't worth the premium at this team size.`,
      };
    }
  }

  // Rule E: Already optimal
  return {
    ...base,
    recommendedAction: 'optimal',
    recommendedPlanId: null,
    recommendedToolId: null,
    projectedMonthlySpend: tool.monthlySpend,
    monthlySavings: 0,
    reasoning: `${PRICING[tool.toolId]?.displayName ?? tool.toolId} looks well-matched to your team size and use case. No changes recommended.`,
  };
}

function evaluateApiTool(
  tool: ToolInput,
  context: AuditInput,
  base: Pick<ToolRecommendation, 'toolId' | 'currentSpend'>
): ToolRecommendation {
  // If API spend is under $30 and use case is interactive, suggest flat subscription
  if (tool.monthlySpend < 30 && tool.toolId === 'anthropic-api') {
    return {
      ...base,
      recommendedAction: 'downgrade',
      recommendedPlanId: 'pro',
      recommendedToolId: 'claude',
      projectedMonthlySpend: 20,
      monthlySavings: tool.monthlySpend - 20,
      reasoning: `At $${tool.monthlySpend}/month in API spend, a Claude Pro subscription ($20/mo) likely covers your usage and costs less. Pro includes generous interactive limits without the overhead of managing API keys.`,
    };
  }

  if (tool.monthlySpend < 30 && tool.toolId === 'openai-api') {
    return {
      ...base,
      recommendedAction: 'downgrade',
      recommendedPlanId: 'plus',
      recommendedToolId: 'chatgpt',
      projectedMonthlySpend: 20,
      monthlySavings: tool.monthlySpend - 20,
      reasoning: `At $${tool.monthlySpend}/month in API spend, a ChatGPT Plus subscription ($20/mo) may cover your interactive use cases and costs less than usage-based billing.`,
    };
  }

  // High API spend — no downgrade, just note
  return {
    ...base,
    recommendedAction: 'review-usage',
    recommendedPlanId: null,
    recommendedToolId: null,
    projectedMonthlySpend: tool.monthlySpend,
    monthlySavings: 0,
    reasoning: `At $${tool.monthlySpend}/month in API spend, the main savings levers are request batching, prompt caching, and model tier selection. No plan change available for usage-based pricing.`,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/audit-engine/rules.ts
git commit -m "feat: audit engine rule evaluators"
```

---

## Task 7: Implement Audit Engine Index — Make Tests Pass

**Files:**
- Create: `lib/audit-engine/index.ts`

- [ ] **Step 1: Create lib/audit-engine/index.ts**

```typescript
import type { AuditInput, AuditResult } from './types';
import { evaluateTool } from './rules';

export function runAudit(input: AuditInput): AuditResult {
  const recommendations = input.tools.map(tool => evaluateTool(tool, input));

  const totalCurrentSpend = recommendations.reduce((sum, r) => sum + r.currentSpend, 0);
  const totalProjectedSpend = recommendations.reduce((sum, r) => sum + r.projectedMonthlySpend, 0);
  const totalMonthlySavings = recommendations.reduce((sum, r) => sum + r.monthlySavings, 0);
  const totalAnnualSavings = totalMonthlySavings * 12;

  return {
    input,
    recommendations,
    totalCurrentSpend,
    totalProjectedSpend,
    totalMonthlySavings,
    totalAnnualSavings,
    isOptimal: totalMonthlySavings < 10,
    isHighSavings: totalMonthlySavings > 500,
    aiSummary: null,
    createdAt: new Date().toISOString(),
  };
}
```

- [ ] **Step 2: Run the tests**

```bash
npx vitest run __tests__/audit-engine.test.ts
```

Expected: all 7 tests PASS. If any fail, debug the rules in `rules.ts` until they all pass.

- [ ] **Step 3: Create __tests__/utils.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { formatCurrency } from '@/lib/utils';

describe('formatCurrency', () => {
  it('formats whole dollars', () => {
    expect(formatCurrency(500)).toBe('$500');
  });

  it('formats cents', () => {
    expect(formatCurrency(19.99)).toBe('$19.99');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });
});
```

- [ ] **Step 4: Create lib/utils.ts**

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { customAlphabet } from 'nanoid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  if (amount % 1 === 0) {
    return `$${amount.toLocaleString()}`;
  }
  return `$${amount.toFixed(2)}`;
}

export function formatAnnual(monthly: number): string {
  return formatCurrency(monthly * 12);
}

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);
export function generateSlug(): string {
  return nanoid();
}
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/audit-engine/index.ts lib/utils.ts __tests__/utils.test.ts
git commit -m "feat: audit engine index + utils — all tests passing"
```

---

## Task 8: Supabase Setup

**Files:**
- Create: `lib/db/schema.sql`
- Create: `lib/db/supabase.ts`

- [ ] **Step 1: Create a Supabase project**

Go to https://supabase.com, create a new project. Copy the project URL, anon key, and service role key into `.env.local`.

- [ ] **Step 2: Create lib/db/schema.sql**

```sql
-- Stored audits (public results)
CREATE TABLE audits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_slug   TEXT UNIQUE NOT NULL,
  audit_result  JSONB NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Leads (private — never exposed in public URLs)
CREATE TABLE leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id              UUID REFERENCES audits(id),
  email                 TEXT NOT NULL,
  company_name          TEXT,
  role                  TEXT,
  team_size             INT,
  total_monthly_savings NUMERIC,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting
CREATE TABLE rate_limits (
  ip_hash      TEXT PRIMARY KEY,
  audit_count  INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audits_slug ON audits(public_slug);
CREATE INDEX idx_leads_audit ON leads(audit_id);
CREATE INDEX idx_leads_savings ON leads(total_monthly_savings DESC);

-- RLS
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audits_public_read" ON audits FOR SELECT USING (true);
CREATE POLICY "audits_service_write" ON audits FOR INSERT WITH CHECK (false);
CREATE POLICY "leads_service_only" ON leads FOR ALL USING (false);
```

- [ ] **Step 3: Run the SQL in the Supabase SQL editor**

Paste the entire schema.sql content into the Supabase project's SQL editor and run it.

- [ ] **Step 4: Create lib/db/supabase.ts**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Browser client — anon key, read-only access to audits
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);

// Server client — service role, bypasses RLS for writes
export function supabaseServer() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/db/schema.sql lib/db/supabase.ts
git commit -m "feat: supabase schema and client"
```

---

## Task 9: Implement POST /api/audit

**Files:**
- Create: `app/api/audit/route.ts`

- [ ] **Step 1: Create app/api/audit/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runAudit } from '@/lib/audit-engine';
import { generateSummary } from '@/lib/anthropic';
import { supabaseServer } from '@/lib/db/supabase';
import { generateSlug } from '@/lib/utils';
import type { AuditInput } from '@/lib/audit-engine/types';

const ToolInputSchema = z.object({
  toolId: z.enum(['cursor', 'github-copilot', 'claude', 'chatgpt', 'anthropic-api', 'openai-api', 'gemini', 'windsurf']),
  planId: z.string().min(1),
  monthlySpend: z.number().min(0),
  seats: z.number().int().min(1),
});

const AuditInputSchema = z.object({
  tools: z.array(ToolInputSchema),
  teamSize: z.number().int().min(1),
  useCase: z.enum(['coding', 'writing', 'data', 'research', 'mixed']),
  website: z.string().optional(), // honeypot
});

async function checkRateLimit(ipHash: string): Promise<boolean> {
  const db = supabaseServer();
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data } = await db
    .from('rate_limits')
    .select('audit_count, window_start')
    .eq('ip_hash', ipHash)
    .single();

  if (!data) {
    await db.from('rate_limits').insert({ ip_hash: ipHash });
    return true;
  }

  if (data.window_start < windowStart) {
    await db.from('rate_limits').update({ audit_count: 1, window_start: new Date().toISOString() }).eq('ip_hash', ipHash);
    return true;
  }

  if (data.audit_count >= 10) return false;

  await db.from('rate_limits').update({ audit_count: data.audit_count + 1 }).eq('ip_hash', ipHash);
  return true;
}

function hashIp(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ((hash << 5) - hash) + ip.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';
  const ipHash = hashIp(ip);

  const body = await req.json();

  // Honeypot
  if (body.website) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const parsed = AuditInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const allowed = await checkRateLimit(ipHash);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again in an hour.' }, { status: 429 });
  }

  const input: AuditInput = {
    tools: parsed.data.tools,
    teamSize: parsed.data.teamSize,
    useCase: parsed.data.useCase,
  };

  const auditResult = runAudit(input);
  const summary = await generateSummary(auditResult);
  auditResult.aiSummary = summary;

  const publicSlug = generateSlug();
  const db = supabaseServer();

  const { error } = await db.from('audits').insert({
    public_slug: publicSlug,
    audit_result: auditResult,
  });

  if (error) {
    console.error('Supabase insert error:', error);
    return NextResponse.json({ error: 'Failed to save audit' }, { status: 500 });
  }

  return NextResponse.json({ auditId: publicSlug, auditResult });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/audit/route.ts
git commit -m "feat: POST /api/audit with validation, rate limiting, and audit engine"
```

---

## Task 10: Implement POST /api/leads

**Files:**
- Create: `app/api/leads/route.ts`

- [ ] **Step 1: Create app/api/leads/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/db/supabase';
import { sendAuditConfirmation } from '@/lib/email/resend';

const LeadSchema = z.object({
  auditId: z.string().min(1),
  email: z.string().email(),
  companyName: z.string().optional(),
  role: z.string().optional(),
  website: z.string().optional(), // honeypot
});

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.website) {
    return NextResponse.json({ success: true }); // silently ignore bots
  }

  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { auditId, email, companyName, role } = parsed.data;
  const db = supabaseServer();

  // Look up the audit
  const { data: audit, error: auditError } = await db
    .from('audits')
    .select('id, audit_result')
    .eq('public_slug', auditId)
    .single();

  if (auditError || !audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  // Check for duplicate lead (same email for this audit)
  const { data: existing } = await db
    .from('leads')
    .select('id')
    .eq('audit_id', audit.id)
    .eq('email', email)
    .single();

  if (existing) {
    return NextResponse.json({ success: true }); // silently succeed for duplicates
  }

  const auditResult = audit.audit_result as { totalMonthlySavings: number; input: { teamSize: number } };

  await db.from('leads').insert({
    audit_id: audit.id,
    email,
    company_name: companyName ?? null,
    role: role ?? null,
    team_size: auditResult.input?.teamSize ?? null,
    total_monthly_savings: auditResult.totalMonthlySavings ?? null,
  });

  // Send confirmation email (non-blocking — don't fail the request if email fails)
  try {
    await sendAuditConfirmation({
      to: email,
      auditSlug: auditId,
      totalMonthlySavings: auditResult.totalMonthlySavings,
    });
  } catch (err) {
    console.error('Email send failed:', err);
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/leads/route.ts
git commit -m "feat: POST /api/leads with duplicate check and email trigger"
```

---

## Task 11: Implement Anthropic Client

**Files:**
- Create: `lib/anthropic.ts`
- Create: `PROMPTS.md`

- [ ] **Step 1: Create lib/anthropic.ts**

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { AuditResult } from './audit-engine/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a financial analyst who specializes in software cost optimization for startups. Write in a direct, clear, slightly dry tone — like a smart CFO giving honest feedback, not a salesperson. Avoid hype. Use exact numbers from the audit. Never mention any vendor in a promotional or affiliate context.`;

function buildSummaryPrompt(result: AuditResult): string {
  const topRecs = result.recommendations
    .filter(r => r.monthlySavings > 0)
    .sort((a, b) => b.monthlySavings - a.monthlySavings)
    .slice(0, 3)
    .map(r => `- ${r.toolId}: ${r.reasoning}`)
    .join('\n');

  return `Write an 80–120 word personalized summary of this AI spend audit result.

Current spend: $${result.totalCurrentSpend}/month across ${result.input.tools.length} tools.
Recommended spend: $${result.totalProjectedSpend}/month.
Monthly savings: $${result.totalMonthlySavings} ($${result.totalAnnualSavings}/year).
Team size: ${result.input.teamSize}. Primary use case: ${result.input.useCase}.

Top recommendations:
${topRecs || '- No changes recommended — current stack is well-optimized.'}

The summary should:
- Open with the single most impactful finding
- Name the specific tools where money is being saved, and how much
- Close with one concrete next step
- Be honest if savings are modest or zero`;
}

function buildFallbackSummary(result: AuditResult): string {
  if (result.isOptimal) {
    return `Your team's AI tool stack looks well-optimized. Current spend of $${result.totalCurrentSpend}/month is appropriate for your team size and use case. No significant changes recommended at this time.`;
  }
  const topRec = result.recommendations.find(r => r.monthlySavings > 0);
  return `This audit identified $${result.totalMonthlySavings}/month ($${result.totalAnnualSavings}/year) in potential savings across your AI tool stack. The biggest opportunity is ${topRec?.reasoning ?? 'reviewing your current plan mix'}. Review each recommendation above and consider making changes at your next renewal date.`;
}

export async function generateSummary(auditResult: AuditResult): Promise<string> {
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildSummaryPrompt(auditResult) }],
    });
    const block = message.content[0];
    if (block.type === 'text') return block.text;
    throw new Error('Unexpected response type');
  } catch (err) {
    console.error('Anthropic summary failed, using fallback:', err);
    return buildFallbackSummary(auditResult);
  }
}
```

- [ ] **Step 2: Create PROMPTS.md**

```markdown
# Prompts

## Audit Summary Prompt

### System Prompt

> You are a financial analyst who specializes in software cost optimization for startups. Write in a direct, clear, slightly dry tone — like a smart CFO giving honest feedback, not a salesperson. Avoid hype. Use exact numbers from the audit. Never mention any vendor in a promotional or affiliate context.

### User Prompt

> Write an 80–120 word personalized summary of this AI spend audit result.
>
> Current spend: $[totalCurrentSpend]/month across [toolCount] tools.
> Recommended spend: $[totalProjectedSpend]/month.
> Monthly savings: $[totalMonthlySavings] ($[totalAnnualSavings]/year).
> Team size: [teamSize]. Primary use case: [useCase].
>
> Top recommendations:
> [bullet list of top 3 recs with tool name and reasoning]
>
> The summary should:
> - Open with the single most impactful finding
> - Name the specific tools where money is being saved, and how much
> - Close with one concrete next step
> - Be honest if savings are modest or zero

### Design decisions

- Used `claude-sonnet-4-20250514` (Sonnet 4.5): fast enough for non-blocking UX, cheap enough for free product
- max_tokens: 256 — enforces concise output without truncating a 100-word response
- CFO tone avoids the typical AI "here are some great tips!" pattern that destroys trust
- Fallback template covers both optimal and savings-found cases
```

- [ ] **Step 3: Commit**

```bash
git add lib/anthropic.ts PROMPTS.md
git commit -m "feat: Anthropic client with generateSummary and fallback"
```

---

## Task 12: Implement Email (Resend + React Email)

**Files:**
- Create: `lib/email/resend.ts`
- Create: `lib/email/templates/AuditConfirmation.tsx`

- [ ] **Step 1: Create lib/email/templates/AuditConfirmation.tsx**

```tsx
import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Preview, Section, Text,
} from '@react-email/components';

interface AuditConfirmationProps {
  auditSlug: string;
  totalMonthlySavings: number;
  baseUrl?: string;
}

export function AuditConfirmation({
  auditSlug,
  totalMonthlySavings,
  baseUrl = 'https://tryflint.app',
}: AuditConfirmationProps) {
  const auditUrl = `${baseUrl}/audit/${auditSlug}`;
  const isOptimal = totalMonthlySavings < 10;

  return (
    <Html>
      <Head />
      <Preview>
        {isOptimal
          ? 'Your AI tool stack is well-optimized — here's your audit.'
          : `Your audit found $${totalMonthlySavings}/month in potential savings.`}
      </Preview>
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
            Your Flint audit is ready
          </Heading>

          {isOptimal ? (
            <Text style={{ color: '#374151', lineHeight: '1.6' }}>
              Good news — your AI tool stack looks well-optimized. No significant savings
              opportunities identified based on your current setup.
            </Text>
          ) : (
            <Text style={{ color: '#374151', lineHeight: '1.6' }}>
              Your audit identified <strong>${totalMonthlySavings}/month</strong> (
              ${totalMonthlySavings * 12}/year) in potential savings. Review the full
              breakdown at the link below.
            </Text>
          )}

          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button
              href={auditUrl}
              style={{
                backgroundColor: '#111827',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                textDecoration: 'none',
              }}
            >
              View your audit
            </Button>
          </Section>

          {!isOptimal && totalMonthlySavings > 500 && (
            <Text style={{ color: '#374151', lineHeight: '1.6' }}>
              At this spend level, it's worth spending an hour reviewing your contracts
              and negotiating annual pricing with each vendor. The ROI is immediate.
            </Text>
          )}

          <Hr style={{ borderColor: '#e5e7eb', margin: '32px 0' }} />

          <Text style={{ fontSize: '13px', color: '#9ca3af' }}>
            We'll send you a copy of future optimization tips as new tools launch.
            No spam — you can unsubscribe at any time.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Create lib/email/resend.ts**

```typescript
import { Resend } from 'resend';
import { AuditConfirmation } from './templates/AuditConfirmation';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? 'audit@tryflint.app';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tryflint.app';

export async function sendAuditConfirmation({
  to,
  auditSlug,
  totalMonthlySavings,
}: {
  to: string;
  auditSlug: string;
  totalMonthlySavings: number;
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: totalMonthlySavings < 10
      ? 'Your Flint AI spend audit — stack looks healthy'
      : `Your Flint audit: $${totalMonthlySavings}/mo in savings found`,
    react: AuditConfirmation({ auditSlug, totalMonthlySavings, baseUrl: BASE_URL }),
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/email/resend.ts lib/email/templates/AuditConfirmation.tsx
git commit -m "feat: React Email template + Resend transactional email"
```

---

## Task 13: Implement Hooks

**Files:**
- Create: `hooks/useFormPersistence.ts`
- Create: `hooks/useAudit.ts`

- [ ] **Step 1: Create hooks/useFormPersistence.ts**

```typescript
'use client';
import { useState, useEffect } from 'react';

export function useFormPersistence<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState] as const;
}
```

- [ ] **Step 2: Create hooks/useAudit.ts**

```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AuditInput } from '@/lib/audit-engine/types';

type AuditState = 'idle' | 'submitting' | 'error';

export function useAudit() {
  const [state, setState] = useState<AuditState>('idle');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submitAudit(input: AuditInput & { website?: string }) {
    setState('submitting');
    setError(null);

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to submit audit');
      }

      const { auditId } = await res.json();
      router.push(`/audit/${auditId}`);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return { state, error, submitAudit };
}
```

- [ ] **Step 3: Commit**

```bash
git add hooks/useFormPersistence.ts hooks/useAudit.ts
git commit -m "feat: useFormPersistence and useAudit hooks"
```

---

## Task 14: Build the Form UI

**IMPORTANT: Invoke the `frontend-design` skill before writing any component code in this task. Read the skill guidance and commit to the aesthetic choices before proceeding.**

**Files:**
- Create: `components/form/ToolRow.tsx`
- Create: `components/form/SpendForm.tsx`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Invoke frontend-design skill**

Before writing any UI code, invoke:
```
Skill: frontend-design:frontend-design
```

Let the skill guide the visual direction. "Flint" brand — dark, high-contrast, deliberately bold. Not purple gradients. The form is the first impression.

- [ ] **Step 2: Update app/layout.tsx**

```tsx
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flint — AI Spend Audit',
  description: 'Find out exactly where your team is overspending on AI tools. Free audit, instant results, shareable URL.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tryflint.app'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-neutral-950 text-neutral-50 antialiased">
        {children}
      </body>
    </html>
  );
}
```

Install geist font: `npm install geist`

- [ ] **Step 3: Create components/form/ToolRow.tsx**

```tsx
'use client';
import { PRICING } from '@/lib/audit-engine/pricing';
import type { ToolId } from '@/lib/audit-engine/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/utils';

interface ToolRowProps {
  toolId: ToolId;
  enabled: boolean;
  planId: string;
  monthlySpend: number;
  seats: number;
  onToggle: (enabled: boolean) => void;
  onPlanChange: (planId: string) => void;
  onSpendChange: (spend: number) => void;
  onSeatsChange: (seats: number) => void;
  errors?: { planId?: string; monthlySpend?: string; seats?: string };
}

export function ToolRow({
  toolId, enabled, planId, monthlySpend, seats,
  onToggle, onPlanChange, onSpendChange, onSeatsChange, errors,
}: ToolRowProps) {
  const tool = PRICING[toolId];
  const isApiTool = planId === 'api' || tool.category === 'api';

  return (
    <div className={`rounded-lg border p-4 transition-colors ${enabled ? 'border-neutral-600 bg-neutral-900' : 'border-neutral-800 bg-neutral-950 opacity-50'}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          id={`tool-${toolId}`}
          checked={enabled}
          onCheckedChange={onToggle}
          className="mt-1"
          aria-label={`Include ${tool.displayName} in audit`}
        />
        <div className="flex-1 min-w-0">
          <Label htmlFor={`tool-${toolId}`} className="font-semibold text-sm cursor-pointer">
            {tool.displayName}
          </Label>
          {enabled && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor={`plan-${toolId}`} className="text-xs text-neutral-400 mb-1 block">Plan</Label>
                <Select value={planId} onValueChange={onPlanChange}>
                  <SelectTrigger id={`plan-${toolId}`} className="bg-neutral-800 border-neutral-700">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {tool.plans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors?.planId && (
                  <p id={`plan-${toolId}-error`} className="text-red-400 text-xs mt-1" role="alert">{errors.planId}</p>
                )}
              </div>

              <div>
                <Label htmlFor={`spend-${toolId}`} className="text-xs text-neutral-400 mb-1 block">
                  {isApiTool ? 'Avg monthly bill' : 'Monthly spend'}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span>
                  <Input
                    id={`spend-${toolId}`}
                    type="number"
                    min={0}
                    value={monthlySpend || ''}
                    onChange={e => onSpendChange(parseFloat(e.target.value) || 0)}
                    className="pl-7 bg-neutral-800 border-neutral-700"
                    placeholder="0"
                    aria-describedby={errors?.monthlySpend ? `spend-${toolId}-error` : undefined}
                  />
                </div>
                {errors?.monthlySpend && (
                  <p id={`spend-${toolId}-error`} className="text-red-400 text-xs mt-1" role="alert">{errors.monthlySpend}</p>
                )}
              </div>

              {!isApiTool ? (
                <div>
                  <Label htmlFor={`seats-${toolId}`} className="text-xs text-neutral-400 mb-1 block">Seats</Label>
                  <Input
                    id={`seats-${toolId}`}
                    type="number"
                    min={1}
                    value={seats || ''}
                    onChange={e => onSeatsChange(parseInt(e.target.value, 10) || 1)}
                    className="bg-neutral-800 border-neutral-700"
                    placeholder="1"
                    aria-describedby={errors?.seats ? `seats-${toolId}-error` : undefined}
                  />
                  {errors?.seats && (
                    <p id={`seats-${toolId}-error`} className="text-red-400 text-xs mt-1" role="alert">{errors.seats}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-end pb-1">
                  <p className="text-xs text-neutral-500">API pricing is usage-based — enter your average monthly bill above.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create components/form/SpendForm.tsx**

```tsx
'use client';
import { useState } from 'react';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { useAudit } from '@/hooks/useAudit';
import { ToolRow } from './ToolRow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import type { ToolId, UseCase } from '@/lib/audit-engine/types';
import { PRICING } from '@/lib/audit-engine/pricing';

const TOOL_IDS: ToolId[] = ['cursor', 'github-copilot', 'claude', 'chatgpt', 'anthropic-api', 'openai-api', 'gemini', 'windsurf'];
const USE_CASES: { value: UseCase; label: string }[] = [
  { value: 'coding', label: 'Coding' },
  { value: 'writing', label: 'Writing' },
  { value: 'data', label: 'Data / Analytics' },
  { value: 'research', label: 'Research' },
  { value: 'mixed', label: 'Mixed' },
];

interface FormState {
  teamSize: number;
  useCase: UseCase;
  tools: Record<ToolId, { enabled: boolean; planId: string; monthlySpend: number; seats: number }>;
}

function defaultFormState(): FormState {
  const tools = {} as FormState['tools'];
  for (const id of TOOL_IDS) {
    const firstPlan = PRICING[id].plans[0];
    tools[id] = { enabled: false, planId: firstPlan?.id ?? '', monthlySpend: 0, seats: 1 };
  }
  return { teamSize: 1, useCase: 'mixed', tools };
}

export function SpendForm() {
  const [form, setForm] = useFormPersistence<FormState>('spend-audit-form-v1', defaultFormState());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { state, error: submitError, submitAudit } = useAudit();

  const totalCurrentSpend = TOOL_IDS
    .filter(id => form.tools[id].enabled)
    .reduce((sum, id) => sum + form.tools[id].monthlySpend, 0);

  function updateTool(toolId: ToolId, patch: Partial<FormState['tools'][ToolId]>) {
    setForm(prev => ({
      ...prev,
      tools: { ...prev.tools, [toolId]: { ...prev.tools[toolId], ...patch } },
    }));
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    const selectedTools = TOOL_IDS.filter(id => form.tools[id].enabled);

    if (selectedTools.length === 0) {
      newErrors.tools = 'Select at least one tool to audit.';
    }

    for (const id of selectedTools) {
      const t = form.tools[id];
      if (t.monthlySpend <= 0) newErrors[`spend-${id}`] = 'Enter your monthly spend.';
      if (!t.planId) newErrors[`plan-${id}`] = 'Select a plan.';
      if (t.seats < 1) newErrors[`seats-${id}`] = 'Must be at least 1.';
    }

    if (form.teamSize < 1) newErrors.teamSize = 'Team size must be at least 1.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const selectedTools = TOOL_IDS
      .filter(id => form.tools[id].enabled)
      .map(id => ({
        toolId: id,
        planId: form.tools[id].planId,
        monthlySpend: form.tools[id].monthlySpend,
        seats: form.tools[id].seats,
      }));

    await submitAudit({
      tools: selectedTools,
      teamSize: form.teamSize,
      useCase: form.useCase,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="AI spend audit form">
      {/* Step 1: Context */}
      <section aria-labelledby="context-heading" className="mb-8">
        <h2 id="context-heading" className="text-lg font-semibold mb-4">About your team</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="team-size">Team size</Label>
            <Input
              id="team-size"
              type="number"
              min={1}
              value={form.teamSize}
              onChange={e => setForm(prev => ({ ...prev, teamSize: parseInt(e.target.value, 10) || 1 }))}
              className="mt-1 bg-neutral-800 border-neutral-700"
              aria-describedby={errors.teamSize ? 'team-size-error' : undefined}
            />
            {errors.teamSize && <p id="team-size-error" className="text-red-400 text-xs mt-1" role="alert">{errors.teamSize}</p>}
          </div>

          <div>
            <Label>Primary use case</Label>
            <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Primary use case">
              {USE_CASES.map(uc => (
                <label key={uc.value} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${form.useCase === uc.value ? 'border-neutral-400 bg-neutral-800' : 'border-neutral-700 hover:border-neutral-600'}`}>
                  <input
                    type="radio"
                    name="useCase"
                    value={uc.value}
                    checked={form.useCase === uc.value}
                    onChange={() => setForm(prev => ({ ...prev, useCase: uc.value }))}
                    className="sr-only"
                  />
                  {uc.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Step 2: Tools */}
      <section aria-labelledby="tools-heading" className="mb-8">
        <h2 id="tools-heading" className="text-lg font-semibold mb-4">Your AI tools</h2>
        {errors.tools && <p className="text-red-400 text-sm mb-3" role="alert">{errors.tools}</p>}
        <div className="space-y-3">
          {TOOL_IDS.map(id => (
            <ToolRow
              key={id}
              toolId={id}
              enabled={form.tools[id].enabled}
              planId={form.tools[id].planId}
              monthlySpend={form.tools[id].monthlySpend}
              seats={form.tools[id].seats}
              onToggle={enabled => updateTool(id, { enabled })}
              onPlanChange={planId => updateTool(id, { planId })}
              onSpendChange={monthlySpend => updateTool(id, { monthlySpend })}
              onSeatsChange={seats => updateTool(id, { seats })}
              errors={{
                planId: errors[`plan-${id}`],
                monthlySpend: errors[`spend-${id}`],
                seats: errors[`seats-${id}`],
              }}
            />
          ))}
        </div>
      </section>

      {/* Running total */}
      {totalCurrentSpend > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-between">
          <span className="text-sm text-neutral-400">Current monthly spend</span>
          <span className="font-mono text-lg font-semibold" aria-label={`${formatCurrency(totalCurrentSpend)} per month`}>
            {formatCurrency(totalCurrentSpend)}/mo
          </span>
        </div>
      )}

      {submitError && (
        <p className="text-red-400 text-sm mb-4" role="alert">{submitError}</p>
      )}

      {/* Honeypot */}
      <input type="text" name="website" className="sr-only" tabIndex={-1} aria-hidden="true" />

      <Button
        type="submit"
        disabled={state === 'submitting'}
        className="w-full h-12 text-base font-semibold"
        aria-live="polite"
      >
        {state === 'submitting' ? 'Running audit…' : 'Run Audit →'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 5: Update app/page.tsx**

```tsx
import { SpendForm } from '@/components/form/SpendForm';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
        <header className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">🔥</span>
            <span className="text-xl font-bold tracking-tight">Flint</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Is your team overspending<br className="hidden sm:block" /> on AI tools?
          </h1>
          <p className="text-neutral-400 text-lg max-w-lg mx-auto">
            Enter your current subscriptions. Get an instant audit — free, no login required.
          </p>
        </header>
        <SpendForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Verify form works in browser**

```bash
npm run dev
```

Open http://localhost:3000. Verify:
- Form renders all tools
- Enabling a tool shows plan/spend/seats inputs
- Running total updates as you fill in values
- Submit button shows loading state
- localStorage persists state on refresh

- [ ] **Step 7: Commit**

```bash
git add components/form/ hooks/ app/page.tsx app/layout.tsx
git commit -m "feat: spend input form with localStorage persistence and validation"
```

---

## Task 15: Build Results Page

**IMPORTANT: Invoke `frontend-design:frontend-design` skill before writing results components. This page gets screenshotted and shared — it must look exceptional.**

**Files:**
- Create: `components/results/HeroSavings.tsx`
- Create: `components/results/ToolBreakdown.tsx`
- Create: `components/results/AISummary.tsx`
- Create: `components/results/SavingsCTA.tsx`
- Create: `components/results/ShareButton.tsx`
- Create: `components/results/AuditResults.tsx`
- Create: `app/audit/[auditId]/page.tsx`

- [ ] **Step 1: Invoke frontend-design skill**

```
Skill: frontend-design:frontend-design
```

- [ ] **Step 2: Create components/results/HeroSavings.tsx**

```tsx
import { formatCurrency } from '@/lib/utils';
import type { AuditResult } from '@/lib/audit-engine/types';

export function HeroSavings({ result }: { result: AuditResult }) {
  if (result.isOptimal) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4" aria-hidden="true">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-emerald-400 mb-2">
          You're spending well
        </h1>
        <p className="text-neutral-400 text-lg">
          {formatCurrency(result.totalCurrentSpend)}/month across {result.input.tools.length} tool{result.input.tools.length !== 1 ? 's' : ''} — no significant savings identified.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <p className="text-neutral-400 text-sm uppercase tracking-widest mb-2">Potential monthly savings</p>
      <div
        className="text-6xl sm:text-7xl font-black tracking-tight text-white mb-1"
        aria-label={`${formatCurrency(result.totalMonthlySavings)} per month in potential savings`}
      >
        {formatCurrency(result.totalMonthlySavings)}
        <span className="text-2xl text-neutral-500 font-normal">/mo</span>
      </div>
      <p className="text-neutral-400 text-lg">
        <span className="text-neutral-300 font-semibold">{formatCurrency(result.totalAnnualSavings)}/year</span>
        {' '}·{' '}
        {formatCurrency(result.totalCurrentSpend)} → {formatCurrency(result.totalProjectedSpend)}/mo
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create components/results/ToolBreakdown.tsx**

```tsx
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { PRICING } from '@/lib/audit-engine/pricing';
import type { ToolRecommendation } from '@/lib/audit-engine/types';

function actionLabel(action: ToolRecommendation['recommendedAction']): string {
  const map: Record<ToolRecommendation['recommendedAction'], string> = {
    downgrade: 'Downgrade',
    upgrade: 'Upgrade',
    switch: 'Switch tool',
    'use-credits': 'Use credits',
    optimal: 'Already optimal',
    'review-usage': 'Review usage',
  };
  return map[action];
}

export function ToolBreakdown({ recommendations }: { recommendations: ToolRecommendation[] }) {
  return (
    <section aria-labelledby="breakdown-heading">
      <h2 id="breakdown-heading" className="text-xl font-bold mb-4">Per-tool breakdown</h2>
      <div className="space-y-4">
        {recommendations.map(rec => {
          const tool = PRICING[rec.toolId];
          const hasSavings = rec.monthlySavings > 0;

          return (
            <div key={rec.toolId} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold">{tool?.displayName ?? rec.toolId}</p>
                  <p className="text-sm text-neutral-400 mt-0.5">{formatCurrency(rec.currentSpend)}/mo current</p>
                </div>
                {hasSavings ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0" aria-label={`Save ${formatCurrency(rec.monthlySavings)} per month`}>
                    save {formatCurrency(rec.monthlySavings)}/mo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-neutral-500 shrink-0">
                    optimal
                  </Badge>
                )}
              </div>

              {hasSavings && (
                <div className="flex items-center gap-2 mb-3 text-sm">
                  <span className="text-neutral-400">{formatCurrency(rec.currentSpend)}/mo</span>
                  <span className="text-neutral-600" aria-hidden="true">→</span>
                  <span className="text-emerald-400 font-semibold">{formatCurrency(rec.projectedMonthlySpend)}/mo</span>
                  <span className="text-neutral-500 text-xs ml-1">({actionLabel(rec.recommendedAction)})</span>
                </div>
              )}

              <p className="text-sm text-neutral-400 leading-relaxed">{rec.reasoning}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create components/results/AISummary.tsx**

```tsx
'use client';
import { Skeleton } from '@/components/ui/skeleton';

interface AISummaryProps {
  summary: string | null;
}

export function AISummary({ summary }: AISummaryProps) {
  return (
    <section aria-labelledby="summary-heading" aria-live="polite">
      <h2 id="summary-heading" className="text-xl font-bold mb-3">AI Analysis</h2>
      {summary ? (
        <p className="text-neutral-300 leading-relaxed text-base">{summary}</p>
      ) : (
        <div className="space-y-2" aria-label="Loading AI analysis">
          <Skeleton className="h-4 w-full bg-neutral-800" />
          <Skeleton className="h-4 w-5/6 bg-neutral-800" />
          <Skeleton className="h-4 w-4/6 bg-neutral-800" />
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Create components/results/SavingsCTA.tsx**

```tsx
export function SavingsCTA({ annualSavings }: { annualSavings: number }) {
  return (
    <aside className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
      <p className="font-semibold text-amber-400 mb-1">
        ${annualSavings.toLocaleString()}/year is meaningful — act on it
      </p>
      <p className="text-sm text-neutral-400 leading-relaxed">
        At this spend level, it's worth spending an hour reviewing your contracts and
        negotiating annual pricing with each vendor. Most vendors have unpublished annual
        discounts of 15–25%. The ROI on that hour is immediate.
      </p>
    </aside>
  );
}
```

- [ ] **Step 6: Create components/results/ShareButton.tsx**

```tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function ShareButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      variant="outline"
      onClick={handleCopy}
      className="border-neutral-700 hover:border-neutral-500"
      aria-label="Copy shareable link to clipboard"
      aria-live="polite"
    >
      {copied ? '✓ Link copied!' : 'Share audit →'}
    </Button>
  );
}
```

- [ ] **Step 7: Create components/results/AuditResults.tsx**

```tsx
import type { AuditResult } from '@/lib/audit-engine/types';
import { HeroSavings } from './HeroSavings';
import { ToolBreakdown } from './ToolBreakdown';
import { AISummary } from './AISummary';
import { SavingsCTA } from './SavingsCTA';
import { ShareButton } from './ShareButton';

interface AuditResultsProps {
  result: AuditResult;
  shareUrl: string;
}

export function AuditResults({ result, shareUrl }: AuditResultsProps) {
  return (
    <div className="space-y-10">
      <HeroSavings result={result} />
      <ToolBreakdown recommendations={result.recommendations} />
      <AISummary summary={result.aiSummary} />
      {result.isHighSavings && <SavingsCTA annualSavings={result.totalAnnualSavings} />}
      <div className="flex justify-center pt-4">
        <ShareButton url={shareUrl} />
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Create app/audit/[auditId]/page.tsx**

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/db/supabase';
import { AuditResults } from '@/components/results/AuditResults';
import { LeadCaptureModal } from '@/components/LeadCaptureModal';
import type { AuditResult } from '@/lib/audit-engine/types';

interface Props {
  params: { auditId: string };
}

async function getAudit(slug: string): Promise<AuditResult | null> {
  const db = supabaseServer();
  const { data, error } = await db
    .from('audits')
    .select('audit_result')
    .eq('public_slug', slug)
    .single();

  if (error || !data) return null;
  return data.audit_result as AuditResult;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const audit = await getAudit(params.auditId);
  if (!audit) return { title: 'Audit not found — Flint' };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tryflint.app';

  return {
    title: audit.isOptimal
      ? 'My AI tool stack is optimized — Flint'
      : `My team could save $${audit.totalMonthlySavings}/mo on AI tools — Flint`,
    description: `AI spend audit: $${audit.totalCurrentSpend}/mo → $${audit.totalProjectedSpend}/mo. Free audit at tryflint.app.`,
    openGraph: {
      title: audit.isOptimal
        ? 'I audited my AI tool spend — stack looks healthy'
        : `I just audited my AI tool spend — $${audit.totalAnnualSavings}/yr in savings found`,
      description: 'Free AI spend audit with Flint. Takes 2 minutes.',
      type: 'website',
      url: `${baseUrl}/audit/${params.auditId}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: audit.isOptimal
        ? 'AI Spend Audit — stack looks healthy'
        : `AI Spend Audit — $${audit.totalAnnualSavings}/yr savings found`,
    },
  };
}

export default async function AuditPage({ params }: Props) {
  const audit = await getAudit(params.auditId);
  if (!audit) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tryflint.app';
  const shareUrl = `${baseUrl}/audit/${params.auditId}`;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <div className="mb-8 flex items-center justify-between">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
            <span aria-hidden="true">←</span> Run another audit
          </a>
          <div className="flex items-center gap-1.5">
            <span className="text-base" aria-hidden="true">🔥</span>
            <span className="text-sm font-semibold">Flint</span>
          </div>
        </div>
        <AuditResults result={audit} shareUrl={shareUrl} />
        <LeadCaptureModal auditId={params.auditId} />
      </div>
    </main>
  );
}
```

- [ ] **Step 9: Verify results page renders**

Submit an audit from http://localhost:3000, verify redirect to `/audit/[slug]` works and all sections render.

- [ ] **Step 10: Commit**

```bash
git add components/results/ app/audit/
git commit -m "feat: audit results page with OG tags and SSR"
```

---

## Task 16: Build Lead Capture Modal

**Files:**
- Create: `components/LeadCaptureModal.tsx`

- [ ] **Step 1: Create components/LeadCaptureModal.tsx**

```tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LeadCaptureModalProps {
  auditId: string;
}

export function LeadCaptureModal({ auditId }: LeadCaptureModalProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [emailError, setEmailError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const key = `lead-modal-${auditId}`;
    if (sessionStorage.getItem(key)) return;

    const timer = setTimeout(() => {
      setOpen(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [auditId]);

  // Trap focus when open
  useEffect(() => {
    if (open) {
      setTimeout(() => emailRef.current?.focus(), 50);
    }
  }, [open]);

  function handleDismiss() {
    const key = `lead-modal-${auditId}`;
    sessionStorage.setItem(key, 'dismissed');
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setEmailError('Email is required.');
      return;
    }

    setSubmitting(true);
    setEmailError('');

    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditId, email, companyName, role }),
      });
      setSubmitted(true);
      const key = `lead-modal-${auditId}`;
      sessionStorage.setItem(key, 'submitted');
      setTimeout(() => setOpen(false), 1500);
    } catch {
      setEmailError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDismiss(); }}>
      <DialogContent className="bg-neutral-900 border-neutral-700 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle>Get a copy of this audit</DialogTitle>
          <DialogDescription className="text-neutral-400">
            We'll send you a copy. No spam — you can close this.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <p className="text-emerald-400 text-sm py-4 text-center">✓ Sent! Check your inbox.</p>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-2">
            <div>
              <Label htmlFor="lead-email">Email *</Label>
              <Input
                ref={emailRef}
                id="lead-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1 bg-neutral-800 border-neutral-700"
                placeholder="you@company.com"
                aria-required="true"
                aria-describedby={emailError ? 'lead-email-error' : undefined}
              />
              {emailError && <p id="lead-email-error" className="text-red-400 text-xs mt-1" role="alert">{emailError}</p>}
            </div>

            <div>
              <Label htmlFor="lead-company">Company (optional)</Label>
              <Input
                id="lead-company"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="mt-1 bg-neutral-800 border-neutral-700"
                placeholder="Acme Inc."
              />
            </div>

            <div>
              <Label htmlFor="lead-role">Role (optional)</Label>
              <Input
                id="lead-role"
                value={role}
                onChange={e => setRole(e.target.value)}
                className="mt-1 bg-neutral-800 border-neutral-700"
                placeholder="CTO, Engineering Lead…"
              />
            </div>

            {/* Honeypot */}
            <input type="text" name="website" className="sr-only" tabIndex={-1} aria-hidden="true" />

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Sending…' : 'Send me a copy'}
              </Button>
              <Button type="button" variant="ghost" onClick={handleDismiss} className="text-neutral-500">
                No thanks
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify modal behavior**

Open an audit page. Verify:
- Modal appears ~2 seconds after page loads
- Dismissing sets sessionStorage, modal doesn't reappear on reload
- Submitting an email closes the modal after 1.5s
- Form validates email is required
- Escape key closes modal

- [ ] **Step 3: Commit**

```bash
git add components/LeadCaptureModal.tsx
git commit -m "feat: lead capture modal with sessionStorage gate and honeypot"
```

---

## Task 17: Write Documentation

**Files:**
- Create: `ARCHITECTURE.md`
- Create: `TESTS.md`

- [ ] **Step 1: Create ARCHITECTURE.md**

```markdown
# Architecture

## System Diagram

```mermaid
graph LR
    User -->|form submit| Form[SpendForm]
    Form -->|POST /api/audit| API[API Route]
    API -->|runAudit| Engine[Audit Engine]
    Engine -->|AuditResult| API
    API -->|generateSummary| Anthropic[Anthropic API]
    Anthropic -->|summary text| API
    API -->|INSERT| Supabase[(Supabase)]
    API -->|publicSlug| Form
    Form -->|redirect| Results[Results Page]
    Results -->|SELECT by slug| Supabase
    Results -->|render| User
    User -->|email capture| Modal[Lead Modal]
    Modal -->|POST /api/leads| LeadsAPI[/api/leads]
    LeadsAPI -->|INSERT| Supabase
    LeadsAPI -->|sendEmail| Resend[Resend]
```

## Data Flow

A user's form submission becomes a `POST /api/audit` request which runs `runAudit()` synchronously server-side, calls Anthropic for a non-blocking summary paragraph, stores the result in Supabase, then returns the `publicSlug` to the client which redirects to `/audit/[slug]`.

The results page is SSR — Supabase is queried at request time, so OG meta tags are populated correctly for social crawlers.

## Why Next.js App Router

SSR is the critical requirement: the `/audit/[slug]` page must return correct `<meta>` tags for OG unfurls. Client-side rendering makes this impossible without a separate OG image service.

## Scaling to 10k audits/day

- Move Anthropic call to a background queue (BullMQ or Vercel Queue) — return auditId immediately, poll for summary
- Edge-cache result pages at CDN level (they're immutable once created)
- Add a read replica for Supabase audit lookups
- Rate limit by fingerprint, not just IP
```

- [ ] **Step 2: Create TESTS.md**

```markdown
# Tests

## Running Tests

```bash
npx vitest run                        # run all tests once
npx vitest run --reporter=verbose     # verbose output
npx vitest                            # watch mode
```

## Test Files

### __tests__/audit-engine.test.ts

Tests for the deterministic audit engine (`lib/audit-engine/`).

| Test | What it covers |
|------|----------------|
| GitHub Copilot Business → Individual downgrade | Rule A: wrong plan for seat count |
| Claude Pro 1 seat writing → optimal | Rule E: no manufactured recommendations |
| ChatGPT Plus coding → switch recommendation | Rule C: better tool for use case |
| Anthropic API + Claude Pro → redundancy flag | Rule D/double-pay: API + subscription |
| >$500 savings → isHighSavings flag | AuditResult.isHighSavings calculation |
| totalMonthlySavings = sum of recommendations | Math integrity check |
| Empty tools → valid result with isOptimal | Edge case: zero tools |

### __tests__/utils.test.ts

Unit tests for `formatCurrency` utility function.

## CI

Tests run on every push to `main` via `.github/workflows/ci.yml`. See that file for the full pipeline.
```

- [ ] **Step 3: Commit**

```bash
git add ARCHITECTURE.md TESTS.md
git commit -m "docs: architecture overview and test documentation"
```

---

## Task 18: Set Up GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create .github/workflows/ci.yml**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Run tests
        run: npx vitest run
        env:
          CI: true
```

- [ ] **Step 2: Push to GitHub and verify CI passes**

```bash
git add .github/
git commit -m "chore: GitHub Actions CI workflow"
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

Open the repository on GitHub → Actions tab → verify the workflow runs green.

---

## Task 19: Deploy to Vercel

- [ ] **Step 1: Push all code to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Create Vercel project**

Go to https://vercel.com/new, import the GitHub repo. Accept default Next.js settings.

- [ ] **Step 3: Add environment variables in Vercel dashboard**

Add all variables from `.env.example` with production values:
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_BASE_URL` (set to your Vercel URL, e.g. `https://tryflint.app`)

- [ ] **Step 4: Deploy**

Click Deploy. Verify the production URL loads and a full audit can be completed.

- [ ] **Step 5: Verify OG tags**

Paste a production audit URL into https://cards-dev.twitter.com/validator or https://www.opengraph.xyz/. Confirm title and description render correctly.

- [ ] **Step 6: Run Lighthouse**

In Chrome DevTools → Lighthouse, run on mobile for both the home page and an audit result page.
Target: Performance ≥ 85, Accessibility ≥ 90, Best Practices ≥ 90.

Fix any failing items before marking this task complete.

---

## Task 20: Final Verification Checklist

- [ ] All 7 audit engine tests pass: `npx vitest run`
- [ ] TypeScript compiles clean: `npx tsc --noEmit`
- [ ] ESLint passes: `npm run lint`
- [ ] Cold visitor can complete a full audit in < 3 minutes on production URL
- [ ] Lead capture modal appears, email is received within 30s
- [ ] Shareable URL shows correct OG preview (Twitter card validator)
- [ ] CI is green on GitHub Actions
- [ ] No secrets in git history (`git log --all --full-history -- .env*`)
- [ ] `.env.example` is accurate and complete
- [ ] `PRICING_DATA.md` has verified prices with source URLs and dates
- [ ] `ARCHITECTURE.md`, `PROMPTS.md`, `TESTS.md` are complete
- [ ] Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 90, Best Practices ≥ 90

---

## Appendix: tsconfig.json Paths

Ensure `tsconfig.json` has the `@/*` alias configured (create-next-app does this by default):

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```
