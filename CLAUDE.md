# CLAUDE.md — Flint: AI Spend Audit Tool

You are building a full-stack web application from scratch. Read this entire file before
writing a single line of code. Think through architecture and data models first. Ask no
clarifying questions — make reasonable decisions, document them in comments and in
`ARCHITECTURE.md`, and keep moving.

---

## 0. Golden Rules

1. **Think step-by-step before every non-trivial task.** For anything involving data
   modelling, audit logic, or multi-file changes: reason through it explicitly in comments
   before writing the implementation.
2. **Use the frontend-design skill** when building any UI component or page. Read the
   skill guidance and commit to a bold, intentional aesthetic — not generic purple
   gradients and Inter font.
3. **Never hardcode secrets.** All API keys and connection strings go in `.env.local`
   (never committed). Always create a `.env.example` with placeholder values.
4. **TypeScript everywhere.** Strict mode. No `any` unless you comment exactly why.
5. **Verify pricing URLs yourself** before writing audit logic. Every number in the audit
   engine must cite a vendor URL in `PRICING_DATA.md`.
6. **The audit engine uses deterministic rules — not AI.** The AI is used only for the
   personalized summary paragraph. Knowing when NOT to use AI is part of the craft.
7. **Run your code.** After each phase, verify the app actually works before moving on.
8. **Accessibility is not optional.** Lighthouse Accessibility ≥ 90, Best Practices ≥ 90,
   Performance ≥ 85 on mobile. Use semantic HTML. Test with a screen reader mental model.

---

## 1. Project Overview

**What you're building:** A free web app called **Flint** that lets startup founders and
engineering managers audit their AI tool spending. The name is a deliberate choice: flint
strikes a spark — Flint illuminates the hidden spend sitting inside your tool stack. Use
this name, this brand, and this aesthetic consistently everywhere.

Users input what tools they pay for, get an instant breakdown of where they're
overspending, what to switch, and their total potential savings. An optional email capture
shows after the audit result. Each audit gets a unique shareable URL with Open Graph
previews.

**The product's north star:** Genuinely useful. A finance-literate founder reads the
recommendations and agrees with them. Honest "you're already spending well" results are as
important as big savings numbers — they build trust.

---

## 2. Tech Stack (Justified)

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | SSR for OG tags, API routes, file-based routing, Vercel-native |
| Language | **TypeScript (strict)** | Required. Types catch audit-logic bugs before runtime |
| Styling | **Tailwind CSS + shadcn/ui** | Composable primitives; design tokens keep the UI consistent |
| Database | **Supabase** (Postgres) | Free tier generous enough; real-time optional; good DX |
| Auth | **None** | No login required to use the tool |
| AI | **Anthropic API** (`@anthropic-ai/sdk`) | For the personalized summary paragraph only |
| Email | **Resend** (`resend` npm) | Free tier 3k/month; simple API; React Email templates |
| Deployment | **Vercel** | Native Next.js; env var management; analytics |
| Testing | **Vitest** + **@testing-library/react** | Fast, ESM-native; good for unit-testing audit engine |
| CI | **GitHub Actions** | Lint + tests on every push to `main` |

**Do not use:** Prisma (overkill for this schema), tRPC (adds complexity), any component
library that pre-styles everything (MUI, Ant Design — use shadcn primitives instead).

---

## 3. Repository Structure

