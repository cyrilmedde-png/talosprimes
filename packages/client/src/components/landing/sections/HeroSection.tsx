'use client';

import Link from 'next/link';
import { ArrowRight, Bot, Play } from 'lucide-react';
import { iconMap } from './iconMap';
import { FloatingDashboardHero } from './DashboardMockup';

interface HeroConfig {
  title?: string;
  subtitle?: string;
  badge?: { text: string; icon?: string; actif?: boolean };
  ctaPrimary?: { text: string; link: string };
  ctaSecondary?: { text: string; link: string };
  bgGradient?: string;
  showDashboard?: boolean;
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

export function HeroSection({ config }: { config: HeroConfig; theme?: ThemeConfig }) {
  const primaryLink = config.ctaPrimary?.link || '/inscription';
  const secondaryLink = config.ctaSecondary?.link || '#services';
  const BadgeIcon = config.badge?.icon ? (iconMap[config.badge.icon] || Bot) : Bot;

  return (
    <section className="relative pt-32 pb-8 px-6 overflow-hidden min-h-[90vh] flex flex-col justify-center">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-purple-950/40 to-slate-950 pointer-events-none" />

      {/* Animated orbs — purple/blue like Noesis */}
      <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-purple-600/20 via-violet-500/15 to-transparent rounded-full blur-3xl pointer-events-none animate-orb-1" />
      <div className="absolute top-40 right-1/4 w-[500px] h-[500px] bg-gradient-to-bl from-blue-600/15 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none animate-orb-2" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-t from-blue-900/20 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-6xl mx-auto w-full">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          {config.badge?.actif !== false && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-medium mb-8 animate-fade-in-up shadow-sm backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              <BadgeIcon className="w-3.5 h-3.5" />
              {config.badge?.text || 'Agent IA vocal intégré — disponible 24/7'}
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.05] mb-6 animate-fade-in-up animation-delay-100">
            {config.title || (
              <>
                La plateforme <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">tout-en-un</span> pour piloter votre entreprise
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-in-up animation-delay-200">
            {config.subtitle || 'CRM, facturation, comptabilité, RH, BTP, agent IA vocal et 190+ automatisations — tout dans une seule plateforme.'}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in-up animation-delay-300">
            <CtaLink
              href={primaryLink}
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5"
            >
              {config.ctaPrimary?.text || 'Commencer gratuitement'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </CtaLink>
            <CtaLink
              href={secondaryLink}
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-slate-300 text-sm font-medium rounded-xl hover:bg-white/10 hover:border-white/20 transition-all"
            >
              <Play className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
              {config.ctaSecondary?.text || 'Voir la démo'}
            </CtaLink>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs text-slate-500 animate-fade-in-up animation-delay-400">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Essai gratuit 14 jours
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Sans carte bancaire
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Support inclus
            </div>
          </div>
        </div>

        {/* Floating Dashboard Mockup */}
        {config.showDashboard !== false && (
          <div className="max-w-4xl mx-auto animate-fade-in-up animation-delay-500">
            <FloatingDashboardHero />
          </div>
        )}
      </div>
    </section>
  );
}
