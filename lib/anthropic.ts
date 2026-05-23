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