```
/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout: fonts, metadata, OG defaults
│   ├── page.tsx                  # Landing page + form entry point
│   ├── audit/
│   │   └── [auditId]/
│   │       └── page.tsx          # Shareable audit result page (SSR for OG)
│   └── api/
│       ├── audit/
│       │   └── route.ts          # POST: save audit, return auditId
│       ├── summary/
│       │   └── route.ts          # POST: generate AI summary paragraph
│       └── leads/
│           └── route.ts          # POST: capture email lead
├── components/
│   ├── ui/                       # shadcn/ui primitives (auto-generated)
│   ├── form/
│   │   ├── SpendForm.tsx         # Main multi-step input form
│   │   ├── ToolRow.tsx           # Per-tool input: plan selector + spend + seats
│   │   └── FormPersistence.tsx   # localStorage sync hook
│   ├── results/
│   │   ├── AuditResults.tsx      # Full results layout
│   │   ├── HeroSavings.tsx       # Big monthly/annual savings number
│   │   ├── ToolBreakdown.tsx     # Per-tool card: current → recommended → savings
│   │   ├── AISummary.tsx         # The ~100-word AI paragraph
│   │   ├── SavingsCTA.tsx        # Shown when savings > $500/mo
│   │   └── ShareButton.tsx       # Copy unique URL to clipboard
│   ├── LeadCaptureModal.tsx      # Email gate modal (shown after results render)
│   └── OGImage.tsx               # Dynamic OG image via next/og (optional)
├── lib/
│   ├── audit-engine/
│   │   ├── index.ts              # Main runAudit(input) → AuditResult
│   │   ├── rules.ts              # Per-tool recommendation rules
│   │   ├── pricing.ts            # Canonical pricing data (typed, sourced)
│   │   └── types.ts              # All shared types for the audit domain
│   ├── db/
│   │   ├── supabase.ts           # Supabase client (server + browser)
│   │   └── schema.sql            # The SQL you ran to create tables
│   ├── email/
│   │   ├── resend.ts             # Resend client
│   │   └── templates/
│   │       └── AuditConfirmation.tsx  # React Email template
│   ├── anthropic.ts              # Anthropic client + generateSummary()
│   └── utils.ts                  # formatCurrency, cn(), etc.
├── hooks/
│   ├── useFormPersistence.ts     # Reads/writes form state to localStorage
│   └── useAudit.ts               # Client-side audit submission state machine
├── types/
│   └── index.ts                  # Re-exports from lib/audit-engine/types.ts
├── __tests__/
│   ├── audit-engine.test.ts      # ≥5 tests covering the audit engine
│   └── utils.test.ts
├── .github/
│   └── workflows/
│       └── ci.yml
├── ARCHITECTURE.md
├── PRICING_DATA.md
├── PROMPTS.md
├── TESTS.md
└── .env.example
```

---

## 4. Data Models & Types

Define these in `lib/audit-engine/types.ts` before writing any other code.

```typescript
// The tools the app supports
export type ToolId =
  | 'cursor'
  | 'github-copilot'
  | 'claude'
  | 'chatgpt'
  | 'anthropic-api'
  | 'openai-api'
  | 'gemini'
  | 'windsurf';

// Use case influences which alternative tools are surfaced
export type UseCase = 'coding' | 'writing' | 'data' | 'research' | 'mixed';

// Per-tool input from the form
export interface ToolInput {
  toolId: ToolId;
  planId: string;           // e.g. 'pro', 'business', 'enterprise', 'api'
  monthlySpend: number;     // what they actually pay per month (USD)
  seats: number;            // number of users/seats on this tool
}

// The full form submission
export interface AuditInput {
  tools: ToolInput[];
  teamSize: number;
  useCase: UseCase;
}

// The verdict for one tool
export type RecommendationAction =
  | 'downgrade'        // cheaper plan from same vendor
  | 'upgrade'          // counter-intuitive: they need the next plan up (per-seat calc)
  | 'switch'           // a different tool fits better for their use case
  | 'use-credits'      // same tool, buy through discounted credits
  | 'optimal'          // already on the right plan
  | 'review-usage';    // API spend — can't give a plan rec, flag for review

export interface ToolRecommendation {
  toolId: ToolId;
  currentSpend: number;
  recommendedAction: RecommendationAction;
  recommendedPlanId: string | null;         // null for 'switch' or 'review-usage'
  recommendedToolId: ToolId | null;         // non-null for 'switch'
  projectedMonthlySpend: number;
  monthlySavings: number;                   // currentSpend - projectedMonthlySpend
  reasoning: string;                        // 1–2 sentences. Finance-literate tone.
}

// The full audit result
export interface AuditResult {
  input: AuditInput;
  recommendations: ToolRecommendation[];
  totalCurrentSpend: number;
  totalProjectedSpend: number;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  isOptimal: boolean;                       // true if totalMonthlySavings < $10
  isHighSavings: boolean;                   // true if totalMonthlySavings > $500
  aiSummary: string | null;                 // filled after Anthropic call
  createdAt: string;                        // ISO timestamp
}

// What gets stored in Supabase
export interface StoredAudit {
  id: string;                   // uuid
  audit_result: AuditResult;   // full JSON blob
  public_slug: string;          // short random string for the URL
  email: string | null;         // populated after lead capture
  company_name: string | null;
  role: string | null;
  created_at: string;
}
```

