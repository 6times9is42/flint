# Pricing Data

All prices verified from official vendor pages. Last verified: 2026-05-23.

---

## Cursor

Source: https://cursor.com/pricing — verified 2026-05-23

| Plan | Monthly Price | Type | Notes |
|------|--------------|------|-------|
| Hobby | $0/month | Flat (per user) | Free tier; limited usage |
| Individual | $20/month/user | Per-seat (flat per user) | Formerly "Pro"; full AI features |
| Teams | $40/month/user | Per-seat | Centralized billing, admin controls, audit logs |
| Enterprise | Custom | Per-seat | Contact sales; SSO, compliance, dedicated support |

**Notes:**
- Hobby plan has limited completions and chat requests
- Individual plan is essentially per-user flat rate (not per-org)
- Teams adds centralized billing and admin dashboard — the only real differentiator vs Individual for small teams

---

## GitHub Copilot

Source: https://docs.github.com/en/copilot/get-started/plans — verified 2026-05-23
Source: https://github.com/features/copilot/plans — verified 2026-05-23

| Plan | Monthly Price | Type | Notes |
|------|--------------|------|-------|
| Free | $0/month | Per-user | 50 monthly premium requests, 2,000 completions/mo |
| Pro | $10/month/user | Per-seat | 300 monthly premium requests; free for verified teachers/open-source maintainers |
| Pro+ | $39/month/user | Per-seat | 1,500 monthly premium requests; access to all models including Claude Opus 4.7 |
| Business | $19/month/seat | Per-seat | For organizations on GitHub Free/Team; includes policy management, audit logs |
| Enterprise | $39/month/seat | Per-seat | Requires GitHub Enterprise Cloud; all Business features + enterprise-grade controls |

**Notes:**
- Individual Pro and Business have near feature parity for individual developers
- Business adds organization-level policy management, audit logs, and IP indemnity
- Starting June 1, 2026, GitHub is transitioning from request-based to usage-based billing for org/enterprise plans — per-seat price is not increasing
- Pro upgrades temporarily paused as of May 2026 during billing system rollout

---

## Claude (claude.ai subscriptions)

Source: https://claude.com/pricing — verified 2026-05-23

| Plan | Monthly Price | Type | Notes |
|------|--------------|------|-------|
| Free | $0/month | Flat | Basic usage limits; access to Claude models |
| Pro | $20/month/user (monthly) or $17/month/user (annual) | Flat per user | Increased usage limits; priority access |
| Max | $100/month/user (5× limits) or higher tiers | Flat per user | 5× or 20× Pro usage limits; for heavy users |
| Team (Standard Seat) | $25/month/seat (monthly) or $20/month/seat (annual) | Per-seat | Min 5 seats, max 150; admin controls, SSO, billing management |
| Team (Premium Seat) | $125/month/seat (monthly) or $100/month/seat (annual) | Per-seat | Same team admin features + Max-level usage per seat |
| Enterprise | $20/seat + API usage at model rates | Hybrid per-seat + usage | Large-scale; advanced security, compliance, custom integrations |

**Notes:**
- Pro is a flat $20/month per individual account — not per organization seat
- Max is aimed at power users who exhaust Pro limits; 5× = $100/mo, 20× = higher
- Team plan minimum is 5 seats — for teams of 1–4, individual Pro accounts are typically cheaper
- Enterprise pricing is hybrid: per-seat fee + usage-based charges at API rates

---

## Anthropic API

Source: https://platform.claude.com/docs/en/docs/about-claude/pricing — verified 2026-05-23
Source: https://www.anthropic.com/pricing — verified 2026-05-23

Usage-based pricing (pay-per-token). Users provide their average monthly bill when auditing.

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Notes |
|-------|----------------------|------------------------|-------|
| Claude Opus 4.7 | $5.00 | $25.00 | Latest Opus; new tokenizer (up to 35% more tokens vs prior models) |
| Claude Opus 4.6 | $5.00 | $25.00 | |
| Claude Opus 4.5 | $5.00 | $25.00 | |
| Claude Sonnet 4.6 | $3.00 | $15.00 | Current Sonnet generation |
| Claude Sonnet 4.5 | $3.00 | $15.00 | |
| Claude Haiku 4.5 | $1.00 | $5.00 | Fastest/cheapest current model |
| Claude Haiku 3.5 | $0.80 | $4.00 | Retired except on Bedrock and Vertex AI |

