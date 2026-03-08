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
    <section className={`py-24 px-6 ${config.bgColor || 'bg-slate-50/60'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          {config.badge && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 text-violet-600 text-xs font-medium mb-4">
              <BadgeIcon className="w-3.5 h-3.5" />
              {config.badge.text}
            </div>
          )}
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            {config.title || 'Bientôt disponible'}
          </h2>
          <p className="text-slate-500 text-base max-w-lg mx-auto">
            {config.subtitle}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, i) => {
            const ItemIcon = iconMap[item.icon] || TrendingUp;
            return (
              <div key={i} className="group p-5 rounded-xl border border-dashed border-slate-300/80 bg-white/60 hover:border-violet-300 hover:bg-white transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 group-hover:bg-violet-100 flex items-center justify-center shrink-0 transition">
                    <ItemIcon className="w-5 h-5 text-violet-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">{item.title}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">{item.description}</p>
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