---

## 5. Pricing Data

**Before writing `lib/audit-engine/pricing.ts`, go verify current pricing from official
vendor pages.** Document every number in `PRICING_DATA.md` with the source URL and date.

The shape of `pricing.ts`:

```typescript
export interface Plan {
  id: string;
  name: string;
  monthlyPricePerSeat: number;   // USD. For flat-rate plans: price / 1 seat
  isFlat: boolean;               // true = not per-seat (e.g. Claude Pro = $20 flat)
  minSeats?: number;
  maxSeats?: number;             // null = unlimited
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
```

**Tools to include (fetch current pricing from official pages):**

- **Cursor** — `cursor.sh/pricing` — plans: Hobby (free), Pro, Business, Enterprise
- **GitHub Copilot** — `github.com/features/copilot` — Individual, Business, Enterprise
- **Claude** — `claude.ai/pricing` — Free, Pro, Max, Team, Enterprise
- **Anthropic API** — `anthropic.com/pricing` — usage-based; treat as flat monthly
  (ask user for their monthly API bill directly)
- **ChatGPT** — `openai.com/chatgpt/pricing` — Free, Plus, Team, Enterprise
- **OpenAI API** — `openai.com/api/pricing` — usage-based (same pattern as Anthropic API)
- **Gemini** — `one.google.com/about/plans` — Free, Google One AI Premium (Gemini Advanced), API
- **Windsurf** — `windsurf.com/pricing` — Free, Pro, Team

---

## 6. Audit Engine Logic

Located in `lib/audit-engine/rules.ts` and orchestrated by `lib/audit-engine/index.ts`.

### 6.1 `runAudit(input: AuditInput): AuditResult`

For each tool in `input.tools`, call `evaluateTool(tool, input)` to get a
`ToolRecommendation`. Sum savings. Set flags.

### 6.2 `evaluateTool(tool: ToolInput, context: AuditInput): ToolRecommendation`

Think step-by-step for each of these rules. All reasoning must be defensible to a
finance-literate person who knows these tools.

#### Rule Category A — Wrong plan for seat count
Check if the user's `monthlySpend / seats` implies they're paying a per-seat rate that
doesn't match any standard plan. Examples:

- **GitHub Copilot**: If `seats <= 5` and they're on Business ($19/seat), flag —
  Individual ($10/seat) is identical feature-wise for solo devs or tiny teams without
  enterprise SSO needs. Savings = (19 - 10) × seats.
- **Claude Team**: If `seats <= 2`, Team plan adds features (admin, billing) that likely
  go unused. Pro ($20 flat) per user might be cheaper if each person has their own
  account. Do the per-seat math.
- **ChatGPT Team**: Same logic — minimum billing is 2 seats. If team is 1–2 and use case
  is personal productivity, Plus ($20/month flat) is sufficient.
- **Cursor Business**: If `seats <= 2`, Pro ($20/seat) has nearly all the same features
  for small teams. Business adds centralized billing and audit logs — only worth it if
  they actually need those. Flag if seats ≤ 3.

#### Rule Category B — Cheaper same-vendor alternative
- **Claude Max ($100/mo)**: If `monthlySpend` ≈ $100 and `seats` = 1, ask: is Max
  usage justified? Max is 5× Pro usage limits. If use case is 'writing' or 'research'
  (not heavy API/coding), Pro ($20) covers most users. Flag for downgrade + $80 savings.
- **Cursor Pro → Hobby**: If `seats` = 1 and `useCase` = 'writing'|'research' (not coding),
  Cursor is a coding tool — maybe they don't need it at all. Surface this as a 'review-usage'.
- **Any Enterprise plan with estimated seat count < 10**: Enterprise usually has a seat
  minimum and adds SSO/compliance features. If team is small, recommend Business/Team.

#### Rule Category C — Better alternative for use case

