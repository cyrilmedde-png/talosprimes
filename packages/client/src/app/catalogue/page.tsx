import { Metadata } from 'next';
import Link from 'next/link';
import { DynamicLandingHeader } from '@/components/landing/DynamicLandingHeader';
import { DynamicFooter } from '@/components/landing/DynamicFooter';

export const metadata: Metadata = {
  title: 'Catalogue des automatisations | TalosPrimes',
  description: 'Découvrez toutes nos automatisations : emails, CRM, facturation, téléphonie IA, comptabilité, stocks et plus. Activez celles dont vous avez besoin.',
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
  email: 'Email',
  marketing: 'Marketing',
  telephonie: 'Téléphonie',
  facturation: 'Facturation',
  crm: 'CRM',
  sms: 'SMS',
  comptabilite: 'Comptabilité',
  stock: 'Stock',
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
  email: '📧',
  marketing: '📱',
  telephonie: '📞',
  facturation: '🧾',
  crm: '👥',
  sms: '💬',
  comptabilite: '📊',
  stock: '📦',
};

export default async function CataloguePage() {
  const [catalog, globalConfig] = await Promise.all([getCatalog(), getGlobalConfig()]);

  const categories = [...new Set(catalog.map(a => a.categorie))];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 antialiased relative">
      {/* Grid pattern global */}
      <div
        className="fixed inset-0 opacity-[0.04] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <DynamicLandingHeader config={globalConfig.navbar || {}} />

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
            </span>
            {catalog.length} automatisations disponibles
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-5">
            <span className="text-white">Catalogue des </span>
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">automatisations</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Explorez nos modules d&apos;automatisation et choisissez ceux qui correspondent à votre activité. Chaque module est déployable en quelques clics.
          </p>
        </div>
      </section>

      {/* Category filters */}
      <section className="px-6 pb-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <a
                key={cat}
                href={`#${cat}`}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all hover:-translate-y-0.5 ${categoryBadgeColors[cat] || 'bg-slate-800 text-slate-400 border-slate-700'}`}
              >
                <span>{iconMap[cat] || '⚡'}</span>
                {categoryLabels[cat] || cat}
                <span className="text-xs opacity-60">({catalog.filter(a => a.categorie === cat).length})</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Catalog grid by category */}
      {categories.map((cat) => (
        <section key={cat} id={cat} className="px-6 pb-16">
          <div className="max-w-5xl mx-auto">
            {/* Category header */}
            <div className="flex items-center gap-3 mb-8">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${categoryColors[cat] || 'from-slate-600 to-slate-700'} flex items-center justify-center text-lg`}>
                {iconMap[cat] || '⚡'}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{categoryLabels[cat] || cat}</h2>
                <p className="text-sm text-slate-500">{catalog.filter(a => a.categorie === cat).length} module{catalog.filter(a => a.categorie === cat).length > 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalog.filter(a => a.categorie === cat).map((item) => {
                const comp = complexityLabels[item.complexity] || { label: item.complexity, color: 'text-slate-400' };
                return (
                  <Link
                    key={item.code}
                    href={`/catalogue/${item.code}`}
                    className="group relative p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-600 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 hover:-translate-y-1"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${categoryColors[item.categorie] || 'from-slate-600 to-slate-700'} flex items-center justify-center text-xl shadow-lg`}>
                        {iconMap[item.categorie] || '⚡'}
                      </div>
                      <span className={`text-xs font-medium ${comp.color}`}>{comp.label}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-300 transition-colors">{item.nom}</h3>
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2 leading-relaxed">{item.description}</p>

                    {/* Features preview */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {(item.features || []).slice(0, 3).map((f, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
                          {f}
                        </span>
                      ))}
                      {(item.features || []).length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-500">
                          +{(item.features || []).length - 3}
                        </span>
                      )}
                    </div>

                    {/* Pricing */}
                    <div className="flex items-end justify-between pt-4 border-t border-slate-800/60">
                      <div>
                        <div className="text-xs text-slate-500 mb-0.5">À partir de</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-white">{parseFloat(item.monthly_price).toFixed(0)}</span>
                          <span className="text-sm text-slate-500">€/mois</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Voir détails
                        <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>

                    {/* Workflows count badge */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-slate-500">{item.workflow_count} workflows</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ))}

      {/* CTA bottom */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Besoin d&apos;une automatisation sur mesure ?</h2>
          <p className="text-slate-400 mb-8">Notre équipe peut créer des workflows personnalisés adaptés à votre métier.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/#contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 hover:-translate-y-0.5"
            >
              Demander un audit gratuit
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-white text-sm font-medium rounded-xl hover:bg-white/10 transition-all"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </section>

      <DynamicFooter config={globalConfig.footer || {}} />
    </div>
  );
}
