'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Workflow, Menu, X } from 'lucide-react';

interface NavbarConfig {
  logo?: { text?: string; image?: string | null } | string;
  logoText?: string;
  links?: { text: string; href: string; type?: string }[];
  ctaButton?: { text: string; href: string };
  bgColor?: string;
  sticky?: boolean;
  showLoginLink?: boolean;
  loginHref?: string;
}

function CtaLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const isExternal = href.startsWith('http') || href.startsWith('//');
  return isExternal ? (
    <a href={href} className={className}>{children}</a>
  ) : (
    <Link href={href} className={className}>{children}</Link>
  );
}

export function DynamicLandingHeader({ config }: { config?: NavbarConfig }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // logo peut être un objet { text, image } (ancien format) ou une string URL (nouveau format CMS)
  const logoObj = typeof config?.logo === 'object' && config?.logo ? config.logo : null;
  const logoImageUrl = typeof config?.logo === 'string' ? config.logo : logoObj?.image || null;
  const logoText = config?.logoText || logoObj?.text || 'TalosPrimes';
  const links = config?.links || [];
  const ctaButton = config?.ctaButton || { text: 'Essayer gratuitement', href: '/inscription' };
  const showLoginLink = config?.showLoginLink !== false;
  const loginHref = config?.loginHref || '/login';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800/60">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-white font-semibold tracking-tight">
          {logoImageUrl ? (
            <img src={logoImageUrl} alt={logoText} className="h-8 w-auto" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Workflow className="w-4.5 h-4.5 text-white" strokeWidth={2} />
            </div>
          )}
          <span className="text-lg">{logoText}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link, i) => {
            const isAnchor = link.href.startsWith('#');
            return isAnchor ? (
              <a key={i} href={link.href} className="px-3 py-2 text-slate-400 text-sm hover:text-white rounded-lg hover:bg-slate-800 transition">
                {link.text}
              </a>
            ) : (
              <Link key={i} href={link.href} className="px-3 py-2 text-slate-400 text-sm hover:text-white rounded-lg hover:bg-slate-800 transition">
                {link.text}
              </Link>
            );
          })}
          {showLoginLink && (
            <>
              <div className="w-px h-5 bg-slate-700 mx-2" />
              <Link href={loginHref} className="px-3 py-2 text-slate-300 text-sm font-medium hover:text-white rounded-lg hover:bg-slate-800 transition">Connexion</Link>
            </>
          )}
          <CtaLink href={ctaButton.href} className="ml-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition shadow-sm">
            {ctaButton.text}
          </CtaLink>
        </div>

        {/* Hamburger mobile */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Menu mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-t border-slate-800 px-4 py-4 space-y-1 shadow-xl">
          {links.map((link, i) => {
            const isAnchor = link.href.startsWith('#');
            return isAnchor ? (
              <a key={i} href={link.href} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-slate-400 text-sm rounded-lg hover:bg-slate-800 transition">
                {link.text}
              </a>
            ) : (
              <Link key={i} href={link.href} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-slate-400 text-sm rounded-lg hover:bg-slate-800 transition">
                {link.text}
              </Link>
            );
          })}
          <div className="border-t border-slate-800 pt-3 mt-3 space-y-2">
            {showLoginLink && (
              <Link href={loginHref} onClick={() => setMobileMenuOpen(false)} className="block w-full text-center px-4 py-2.5 border border-slate-700 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-800 transition">
                Connexion
              </Link>
            )}
            <CtaLink href={ctaButton.href} className="block w-full text-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition">
              {ctaButton.text}
            </CtaLink>
          </div>
        </div>
      )}
    </header>
  );
}