These are the most valuable recommendations. Be precise, not generic.

| Current Tool | Use Case | Alternative | Why |
|---|---|---|---|
| Cursor Pro | writing / research | Claude Pro | Cursor is a coding IDE assistant; for writing tasks, Claude's interface is a better fit and cheaper |
| GitHub Copilot Business | mixed / research | Cursor Pro | At similar per-seat cost, Cursor has stronger completions + agentic coding; if not using GitHub-native features, Copilot's IDE advantage is moot |
| ChatGPT Plus | coding | Cursor Hobby (free) + Claude Pro | For coding-heavy workflows, an IDE-native assistant outperforms a chat interface; Claude Pro handles non-coding AI needs |
| Gemini Pro | coding | GitHub Copilot Individual or Cursor Hobby | Gemini API is strong but Gemini Advanced is a consumer product; for coding use cases, purpose-built tools win |
| Both Anthropic API + Claude Pro | any | Anthropic API only | If they're paying for API access AND a Claude.ai subscription, and their use case can be served by API, they're double-paying. Pro is ~$20/mo — if API spend is already >$50/mo they'd be better off routing all usage through API + a lightweight UI. |
| Both OpenAI API + ChatGPT Plus | any | OpenAI API only | Same as above. Flag the redundancy. |

#### Rule Category D — API usage flags

When `planId === 'api'` for Anthropic or OpenAI, you can't recommend a different plan
(it's usage-based), but you can:
- Compare their stated monthly spend against what a flat plan would cost.
  If `monthlySpend < $30`, flag: "A Claude Pro subscription ($20/mo) includes generous
  limits and costs less than your current API spend — consider it for interactive use."
- If `monthlySpend > $200` on API, that's a power-user signal. No downgrade recommendation;
  note that negotiating API pricing directly with the vendor or batching requests more
  efficiently are the main levers at this spend level.

#### Rule Category E — Already optimal
If after all checks a tool has no recommendation, set `recommendedAction: 'optimal'` and
`monthlySavings: 0`. Do NOT manufacture a recommendation just to have one. The
"You're spending well" result is an honest and important outcome — it builds trust.

### 6.3 High-Savings CTA Logic

```typescript
// In AuditResult
isHighSavings = totalMonthlySavings > 500;
```

When `isHighSavings === true`, show `<SavingsCTA />` prominently below the breakdown.
The message should be actionable and direct: something like "At this spend level, it's
worth spending an hour reviewing your contracts and negotiating annual pricing with each
vendor. The ROI is immediate." Keep it useful, not salesy.

When `isHighSavings === false && totalMonthlySavings < 100`:
- Still capture the email, but change the CTA to "notify me when new optimizations apply."
- Don't manufacture urgency — their stack is fine.

---

## 7. Form Design (Phase 3)

The form lives on the home page (`app/page.tsx`) and is the user's entry point.

### 7.1 Structure

**Step 1 — Context**
- Team size (number input)
- Primary use case (radio: Coding / Writing / Data / Research / Mixed)

**Step 2 — Tools**
For each supported tool, show a row:
- Toggle/checkbox to include this tool
- Plan selector (dropdown — options change based on toolId)
- Monthly spend ($USD — number input with $ prefix)
- Number of seats (number input, min 1)

Start with all tools unchecked. Only selected tools count toward the audit.

**Step 3 — Run Audit button**
- Validate that at least one tool is selected
- Validate that each selected tool has spend > 0 and seats ≥ 1
- Show field-level validation errors inline, not in a toast
- On submit: POST to `/api/audit`

### 7.2 Form Persistence

Use `localStorage` to save form state on every change. On page load, rehydrate from
localStorage. Key: `spend-audit-form-v1`. This is a hook in `hooks/useFormPersistence.ts`.

```typescript
// Pseudocode for the hook
export function useFormPersistence<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
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

### 7.3 UX Details
- The plan dropdown for each tool must be populated from `pricing.ts` — never hardcoded
  in the form component itself.
- If the user selects "API direct" as a plan, replace the seats input with a note:
  "API pricing is usage-based — enter your average monthly bill."
- Show a running total of current monthly spend as they fill in the form (a live preview
  in a sticky sidebar or footer bar on desktop).

---

## 8. Results Page (Phase 4)

### 8.1 Layout Priority
This is the page that gets screenshotted and shared. Design it with visual pride.
Apply the frontend-design skill. Think about what would look good in a tweet.

Hierarchy:
1. **Hero section** — Total monthly savings (large, immediate). Annual savings below.
   If optimal, show a green "You're spending well" hero instead.
2. **Per-tool breakdown** — One card per tool in the audit. Each card:
   - Tool name + current plan
   - Current spend → arrow → recommended spend
   - Savings badge (green) or "Already optimal" badge (neutral)
   - Reasoning text (1–2 sentences, finance-literate)
3. **AI summary paragraph** — Under the breakdown cards. Skeleton loading state while
   the Anthropic API call resolves.
4. **High-savings CTA** — Only shown when `isHighSavings === true`.
5. **Share button** — Copy the unique URL. Shows a clipboard confirmation.
6. **Email gate** — A modal that appears ~2 seconds after results load. Dismissible.
   Shows again on next visit. Not a blocker — user can close it and still see the results.

### 8.2 Route: `/audit/[auditId]`
- This page is SSR (not client-only) so OG tags render correctly for crawlers.
- Fetches the stored audit from Supabase by slug.
- **Public version strips PII**: email and company name are not shown on the public URL.
  Only the tool stack, spend, and savings numbers.

### 8.3 Open Graph Tags
Set in `generateMetadata()` in `app/audit/[auditId]/page.tsx`:

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const audit = await getAuditBySlug(params.auditId);
  return {
    title: `My team could save $${audit.totalMonthlySavings}/mo on AI tools`,
    description: `AI spend audit: $${audit.totalCurrentSpend}/mo → $${audit.totalProjectedSpend}/mo. Free audit at tryflint.app.`,
    openGraph: {
      title: `I just audited my AI tool spend — $${audit.totalAnnualSavings}/yr in savings found`,
      description: `Free AI spend audit with Flint. Takes 2 minutes.`,
      type: 'website',
      url: `https://tryflint.app/audit/${params.auditId}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `AI Spend Audit — $${audit.totalAnnualSavings}/yr savings found`,
    },
  };
}
```

---

## 9. AI Summary (Phase 5)

### 9.1 Route: `POST /api/summary`
Request body: `{ auditResult: AuditResult }`
Response: `{ summary: string }`

### 9.2 The Prompt
The full prompt lives in `PROMPTS.md`. Here is the structure — you must refine it:

```
System:
You are a financial analyst who specializes in software cost optimization for startups.
Write in a direct, clear, slightly dry tone — like a smart CFO giving honest feedback, not a
salesperson. Avoid hype. Use exact numbers from the audit.

