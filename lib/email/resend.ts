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
    subject:
      totalMonthlySavings < 10
        ? 'Your Flint AI spend audit — stack looks healthy'
        : `Your Flint audit: $${totalMonthlySavings}/mo in savings found`,
    react: AuditConfirmation({ auditSlug, totalMonthlySavings, baseUrl: BASE_URL }),
  });
}
