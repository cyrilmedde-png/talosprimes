'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { iconMap } from './iconMap';

interface CTAConfig {
  title?: string;
  subtitle?: string;
  ctaPrimary?: { text: string; link: string; icon?: string };
  ctaSecondary?: { text: string; link: string; icon?: string };
  bgGradient?: string;
}

function CtaLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const isExternal = href.startsWith('http') || href.startsWith('//');
  return isExternal ? (
    <a href={href} className={className}>{children}</a>
  ) : (
    <Link href={href} className={className}>{children}</Link>
  );
}

export function CTASection({ config }: { config: CTAConfig; theme?: Record<string, unknown> }) {
  const SecondaryIcon = config.ctaSecondary?.icon ? (iconMap[config.ctaSecondary.icon] || null) : null;

  return (
    <section className={`py-20 px-6 bg-gradient-to-r ${config.bgGradient || 'from-slate-900 via-slate-900 to-slate-800'}`}>
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          {config.title || 'Prêt à simplifier votre gestion ?'}
        </h2>
        <p className="text-slate-400 text-base mb-8 max-w-lg mx-auto">
          {config.subtitle || 'Rejoignez les entreprises qui automatisent leur quotidien avec TalosPrimes.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <CtaLink
            href={config.ctaPrimary?.link || '/inscription'}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-slate-900 text-sm font-medium rounded-xl hover:bg-slate-100 transition shadow-lg"
          >
            {config.ctaPrimary?.text || 'Commencer gratuitement'}
            <ArrowRight className="w-4 h-4" />
          </CtaLink>
          <CtaLink
            href={config.ctaSecondary?.link || '#contact'}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-slate-700 text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-800 transition"
          >
            {SecondaryIcon && <SecondaryIcon className="w-4 h-4" />}
            {config.ctaSecondary?.text || 'Parler à un conseiller'}
          </CtaLink>
        </div>
      </div>
    </section>
  );
}