User:
Write a 80–120 word personalized summary of this AI spend audit result.

Current spend: $[totalCurrentSpend]/month across [toolCount] tools.
Recommended spend: $[totalProjectedSpend]/month.
Monthly savings: $[totalMonthlySavings] ($[totalAnnualSavings]/year).
Team size: [teamSize]. Primary use case: [useCase].

Top recommendations:
[list top 3 recommendations as bullet points with tool name and reasoning]

The summary should:
- Open with the single most impactful finding
- Name the specific tools where money is being saved, and how much
- Close with one concrete next step
- Be honest if savings are modest or zero
- Never mention any specific vendor in a promotional or affiliate context
```

### 9.3 Fallback
Wrap the Anthropic call in try/catch. On failure, return a template string:

```typescript
function buildFallbackSummary(result: AuditResult): string {
  if (result.isOptimal) {
    return `Your team's AI tool stack looks well-optimized. Current spend of $${result.totalCurrentSpend}/month is appropriate for your team size and use case. No significant changes recommended at this time.`;
  }
  return `This audit identified $${result.totalMonthlySavings}/month ($${result.totalAnnualSavings}/year) in potential savings across your AI tool stack. The biggest opportunity is ${result.recommendations[0]?.reasoning ?? 'reviewing your current plan mix'}. Review each recommendation above and consider making changes at your next renewal date.`;
}
```

### 9.4 Anthropic Client

```typescript
// lib/anthropic.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateSummary(auditResult: AuditResult): Promise<string> {
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514', // Always use claude-sonnet-4-20250514
      max_tokens: 256,
      messages: [{ role: 'user', content: buildSummaryPrompt(auditResult) }],
      system: SYSTEM_PROMPT,
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

