'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
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
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.bgGradient || 'from-slate-950 via-slate-900 to-slate-950'}`} />

      {/* Animated orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-orb-1" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-orb-2" />

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none' stroke='%23fff' stroke-width='0.5'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-medium mb-6 border border-white/10">
          <Sparkles className="w-3.5 h-3.5" />
          Commencez dès maintenant
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight">
          {config.title || (
            <>Prêt à <span className="bg-gradient-to-r from-amber-300 to-amber-400 bg-clip-text text-transparent">simplifier</span> votre gestion ?</>
          )}
        </h2>
        <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
          {config.subtitle || 'Rejoignez les entreprises qui automatisent leur quotidien avec TalosPrimes.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <CtaLink
            href={config.ctaPrimary?.link || '/inscription'}
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-900 text-sm font-semibold rounded-xl hover:bg-slate-100 transition-all shadow-lg shadow-white/10 hover:shadow-xl hover:-translate-y-0.5"
          >
            {config.ctaPrimary?.text || 'Commencer gratuitement'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </CtaLink>
          <CtaLink
            href={config.ctaSecondary?.link || '#contact'}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-white text-sm font-medium rounded-xl hover:bg-white/10 hover:border-white/30 transition-all"
          >
            {SecondaryIcon && <SecondaryIcon className="w-4 h-4" />}
            {config.ctaSecondary?.text || 'Parler à un conseiller'}
          </CtaLink>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-xs text-slate-500">
          <span>✓ 14 jours d&apos;essai</span>
          <span>✓ Sans engagement</span>
          <span>✓ Support réactif</span>
        </div>
      </div>
    </section>
  );
}
