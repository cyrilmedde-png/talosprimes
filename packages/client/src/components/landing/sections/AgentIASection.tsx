'use client';

import { useEffect, useState } from 'react';
import { Brain, Users, Bot, PhoneCall, Mic } from 'lucide-react';
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

function TypingMessage({ text, delay }: { text: string; delay: number }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(timer);
    }, 25);
    return () => clearInterval(timer);
  }, [started, text]);

  if (!started) return null;
  return <>{displayed}{displayed.length < text.length ? <span className="animate-pulse">|</span> : ''}</>;
}

function WaveformVisualizer() {
  return (
    <div className="flex items-center gap-0.5 h-6">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="w-0.5 bg-amber-400/60 rounded-full animate-waveform"
          style={{
            animationDelay: `${i * 100}ms`,
            height: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

export function AgentIASection({ config }: { config: AgentIAConfig; theme?: Record<string, unknown> }) {
  const features = config.features || [];
  const messages = config.chatMessages || [];
  const BadgeIcon = config.badge?.icon ? (iconMap[config.badge.icon] || Brain) : Brain;

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Dark gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.bgGradient || 'from-slate-950 via-slate-900 to-slate-950'}`} />

      {/* Animated gradient orbs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-amber-500/10 via-orange-500/5 to-transparent rounded-full blur-3xl animate-orb-1" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-blue-500/10 via-violet-500/5 to-transparent rounded-full blur-3xl animate-orb-2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none' stroke='%23fff' stroke-width='0.5'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <div>
            {config.badge && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/20 text-amber-300 text-xs font-medium mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                </span>
                <BadgeIcon className="w-3.5 h-3.5" />
                {config.badge.text}
              </div>
            )}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5 leading-tight text-white">
              {config.title || 'Votre assistant IA,'}<br />
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                {config.titleHighlight || 'disponible 24h/24'}
              </span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed mb-10 max-w-lg">
              {config.subtitle}
            </p>

            {/* Features with better design */}
            <div className="space-y-4">
              {features.map((item, i) => {
                const ItemIcon = iconMap[item.icon] || Brain;
                return (
                  <div key={i} className="group flex items-center gap-4 p-3 -mx-3 rounded-xl hover:bg-white/5 transition-colors duration-300">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <ItemIcon className="w-5 h-5 text-amber-400" />
                    </div>
                    <span className="text-slate-300 text-sm font-medium">{item.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Call stats */}
            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { value: '<2s', label: 'Temps de réponse' },
                { value: '24/7', label: 'Disponibilité' },
                { value: '98%', label: 'Satisfaction' },
              ].map((stat, i) => (
                <div key={i} className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-lg font-bold text-amber-400">{stat.value}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Phone/Chat simulation */}
          <div className="relative">
            {/* Phone frame */}
            <div className="relative max-w-sm mx-auto">
              {/* Glow */}
              <div className="absolute -inset-8 bg-gradient-to-r from-amber-500/10 via-violet-500/10 to-blue-500/10 rounded-[3rem] blur-2xl" />

              <div className="relative bg-slate-800/90 backdrop-blur-xl rounded-[2.5rem] border border-white/15 p-4 shadow-2xl shadow-black/50">
                {/* Phone notch */}
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-5 bg-slate-900 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center gap-3 px-2 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Léa — Agent IA</div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      En ligne
                    </div>
                  </div>
                  <div className="ml-auto">
                    <PhoneCall className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>

                {/* Messages */}
                <div className="space-y-3 px-1 min-h-[240px]">
                  {messages.map((msg, i) => (
                    msg.role === 'user' ? (
                      <div key={i} className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-1">
                          <Users className="w-3 h-3 text-blue-400" />
                        </div>
                        <div className="bg-white/10 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[11px] text-slate-300 max-w-[80%]">
                          <TypingMessage text={msg.text} delay={i * 2000} />
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="flex gap-2 justify-end">
                        <div className="bg-gradient-to-br from-amber-500/25 to-amber-500/15 rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-[11px] text-amber-100 max-w-[80%] border border-amber-500/20">
                          <TypingMessage text={msg.text} delay={i * 2000 + 500} />
                        </div>
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-1">
                          <Bot className="w-3 h-3 text-amber-400" />
                        </div>
                      </div>
                    )
                  ))}
                </div>

                {/* Waveform + input */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 px-1">
                    <WaveformVisualizer />
                    <div className="ml-auto flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Mic className="w-4 h-4 text-amber-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Home indicator */}
                <div className="flex justify-center mt-4">
                  <div className="w-24 h-1 bg-slate-600 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
