# Flint — AI Spend Audit Tool: Design Spec

**Date:** 2026-05-23  
**Status:** Approved  
**Source:** CLAUDE.md (full spec)

---

## 1. Overview

Flint is a free web app for startup founders and engineering managers to audit their AI tool spending. Users input their current tool subscriptions, receive an instant deterministic breakdown of overspend and recommendations, and get a unique shareable URL with Open Graph previews.

**North star:** Genuinely useful. Honest "you're spending well" results are as important as big savings numbers.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) — SSR required for OG tags |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (Postgres) |
| Auth | None |
| AI | Anthropic API (`claude-sonnet-4-20250514`) — summary paragraph only |
| Email | Resend + React Email |
| Deployment | Vercel |
| Testing | Vitest + @testing-library/react |
| CI | GitHub Actions |

---

## 3. Repository Structure

```
/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Landing + form
│   ├── audit/[auditId]/page.tsx    # SSR results page
│   └── api/
│       ├── audit/route.ts          # POST: run audit, store, return slug
│       ├── summary/route.ts        # POST: generate AI summary
│       └── leads/route.ts          # POST: capture email lead
├── components/
│   ├── ui/                         # shadcn primitives
│   ├── form/
│   │   ├── SpendForm.tsx
│   │   ├── ToolRow.tsx
│   │   └── FormPersistence.tsx
│   └── results/
│       ├── AuditResults.tsx
│       ├── HeroSavings.tsx
│       ├── ToolBreakdown.tsx
│       ├── AISummary.tsx
│       ├── SavingsCTA.tsx
│       └── ShareButton.tsx
├── lib/
│   ├── audit-engine/
│   │   ├── index.ts                # runAudit(input) → AuditResult
│   │   ├── rules.ts                # Per-tool recommendation rules
│   │   ├── pricing.ts              # Canonical pricing data
│   │   └── types.ts                # All domain types
│   ├── db/
│   │   ├── supabase.ts
│   │   └── schema.sql
│   ├── email/
│   │   ├── resend.ts
│   │   └── templates/AuditConfirmation.tsx
│   ├── anthropic.ts
│   └── utils.ts
├── hooks/
│   ├── useFormPersistence.ts
│   └── useAudit.ts
├── __tests__/
│   ├── audit-engine.test.ts
│   └── utils.test.ts
└── .github/workflows/ci.yml
```

---

## 4. Data Models

```typescript
type ToolId = 'cursor' | 'github-copilot' | 'claude' | 'chatgpt' |
              'anthropic-api' | 'openai-api' | 'gemini' | 'windsurf';

type UseCase = 'coding' | 'writing' | 'data' | 'research' | 'mixed';

interface ToolInput {
  toolId: ToolId;
  planId: string;
  monthlySpend: number;
  seats: number;
}

interface AuditInput {
  tools: ToolInput[];
  teamSize: number;
  useCase: UseCase;
}

type RecommendationAction =
  | 'downgrade' | 'upgrade' | 'switch' | 'use-credits' | 'optimal' | 'review-usage';

interface ToolRecommendation {
  toolId: ToolId;
  currentSpend: number;
  recommendedAction: RecommendationAction;
  recommendedPlanId: string | null;
  recommendedToolId: ToolId | null;
  projectedMonthlySpend: number;
  monthlySavings: number;
  reasoning: string;
}

interface AuditResult {
  input: AuditInput;
  recommendations: ToolRecommendation[];
  totalCurrentSpend: number;
  totalProjectedSpend: number;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  isOptimal: boolean;       // totalMonthlySavings < $10
  isHighSavings: boolean;   // totalMonthlySavings > $500
  aiSummary: string | null;
  createdAt: string;
}
```

---

## 5. Audit Engine Rules

### A — Wrong plan for seat count
- GitHub Copilot Business → Individual if seats ≤ 5 (no enterprise SSO needed)
- Claude Team → individual Pro accounts if seats ≤ 2
- ChatGPT Team → Plus if seats ≤ 2 and use case is personal productivity
- Cursor Business → Pro if seats ≤ 3

### B — Cheaper same-vendor alternative
- Claude Max ($100) → Pro ($20) if seats=1 and use case is writing/research
- Cursor Pro → review-usage if seats=1 and use case is writing/research (coding tool misuse)
- Enterprise → Business/Team if estimated seats < 10

