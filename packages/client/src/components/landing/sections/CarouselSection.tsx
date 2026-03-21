'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { iconMap } from './iconMap';

interface CarouselSlide {
  image: string;
  title?: string;
  subtitle?: string;
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
  showBrowserFrame?: boolean;
  browserUrl?: string;
}

const defaultSlides: CarouselSlide[] = [
  { image: '/images/carousel/dashboard.png', title: 'Dashboard', subtitle: 'Vue d\'ensemble de votre activité' },
  { image: '/images/carousel/agent-ia.png', title: 'Agent IA', subtitle: 'Votre assistante disponible 24/7' },
  { image: '/images/carousel/crm.png', title: 'CRM & Leads', subtitle: 'Pipeline commercial visuel' },
  { image: '/images/carousel/facturation.png', title: 'Facturation', subtitle: 'Devis et factures en un clic' },
];

export function CarouselSection({ config }: { config: CarouselConfig; theme?: Record<string, unknown> }) {
  const slides = (config.slides && config.slides.length > 0) ? config.slides : defaultSlides;
  const autoplay = config.autoplay !== false;
  const interval = config.interval || 5000;
  const showArrows = config.showArrows !== false;
  const showDots = config.showDots !== false;
  const showBrowserFrame = config.showBrowserFrame !== false;
  const browserUrl = config.browserUrl || 'app.talosprimes.com';
  const BadgeIcon = config.badge?.icon ? (iconMap[config.badge.icon] || Sparkles) : Sparkles;

  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const touchStart = useRef<number | null>(null);

  const next = useCallback(() => {
    setDirection('right');
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setDirection('left');
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goTo = useCallback((index: number) => {
    setDirection(index > current ? 'right' : 'left');
    setCurrent(index);
  }, [current]);

  // Autoplay
  useEffect(() => {
    if (!autoplay || isHovered || slides.length <= 1) return;
    const timer = setInterval(next, interval);
    return () => clearInterval(timer);
  }, [autoplay, interval, isHovered, next, slides.length]);

  // Touch / swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
    touchStart.current = null;
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  };

  const slide = slides[current];

  const slideContent = (
    <div
      className="relative w-full overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides container */}
      <div className="relative aspect-[16/9] sm:aspect-[16/9] w-full">
        {slides.map((s, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-all duration-500 ease-in-out ${
              i === current
                ? 'opacity-100 translate-x-0 scale-100'
                : i < current || (current === 0 && i === slides.length - 1 && direction === 'left')
                  ? 'opacity-0 -translate-x-full scale-95'
                  : 'opacity-0 translate-x-full scale-95'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.image}
              alt={s.title || `Slide ${i + 1}`}
              className="w-full h-full object-cover object-top"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
            {/* Caption overlay */}
            {(s.title || s.subtitle) && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 sm:p-6">
                {s.title && <h3 className="text-white font-semibold text-base sm:text-lg">{s.title}</h3>}
                {s.subtitle && <p className="text-slate-300 text-xs sm:text-sm mt-1">{s.subtitle}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Arrows */}
      {showArrows && slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/80 hover:text-white hover:bg-black/60 transition-all flex items-center justify-center"
            style={{ opacity: isHovered ? 1 : 0.4, transition: 'opacity 0.3s' }}
            aria-label="Précédent"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/80 hover:text-white hover:bg-black/60 transition-all flex items-center justify-center"
            style={{ opacity: isHovered ? 1 : 0.4, transition: 'opacity 0.3s' }}
            aria-label="Suivant"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </>
      )}
    </div>
  );

  return (
    <section className="py-20 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
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

        {/* Carousel */}
        <div
          className="relative max-w-4xl mx-auto"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="region"
          aria-label="Carrousel d'images"
          aria-roledescription="carousel"
        >
          {showBrowserFrame ? (
            /* With browser frame */
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-sm shadow-2xl shadow-black/40 overflow-hidden">
              {/* Browser title bar */}
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
                    {browserUrl}{slide?.title ? `/${slide.title.toLowerCase().replace(/\s+/g, '-')}` : ''}
                  </div>
                </div>
              </div>
              {slideContent}
            </div>
          ) : (
            /* Without frame — simple rounded container */
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
              {slideContent}
            </div>
          )}

          {/* Dots */}
          {showDots && slides.length > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`transition-all duration-300 rounded-full ${
                    i === current
                      ? 'w-8 h-2 bg-blue-500'
                      : 'w-2 h-2 bg-slate-600 hover:bg-slate-500'
                  }`}
                  aria-label={`Aller au slide ${i + 1}`}
                  aria-current={i === current ? 'true' : undefined}
                />
              ))}
            </div>
          )}

          {/* Counter */}
          {slides.length > 1 && (
            <p className="text-center text-slate-500 text-xs mt-3">
              {current + 1} / {slides.length}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
