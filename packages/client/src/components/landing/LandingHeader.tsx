'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Workflow, Menu, X } from 'lucide-react';

interface LandingHeaderProps {
  companyName: string;
  ctaLabel: string;
  ctaHref: string;
}

export function LandingHeader({ companyName, ctaLabel, ctaHref }: LandingHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isExternal = (href: string) => href.startsWith('http') || href.startsWith('//');
  const CtaLink = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    isExternal(href) ? (
      <a href={href} className={className}>{children}</a>
    ) : (
      <Link href={href} className={className}>{children}</Link>
    );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-slate-900 font-semibold tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
            <Workflow className="w-4.5 h-4.5 text-white" strokeWidth={2} />
          </div>
          <span className="text-lg">{companyName}</span>
        </Link>
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <a href="#features" className="px-3 py-2 text-slate-500 text-sm hover:text-slate-900 rounded-lg hover:bg-slate-50 transition">Fonctionnalités</a>
          <Link href="/page/tarifs" className="px-3 py-2 text-slate-500 text-sm hover:text-slate-900 rounded-lg hover:bg-slate-50 transition">Tarifs</Link>
          <a href="#testimonials" className="px-3 py-2 text-slate-500 text-sm hover:text-slate-900 rounded-lg hover:bg-slate-50 transition">Témoignages</a>
          <a href="#contact" className="px-3 py-2 text-slate-500 text-sm hover:text-slate-900 rounded-lg hover:bg-slate-50 transition">Contact</a>
          <div className="w-px h-5 bg-slate-200 mx-2" />
          <Link href="/login" className="px-3 py-2 text-slate-600 text-sm font-medium hover:text-slate-900 rounded-lg hover:bg-slate-50 transition">Connexion</Link>
          <CtaLink href={ctaHref} className="ml-1 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition shadow-sm">
            {ctaLabel}
          </CtaLink>
        </div>
        {/* Hamburger mobile */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50"
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>
      {/* Menu mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-1 shadow-xl">
          <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition">Fonctionnalités</a>
          <Link href="/page/tarifs" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition">Tarifs</Link>
          <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition">Témoignages</a>
          <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition">Contact</a>
          <div className="border-t border-slate-100 pt-3 mt-3 space-y-2">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block w-full text-center px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition">
              Connexion
            </Link>
            <CtaLink href={ctaHref} className="block w-full text-center px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition">
              {ctaLabel}
            </CtaLink>
          </div>
        </div>
      )}
    </header>
  );
}
