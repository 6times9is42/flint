'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AuditInput } from '@/lib/audit-engine/types';

/**
 * State machine for audit submission.
 * Tracks loading, error, and success states.
 */
type AuditState = 'idle' | 'submitting' | 'error';

/**
 * Hook for submitting an audit form to the backend.
 * Handles POST to /api/audit, error handling, and routing to results page.
 *
 * @returns { state, error, submitAudit }
 *   - state: 'idle' | 'submitting' | 'error'
 *   - error: error message if state === 'error'
 *   - submitAudit: async function to submit audit
 */
export function useAudit() {
  const [state, setState] = useState<AuditState>('idle');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submitAudit(input: AuditInput & { website?: string }) {
    setState('submitting');
    setError(null);

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to submit audit');
      }

      const { auditId } = await res.json();

      // Redirect to the results page
      router.push(`/audit/${auditId}`);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return { state, error, submitAudit };
}
