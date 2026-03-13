'use client';

import { useState } from 'react';
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import { iconMap } from './iconMap';

interface ModuleItem {
  icon: string;
  title: string;
  description: string;
  features: string[];
  color: string;
}

interface ModulesConfig {
  badge?: { text: string; icon?: string };
  title?: string;
  subtitle?: string;
  items?: ModuleItem[];
}

export function ModulesSection({ config }: { config: ModulesConfig; theme?: Record<string, unknown> }) {
  const items = config.items || [];
  const BadgeIcon = config.badge?.icon ? (iconMap[config.badge.icon] || Sparkles) : Sparkles;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="services" className="py-24 px-6 relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/30 to-white" />
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-blue-50/40 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-violet-50/40 rounded-full blur-3xl translate-x-1/2" />

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          {config.badge && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium mb-4 border border-blue-100">
              <BadgeIcon className="w-3.5 h-3.5" />
              {config.badge.text}
            </div>
          )}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight mb-4">
            {config.title || 'Tous vos outils métier, une seule plateforme'}
          </h2>
          <p className="text-slate-500 text-base max-w-xl mx-auto">
            {config.subtitle || 'Activez uniquement les modules dont vous avez besoin.'}
          </p>
        </div>

        {/* Modules grid */}
        <div className="grid md:grid-cols-2 gap-5">
          {items.map((mod, i) => {
            const ModIcon = iconMap[mod.icon] || Sparkles;
            const isHovered = hoveredIndex === i;
            return (
              <div
                key={i}
                className={`group relative p-6 rounded-2xl border bg-white transition-all duration-500 cursor-default ${
                  isHovered
                    ? 'border-slate-300 shadow-xl shadow-slate-200/50 -translate-y-1'
                    : 'border-slate-200/80 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100/50'
                }`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Subtle gradient on hover */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${mod.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />

                <div className="relative flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mod.color} flex items-center justify-center shrink-0 shadow-lg shadow-slate-200/30 group-hover:scale-110 transition-transform duration-500`}>
                    <ModIcon className="w-7 h-7 text-white" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{mod.title}</h3>
                      <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">{mod.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {mod.features.map((f, j) => (
                        <span
                          key={j}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium border border-slate-100 group-hover:border-slate-200 transition-colors"
                        >
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
