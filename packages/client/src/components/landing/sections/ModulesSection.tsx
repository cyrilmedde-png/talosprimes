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
      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          {config.badge && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium mb-4 border border-blue-500/20">
              <BadgeIcon className="w-3.5 h-3.5" />
              {config.badge.text}
            </div>
          )}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4">
            {config.title || 'Tous vos outils métier, une seule plateforme'}
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto">
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
                className={`group relative p-6 rounded-2xl border bg-slate-900/50 transition-all duration-500 cursor-default ${
                  isHovered
                    ? 'border-slate-600 shadow-xl shadow-blue-500/5 -translate-y-1'
                    : 'border-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-blue-500/5'
                }`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Subtle gradient on hover */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${mod.color} opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500`} />

                <div className="relative flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mod.color} flex items-center justify-center shrink-0 shadow-lg shadow-slate-900/30 group-hover:scale-110 transition-transform duration-500`}>
                    <ModIcon className="w-7 h-7 text-white" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">{mod.title}</h3>
                      <ArrowRight className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4">{mod.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {mod.features.map((f, j) => (
                        <span
                          key={j}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 text-slate-300 text-xs font-medium border border-slate-700/50 group-hover:border-slate-600/50 transition-colors"
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
