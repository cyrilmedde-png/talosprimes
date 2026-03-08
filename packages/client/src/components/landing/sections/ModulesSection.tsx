'use client';

import { CheckCircle, Sparkles } from 'lucide-react';
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

  return (
    <section id="services" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          {config.badge && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium mb-4">
              <BadgeIcon className="w-3.5 h-3.5" />
              {config.badge.text}
            </div>
          )}
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            {config.title || 'Tous vos outils métier, une seule plateforme'}
          </h2>
          <p className="text-slate-500 text-base max-w-xl mx-auto">
            {config.subtitle || 'Activez uniquement les modules dont vous avez besoin.'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {items.map((mod, i) => {
            const ModIcon = iconMap[mod.icon] || Sparkles;
            return (
              <div key={i} className="group relative p-6 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-md transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center shrink-0 shadow-sm`}>
                    <ModIcon className="w-6 h-6 text-white" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1.5">{mod.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-3">{mod.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {mod.features.map((f, j) => (
                        <span key={j} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 text-xs font-medium">
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
