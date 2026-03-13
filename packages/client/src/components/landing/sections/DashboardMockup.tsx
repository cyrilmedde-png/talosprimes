'use client';

import { useEffect, useState } from 'react';

/**
 * DashboardMockup — Renders a realistic browser frame with animated dashboard content
 * Pure CSS/SVG — no external images needed.
 */

function MiniChart({ color, delay }: { color: string; delay: number }) {
  return (
    <svg viewBox="0 0 100 40" className="w-full h-10" style={{ animationDelay: `${delay}ms` }}>
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M0,35 Q10,${30 - delay % 10} 20,28 T40,${20 - (delay % 8)} T60,${15 + (delay % 5)} T80,${10 + (delay % 7)} T100,${8 - (delay % 3)}`}
        fill={`url(#grad-${color})`}
        className="animate-chart-draw"
      />
      <path
        d={`M0,35 Q10,${30 - delay % 10} 20,28 T40,${20 - (delay % 8)} T60,${15 + (delay % 5)} T80,${10 + (delay % 7)} T100,${8 - (delay % 3)}`}
        fill="none"
        stroke={color}
        strokeWidth="2"
        className="animate-chart-draw"
      />
    </svg>
  );
}

function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let current = 0;
    const step = Math.max(1, Math.floor(target / 40));
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      setCount(current);
    }, 40);
    return () => clearInterval(timer);
  }, [target]);
  return <>{count.toLocaleString('fr-FR')}{suffix}</>;
}

