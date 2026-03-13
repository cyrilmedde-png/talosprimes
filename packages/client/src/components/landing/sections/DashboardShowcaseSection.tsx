'use client';

import { useState } from 'react';
import { BarChart3, Sparkles } from 'lucide-react';
import { DashboardMockup } from './DashboardMockup';
import { iconMap } from './iconMap';

interface ShowcaseConfig {
  badge?: { text: string; icon?: string };
  title?: string;
  subtitle?: string;
  tabs?: { id: string; label: string; icon: string; description: string }[];
}

const defaultTabs = [
  { id: 'main', label: 'Dashboard', icon: 'BarChart3', description: 'Vue d\'ensemble en temps réel de votre activité avec KPIs, graphiques et alertes.' },
  { id: 'crm', label: 'CRM', icon: 'Users', description: 'Pipeline commercial visuel, suivi des leads et conversion automatisée.' },
  { id: 'factures', label: 'Facturation', icon: 'FileText', description: 'Devis, factures et relances automatiques avec suivi des paiements.' },
  { id: 'agent-ia', label: 'Agent IA', icon: 'Bot', description: 'Votre assistant vocal IA qui gère les appels, qualifie et prend des rendez-vous.' },
];

export function DashboardShowcaseSection({ config }: { config: ShowcaseConfig; theme?: Record<string, unknown> }) {
  const tabs = config.tabs || defaultTabs;
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'main');
  const activeTabData = tabs.find(t => t.id === activeTab) || tabs[0];
  const BadgeIcon = config.badge?.icon ? (iconMap[config.badge.icon] || Sparkles) : Sparkles;

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-white via-slate-50/50 to-white overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          {config.badge && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 text-violet-600 text-xs font-medium mb-4">
              <BadgeIcon className="w-3.5 h-3.5" />
              {config.badge.text}
            </div>
          )}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight mb-4">
            {config.title || (
              <>Découvrez <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">l&apos;interface</span></>
            )}
          </h2>
          <p className="text-slate-500 text-base max-w-xl mx-auto">
            {config.subtitle || 'Une plateforme pensée pour la productivité. Chaque module est conçu pour vous faire gagner du temps.'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map((tab) => {
            const TabIcon = iconMap[tab.icon] || BarChart3;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700 hover:shadow-sm'
                }`}
              >
                <TabIcon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Description */}
        <p className="text-center text-slate-500 text-sm mb-8 max-w-lg mx-auto min-h-[40px]">
          {activeTabData?.description}
        </p>

        {/* Dashboard mockup */}
        <div className="max-w-4xl mx-auto">
          <DashboardMockup variant={activeTab as 'main' | 'crm' | 'factures' | 'agent-ia'} />
        </div>
      </div>
    </section>
  );
}
