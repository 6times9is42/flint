# Prompts

## Audit Summary

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
> [bullet list — top 3 by savings, tool name + reasoning]
>
> The summary should:
> - Open with the single most impactful finding
> - Name the specific tools where money is being saved, and how much
> - Close with one concrete next step
> - Be honest if savings are modest or zero

### Design decisions

- **Model:** `claude-sonnet-4-20250514` — fast enough to be non-blocking without impacting page load, capable enough to maintain financial tone and accuracy
- **max_tokens:** 256 — enforces concise output (fits comfortably within 120 words) without risk of truncating valid responses
- **CFO tone:** Avoids the typical AI "here are some great tips!" pattern that destroys trust with finance-literate founders and CTOs. The goal is honesty, not cheerleading.
- **Fallback template:** Covers both the optimal case ("your stack is fine") and savings-found case, ensuring the UI never breaks if Anthropic is down
- **Error handling:** The Anthropic call is wrapped in try/catch — failure always returns a string, never throws. The audit result UI shows immediately; the summary loads asynchronously into its section
- **Top-3 filtering:** Sorts recommendations by monthly savings (descending) and takes the top 3. If all recommendations are $0 (optimal case), the fallback handles it gracefully
- **No affiliate links or vendor mentions:** The summary references tools by name only and never includes links or promotional language
