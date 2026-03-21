'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { iconMap } from './iconMap';

interface CarouselSlide {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  icon?: string;
  badges?: { text: string; color?: string }[];
  features?: { text: string; icon?: string }[];
}

interface CarouselConfig {
  badge?: { text: string; icon?: string };
  title?: string;
  subtitle?: string;
  slides?: CarouselSlide[];
  autoplay?: boolean;
  interval?: number;
  showArrows?: boolean;
  showDots?: boolean;
  showNav?: boolean;
}

const defaultSlides: CarouselSlide[] = [
  {
    id: 'agent-ia',
    title: 'Agent IA — Léa',
    subtitle: 'Votre assistante vocale et chat IA disponible 24/7',
    icon: 'Bot',
    badges: [
      { text: 'En ligne', color: 'emerald' },
    ],
    features: [
      { text: 'Qualification de leads automatique', icon: 'Zap' },
      { text: 'Prise de rendez-vous', icon: 'Calendar' },
      { text: 'Création de devis en direct', icon: 'FileText' },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Vue d\'ensemble en temps réel de votre activité',
    icon: 'BarChart3',
    badges: [
      { text: 'Temps réel', color: 'blue' },
    ],
    features: [
      { text: 'KPIs et métriques clés', icon: 'TrendingUp' },
      { text: 'Graphiques interactifs', icon: 'BarChart3' },
      { text: 'Alertes intelligentes', icon: 'Bell' },
    ],
  },
  {
    id: 'crm',
    title: 'CRM & Leads',
    subtitle: 'Pipeline commercial visuel et suivi des opportunités',
    icon: 'Users',
    badges: [
      { text: '342 clients actifs', color: 'violet' },
    ],
    features: [
      { text: 'Pipeline drag & drop', icon: 'Columns' },
      { text: 'Scoring automatique', icon: 'Star' },
      { text: 'Historique complet', icon: 'Clock' },
    ],
  },
  {
    id: 'facturation',
    title: 'Facturation',
    subtitle: 'Devis, factures, relances et paiements en un clic',
    icon: 'FileText',
    badges: [
      { text: 'Conforme', color: 'emerald' },
    ],
    features: [
      { text: 'Devis → Facture en 1 clic', icon: 'ArrowRight' },
      { text: 'Relances automatiques', icon: 'Mail' },
      { text: 'Export comptable', icon: 'Download' },
    ],
  },
];

export function CarouselSection({ config }: { config: CarouselConfig; theme?: Record<string, unknown> }) {
  const slides = config.slides || defaultSlides;
  const autoplay = config.autoplay !== false;
  const interval = config.interval || 5000;
  const showArrows = config.showArrows !== false;
  const showDots = config.showDots !== false;
  const showNav = config.showNav !== false;
  const BadgeIcon = config.badge?.icon ? (iconMap[config.badge.icon] || Sparkles) : Sparkles;

  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (!autoplay || isHovered) return;
    const timer = setInterval(next, interval);
    return () => clearInterval(timer);
  }, [autoplay, interval, isHovered, next]);

  const slide = slides[current];
  const SlideIcon = slide?.icon ? (iconMap[slide.icon] || Sparkles) : Sparkles;

  return (
    <section className="py-20 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          {config.badge && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium mb-4 border border-blue-500/20">
              <BadgeIcon className="w-3.5 h-3.5" />
              {config.badge.text}
            </div>
          )}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4">
            {config.title || (
              <>Découvrez <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">la plateforme</span> en action</>
            )}
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto">
            {config.subtitle || 'Chaque module est conçu pour simplifier votre quotidien et booster votre productivité.'}
          </p>
        </div>

        {/* Navigation tabs */}
        {showNav && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {slides.map((s, i) => {
              const NavIcon = s.icon ? (iconMap[s.icon] || Sparkles) : Sparkles;
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrent(i)}
                  className={`group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    i === current
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-slate-900/50 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  <NavIcon className={`w-4 h-4 ${i === current ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                  {s.title}
                </button>
              );
            })}
          </div>
        )}

        {/* Carousel frame — browser mockup */}
        <div
          className="relative max-w-4xl mx-auto"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Browser chrome */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-sm shadow-2xl shadow-black/40 overflow-hidden">
            {/* Title bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-slate-700/50 text-slate-400 text-xs max-w-sm w-full">
                  <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  app.talosprimes.com/{slide?.id || 'dashboard'}
                </div>
              </div>
            </div>

            {/* Slide content */}
            <div className="relative min-h-[350px] sm:min-h-[420px] p-6 sm:p-10">
              {/* Slide transition */}
              <div key={slide?.id} className="animate-fade-in-up">
                {/* If image provided, show it */}
                {slide?.image ? (
                  <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  /* Otherwise, render a rich mockup */
                  <div className="space-y-6">
                    {/* Slide header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                          <SlideIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-white font-semibold text-lg">{slide?.title}</h3>
                            {slide?.badges?.map((badge, i) => (
                              <span
                                key={i}
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                  badge.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  badge.color === 'blue' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                  badge.color === 'violet' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                                  'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                }`}
                              >
                                {badge.text}
                              </span>
                            ))}
                          </div>
                          <p className="text-slate-400 text-sm mt-0.5">{slide?.subtitle}</p>
                        </div>
                      </div>
                    </div>

                    {/* Simulated UI content */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {slide?.features?.map((feat, i) => {
                        const FeatIcon = feat.icon ? (iconMap[feat.icon] || Sparkles) : Sparkles;
                        return (
                          <div key={i} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/30 hover:border-slate-600/50 transition-colors group">
                            <FeatIcon className="w-5 h-5 text-blue-400 mb-3 group-hover:text-violet-400 transition-colors" />
                            <p className="text-slate-300 text-sm font-medium">{feat.text}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Decorative stats bars */}
                    <div className="flex gap-3">
                      {[65, 82, 45, 91, 73, 58, 88, 40, 76, 93, 55, 68].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col justify-end h-20">
                          <div
                            className="rounded-t-sm bg-gradient-to-t from-blue-600/60 to-violet-500/40 transition-all duration-700"
                            style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Bottom stats row */}
                    <div className="flex gap-4 pt-2">
                      <div className="flex-1 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                        <p className="text-blue-400 text-lg font-bold">+34%</p>
                        <p className="text-slate-500 text-xs">Revenus</p>
                      </div>
                      <div className="flex-1 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <p className="text-emerald-400 text-lg font-bold">342</p>
                        <p className="text-slate-500 text-xs">Clients actifs</p>
                      </div>
                      <div className="flex-1 p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
                        <p className="text-violet-400 text-lg font-bold">98%</p>
                        <p className="text-slate-500 text-xs">Satisfaction</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Arrow buttons */}
              {showArrows && slides.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700/80 transition-all flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                    style={{ opacity: isHovered ? 1 : 0 }}
                    aria-label="Slide précédente"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={next}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700/80 transition-all flex items-center justify-center backdrop-blur-sm"
                    style={{ opacity: isHovered ? 1 : 0 }}
                    aria-label="Slide suivante"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Dots */}
          {showDots && slides.length > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`transition-all duration-300 rounded-full ${
                    i === current
                      ? 'w-8 h-2 bg-blue-500'
                      : 'w-2 h-2 bg-slate-600 hover:bg-slate-500'
                  }`}
                  aria-label={`Aller au slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
