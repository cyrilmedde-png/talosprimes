import { Metadata } from 'next';
import Link from 'next/link';
import { DynamicLandingHeader } from '@/components/landing/DynamicLandingHeader';
import { DynamicFooter } from '@/components/landing/DynamicFooter';

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
  workflow_templates?: { name: string; description?: string }[];
}

interface CatalogListItem {
  code: string;
  nom: string;
  categorie: string;
  monthly_price: string;
}

interface GlobalConfig {
  navbar?: Record<string, unknown>;
  footer?: Record<string, unknown>;
}

async function getItem(code: string): Promise<CatalogItem | null> {
  try {
    const res = await fetch(`${SERVER_API}/api/landing/catalog/${encodeURIComponent(code)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function getCatalog(): Promise<CatalogListItem[]> {
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

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const item = await getItem(code);
  if (!item) return { title: 'Automatisation introuvable | TalosPrimes' };
  return {
    title: `${item.nom} | Catalogue TalosPrimes`,
    description: item.description,
  };
}

const categoryLabels: Record<string, string> = {
  email: 'Email', marketing: 'Marketing', telephonie: 'Téléphonie',
  facturation: 'Facturation', crm: 'CRM', sms: 'SMS',
  comptabilite: 'Comptabilité', stock: 'Stock',
};

const categoryColors: Record<string, string> = {
  email: 'from-blue-500 to-blue-600', marketing: 'from-pink-500 to-rose-600',
  telephonie: 'from-amber-500 to-orange-600', facturation: 'from-emerald-500 to-green-600',
  crm: 'from-violet-500 to-purple-600', sms: 'from-cyan-500 to-teal-600',
  comptabilite: 'from-indigo-500 to-blue-600', stock: 'from-orange-500 to-amber-600',
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

const iconMap: Record<string, string> = {
  email: '📧', marketing: '📱', telephonie: '📞', facturation: '🧾',
  crm: '👥', sms: '💬', comptabilite: '📊', stock: '📦',
};

const complexityLabels: Record<string, { label: string; color: string; description: string }> = {
  simple: { label: 'Simple', color: 'text-emerald-400', description: 'Mise en place rapide, idéal pour débuter' },
  intermediaire: { label: 'Intermédiaire', color: 'text-amber-400', description: 'Configuration personnalisée selon vos besoins' },
  avance: { label: 'Avancé', color: 'text-rose-400', description: 'Solution complète avec intégrations multiples' },
};

export default async function CatalogueDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [item, catalog, globalConfig] = await Promise.all([
    getItem(code),
    getCatalog(),
    getGlobalConfig(),
  ]);

  if (!item) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Automatisation introuvable</h1>
          <p className="text-slate-400 mb-6">Cette automatisation n&apos;existe pas ou n&apos;est plus disponible.</p>
          <Link href="/catalogue" className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition">
            Retour au catalogue
          </Link>
        </div>
      </div>
    );
  }

  const comp = complexityLabels[item.complexity] || { label: item.complexity, color: 'text-slate-400', description: '' };
  const related = catalog.filter(a => a.categorie === item.categorie && a.code !== item.code).slice(0, 3);

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

      {/* Breadcrumb */}
      <div className="relative pt-28 pb-4 px-6">
        <div className="max-w-5xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-300 transition">Accueil</Link>
            <span>/</span>
            <Link href="/catalogue" className="hover:text-slate-300 transition">Catalogue</Link>
            <span>/</span>
            <span className="text-slate-300">{item.nom}</span>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <section className="relative px-6 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left column — detail */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header */}
              <div>
                <div className="flex items-center gap-4 mb-5">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${categoryColors[item.categorie] || 'from-slate-600 to-slate-700'} flex items-center justify-center text-3xl shadow-lg`}>
                    {iconMap[item.categorie] || '⚡'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${categoryBadgeColors[item.categorie] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {categoryLabels[item.categorie] || item.categorie}
                      </span>
                      <span className={`text-xs font-medium ${comp.color}`}>{comp.label}</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white">{item.nom}</h1>
                  </div>
                </div>
                <p className="text-lg text-slate-400 leading-relaxed">{item.description}</p>
              </div>

              {/* Features */}
              <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
                <h2 className="text-xl font-semibold text-white mb-5 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Fonctionnalités incluses
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(item.features || []).map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm text-slate-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
                <h2 className="text-xl font-semibold text-white mb-5 flex items-center gap-2">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Détails techniques
                </h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-2xl font-bold text-white mb-1">{item.workflow_count}</div>
                    <div className="text-xs text-slate-500">Workflows inclus</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className={`text-2xl font-bold mb-1 ${comp.color}`}>{comp.label}</div>
                    <div className="text-xs text-slate-500">Complexité</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-2xl font-bold text-white mb-1">{(item.features || []).length}</div>
                    <div className="text-xs text-slate-500">Fonctionnalités</div>
                  </div>
                </div>
                {comp.description && (
                  <p className="text-sm text-slate-500 mt-4">{comp.description}</p>
                )}
              </div>
            </div>

            {/* Right column — pricing card sticky */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-4">
                {/* Pricing card */}
                <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-700 backdrop-blur">
                  <div className="text-sm text-slate-400 mb-2">Tarification</div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-4xl font-bold text-white">{parseFloat(item.monthly_price).toFixed(0)}</span>
                      <span className="text-lg text-slate-500">€</span>
                      <span className="text-sm text-slate-500">/mois</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      + {parseFloat(item.setup_price).toFixed(0)}€ de mise en place
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {item.workflow_count} workflows configurés
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Support technique inclus
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Déploiement en 48h
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Sans engagement
                    </div>
                  </div>

                  <Link
                    href="/#contact"
                    className="block w-full text-center px-6 py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 hover:-translate-y-0.5"
                  >
                    Demander cette automatisation
                  </Link>
                  <Link
                    href="/#contact"
                    className="block w-full text-center px-6 py-3 mt-2 border border-slate-700 text-slate-300 text-sm font-medium rounded-xl hover:bg-white/5 transition-all"
                  >
                    Poser une question
                  </Link>
                </div>

                {/* Back to catalog */}
                <Link
                  href="/catalogue"
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition p-3"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Retour au catalogue
                </Link>
              </div>
            </div>
          </div>

          {/* Related automations */}
          {related.length > 0 && (
            <div className="mt-16 pt-12 border-t border-slate-800">
              <h2 className="text-2xl font-bold text-white mb-6">Autres modules {categoryLabels[item.categorie] || item.categorie}</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {related.map((rel) => (
                  <Link
                    key={rel.code}
                    href={`/catalogue/${rel.code}`}
                    className="group p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-600 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${categoryColors[rel.categorie] || 'from-slate-600 to-slate-700'} flex items-center justify-center text-lg mb-3`}>
                      {iconMap[rel.categorie] || '⚡'}
                    </div>
                    <h3 className="text-base font-semibold text-white group-hover:text-blue-300 transition-colors mb-1">{rel.nom}</h3>
                    <div className="text-sm text-slate-500">{parseFloat(rel.monthly_price).toFixed(0)}€/mois</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <DynamicFooter config={globalConfig.footer || {}} />
    </div>
  );
}