export function DashboardMockup({ variant = 'main' }: { variant?: 'main' | 'crm' | 'factures' | 'agent-ia' }) {
  const contents: Record<string, React.ReactNode> = {
    main: (
      <div className="p-4 space-y-3">
        {/* Top stats row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Chiffre d\'affaires', value: 47250, suffix: '€', color: 'text-emerald-400' },
            { label: 'Factures', value: 128, suffix: '', color: 'text-blue-400' },
            { label: 'Clients actifs', value: 342, suffix: '', color: 'text-violet-400' },
            { label: 'Taux conversion', value: 87, suffix: '%', color: 'text-amber-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 backdrop-blur rounded-lg p-2.5 border border-white/10">
              <div className="text-[9px] text-slate-400 mb-1">{stat.label}</div>
              <div className={`text-sm font-bold ${stat.color}`}>
                <AnimatedNumber target={stat.value} suffix={stat.suffix} />
              </div>
            </div>
          ))}
        </div>
        {/* Charts */}
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 bg-white/5 backdrop-blur rounded-lg p-3 border border-white/10">
            <div className="text-[9px] text-slate-400 mb-2">Revenus mensuels</div>
            <div className="flex items-end gap-1 h-20">
              {[35, 42, 58, 52, 68, 75, 82, 78, 90, 85, 95, 100].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end">
                  <div
                    className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm animate-bar-grow"
                    style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[7px] text-slate-500">Jan</span>
              <span className="text-[7px] text-slate-500">Déc</span>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-lg p-3 border border-white/10">
            <div className="text-[9px] text-slate-400 mb-2">Par module</div>
            <div className="space-y-2">
              {[
                { label: 'CRM', pct: 85, color: 'bg-blue-500' },
                { label: 'Factures', pct: 72, color: 'bg-emerald-500' },
                { label: 'RH', pct: 58, color: 'bg-violet-500' },
                { label: 'BTP', pct: 45, color: 'bg-amber-500' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[8px] text-slate-400 mb-0.5">
                    <span>{item.label}</span>
                    <span>{item.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full animate-bar-grow`}
                      style={{ width: `${item.pct}%`, animationDelay: `${i * 150}ms` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Table preview */}
        <div className="bg-white/5 backdrop-blur rounded-lg border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <div className="text-[9px] text-slate-400 font-medium">Dernières factures</div>
            <div className="text-[8px] text-blue-400">Voir tout →</div>
          </div>
          <div className="divide-y divide-white/5">
            {[
              { client: 'Nexus Corp', montant: '4 250 €', status: 'Payée', color: 'text-emerald-400 bg-emerald-500/10' },
              { client: 'Atlas Industries', montant: '12 800 €', status: 'En attente', color: 'text-amber-400 bg-amber-500/10' },
              { client: 'Zenith SA', montant: '8 750 €', status: 'Payée', color: 'text-emerald-400 bg-emerald-500/10' },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-1.5 text-[9px]">
                <span className="text-slate-300">{row.client}</span>
                <span className="text-slate-400">{row.montant}</span>
                <span className={`px-1.5 py-0.5 rounded text-[7px] font-medium ${row.color}`}>{row.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    crm: (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-[10px] font-medium text-white">Pipeline commercial</div>
          <div className="text-[8px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">+23% ce mois</div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {['Prospect', 'Qualifié', 'Proposition', 'Gagné'].map((stage, i) => (
            <div key={i} className="space-y-1.5">
              <div className="text-[8px] text-slate-400 text-center">{stage}</div>
              <div className="space-y-1">
                {Array.from({ length: 3 - Math.floor(i * 0.5) }).map((_, j) => (
                  <div key={j} className="bg-white/8 rounded-md p-1.5 border border-white/10">
                    <div className="h-1.5 w-3/4 bg-slate-600 rounded mb-1" />
                    <div className="h-1 w-1/2 bg-slate-700 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <MiniChart color="#3b82f6" delay={0} />
      </div>
    ),
    factures: (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-medium text-white">Factures & Devis</div>
          <div className="flex gap-1">
            <div className="text-[8px] text-white bg-blue-500/30 px-2 py-0.5 rounded">+ Nouveau</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'En attente', value: '23 450 €', color: 'text-amber-400' },
            { label: 'Payées', value: '189 200 €', color: 'text-emerald-400' },
            { label: 'En retard', value: '4 100 €', color: 'text-red-400' },
          ].map((s, i) => (
            <div key={i} className="bg-white/5 rounded-lg p-2 border border-white/10 text-center">
              <div className="text-[8px] text-slate-400">{s.label}</div>
              <div className={`text-xs font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
        <MiniChart color="#10b981" delay={200} />
      </div>
    ),
    'agent-ia': (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <div className="text-[10px] font-medium text-white">Agent IA — Léa</div>
          <div className="text-[8px] text-emerald-400">En ligne</div>
        </div>
        <div className="space-y-2">
          {[
            { type: 'in', text: 'Bonjour, je souhaite un devis pour...' },
            { type: 'out', text: 'Bien sûr ! Je vais créer votre devis. Pouvez-vous me préciser la surface ?' },
            { type: 'in', text: '120m² pour un ravalement de façade' },
            { type: 'out', text: 'Parfait, je prépare votre devis estimé à 8 400€. Je vous l\'envoie par email ?' },
          ].map((msg, i) => (
            <div key={i} className={`flex ${msg.type === 'out' ? 'justify-end' : ''}`}>
              <div className={`max-w-[75%] px-2.5 py-1.5 rounded-lg text-[8px] ${
                msg.type === 'out'
                  ? 'bg-amber-500/20 text-amber-100 rounded-tr-sm'
                  : 'bg-white/10 text-slate-300 rounded-tl-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <div className="flex-1 h-6 bg-white/5 rounded border border-white/10" />
          <div className="w-6 h-6 bg-amber-500/20 rounded flex items-center justify-center">
            <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="relative group">
      {/* Glow effect behind */}
      <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-amber-500/20 rounded-3xl blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-700" />

      {/* Browser frame */}
      <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-xl border border-white/15 shadow-2xl shadow-black/40 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-slate-800/50">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="flex-1 mx-2">
            <div className="bg-slate-700/50 rounded-md px-3 py-1 text-[9px] text-slate-400 text-center flex items-center justify-center gap-1">
              <svg className="w-2.5 h-2.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              app.talosprimes.com/dashboard
            </div>
          </div>
        </div>

        {/* Sidebar + content */}
        <div className="flex min-h-[280px]">
          {/* Mini sidebar */}
          <div className="w-12 border-r border-white/10 bg-slate-800/30 py-3 flex flex-col items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <span className="text-[7px] font-bold text-white">TP</span>
            </div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`w-5 h-5 rounded-md ${i === 0 ? 'bg-blue-500/30 border border-blue-400/30' : 'bg-white/5'}`} />
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1">
            {contents[variant]}
          </div>
        </div>
      </div>
    </div>
  );
}

const carouselSlides: { variant: 'main' | 'crm' | 'factures' | 'agent-ia'; label: string; icon: React.ReactNode; color: string }[] = [
  {
    variant: 'main',
    label: 'Dashboard',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    color: 'from-blue-500 to-blue-600',
  },
  {
    variant: 'crm',
    label: 'CRM & Leads',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'from-violet-500 to-violet-600',
  },
  {
    variant: 'factures',
    label: 'Facturation',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    variant: 'agent-ia',
    label: 'Agent IA',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: 'from-amber-500 to-amber-600',
  },
];

export function FloatingDashboardHero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-rotate every 4 seconds
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % carouselSlides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const activeSlide = carouselSlides[activeIndex];

  return (
    <div
      className="relative mt-16 perspective-1200"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Browser mockup with carousel */}
      <div className="transform rotate-x-2 hover:rotate-x-0 transition-transform duration-700 ease-out">
        <div className="relative group">
          {/* Glow effect — color shifts with active slide */}
          <div className={`absolute -inset-4 bg-gradient-to-r ${activeSlide.color} rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-all duration-1000`} />
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 via-violet-500/10 to-amber-500/10 rounded-3xl blur-2xl opacity-40" />

          {/* Browser frame */}
          <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-xl border border-white/15 shadow-2xl shadow-black/40 overflow-hidden">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-slate-800/50">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex-1 mx-2">
                <div className="bg-slate-700/50 rounded-md px-3 py-1 text-[9px] text-slate-400 text-center flex items-center justify-center gap-1">
                  <svg className="w-2.5 h-2.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  app.talosprimes.com/{activeSlide.variant === 'main' ? 'dashboard' : activeSlide.variant}
                </div>
              </div>
            </div>

            {/* Sidebar + content with transition */}
            <div className="flex min-h-[280px]">
              {/* Mini sidebar */}
              <div className="w-12 border-r border-white/10 bg-slate-800/30 py-3 flex flex-col items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <span className="text-[7px] font-bold text-white">TP</span>
                </div>
                {carouselSlides.map((slide, i) => (
                  <button
                    key={slide.variant}
                    onClick={() => setActiveIndex(i)}
                    className={`w-5 h-5 rounded-md transition-all duration-300 flex items-center justify-center ${
                      i === activeIndex
                        ? 'bg-blue-500/30 border border-blue-400/30 scale-110'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-sm ${i === activeIndex ? 'bg-blue-400' : 'bg-slate-600'}`} />
                  </button>
                ))}
              </div>

              {/* Main content — slides with crossfade */}
              <div className="flex-1 relative overflow-hidden">
                {carouselSlides.map((slide, i) => (
                  <div
                    key={slide.variant}
                    className={`transition-all duration-500 ease-out ${
                      i === activeIndex
                        ? 'opacity-100 relative'
                        : 'opacity-0 absolute inset-0 pointer-events-none'
                    }`}
                  >
                    <DashboardMockupContent variant={slide.variant} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation tabs below the mockup */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {carouselSlides.map((slide, i) => (
          <button
            key={slide.variant}
            onClick={() => setActiveIndex(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-300 ${
              i === activeIndex
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-400 border border-slate-200 hover:text-slate-600 hover:border-slate-300'
            }`}
          >
            <span className={i === activeIndex ? 'text-amber-400' : 'text-slate-400'}>{slide.icon}</span>
            {slide.label}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="flex justify-center gap-1.5 mt-3">
        {carouselSlides.map((_, i) => (
          <div key={i} className="h-1 rounded-full overflow-hidden bg-slate-200 w-8">
            <div
              className={`h-full rounded-full transition-all ${
                i === activeIndex
                  ? 'bg-slate-900 animate-progress-fill'
                  : i < activeIndex
                    ? 'bg-slate-400 w-full'
                    : 'bg-transparent w-0'
              }`}
              style={i === activeIndex && !isPaused ? { animation: 'progress-fill 4s linear' } : i < activeIndex ? { width: '100%' } : { width: '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Floating mini cards */}
      <div className="absolute -left-8 top-1/3 animate-float-slow hidden lg:block">
        <div className="bg-white rounded-xl shadow-xl shadow-slate-200/50 p-3 border border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Revenus</div>
              <div className="text-sm font-bold text-slate-900">+34%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -right-6 top-1/4 animate-float-medium hidden lg:block">
        <div className="bg-white rounded-xl shadow-xl shadow-slate-200/50 p-3 border border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Clients actifs</div>
              <div className="text-sm font-bold text-slate-900">342</div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -right-4 bottom-16 animate-float-fast hidden lg:block">
        <div className="bg-white rounded-xl shadow-xl shadow-slate-200/50 p-2.5 border border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <div className="text-[10px] text-slate-600">Agent IA actif</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Separated content component so the browser frame stays static
 * while content crossfades between slides.
 */
function DashboardMockupContent({ variant }: { variant: 'main' | 'crm' | 'factures' | 'agent-ia' }) {
  const contents: Record<string, React.ReactNode> = {
    main: (
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Chiffre d\'affaires', value: 47250, suffix: '€', color: 'text-emerald-400' },
            { label: 'Factures', value: 128, suffix: '', color: 'text-blue-400' },
            { label: 'Clients actifs', value: 342, suffix: '', color: 'text-violet-400' },
            { label: 'Taux conversion', value: 87, suffix: '%', color: 'text-amber-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 backdrop-blur rounded-lg p-2.5 border border-white/10">
              <div className="text-[9px] text-slate-400 mb-1">{stat.label}</div>
              <div className={`text-sm font-bold ${stat.color}`}>
                <AnimatedNumber target={stat.value} suffix={stat.suffix} />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 bg-white/5 backdrop-blur rounded-lg p-3 border border-white/10">
            <div className="text-[9px] text-slate-400 mb-2">Revenus mensuels</div>
            <div className="flex items-end gap-1 h-20">
              {[35, 42, 58, 52, 68, 75, 82, 78, 90, 85, 95, 100].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end">
                  <div
                    className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm animate-bar-grow"
                    style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[7px] text-slate-500">Jan</span>
              <span className="text-[7px] text-slate-500">Déc</span>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-lg p-3 border border-white/10">
            <div className="text-[9px] text-slate-400 mb-2">Par module</div>
            <div className="space-y-2">
              {[
                { label: 'CRM', pct: 85, color: 'bg-blue-500' },
                { label: 'Factures', pct: 72, color: 'bg-emerald-500' },
                { label: 'RH', pct: 58, color: 'bg-violet-500' },
                { label: 'BTP', pct: 45, color: 'bg-amber-500' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[8px] text-slate-400 mb-0.5">
                    <span>{item.label}</span>
                    <span>{item.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full animate-bar-grow`}
                      style={{ width: `${item.pct}%`, animationDelay: `${i * 150}ms` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur rounded-lg border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <div className="text-[9px] text-slate-400 font-medium">Dernières factures</div>
            <div className="text-[8px] text-blue-400">Voir tout →</div>
          </div>
          <div className="divide-y divide-white/5">
            {[
              { client: 'Nexus Corp', montant: '4 250 €', status: 'Payée', color: 'text-emerald-400 bg-emerald-500/10' },
              { client: 'Atlas Industries', montant: '12 800 €', status: 'En attente', color: 'text-amber-400 bg-amber-500/10' },
              { client: 'Zenith SA', montant: '8 750 €', status: 'Payée', color: 'text-emerald-400 bg-emerald-500/10' },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-1.5 text-[9px]">
                <span className="text-slate-300">{row.client}</span>
                <span className="text-slate-400">{row.montant}</span>
                <span className={`px-1.5 py-0.5 rounded text-[7px] font-medium ${row.color}`}>{row.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    crm: (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-[10px] font-medium text-white">Pipeline commercial</div>
          <div className="text-[8px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">+23% ce mois</div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {['Prospect', 'Qualifié', 'Proposition', 'Gagné'].map((stage, i) => (
            <div key={i} className="space-y-1.5">
              <div className="text-[8px] text-slate-400 text-center">{stage}</div>
              <div className="space-y-1">
                {Array.from({ length: 3 - Math.floor(i * 0.5) }).map((_, j) => (
                  <div key={j} className="bg-white/[0.08] rounded-md p-1.5 border border-white/10">
                    <div className="h-1.5 w-3/4 bg-slate-600 rounded mb-1" />
                    <div className="h-1 w-1/2 bg-slate-700 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <MiniChart color="#3b82f6" delay={0} />
      </div>
    ),
    factures: (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-medium text-white">Factures & Devis</div>
          <div className="flex gap-1">
            <div className="text-[8px] text-white bg-blue-500/30 px-2 py-0.5 rounded">+ Nouveau</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'En attente', value: '23 450 €', color: 'text-amber-400' },
            { label: 'Payées', value: '189 200 €', color: 'text-emerald-400' },
            { label: 'En retard', value: '4 100 €', color: 'text-red-400' },
          ].map((s, i) => (
            <div key={i} className="bg-white/5 rounded-lg p-2 border border-white/10 text-center">
              <div className="text-[8px] text-slate-400">{s.label}</div>
              <div className={`text-xs font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
        <MiniChart color="#10b981" delay={200} />
      </div>
    ),
    'agent-ia': (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <div className="text-[10px] font-medium text-white">Agent IA — Léa</div>
          <div className="text-[8px] text-emerald-400">En ligne</div>
        </div>
        <div className="space-y-2">
          {[
            { type: 'in', text: 'Bonjour, je souhaite un devis pour...' },
            { type: 'out', text: 'Bien sûr ! Je vais créer votre devis. Pouvez-vous me préciser la surface ?' },
            { type: 'in', text: '120m² pour un ravalement de façade' },
            { type: 'out', text: 'Parfait, je prépare votre devis estimé à 8 400€. Je vous l\'envoie par email ?' },
          ].map((msg, i) => (
            <div key={i} className={`flex ${msg.type === 'out' ? 'justify-end' : ''}`}>
              <div className={`max-w-[75%] px-2.5 py-1.5 rounded-lg text-[8px] ${
                msg.type === 'out'
                  ? 'bg-amber-500/20 text-amber-100 rounded-tr-sm'
                  : 'bg-white/10 text-slate-300 rounded-tl-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <div className="flex-1 h-6 bg-white/5 rounded border border-white/10" />
          <div className="w-6 h-6 bg-amber-500/20 rounded flex items-center justify-center">
            <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </div>
        </div>
      </div>
    ),
  };

  return contents[variant] || contents.main;
}
