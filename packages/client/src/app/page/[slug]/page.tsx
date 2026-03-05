'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Workflow, Check, Loader2, ArrowRight, Sparkles, Phone, Mail } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface CmsPage {
  id: string;
  slug: string;
  titre: string;
  contenu: string;
  metaTitle: string | null;
  metaDesc: string | null;
  publie: boolean;
}

interface TarifPlan {
  id: string;
  code: string;
  nom: string;
  description: string | null;
  prixMensuel: number;
  prixAnnuel: number | null;
  essaiJours: number;
  couleur: string | null;
  planModules: Array<{
    id: string;
    module: { code: string; nomAffiche: string; categorie: string | null };
  }>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Calcule le % d'économie annuel, retourne null si invalide */
function calcDiscount(mensuel: number, annuel: number | null): number | null {
  if (!annuel || mensuel <= 0) return null;
  const fullPrice = mensuel * 12;
  if (fullPrice <= 0) return null;
  const discount = Math.round((1 - annuel / fullPrice) * 100);
  return discount > 0 && discount < 100 ? discount : null;
}

/** Formatte un prix : affiche les centimes seulement si nécessaire */
function formatPrice(price: number): string {
  const n = Number(price);
  if (!Number.isFinite(n)) return '0';
  // Si le prix a des centimes (ex: 79.90), on affiche 2 décimales
  // Sinon (ex: 150), on n'affiche pas de décimales
  const hasDecimals = n % 1 !== 0;
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });
}