**Discounts:**
- Batch API: 50% discount on both input and output tokens
- Prompt caching: 5-minute cache write = 1.25× input rate; cache hits = 0.1× input rate
- Data residency (US-only inference): 1.1× multiplier on all token costs

**Audit note:** This is usage-based — the audit form collects the user's average monthly API bill directly. No recommended plan can be made; spend flags are based on comparing monthly bill to flat-plan equivalents.

---

## ChatGPT (openai.com consumer plans)

Source: https://openai.com/chatgpt/pricing/ — verified 2026-05-23
Source: https://help.openai.com/en/articles/8792828-what-is-chatgpt-business — verified 2026-05-23

| Plan | Monthly Price | Type | Notes |
|------|--------------|------|-------|
| Free | $0/month | Flat | Limited GPT-4o access |
| Go | $8/month/user | Flat per user | Launched globally Jan 2026; lightweight paid tier |
| Plus | $20/month/user | Flat per user | Full GPT-4o + other models; most popular paid tier |
| Pro (standard) | $100/month/user | Flat per user | Launched April 2026; between Plus and Pro $200 |
| Pro (power) | $200/month/user | Flat per user | Maximum usage limits; o1 Pro mode |
| Business | $25/seat/month (monthly) or $20/seat/month (annual) | Per-seat | Formerly "Team"; min 2 seats; admin console, no training on data |
| Enterprise | Custom (est. $60–$100+/seat/month) | Per-seat | Annual commitment; contact sales |

**Notes:**
- ChatGPT Team was renamed to ChatGPT Business in August 2025
- Business plan annual pricing reduced from $25 to $20/seat in August 2025; monthly billing remains $25/seat
- Two Pro tiers now exist ($100 and $200) as of April 2026
- The $5 per-seat reduction in subscription pricing was applied across plans as of April 2026
- Business minimum is 2 seats — for solo users, Plus ($20/mo) is the right choice

---

## OpenAI API

Source: https://developers.openai.com/api/docs/pricing — verified 2026-05-23
Source: https://openai.com/api/pricing/ — verified 2026-05-23

Usage-based pricing (pay-per-token). Users provide their average monthly bill when auditing.

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Notes |
|-------|----------------------|------------------------|-------|
| GPT-5.5 | $5.00 | $30.00 | Flagship model |
| GPT-5.4 | $2.50 | $15.00 | |
| GPT-5.4-mini | $0.75 | $4.50 | Cost-efficient |
| GPT-5.4-nano | $0.20 | $1.25 | Fastest/cheapest tier |

**Additional API costs:**
- Web search: $10.00 per 1,000 calls (plus token costs)
- File storage: $0.10/GB per day (after free tier)
- Audio input (gpt-realtime-2): $32.00 per 1M audio tokens
- Image generation (gpt-image-2): $8.00 per 1M tokens
- Batch API: 50% discount on input and output

**Audit note:** This is usage-based — the audit form collects the user's average monthly API bill directly. Audit logic compares API spend to equivalent flat-plan options (e.g., ChatGPT Plus at $20/mo).

---

## Gemini (Google consumer subscription)

Source: https://gemini.google/subscriptions/ — verified 2026-05-23
Source: https://one.google.com/intl/en/about/google-ai-plans/ — verified 2026-05-23
Source: https://blog.google/products-and-platforms/products/google-one/google-ai-subscriptions/ — verified 2026-05-23

**Note:** The subscription formerly called "Google One AI Premium" / "Gemini Advanced" has been rebranded to **Google AI Pro** as of 2026. Plans are now: Google AI Plus, Google AI Pro, Google AI Ultra.

| Plan | Monthly Price (USD) | Type | Notes |
|------|-------------------|------|-------|
| Free | $0/month | Flat | 15 GB storage; basic Gemini access |
| Google AI Plus | ~$9.99/month | Flat | 200 GB storage; 2× higher Gemini usage limits |
| Google AI Pro | $19.99/month | Flat | 5 TB storage; 4× higher Gemini usage limits vs Free; YouTube Premium Lite; formerly "Google One AI Premium" / "Gemini Advanced" |
| Google AI Ultra | $100/month (reduced from $200–$250) | Flat | 20 TB+ storage; up to 20× more limits vs Pro; YouTube Premium; for developers and power users |

