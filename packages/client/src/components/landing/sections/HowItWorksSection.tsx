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
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="relative max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-4 border border-emerald-500/20">
            <BadgeCheck className="w-3.5 h-3.5" />
            Simple & rapide
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4">
            {config.title || 'Démarrez en 3 étapes'}
          </h2>
          <p className="text-slate-400 text-base max-w-lg mx-auto">
            {config.subtitle || 'Simple, rapide et sans engagement.'}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connection line */}
          <div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

          {steps.map((item, i) => {
            const StepIcon = item.icon ? (iconMap[item.icon] || BadgeCheck) : BadgeCheck;
            return (
              <div key={i} className="group text-center relative">
                {/* Step number badge */}
                <div className="relative mx-auto mb-6 w-20 h-20">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl rotate-3 group-hover:rotate-6 transition-transform duration-500 opacity-20" />
                  <div className="relative w-full h-full rounded-2xl bg-slate-900 border-2 border-slate-800 group-hover:border-slate-700 flex items-center justify-center transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:shadow-blue-500/10">
                    <StepIcon className="w-8 h-8 text-slate-400 group-hover:text-blue-400 transition-colors duration-300" strokeWidth={1.5} />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-blue-600 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-md">
                    {item.number || i + 1}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-[250px] mx-auto">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
