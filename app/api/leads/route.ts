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
    return NextResponse.json({ success: true }); // silently ignore bots
  }

  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { auditId, email, companyName, role } = parsed.data;
  const db = supabaseServer();

  // Look up the audit by public slug
  const { data: audit, error: auditError } = await db
    .from('audits')
    .select('id, audit_result')
    .eq('public_slug', auditId)
    .single();

  if (auditError || !audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  // Check for duplicate lead (same email + auditId)
  // Email-based dedup is more robust than IP-based; prevents the same person from submitting multiple times
  const { data: existing } = await db
    .from('leads')
    .select('id')
    .eq('audit_id', audit.id)
    .eq('email', email)
    .single();

  if (existing) {
    return NextResponse.json({ success: true }); // silently succeed for duplicates
  }

  // Extract the data we need to store with the lead
  const auditResult = audit.audit_result as {
    totalMonthlySavings: number;
    input: { teamSize: number };
  };

  // Insert the lead
  const { error: insertError } = await db.from('leads').insert({
    audit_id: audit.id,
    email,
    company_name: companyName ?? null,
    role: role ?? null,
    team_size: auditResult.input?.teamSize ?? null,
    total_monthly_savings: auditResult.totalMonthlySavings ?? null,
  });

  if (insertError) {
    console.error('Supabase lead insert error:', insertError);
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
  }

  // Send confirmation email (non-blocking — don't wait for it or fail the response)
  sendAuditConfirmation({
    to: email,
    auditSlug: auditId,
    totalMonthlySavings: auditResult.totalMonthlySavings,
    isOptimal: auditResult.totalMonthlySavings < 10,
  }).catch((err) => {
    console.error('Email send failed:', err);
  });

  return NextResponse.json({ success: true });
}