**Notes:**
- For audit purposes, the relevant plan is **Google AI Pro at $19.99/month** (the consumer Gemini Advanced equivalent)
- Google AI Plus pricing approximated based on available data; verify at one.google.com
- Plans are flat-rate individual subscriptions; storage can be shared with up to 5 family members
- This is a consumer product — for coding use cases, purpose-built tools (Cursor, GitHub Copilot) are typically more appropriate

---

## Gemini API

Source: https://ai.google.dev/gemini-api/docs/pricing — verified 2026-05-23

Usage-based pricing. Provided for reference; the Flint audit tool does not currently support Gemini API as a separate line item.

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Notes |
|-------|----------------------|------------------------|-------|
| Gemini 3.5 Flash | $1.50 | $9.00 | Latest Flash model |
| Gemini 2.5 Flash | $0.30 | $2.50 | |
| Gemini 2.5 Flash-Lite | $0.10 | $0.40 | Most cost-efficient |

- Free tier available (limited access, content may be used for product improvement)
- Batch API: 50% discount
- Flex/Priority tiers available at premium rates

---

## Windsurf

Source: https://windsurf.com/pricing — verified 2026-05-23
Source: https://windsurf.com/blog/windsurf-pricing-plans — verified 2026-05-23

| Plan | Monthly Price | Type | Notes |
|------|--------------|------|-------|
| Free | $0/month | Flat per user | Limited daily/weekly usage quota |
| Pro | $20/month/user | Flat per user | Full premium model access (SWE-1.5, etc.); daily & weekly quota refreshes |
| Max | $200/month/user | Flat per user | Heavy usage at API pricing; unlimited within quota |
| Teams | $40/month/user | Per-seat | Centralized billing, admin dashboard, SSO, RBAC, access controls |
| Enterprise | Custom | Per-seat | Volume discounts, dedicated support, custom integrations |

**Notes:**
- Windsurf Pro increased from $15 to $20/month in March 2026 (now matches Cursor Individual)
- Usage switched from a monthly credit pool to daily/weekly quotas that auto-refresh (March 2026)
- "Extra usage at API price" available when quota is exceeded on paid plans
- Teams plan is the organizational equivalent of Pro with admin features added
- A "Light" plan was shown on the pricing page but exact price is unclear/may be discontinued; Pro at $20/mo is the standard paid tier

---

## Summary Table (for audit-engine reference)

| Tool | Plan | $/month/seat | Flat or Per-seat |
|------|------|-------------|-----------------|
| Cursor | Hobby | $0 | Flat |
| Cursor | Individual | $20 | Per-user flat |
| Cursor | Teams | $40 | Per-seat |
| GitHub Copilot | Free | $0 | Per-user |
| GitHub Copilot | Pro | $10 | Per-seat |
| GitHub Copilot | Pro+ | $39 | Per-seat |
| GitHub Copilot | Business | $19 | Per-seat |
| GitHub Copilot | Enterprise | $39 | Per-seat |
| Claude | Free | $0 | Flat |
| Claude | Pro | $20 | Per-user flat |
| Claude | Max | $100 | Per-user flat |
| Claude | Team (Standard) | $25 (monthly) / $20 (annual) | Per-seat, min 5 |
| Claude | Team (Premium) | $125 (monthly) / $100 (annual) | Per-seat, min 5 |
| Anthropic API | — | Usage-based | N/A |
| ChatGPT | Free | $0 | Flat |
| ChatGPT | Go | $8 | Per-user flat |
| ChatGPT | Plus | $20 | Per-user flat |
| ChatGPT | Pro ($100) | $100 | Per-user flat |
| ChatGPT | Pro ($200) | $200 | Per-user flat |
| ChatGPT | Business | $25 (monthly) / $20 (annual) | Per-seat, min 2 |
| OpenAI API | — | Usage-based | N/A |
| Gemini | Free | $0 | Flat |
| Gemini | Google AI Pro | $19.99 | Per-user flat |
| Gemini | Google AI Ultra | $100 | Per-user flat |
| Windsurf | Free | $0 | Flat |
| Windsurf | Pro | $20 | Per-user flat |
| Windsurf | Max | $200 | Per-user flat |
| Windsurf | Teams | $40 | Per-seat |
