'use client';

import { Star } from 'lucide-react';

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
  theme?: any;
}) {
  if (testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="py-24 px-6 bg-slate-50/60">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            {config.title || 'Ils nous font confiance'}
          </h2>
          <p className="text-slate-500 text-base">
            {config.subtitle || 'Ce que nos clients disent de TalosPrimes.'}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <div key={t.id} className="p-6 rounded-2xl border border-slate-200/80 bg-white hover:shadow-md transition-all duration-300">
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < t.note ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`}
                  />
                ))}
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">&ldquo;{t.commentaire}&rdquo;</p>
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs">
                  {t.avatar || `${t.prenom[0]}${t.nom[0]}`}
                </div>
                <div>
                  <div className="font-medium text-slate-900 text-sm">{t.prenom} {t.nom}</div>
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
