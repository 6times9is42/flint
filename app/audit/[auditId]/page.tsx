/**
 * /audit/[auditId] — Shareable audit result page.
 *
 * This is a SERVER component:
 * - Fetches the stored AuditResult from Supabase by public_slug
 * - Generates OG metadata so Twitter/Slack unfurls render correctly
 * - PII (email, company) is never returned here — only audit_result is exposed
 *
 * AuditResults and LeadCaptureModal are client components imported here;
 * they hydrate on the client after the initial SSR render.
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/db/supabase';
import { AuditResults } from '@/components/results/AuditResults';
import { LeadCaptureModal } from '@/components/LeadCaptureModal';
import type { AuditResult } from '@/lib/audit-engine/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ auditId: string }>;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getAuditBySlug(slug: string): Promise<AuditResult | null> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('audits')
    .select('audit_result')
    .eq('public_slug', slug)
    .single();

  if (error || !data) return null;
  return data.audit_result as AuditResult;
}

// ─── Metadata (OG tags) ───────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { auditId } = await params;
  const audit = await getAuditBySlug(auditId);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tryflint.app';
  const auditUrl = `${baseUrl}/audit/${auditId}`;

  if (!audit) {
    return {
      title: 'Audit not found — Flint',
      description: 'This audit result could not be found.',
    };
  }

  const isOptimal = audit.isOptimal;
  const monthly = Math.round(audit.totalMonthlySavings);
  const annual = Math.round(audit.totalAnnualSavings);
  const current = Math.round(audit.totalCurrentSpend);

  const title = isOptimal
    ? `My AI tool stack is well-optimised — $${current}/mo`
    : `My team could save $${monthly}/mo on AI tools`;

  const description = isOptimal
    ? `AI spend audit by Flint: $${current}/month — already well-optimised. Free audit at tryflint.app.`
    : `AI spend audit: $${current}/mo → $${Math.round(audit.totalProjectedSpend)}/mo. $${annual}/year in savings found. Free audit at tryflint.app.`;

  const ogTitle = isOptimal
    ? `I audited my AI tool spend — stack looks good at $${current}/mo`
    : `I just audited my AI tool spend — $${annual}/yr in savings found`;

  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description: 'Free AI spend audit with Flint. Takes 2 minutes.',
      type: 'website',
      url: auditUrl,
      siteName: 'Flint',
    },
    twitter: {
      card: 'summary_large_image',
      title: isOptimal
        ? `AI Spend Audit — Stack optimised at $${current}/mo`
        : `AI Spend Audit — $${annual}/yr savings found`,
      description: 'Free AI spend audit with Flint. Takes 2 minutes.',
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AuditPage({ params }: PageProps) {
  const { auditId } = await params;
  const audit = await getAuditBySlug(auditId);

  if (!audit) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tryflint.app';
  const shareUrl = `${baseUrl}/audit/${auditId}`;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background grid texture — matches form page */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Ambient amber glow — echo of form page header */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
        aria-hidden="true"
        style={{
          width: '700px',
          height: '350px',
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-2xl px-6 pb-24 pt-12 sm:pt-16">
        {/* ── Brand mark ──────────────────────────────────────────────────── */}
        <header className="mb-10">
          <a
            href="/"
            className="inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 rounded"
            aria-label="Flint — go to home page"
          >
            {/* Flint spark mark */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 28 28"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <polygon
                points="14,2 26,14 14,26 2,14"
                fill="none"
                stroke="#f97316"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <polygon
                points="14,7 21,14 14,21 7,14"
                fill="#f97316"
                opacity="0.7"
              />
            </svg>
            <span className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-[#f97316]">
              Flint
            </span>
          </a>

          <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-neutral-600">
            AI Spend Audit
          </p>
        </header>

        {/* ── Main results ────────────────────────────────────────────────── */}
        <main aria-label="Audit results">
          <AuditResults result={audit} shareUrl={shareUrl} />
        </main>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <footer className="mt-16 border-t border-white/8 pt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-neutral-700">
              Pricing data verified from official vendor pages.{' '}
              <span className="text-neutral-600">Built to help, not to sell.</span>
            </p>
            <a
              href="/"
              className="text-xs text-neutral-600 underline underline-offset-4 transition-colors hover:text-[#f97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 rounded"
            >
              Run your own audit →
            </a>
          </div>
        </footer>
      </div>

      {/* Lead capture modal — client component, renders after hydration */}
      <LeadCaptureModal auditId={auditId} />
    </div>
  );
}
