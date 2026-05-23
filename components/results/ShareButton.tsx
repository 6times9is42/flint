'use client';

/**
 * ShareButton — Copies the audit URL to clipboard.
 *
 * States:
 * - Default: "Share audit →"
 * - After click (2s): "✓ Link copied!"
 *
 * aria-live="polite" on a visually separate region announces the success
 * state to screen readers without re-reading the button label mid-activation.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ShareButtonProps {
  url: string;
}

export function ShareButton({ url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API (e.g. HTTP)
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [url]);

  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        onClick={handleCopy}
        variant="outline"
        className={cn(
          'h-10 border-white/15 bg-white/[0.03] font-mono text-sm font-medium text-neutral-300 transition-all duration-200 hover:border-[#f97316]/40 hover:bg-[#f97316]/[0.05] hover:text-[#f97316]',
          copied && 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-400',
        )}
        aria-label={copied ? 'Link copied to clipboard' : 'Copy shareable audit link to clipboard'}
      >
        {copied ? (
          <span className="flex items-center gap-1.5">
            <svg
              width="12"
              height="10"
              viewBox="0 0 12 10"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M1 5l3.5 3.5L11 1"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Link copied!
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <svg
              width="12"
              height="13"
              viewBox="0 0 12 13"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="4"
                y="4"
                width="7"
                height="8"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <path
                d="M1 9V2a1 1 0 0 1 1-1h6"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            Share audit →
          </span>
        )}
      </Button>

      {/* Screen reader announcement region — separate from button label */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {copied ? 'Audit link copied to clipboard.' : ''}
      </div>
    </div>
  );
}
