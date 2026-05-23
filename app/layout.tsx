import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flint — AI Spend Audit',
  description:
    'Find out exactly where your team is overspending on AI tools. Free audit, instant results, shareable URL.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tryflint.app'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} dark`}
    >
      <body className="min-h-screen bg-neutral-950 text-neutral-50 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