---

## 10. Database Schema (Supabase)

Run this SQL in the Supabase SQL editor and copy it to `lib/db/schema.sql`:

```sql
-- Stored audits (public results)
CREATE TABLE audits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_slug   TEXT UNIQUE NOT NULL,   -- short random string (e.g. "xk7p2m")
  audit_result  JSONB NOT NULL,          -- full AuditResult, PII-stripped
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Leads (private — never exposed in public URLs)
CREATE TABLE leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id      UUID REFERENCES audits(id),
  email         TEXT NOT NULL,
  company_name  TEXT,
  role          TEXT,
  team_size     INT,
  total_monthly_savings NUMERIC,        -- denormalized for easy filtering
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting (simple IP-based)
CREATE TABLE rate_limits (
  ip_hash       TEXT PRIMARY KEY,
  audit_count   INT DEFAULT 1,
  window_start  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audits_slug ON audits(public_slug);
CREATE INDEX idx_leads_audit ON leads(audit_id);
CREATE INDEX idx_leads_savings ON leads(total_monthly_savings DESC);
```

Row-Level Security: Enable RLS. Service role key (server-side only) bypasses it.
Anon key (client-side) should have SELECT on `audits` only (for public result pages).

```sql
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Public can read audits
CREATE POLICY "audits_public_read" ON audits FOR SELECT USING (true);

-- Only service role can write
CREATE POLICY "audits_service_write" ON audits FOR INSERT WITH CHECK (false); -- blocked for anon
CREATE POLICY "leads_service_only" ON leads FOR ALL USING (false);
```

---

## 11. API Routes

### `POST /api/audit`
1. Validate request body against `AuditInput` schema (use `zod`)
2. IP rate limit check: max 10 audits per IP per hour. Store in `rate_limits` table.
   On limit hit: return 429.
3. Run `runAudit(input)` to get `AuditResult`
4. Generate `publicSlug` (6-char nanoid: `import { nanoid } from 'nanoid'`)
5. Call `generateSummary(auditResult)` (handles its own fallback)
6. Store in `audits` table
7. Return `{ auditId: publicSlug, auditResult }`

```typescript
// Honeypot abuse protection
// Add a hidden field `website` to the form. If it's filled in, it's a bot.
// Check: if (body.website) return 429
```

### `POST /api/leads`
1. Validate: email (required), company_name, role, team_size (all optional)
2. Look up audit by `auditId` from body
3. Check for duplicate: if this IP already submitted a lead for this audit, return 200 silently
4. Insert into `leads` table
5. Trigger transactional email via Resend
6. Return `{ success: true }`

### `GET /api/audit/[slug]`
- Returns the full `AuditResult` for a given slug (for client-side hydration if needed)
- Strips email and company_name from the response

---

## 12. Email Template

Use `@react-email/components` for the transactional email.

The email should:
- Thank them for completing the audit
- Show the summary: total savings, top recommendation
- For high-savings audits: include a practical next step ("at this level, it's worth a vendor pricing call")
- For low-savings / optimal audits: include the "notify me" framing
- Include a link back to their shareable audit URL
- Plain text fallback

Keep it short. Nobody reads long transactional emails.

---

## 13. Lead Capture Modal

Shown ~2 seconds after results first render (use `setTimeout` + a state flag).
Dismissible with Escape key and a ×  button. Should NOT appear again if already submitted
or already dismissed in this session (track with `sessionStorage`).

Fields:
- Email* (required)
- Company name (optional)
- Role (optional)

Do not show "by submitting you agree to X" dark patterns. A simple privacy note:
"We'll send you a copy of this audit. No spam." is sufficient.

Honeypot: include a `<input type="text" name="website" className="sr-only" tabIndex={-1} />`.
Check server-side that `website` is empty.

---

## 14. Shareable URL

Each audit result is at `/audit/[publicSlug]`. The slug is 6 chars from nanoid.
This page is fully accessible without login. PII (email, company) is never shown.

