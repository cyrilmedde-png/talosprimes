'use client';

import { useEffect, useRef, useState } from 'react';

interface StatsConfig {
  items?: { value: string; label: string; suffix?: string; prefix?: string }[];
}

function AnimatedStat({ value, label, suffix, prefix }: { value: string; label: string; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Parse numeric part
  const numericMatch = value.match(/[\d,.]+/);
  const numericValue = numericMatch ? parseFloat(numericMatch[0].replace(/[,\s]/g, '').replace(',', '.')) : 0;
  const displaySuffix = suffix || value.replace(/[\d,.]+/, '').trim();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || numericValue === 0) return;
    let current = 0;
    const step = Math.max(1, Math.floor(numericValue / 50));
    const timer = setInterval(() => {
      current += step;
      if (current >= numericValue) {
        current = numericValue;
        clearInterval(timer);
      }
      setCount(current);
    }, 30);
    return () => clearInterval(timer);
  }, [isVisible, numericValue]);

  const displayValue = numericValue > 0
    ? `${prefix || ''}${Math.round(count).toLocaleString('fr-FR')}${displaySuffix}`
    : value;

  return (
    <div ref={ref} className="group relative text-center p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-500">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-violet-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative">
        <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-2">
          {displayValue}
        </div>
        <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

export function StatsSection({ config }: { config: StatsConfig; theme?: Record<string, unknown> }) {
  const items = config.items || [];
  if (items.length === 0) return null;

  return (
    <section className="py-16 px-6 relative">
      <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {items.map((stat, i) => (
          <AnimatedStat key={i} value={stat.value} label={stat.label} suffix={stat.suffix} prefix={stat.prefix} />
        ))}
      </div>
    </section>
  );
}
