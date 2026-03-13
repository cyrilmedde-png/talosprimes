'use client';

import { Star, Quote } from 'lucide-react';

interface Testimonial {
  id: string;
  nom: string;
  prenom: string;
  entreprise?: string;
  poste?: string;
  avatar?: string;
  note: number;
  commentaire: string;
}

interface TestimonialsConfig {
  title?: string;
  subtitle?: string;
}

export function TestimonialsSection({
  config,
  testimonials = [],
}: {
  config: TestimonialsConfig;
  testimonials?: Testimonial[];
  theme?: Record<string, unknown>;
}) {
  if (testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="py-24 px-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 via-white to-slate-50/80" />
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-amber-50/40 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-50/30 rounded-full blur-3xl" />

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-medium mb-4 border border-amber-100">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            Témoignages
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight mb-4">
            {config.title || 'Ils nous font confiance'}
          </h2>
          <p className="text-slate-500 text-base max-w-lg mx-auto">
            {config.subtitle || 'Découvrez ce que nos clients disent de TalosPrimes.'}
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div
              key={t.id}
              className={`group relative p-6 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-xl hover:shadow-slate-100/50 hover:-translate-y-1 transition-all duration-500 ${
                i === 0 ? 'lg:col-span-1' : ''
              }`}
            >
              {/* Quote icon */}
              <Quote className="w-8 h-8 text-slate-100 group-hover:text-amber-100 transition-colors mb-3" />

              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star
                    key={j}
                    className={`w-4 h-4 ${j < t.note ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`}
                  />
                ))}
              </div>

              {/* Comment */}
              <p className="text-slate-600 text-sm leading-relaxed mb-6">&ldquo;{t.commentaire}&rdquo;</p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold text-xs shadow-sm">
                  {t.avatar || `${t.prenom[0]}${t.nom[0]}`}
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{t.prenom} {t.nom}</div>
                  {(t.poste || t.entreprise) && (
                    <div className="text-xs text-slate-400">{[t.poste, t.entreprise].filter(Boolean).join(' · ')}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