### C — Better alternative for use case
| Current | Use Case | Recommend |
|---|---|---|
| Cursor Pro | writing/research | Claude Pro |
| GitHub Copilot Business | mixed/research | Cursor Pro |
| ChatGPT Plus | coding | Cursor Hobby + Claude Pro |
| Gemini Advanced | coding | GitHub Copilot Individual or Cursor Hobby |
| Anthropic API + Claude Pro | any | API only (double-pay) |
| OpenAI API + ChatGPT Plus | any | API only (double-pay) |

### D — API usage flags
- Monthly API spend < $30 → suggest flat subscription instead
- Monthly API spend > $200 → note efficiency levers, no downgrade rec

### E — Already optimal
- No manufactured recommendations. `recommendedAction: 'optimal'`, `monthlySavings: 0`

---

## 6. User Flow

```
Home (form) → POST /api/audit → /audit/[slug] (SSR results) → Lead modal → POST /api/leads → Email
```

**Form steps:**
1. Team size + use case
2. Tool rows (toggle → plan → spend → seats); running spend total in sidebar
3. Validate + submit

**Results page sections (in order):**
1. Hero savings (or "You're spending well" if optimal)
2. Per-tool breakdown cards
3. AI summary paragraph (async skeleton loader)
4. High-savings CTA (only if > $500/mo)
5. Share button (copy URL, clipboard tooltip)
6. Email modal (~2s delay, dismissible, sessionStorage gate)

---

## 7. Database Schema

```sql
CREATE TABLE audits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_slug  TEXT UNIQUE NOT NULL,
  audit_result JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leads (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id             UUID REFERENCES audits(id),
  email                TEXT NOT NULL,
  company_name         TEXT,
  role                 TEXT,
  team_size            INT,
  total_monthly_savings NUMERIC,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rate_limits (
  ip_hash      TEXT PRIMARY KEY,
  audit_count  INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW()
);
```

RLS: anon can SELECT audits only. Service role handles all writes.

---

## 8. API Routes

### POST /api/audit
1. Zod validation of AuditInput
2. IP rate limit (10/hr, stored in rate_limits)
3. Honeypot check (`website` field must be empty)
4. `runAudit(input)` → AuditResult
5. `generateSummary(auditResult)` with try/catch fallback
6. Store in Supabase, return `{ auditId: publicSlug, auditResult }`

### POST /api/leads
1. Validate email (required), optional fields
2. Duplicate check by IP + auditId
3. Insert lead, trigger Resend email
4. Return `{ success: true }`

---

## 9. AI Summary

- Model: `claude-sonnet-4-20250514`
- Max tokens: 256
- Tone: direct, dry, CFO-style — use exact numbers, name specific tools
- Fallback: template string if Anthropic call fails
- Non-blocking: results page shows immediately; summary loads async

---

## 10. Build Phases

| Phase | What |
|---|---|
| 1 | Project scaffold (Next.js + shadcn, types) |
| 2 | Pricing data + audit engine + ≥5 Vitest tests |
| 3 | Supabase schema + API routes |
| 4 | Form UI with localStorage persistence |
| 5 | Results page + OG tags + lead capture |
| 6 | AI summary (Anthropic integration) |
| 7 | Email (React Email + Resend) |
| 8 | CI, Lighthouse polish, documentation |
| 9 | Bonus: PDF export, benchmark mode |

---

## 11. Constraints

- No secrets in repo; all in `.env.local` (never committed)
- `SUPABASE_SERVICE_ROLE_KEY` must never be in a `NEXT_PUBLIC_` variable
- PII (email, company) only in `leads` table, never in public `audits` table
- Audit engine is deterministic — AI only for summary paragraph
- High-savings CTA only shown when savings > $500/mo
- AI summary must be non-blocking (skeleton loader while fetching)
- Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 90, Best Practices ≥ 90

---

## 12. Definition of Done

- All 6 MVP features work end-to-end in production
- Cold visitor completes audit in < 3 minutes
- Shareable URL shows correct OG preview in Twitter/Slack unfurl
- Email received within 30s of lead capture
- Lighthouse thresholds met
- CI green, all 5+ tests pass
- PRICING_DATA.md, PROMPTS.md, ARCHITECTURE.md, TESTS.md complete
- No secrets in repo
