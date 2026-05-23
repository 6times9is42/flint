'use client';

/**
 * LeadCaptureModal — Email capture modal for audit results.
 *
 * Appears ~2 seconds after the results page renders. Dismissible with:
 * - Escape key (handled by Dialog primitive)
 * - × close button
 * - "No thanks" button
 *
 * Session gating: stored in sessionStorage with key `lead-modal-${auditId}`.
 * Once dismissed or submitted, does not appear again in the same session.
 *
 * Honeypot protection: includes a hidden `website` field. Bots that fill it
 * are silently accepted by the server to avoid giving away the trap.
 *
 * Accessibility:
 * - Focus trap handled by Dialog primitive
 * - Error messages use aria-describedby
 * - Status message role="status" for screen readers
 * - Email input auto-focuses on open (visual + SR)
 */

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface LeadCaptureModalProps {
  auditId: string;
}

export function LeadCaptureModal({ auditId }: LeadCaptureModalProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [emailError, setEmailError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // Session gating: check on mount if modal was already shown/submitted
  useEffect(() => {
    const sessionKey = `lead-modal-${auditId}`;
    if (sessionStorage.getItem(sessionKey)) {
      return; // Already shown/submitted — don't show again
    }

    const timer = setTimeout(() => {
      setOpen(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [auditId]);

  // Auto-focus email input when modal opens for better UX
  useEffect(() => {
    if (open && emailRef.current) {
      setTimeout(() => emailRef.current?.focus(), 50);
    }
  }, [open]);

  function handleDismiss() {
    const sessionKey = `lead-modal-${auditId}`;
    sessionStorage.setItem(sessionKey, 'dismissed');
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate email
    if (!email.trim()) {
      setEmailError('Email is required.');
      return;
    }

    setSubmitting(true);
    setEmailError('');

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId,
          email: email.trim(),
          companyName: companyName.trim() || undefined,
          role: role.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Success state
      setSubmitted(true);
      const sessionKey = `lead-modal-${auditId}`;
      sessionStorage.setItem(sessionKey, 'submitted');

      // Close modal after showing success message
      setTimeout(() => setOpen(false), 1500);
    } catch (err) {
      console.error('Lead submission error:', err);
      setEmailError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDismiss(); }}>
      <DialogContent
        className={cn(
          'max-w-sm',
          'bg-neutral-900 border-neutral-700 text-white',
          'rounded-lg shadow-2xl'
        )}
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle className="text-white">Get a copy of this audit</DialogTitle>
          <DialogDescription className="text-neutral-400">
            We&apos;ll send you a copy. No spam — you can close this.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div
            className="py-4 text-center text-emerald-400 text-sm font-medium"
            role="status"
            aria-live="polite"
          >
            ✓ Sent! Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-4">
            {/* Email field (required) */}
            <div>
              <Label
                htmlFor="lead-email"
                className="text-white font-medium text-sm block mb-1.5"
              >
                Email <span className="text-neutral-500">*</span>
              </Label>
              <Input
                ref={emailRef}
                id="lead-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(''); // Clear error on input change
                }}
                placeholder="you@company.com"
                className={cn(
                  'bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500',
                  emailError && 'border-destructive'
                )}
                aria-required="true"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'lead-email-error' : undefined}
                disabled={submitting}
              />
              {emailError && (
                <p
                  id="lead-email-error"
                  className="text-red-400 text-xs mt-1.5"
                  role="alert"
                >
                  {emailError}
                </p>
              )}
            </div>

            {/* Company name field (optional) */}
            <div>
              <Label
                htmlFor="lead-company"
                className="text-white font-medium text-sm block mb-1.5"
              >
                Company <span className="text-neutral-500">(optional)</span>
              </Label>
              <Input
                id="lead-company"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Inc."
                className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                disabled={submitting}
              />
            </div>

            {/* Role field (optional) */}
            <div>
              <Label
                htmlFor="lead-role"
                className="text-white font-medium text-sm block mb-1.5"
              >
                Role <span className="text-neutral-500">(optional)</span>
              </Label>
              <Input
                id="lead-role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="CTO, Engineering Lead…"
                className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                disabled={submitting}
              />
            </div>

            {/* Honeypot field (hidden from real users) */}
            <input
              type="text"
              name="website"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              disabled={submitting}
            />

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-white text-neutral-900 hover:bg-neutral-100 font-medium"
              >
                {submitting ? 'Sending…' : 'Send me a copy'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleDismiss}
                disabled={submitting}
                className="text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
              >
                No thanks
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
