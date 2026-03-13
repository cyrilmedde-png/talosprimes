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
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/30 to-white" />

      <div className="relative max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium mb-4 border border-emerald-100">
            <BadgeCheck className="w-3.5 h-3.5" />
            Simple & rapide
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight mb-4">
            {config.title || 'Démarrez en 3 étapes'}
          </h2>
          <p className="text-slate-500 text-base max-w-lg mx-auto">
            {config.subtitle || 'Simple, rapide et sans engagement.'}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connection line */}
          <div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {steps.map((item, i) => {
            const StepIcon = item.icon ? (iconMap[item.icon] || BadgeCheck) : BadgeCheck;
            return (
              <div key={i} className="group text-center relative">
                {/* Step number badge */}
                <div className="relative mx-auto mb-6 w-20 h-20">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl rotate-3 group-hover:rotate-6 transition-transform duration-500 opacity-10" />
                  <div className="relative w-full h-full rounded-2xl bg-white border-2 border-slate-100 group-hover:border-slate-200 flex items-center justify-center transition-all duration-500 shadow-sm group-hover:shadow-lg">
                    <StepIcon className="w-8 h-8 text-slate-700 group-hover:text-blue-600 transition-colors duration-300" strokeWidth={1.5} />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-slate-900 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-md">
                    {item.number || i + 1}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-[250px] mx-auto">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