export default function DynamicCmsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [page, setPage] = useState<CmsPage | null>(null);
  const [plans, setPlans] = useState<TarifPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    if (!slug) return;

    const loadPage = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/landing/pages/${slug}`);
        if (!res.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (data.success && data.data?.page) {
          setPage(data.data.page);
          if (data.data.plans) {
            setPlans(data.data.plans);
          }
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    };

    loadPage();
  }, [slug]);

  useEffect(() => {
    if (page) {
      document.title = page.metaTitle || page.titre + ' - TalosPrimes';
    }
  }, [page]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <Workflow className="w-8 h-8 text-indigo-600" />
              <span className="text-2xl font-bold text-gray-900">
                TalosPrimes
              </span>
            </Link>
            <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition text-sm">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Link>
          </div>
        </nav>
      </header>

      {/* Content */}
      <main>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
            <p className="text-gray-400 text-sm">Chargement...</p>
          </div>
        ) : notFound ? (
          <div className="text-center py-32">
            <h1 className="text-7xl font-bold text-gray-200 mb-4">404</h1>
            <p className="text-lg text-gray-500 mb-8">Cette page n&apos;existe pas</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à l&apos;accueil
            </Link>
          </div>
        ) : page ? (
          <>
            {/* Section tarifs avec les cartes de plans */}
            {slug === 'tarifs' && plans.length > 0 && (
              <TarifsSection
                plans={plans}
                billingCycle={billingCycle}
                setBillingCycle={setBillingCycle}
              />
            )}

            {/* Contenu CMS Markdown (affiché sous les plans ou seul pour les pages standard) */}
            {page.contenu && (
              <div className="container mx-auto px-6 py-12 max-w-4xl">
                {/* Titre uniquement pour les pages CMS standard (pas tarifs) */}
                {!(slug === 'tarifs' && plans.length > 0) && (
                  <h1 className="text-4xl font-bold text-gray-900 mb-8">{page.titre}</h1>
                )}
                <div className="max-w-none text-gray-800 leading-relaxed [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mt-10 [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1 [&_strong]:font-bold [&_em]:italic [&_hr]:my-8 [&_hr]:border-gray-200 [&_a]:text-indigo-600 [&_a]:underline">
                  <ReactMarkdown>{page.contenu}</ReactMarkdown>
                </div>
              </div>
            )}
          </>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 mt-16">
        <div className="container mx-auto px-6 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} TalosPrimes. Tous droits réservés.
          <span className="mx-2">·</span>
          <Link href="/mentions-legales" className="hover:text-indigo-600 transition">Mentions légales</Link>
          <span className="mx-2">·</span>
          <Link href="/cgu" className="hover:text-indigo-600 transition">CGU</Link>
          <span className="mx-2">·</span>
          <Link href="/confidentialite" className="hover:text-indigo-600 transition">Confidentialité</Link>
        </div>
      </footer>
    </div>
  );
}

/* ─── SECTION TARIFS ─────────────────────────────────────────────── */

function TarifsSection({
  plans,
  billingCycle,
  setBillingCycle,
}: {
  plans: TarifPlan[];
  billingCycle: 'monthly' | 'annual';
  setBillingCycle: (v: 'monthly' | 'annual') => void;
}) {
  // Déterminer quel plan est le plus "populaire" (index 1 s'il existe)
  const popularIndex = plans.length >= 2 ? 1 : -1;

  // Vérifier si au moins un plan a un prix annuel
  const hasAnnualPricing = plans.some((p) => p.prixAnnuel && p.prixAnnuel > 0);

  return (
    <>
      {/* Hero */}
      <section className="pt-16 pb-8 text-center">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Tarification transparente
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Choisissez le plan adapté<br />à votre entreprise
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Tous les plans incluent un essai gratuit. Sans engagement, évoluez à tout moment.
          </p>

          {/* Toggle mensuel/annuel */}
          {hasAnnualPricing && (
            <div className="mt-8 inline-flex items-center bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  billingCycle === 'annual'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Annuel
                <span className="ml-1.5 text-xs text-emerald-600 font-semibold">Économisez</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Plans Grid */}
      <section className="pb-16">
        <div className="container mx-auto px-6">
          <div className={`grid gap-6 max-w-5xl mx-auto ${
            plans.length === 1 ? 'grid-cols-1 max-w-md' :
            plans.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-3xl' :
            plans.length >= 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : ''
          }`}>
            {plans.map((plan, index) => {
              const isPopular = index === popularIndex;
              const mensuel = Number(plan.prixMensuel);
              const annuel = plan.prixAnnuel ? Number(plan.prixAnnuel) : null;
              const discount = calcDiscount(mensuel, annuel);
              const isFree = mensuel === 0;

              // Prix affiché
              const displayPrice = billingCycle === 'annual' && annuel
                ? formatPrice(Math.round(annuel / 12))
                : formatPrice(mensuel);

              const displayTotal = billingCycle === 'annual' && annuel
                ? formatPrice(annuel)
                : null;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl transition-all ${
                    isPopular
                      ? 'bg-gray-900 text-white shadow-2xl shadow-gray-900/20 scale-[1.02] lg:scale-105'
                      : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-lg'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-indigo-500 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide">
                        Le plus populaire
                      </span>
                    </div>
                  )}

                  <div className="p-8">
                    {/* Plan name */}
                    <h3 className={`text-lg font-semibold ${isPopular ? 'text-white' : 'text-gray-900'}`}>
                      {plan.nom}
                    </h3>
                    {plan.description && (
                      <p className={`text-sm mt-1 leading-relaxed ${isPopular ? 'text-gray-400' : 'text-gray-500'}`}>
                        {plan.description}
                      </p>
                    )}

                    {/* Price */}
                    <div className="mt-6 mb-1">
                      {isFree ? (
                        <div className="flex items-baseline gap-1">
                          <span className={`text-4xl font-bold ${isPopular ? 'text-white' : 'text-gray-900'}`}>
                            Gratuit
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className={`text-4xl font-bold ${isPopular ? 'text-white' : 'text-gray-900'}`}>
                            {displayPrice}€
                          </span>
                          <span className={`text-sm ${isPopular ? 'text-gray-400' : 'text-gray-500'}`}>
                            /mois
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Annual info */}
                    {!isFree && billingCycle === 'annual' && displayTotal ? (
                      <p className={`text-sm ${isPopular ? 'text-gray-400' : 'text-gray-400'}`}>
                        {displayTotal}€ facturé par an
                        {discount && (
                          <span className="text-emerald-500 font-medium ml-1">
                            (-{discount}%)
                          </span>
                        )}
                      </p>
                    ) : !isFree && billingCycle === 'monthly' && annuel ? (
                      <p className={`text-sm ${isPopular ? 'text-gray-400' : 'text-gray-400'}`}>
                        ou {formatPrice(annuel)}€/an
                        {discount && (
                          <span className="text-emerald-500 font-medium ml-1">
                            (-{discount}%)
                          </span>
                        )}
                      </p>
                    ) : null}

                    {/* Trial */}
                    {plan.essaiJours > 0 && !isFree && (
                      <p className={`text-xs mt-2 font-medium ${isPopular ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        {plan.essaiJours} jours d&apos;essai gratuit
                      </p>
                    )}

                    {/* CTA */}
                    <Link
                      href="/inscription"
                      className={`mt-6 flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all ${
                        isPopular
                          ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {isFree ? 'Créer un compte' : 'Commencer l\'essai'}
                      <ArrowRight className="w-4 h-4" />
                    </Link>

                    {/* Modules */}
                    <div className={`mt-8 pt-6 border-t ${isPopular ? 'border-gray-700' : 'border-gray-100'}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wider mb-4 ${
                        isPopular ? 'text-gray-400' : 'text-gray-400'
                      }`}>
                        Ce qui est inclus
                      </p>
                      <ul className="space-y-3">
                        {plan.planModules.map((pm) => (
                          <li key={pm.id} className="flex items-start gap-3">
                            <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                              isPopular ? 'text-emerald-400' : 'text-emerald-500'
                            }`} />
                            <span className={`text-sm ${isPopular ? 'text-gray-300' : 'text-gray-600'}`}>
                              {pm.module.nomAffiche}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="pb-20">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="bg-gray-50 rounded-2xl p-10 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Besoin d&apos;un plan sur mesure ?
            </h2>
            <p className="text-gray-500 mb-8 max-w-lg mx-auto">
              Nous adaptons nos solutions aux besoins spécifiques de votre entreprise.
              Contactez-nous pour un devis personnalisé.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/#contact"
                className="inline-flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition font-semibold text-sm"
              >
                <Mail className="w-4 h-4" />
                Nous contacter
              </Link>
              <a
                href="tel:+33789394806"
                className="inline-flex items-center gap-2 px-8 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold text-sm"
              >
                <Phone className="w-4 h-4" />
                07 89 39 48 06
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
