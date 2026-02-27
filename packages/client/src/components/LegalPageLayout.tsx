'use client';

import Link from 'next/link';
import { ArrowLeft, Workflow } from 'lucide-react';

interface LegalPageLayoutProps {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

const legalLinks = [
  { href: '/mentions-legales', label: 'Mentions légales' },
  { href: '/cgu', label: 'CGU' },
  { href: '/cgv', label: 'CGV' },
  { href: '/confidentialite', label: 'Confidentialité & RGPD' },
];

export function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-white text-slate-800 antialiased flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-slate-900 font-semibold tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Workflow className="w-4.5 h-4.5 text-white" strokeWidth={2} />
            </div>
            <span className="text-lg">TalosPrimes</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-slate-500 text-sm hover:text-slate-900 rounded-lg px-3 py-2 hover:bg-slate-50 transition">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          {/* Title */}
          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mb-2">{title}</h1>
            {lastUpdated && (
              <p className="text-sm text-slate-400">Dernière mise à jour : {lastUpdated}</p>
            )}
          </div>

          {/* Nav rapide pages légales */}
          <div className="flex flex-wrap gap-2 mb-10 pb-8 border-b border-slate-100">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 rounded-full hover:bg-slate-100 hover:text-slate-700 transition"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Corps du texte */}
          <div className="legal-content space-y-8 text-slate-600 text-[15px] leading-[1.8]">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-8 px-6 mt-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center">
                <Workflow className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <span className="text-sm text-slate-300 font-medium">TalosPrimes</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-xs">
              {legalLinks.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-slate-200 transition">{link.label}</Link>
              ))}
            </div>
            <span className="text-xs text-slate-500">&copy; {new Date().getFullYear()} TalosPrimes</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* Section helper pour structurer les pages légales */
export function LegalSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-baseline gap-2">
        <span className="text-slate-300 font-normal">{number}.</span>
        {title}
      </h2>
      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
}
