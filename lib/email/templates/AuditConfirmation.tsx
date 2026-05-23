import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface AuditConfirmationProps {
  auditSlug: string;
  totalMonthlySavings: number;
  isOptimal: boolean;
  baseUrl?: string;
}

export function AuditConfirmation({
  auditSlug,
  totalMonthlySavings,
  isOptimal,
  baseUrl = 'https://tryflint.app',
}: AuditConfirmationProps) {
  const auditUrl = `${baseUrl}/audit/${auditSlug}`;

  return (
    <Html>
      <Head />
      <Preview>
        {isOptimal
          ? "Your AI tool stack is well-optimized — here's your audit."
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
              At this spend level, it&apos;s worth spending an hour reviewing your contracts
              and negotiating annual pricing with each vendor. The ROI is immediate.
            </Text>
          )}

          <Hr style={{ borderColor: '#e5e7eb', margin: '32px 0' }} />

          <Text style={{ fontSize: '13px', color: '#9ca3af' }}>
            We&apos;ll send you a copy of future optimization tips as new tools launch.
            No spam — you can unsubscribe at any time.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
