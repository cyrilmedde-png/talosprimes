'use client';

import Link from 'next/link';
import { ArrowRight, ChevronDown, Bot } from 'lucide-react';
import { iconMap } from './iconMap';

interface HeroConfig {
  title?: string;
  subtitle?: string;
  badge?: { text: string; icon?: string; actif?: boolean };
  ctaPrimary?: { text: string; link: string };
  ctaSecondary?: { text: string; link: string };
  bgGradient?: string;
}

interface ThemeConfig {
  primaryColor?: string;
  accentColor?: string;
}

function CtaLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const isExternal = href.startsWith('http') || href.startsWith('//');
  return isExternal ? (
    <a href={href} className={className}>{children}</a>
  ) : (
    <Link href={href} className={className}>{children}</Link>
  );
}

export function HeroSection({ config, theme }: { config: HeroConfig; theme?: ThemeConfig }) {
  const primaryLink = config.ctaPrimary?.link || '/inscription';
  const secondaryLink = config.ctaSecondary?.link || '#services';
  const BadgeIcon = config.badge?.icon ? (iconMap[config.badge.icon] || Bot) : Bot;

  return (
    <section className="relative pt-32 pb-24 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 to-white pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-gradient-to-br from-blue-50/40 via-violet-50/30 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto text-center">
        {config.badge?.actif !== false && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 text-amber-700 text-xs font-medium mb-8">
            <BadgeIcon className="w-3.5 h-3.5" />
            {config.badge?.text || 'Agent IA vocal intégré — disponible 24/7'}
          </div>
        )}

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 tracking-tight leading-[1.08] mb-6">
          {config.title || 'La plateforme tout-en-un pour piloter votre entreprise'}
        </h1>
        <p className="text-slate-500 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          {config.subtitle || 'Facturation, comptabilité, CRM, RH, BTP, agent IA et 190+ automatisations — tout dans une seule plateforme.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <CtaLink href={primaryLink} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition shadow-lg shadow-slate-900/20">
            {config.ctaPrimary?.text || 'Essayer gratuitement'}
            <ArrowRight className="w-4 h-4" />
          </CtaLink>
          <CtaLink href={secondaryLink} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 hover:border-slate-300 transition">
            {config.ctaSecondary?.text || 'Découvrir les services'}
            <ChevronDown className="w-4 h-4" />
          </CtaLink>
        </div>
      </div>
    </section>
  );
}
