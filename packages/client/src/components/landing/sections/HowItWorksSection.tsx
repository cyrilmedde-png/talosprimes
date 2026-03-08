'use client';

import { iconMap } from './iconMap';
import { BadgeCheck } from 'lucide-react';

interface Step {
  number: string;
  title: string;
  description: string;
  icon?: string;
}

interface HowItWorksConfig {
  title?: string;
  subtitle?: string;
  steps?: Step[];
}

export function HowItWorksSection({ config }: { config: HowItWorksConfig; theme?: Record<string, unknown> }) {
  const steps = config.steps || [];

  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            {config.title || 'Démarrez en 3 étapes'}
          </h2>
          <p className="text-slate-500 text-base max-w-lg mx-auto">
            {config.subtitle || 'Simple, rapide et sans engagement.'}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((item, i) => {
            const StepIcon = item.icon ? (iconMap[item.icon] || BadgeCheck) : BadgeCheck;
            return (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
                  <StepIcon className="w-7 h-7 text-slate-600" strokeWidth={1.5} />
                </div>
                <div className="text-xs font-bold text-slate-300 mb-2">{item.number}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
