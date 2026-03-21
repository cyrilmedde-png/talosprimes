'use client';

import { TrendingUp } from 'lucide-react';
import { iconMap } from './iconMap';

interface UpcomingConfig {
  badge?: { text: string; icon?: string };
  title?: string;
  subtitle?: string;
  items?: { icon: string; title: string; description: string; badge?: string }[];
  bgColor?: string;
}

export function UpcomingSection({ config }: { config: UpcomingConfig; theme?: Record<string, unknown> }) {
  const items = config.items || [];
  const BadgeIcon = config.badge?.icon ? (iconMap[config.badge.icon] || TrendingUp) : TrendingUp;

  return (
    <section className={`py-24 px-6 ${config.bgColor || ''}`}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          {config.badge && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-medium mb-4 border border-violet-500/20">
              <BadgeIcon className="w-3.5 h-3.5" />
              {config.badge.text}
            </div>
          )}
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            {config.title || 'Bientôt disponible'}
          </h2>
          <p className="text-slate-400 text-base max-w-lg mx-auto">
            {config.subtitle}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, i) => {
            const ItemIcon = iconMap[item.icon] || TrendingUp;
            return (
              <div key={i} className="group p-5 rounded-xl border border-dashed border-slate-700/60 bg-slate-900/50 hover:border-violet-500/40 hover:bg-slate-800/60 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 group-hover:bg-violet-500/20 flex items-center justify-center shrink-0 transition">
                    <ItemIcon className="w-5 h-5 text-violet-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">{item.description}</p>
                    {item.badge && (
                      <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {item.badge}
                      </span>
                    )}
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
