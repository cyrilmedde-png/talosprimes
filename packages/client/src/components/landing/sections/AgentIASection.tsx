'use client';

import { Brain, Users, Bot } from 'lucide-react';
import { iconMap } from './iconMap';

interface AgentIAConfig {
  badge?: { text: string; icon?: string };
  title?: string;
  titleHighlight?: string;
  subtitle?: string;
  features?: { icon: string; text: string }[];
  chatMessages?: { role: string; text: string }[];
  bgGradient?: string;
}

export function AgentIASection({ config }: { config: AgentIAConfig; theme?: any }) {
  const features = config.features || [];
  const messages = config.chatMessages || [];
  const BadgeIcon = config.badge?.icon ? (iconMap[config.badge.icon] || Brain) : Brain;

  return (
    <section className={`py-24 px-6 bg-gradient-to-br ${config.bgGradient || 'from-slate-900 via-slate-900 to-slate-800'} text-white overflow-hidden relative`}>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />

      <div className="relative max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            {config.badge && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium mb-6">
                <BadgeIcon className="w-3.5 h-3.5" />
                {config.badge.text}
              </div>
            )}
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5 leading-tight">
              {config.title || 'Votre assistant IA,'}<br />
              <span className="text-amber-400">{config.titleHighlight || 'disponible 24h/24'}</span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed mb-8">
              {config.subtitle}
            </p>
            <div className="space-y-3">
              {features.map((item, i) => {
                const ItemIcon = iconMap[item.icon] || Brain;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <ItemIcon className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-slate-300 text-sm">{item.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat illustration */}
          <div className="relative">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  msg.role === 'user' ? (
                    <div key={i} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="bg-white/10 rounded-xl rounded-tl-sm px-4 py-2.5 text-sm text-slate-300 max-w-xs">
                        {msg.text}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex gap-3 justify-end">
                      <div className="bg-amber-500/20 rounded-xl rounded-tr-sm px-4 py-2.5 text-sm text-amber-100 max-w-xs">
                        {msg.text}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-amber-400" />
                      </div>
                    </div>
                  )
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-slate-500">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Agent IA actif — temps de réponse &lt; 2s
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
