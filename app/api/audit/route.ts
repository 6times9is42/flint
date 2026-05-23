import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runAudit } from '@/lib/audit-engine';
import { generateSummary } from '@/lib/anthropic';
import { supabaseServer } from '@/lib/db/supabase';
import { generateSlug } from '@/lib/utils';
import type { AuditInput } from '@/lib/audit-engine/types';

const ToolInputSchema = z.object({
  toolId: z.enum([
    'cursor',
    'github-copilot',
    'claude',
    'chatgpt',
    'anthropic-api',
    'openai-api',
    'gemini',
    'windsurf',
  ]),
  planId: z.string().min(1),
  monthlySpend: z.number().min(0),
  seats: z.number().int().min(1),
});

const AuditInputSchema = z.object({
  tools: z.array(ToolInputSchema),
  teamSize: z.number().int().min(1),
  useCase: z.enum(['coding', 'writing', 'data', 'research', 'mixed']),
  website: z.string().optional(), // honeypot — must be empty for real users
});

// Simple non-cryptographic hash of an IP address for rate-limit keying.
// We never store the raw IP; only the hash is persisted.
function hashIp(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ((hash << 5) - hash) + ip.charCodeAt(i);
    hash |= 0; // convert to 32-bit int
  }
  return hash.toString(36);
}

// Returns true if the request is within rate limits, false if exceeded.
// Limit: 10 audits per IP per rolling 1-hour window.
async function checkRateLimit(ipHash: string): Promise<boolean> {
  const db = supabaseServer();
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data } = await db
    .from('rate_limits')
    .select('audit_count, window_start')
    .eq('ip_hash', ipHash)
    .single();

  if (!data) {
    // First request from this IP — insert a fresh row
    await db.from('rate_limits').insert({ ip_hash: ipHash });
    return true;
  }

  if (data.window_start < windowStart) {
    // Window has expired — reset the counter
    await db
      .from('rate_limits')
      .update({ audit_count: 1, window_start: new Date().toISOString() })
      .eq('ip_hash', ipHash);
    return true;
  }

  if (data.audit_count >= 10) return false;

  // Increment within the current window
  await db
    .from('rate_limits')
    .update({ audit_count: data.audit_count + 1 })
    .eq('ip_hash', ipHash);
  return true;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const ipHash = hashIp(ip);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Honeypot check — bots fill in the hidden `website` field
  if (
    body &&
    typeof body === 'object' &&
    'website' in body &&
    (body as Record<string, unknown>).website
  ) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const parsed = AuditInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const allowed = await checkRateLimit(ipHash);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again in an hour.' },
      { status: 429 }
    );
  }

  const input: AuditInput = {
    tools: parsed.data.tools,
    teamSize: parsed.data.teamSize,
    useCase: parsed.data.useCase,
  };

  // Run the deterministic audit engine — no AI involved here
  const auditResult = runAudit(input);

  // Generate the AI summary paragraph (has its own fallback on error)
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
