import { Metadata } from 'next';
import Link from 'next/link';
import { DynamicLandingHeader } from '@/components/landing/DynamicLandingHeader';
import { DynamicFooter } from '@/components/landing/DynamicFooter';

export const metadata: Metadata = {
  title: 'Catalogue des automatisations | TalosPrimes',
  description: 'Découvrez toutes nos automatisations : emails, CRM, facturation, téléphonie IA, comptabilité, stocks et plus.',
};

export const dynamic = 'force-dynamic';

const SERVER_API = process.env.INTERNAL_API_URL || 'http://localhost:3001';

interface CatalogItem {
  code: string;
  nom: string;
  description: string;
  categorie: string;
  icon: string;
  setup_price: string;
  monthly_price: string;
  complexity: string;
  workflow_count: number;
  features: string[];
}

interface GlobalConfig {
  navbar?: Record<string, unknown>;
  footer?: Record<string, unknown>;
}

async function getCatalog(): Promise<CatalogItem[]> {
  try {
    const res = await fetch(`${SERVER_API}/api/landing/catalog`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

async function getGlobalConfig(): Promise<GlobalConfig> {
  try {
    const res = await fetch(`${SERVER_API}/api/landing/global-config`, { cache: 'no-store' });
    if (!res.ok) return {};
    const json = await res.json();
    return json.data || json || {};
  } catch {
    return {};
  }
}

const categoryLabels: Record<string, string> = {
  email: 'Email', marketing: 'Marketing', telephonie: 'Téléphonie',
  facturation: 'Facturation', crm: 'CRM', sms: 'SMS',
  comptabilite: 'Comptabilité', stock: 'Stock',
};

const categoryColors: Record<string, string> = {
  email: 'from-blue-500 to-blue-600',
  marketing: 'from-pink-500 to-rose-600',
  telephonie: 'from-amber-500 to-orange-600',
  facturation: 'from-emerald-500 to-green-600',
  crm: 'from-violet-500 to-purple-600',
  sms: 'from-cyan-500 to-teal-600',
  comptabilite: 'from-indigo-500 to-blue-600',
  stock: 'from-orange-500 to-amber-600',
};

const categoryBadgeColors: Record<string, string> = {
  email: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  marketing: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  telephonie: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  facturation: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  crm: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  sms: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  comptabilite: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  stock: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const complexityLabels: Record<string, { label: string; color: string }> = {
  simple: { label: 'Simple', color: 'text-emerald-400' },
  intermediaire: { label: 'Intermédiaire', color: 'text-amber-400' },
  avance: { label: 'Avancé', color: 'text-rose-400' },
};

const iconMap: Record<string, string> = {
  email: '📧', marketing: '📱', telephonie: '📞', facturation: '🧾',
  crm: '👥', sms: '💬', comptabilite: '📊', stock: '📦',
};

export default async function CataloguePage() {
  const [catalog, globalConfig] = await Promise.all([getCatalog(), getGlobalConfig()]);
  const categories = [...new Set(catalog.map(a => a.categorie))];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 antialiased relative">
      {/* Grid pattern */}
      <div
        className="fixed inset-0 opacity-[0.04] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <DynamicLandingHeader config={globalConfig.navbar || {}} />

      {/* Hero compact */}
      <section className="relative pt-28 pb-10 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-medium mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
            </span>
            {catalog.length} automatisations disponibles
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-3">
            <span className="text-white">Nos </span>
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">automatisations</span>
          </h1>
          <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
            Chaque module est déployable en quelques clics. Activez ceux dont vous avez besoin.
          </p>
        </div>
      </section>

      {/* Category pills */}
      <section className="px-6 pb-6">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <a
              key={cat}
              href={`#${cat}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:-translate-y-0.5 ${categoryBadgeColors[cat] || 'bg-slate-800 text-slate-400 border-slate-700'}`}
            >
              <span>{iconMap[cat] || '⚡'}</span>
              {categoryLabels[cat] || cat}
            </a>
          ))}
        </div>
      </section>

      {/* All cards — single compact grid */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {catalog.map((item) => {
            const comp = complexityLabels[item.complexity] || { label: item.complexity, color: 'text-slate-400' };
            return (
              <Link
                key={item.code}
                href={`/catalogue/${item.code}`}
                className="group relative flex flex-col p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-600 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 hover:-translate-y-1"
              >
                {/* Top row: icon + category */}
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${categoryColors[item.categorie] || 'from-slate-600 to-slate-700'} flex items-center justify-center text-lg shadow-lg`}>
                    {iconMap[item.categorie] || '⚡'}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${categoryBadgeColors[item.categorie] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    {categoryLabels[item.categorie] || item.categorie}
                  </span>
                </div>

                {/* Title + description */}
                <h3 className="text-sm font-semibold text-white mb-1.5 group-hover:text-blue-300 transition-colors leading-snug">{item.nom}</h3>
                <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed flex-1">{item.description}</p>

                {/* Features chips — 2 max */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {(item.features || []).slice(0, 2).map((f, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 border border-white/5 truncate max-w-[120px]">
                      {f}
                    </span>
                  ))}
                  {(item.features || []).length > 2 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-600">
                      +{(item.features || []).length - 2}
                    </span>
                  )}
                </div>

                {/* Footer: price + complexity */}
                <div className="flex items-end justify-between pt-3 border-t border-slate-800/60 mt-auto">
                  <div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-lg font-bold text-white">{parseFloat(item.monthly_price).toFixed(0)}</span>
                      <span className="text-[10px] text-slate-500">€/mois</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium ${comp.color}`}>{comp.label}</span>
                    <svg className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA compact */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600/10 via-violet-600/10 to-purple-600/10 border border-white/10 p-8 sm:p-10">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-violet-600/5" />
            <div className="relative flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-xl font-bold text-white mb-2">Besoin d&apos;une automatisation sur mesure ?</h2>
                <p className="text-sm text-slate-400">Notre équipe crée des workflows personnalisés adaptés à votre métier.</p>
              </div>
              <Link
                href="/#contact"
                className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 hover:-translate-y-0.5"
              >
                Demander un audit
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <DynamicFooter config={globalConfig.footer || {}} />
    </div>
  );
}
