import { SpendForm } from '@/components/form/SpendForm';

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background grid texture */}
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

      {/* Subtle amber glow behind the form */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
        aria-hidden="true"
        style={{
          width: '600px',
          height: '400px',
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-16 sm:pt-24">
        {/* ── Brand mark ──────────────────────────────────────────────────── */}
        <header className="mb-12">
          <div className="flex items-center gap-2">
            {/* Flint "spark" mark — a minimalist geometric diamond */}
            <svg
              width="28"
              height="28"
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
          </div>

          {/* Headline */}
          <div className="mt-10">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-neutral-50 sm:text-5xl">
              Is your team{' '}
              <span
                className="relative inline-block"
                style={{
                  // Subtle underline using the amber
                  backgroundImage: 'linear-gradient(#f97316, #f97316)',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: '0 100%',
                  backgroundSize: '100% 2px',
                }}
              >
                overpaying
              </span>{' '}
              for AI tools?
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-400 sm:text-lg">
              Enter what you pay — get an instant, honest audit of your AI stack.
              No login. No upsell. Free.
            </p>
          </div>

          {/* Trust signals */}
          <div
            className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2"
            aria-label="Key features"
          >
            {[
              { icon: '⚡', text: 'Instant results' },
              { icon: '🔗', text: 'Shareable URL' },
              { icon: '🔒', text: 'No account needed' },
            ].map(item => (
              <span
                key={item.text}
                className="flex items-center gap-1.5 text-xs text-neutral-500"
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.text}
              </span>
            ))}
          </div>
        </header>

        {/* ── Form container ─────────────────────────────────────────────── */}
        <main>
          {/* Step indicator */}
          <div
            className="mb-6 flex items-center gap-2"
            aria-label="Form progress"
          >
            <StepDot number={1} label="Context" />
            <div className="h-px flex-1 bg-white/8" aria-hidden="true" />
            <StepDot number={2} label="Tools" />
          </div>

          <SpendForm />
        </main>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <footer className="mt-16 border-t border-white/8 pt-8 text-center">
          <p className="text-xs text-neutral-600">
            Pricing data verified from official vendor pages.{' '}
            <span className="text-neutral-500">Built to help, not to sell.</span>
          </p>
        </footer>
      </div>
    </div>
  );
}

// ── Small step indicator dot ──────────────────────────────────────────────────

function StepDot({ number, label }: { number: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 font-mono text-[10px] font-bold text-neutral-500"
        aria-hidden="true"
      >
        {number}
      </span>
      <span className="text-xs font-medium uppercase tracking-widest text-neutral-600">
        {label}
      </span>
    </div>
  );
}