The **Share button** copies `window.location.href` to the clipboard. On success, show
a "Link copied!" tooltip that fades after 2 seconds.

---

## 15. Testing (Vitest)

Minimum 5 tests for the audit engine. Put them in `__tests__/audit-engine.test.ts`.

**Required test cases:**
1. **Downgrade correctly identified**: User with 2 seats on GitHub Copilot Business
   ($19/seat = $38/mo). Expected: recommend Individual ($10/seat = $20/mo), savings $18/mo.
2. **Optimal case not manufactured**: User on Claude Pro ($20/mo), 1 seat, use case writing.
   Expected: `recommendedAction: 'optimal'`, `monthlySavings: 0`.
3. **Cross-tool switch**: User on ChatGPT Plus ($20/mo) with use case 'coding'. Expected:
   a recommendation to consider a coding-specific tool.
4. **API vs subscription double-pay detection**: User paying for both Anthropic API ($80/mo)
   AND Claude Pro ($20/mo). Expected: flag the redundancy.
5. **High-savings flag**: Build an audit with total savings > $500/mo. Assert `isHighSavings === true`.
6. (Bonus) **Total savings math**: Assert `totalMonthlySavings = sum(recommendation.monthlySavings)`.
7. (Bonus) **Zero tools input**: Should return a valid AuditResult with `isOptimal: true`.

All tests must actually run: `npx vitest run`. Document how in `TESTS.md`.

---

## 16. CI/CD

`.github/workflows/ci.yml`:

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
          # Tests that don't need real secrets should not need env vars
          # If they do, use test doubles / mocks
          CI: true
```

The CI badge must be green on the latest commit before you consider this done.

---

## 17. Accessibility Checklist

Before declaring any page complete, run through this:

- [ ] Every form input has a `<label>` (not just `placeholder`)
- [ ] Error messages are associated with inputs via `aria-describedby`
- [ ] Color is not the only indicator of state (use icons + color together)
- [ ] Focus styles are visible (do not remove `outline` without replacing it)
- [ ] All interactive elements are keyboard-reachable (Tab order makes sense)
- [ ] Images have `alt` text; decorative images have `alt=""`
- [ ] Dynamic content changes (audit results appearing) are announced via `aria-live`
- [ ] Savings numbers use `aria-label` to give screen reader context (not just "$500")
- [ ] The modal traps focus when open; returns focus to trigger on close
- [ ] Color contrast ratio ≥ 4.5:1 for body text, ≥ 3:1 for large text

---

## 18. Performance Checklist

- [ ] No layout shift on form rehydration from localStorage (set initial state correctly)
- [ ] Audit results page: the audit data is SSR — no client fetch waterfall for OG
- [ ] AI summary uses streaming or shows a skeleton loader — never blocks the rest of UI
- [ ] Images optimized with `next/image`
- [ ] Fonts loaded via `next/font` (not CDN `<link>` tags) to avoid layout shift
- [ ] No `use client` on any page that doesn't need interactivity at the root

---

## 19. Documentation Files to Create

### `ARCHITECTURE.md`
Include:
- Mermaid system diagram showing: User → Form → API Route → Audit Engine → Supabase → Results Page
- Data flow narrative: "A user's form submission becomes a `POST /api/audit` request which runs `runAudit()` synchronously server-side, stores the result in Supabase, then returns the `publicSlug` to the client which redirects to `/audit/[slug]`."
- Why Next.js (SSR for OG tags is the key reason)
- What you'd change at 10k audits/day: async queue for AI summary, edge caching for result pages, separate read replica

### `PRICING_DATA.md`
Format every entry as:
```markdown
## Cursor
- Hobby: $0/month — https://cursor.sh/pricing — verified YYYY-MM-DD
- Pro: $X/user/month — https://cursor.sh/pricing — verified YYYY-MM-DD
- Business: $X/user/month — ...
```

### `PROMPTS.md`
- The full system prompt and user prompt for the audit summary
- What you tried that didn't work
- Why you structured it the way you did

### `TESTS.md`
- List every test file, what it covers, how to run it
- `npx vitest run` to run all
- `npx vitest run --reporter=verbose` for detailed output

### `.env.example`
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

---

## 20. Build Phases & Order

Work in this order. Do not skip ahead. Verify each phase works before continuing.

### Phase 1 — Project Scaffold
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=no
npx shadcn@latest init
```
Set up folder structure. Create all type files (`types/index.ts`, `lib/audit-engine/types.ts`).
Commit: `chore: initial project scaffold with types`

