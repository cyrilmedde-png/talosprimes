'use client';

import { iconMap } from './iconMap';
import { Shield } from 'lucide-react';

interface TrustBadgesConfig {
  items?: { icon: string; text: string }[];
  bgColor?: string;
}

export function TrustBadgesSection({ config }: { config: TrustBadgesConfig; theme?: Record<string, unknown> }) {
  const items = config.items || [];
  if (items.length === 0) return null;

  return (
    <section className="py-6 bg-slate-900/50 border-y border-slate-800">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-slate-500">
          {items.map((item, i) => {
            const Icon = iconMap[item.icon] || Shield;
            return (
              <span key={i} className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {item.text}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
