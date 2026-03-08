'use client';

interface StatsConfig {
  items?: { value: string; label: string }[];
}

export function StatsSection({ config }: { config: StatsConfig; theme?: Record<string, unknown> }) {
  const items = config.items || [];
  if (items.length === 0) return null;

  return (
    <div className="py-8 px-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
        {items.map((stat, i) => (
          <div key={i} className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-xs text-slate-400 mt-1 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