### Phase 2 — Pricing Data & Audit Engine
Verify pricing from vendor pages. Write `PRICING_DATA.md`. Implement `pricing.ts`.
Implement `rules.ts` and `index.ts` (the audit engine). **No UI yet.**
Write the 5+ Vitest tests and make them pass.
Commit: `feat: audit engine with pricing data and tests`

### Phase 3 — Database & API Routes
Set up Supabase project. Run schema SQL. Implement Supabase client.
Implement `POST /api/audit`. Implement `POST /api/leads`.
Test both routes with a REST client (curl or HTTPie).
Commit: `feat: supabase schema and API routes`

### Phase 4 — Form UI
Apply the frontend-design skill. Build `SpendForm.tsx` with form persistence.
Connect to `POST /api/audit`. Redirect to `/audit/[slug]` on success.
Verify form validation, localStorage persistence, and submission.
Commit: `feat: spend input form with persistence`

### Phase 5 — Results Page
Build `AuditResults.tsx` and all sub-components. Set OG metadata.
Connect `LeadCaptureModal.tsx` to `POST /api/leads`.
Test the shareable URL is publicly accessible and OG tags render.
Commit: `feat: audit results page with OG tags and lead capture`

### Phase 6 — AI Summary
Implement Anthropic client + `generateSummary()`. Integrate into `POST /api/audit`.
Wire `AISummary.tsx` component to show the paragraph. Verify fallback works by
temporarily throwing an error.
Write the prompt in `PROMPTS.md`.
Commit: `feat: AI-generated personalized audit summary with fallback`

### Phase 7 — Email
Implement React Email template. Wire Resend into `POST /api/leads`.
Test by submitting a real lead (use your own email).
Commit: `feat: transactional email on lead capture`

### Phase 8 — CI, Polish, Deploy
Set up `.github/workflows/ci.yml`. Ensure lint and tests pass.
Run Lighthouse on the deployed Vercel URL. Fix anything below threshold.
Complete all documentation files.
Commit: `chore: CI workflow, accessibility fixes, documentation`

### Phase 9 — Bonus Features (only if Phase 1–8 are solid)
- PDF export of the audit report (use `@react-pdf/renderer` or `puppeteer`)
- Benchmark mode: "your AI spend per dev is $X, median for your team size is $Y"
- Embeddable `<script>` widget

---

## 21. Common Pitfalls to Avoid

- **Don't generate audit recommendations without the full `AuditInput` context.** Team
  size and use case affect which alternative to surface. A solo researcher and a 10-person
  engineering team on the same plan get different recommendations.
- **Don't show the high-savings CTA for < $500/mo savings.** It looks desperate and undermines trust.
- **Don't block the results UI on the AI summary.** Show the full audit result immediately;
  load the summary asynchronously into its section.
- **Don't store email in the public `audits` table.** PII lives only in `leads`.
- **Don't skip the honeypot.** Bots will find the form.
- **Don't invent savings.** If a tool is well-chosen, say so. The "optimal" path is a
  feature, not a failure.
- **Don't put `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_` variable.** It gives
  everyone unrestricted database access.

---

## 22. Definition of Done

The app is done when:
- [ ] All 6 MVP features work end-to-end in production (not just localhost)
- [ ] A cold visitor can complete an audit in under 3 minutes
- [ ] The shareable URL works and shows correct OG preview in a Twitter/Slack unfurl
- [ ] Email is received within 30 seconds of lead capture
- [ ] Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 90, Best Practices ≥ 90
- [ ] CI is green
- [ ] All 5+ tests pass
- [ ] `PRICING_DATA.md`, `PROMPTS.md`, `ARCHITECTURE.md`, `TESTS.md` are complete
- [ ] No secrets in the repo
- [ ] `.env.example` is accurate and complete
