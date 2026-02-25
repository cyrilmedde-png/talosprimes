'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Workflow, CheckCircle, Loader2 } from 'lucide-react';
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

export default function DynamicCmsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [page, setPage] = useState<CmsPage | null>(null);
  const [plans, setPlans] = useState<TarifPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
          // Pour la page tarifs, les plans sont inclus dans la réponse
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

  // Mise à jour du titre de la page
  useEffect(() => {
    if (page) {
      document.title = page.metaTitle || page.titre + ' - TalosPrimes';
    }
  }, [page]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <Workflow className="w-8 h-8 text-purple-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                TalosPrimes
              </span>
            </Link>
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition">
              <ArrowLeft className="w-5 h-5" />
              Retour à l&apos;accueil
            </Link>
          </div>
        </nav>
      </header>

      {/* Content */}
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-4" />
            <p className="text-gray-500">Chargement...</p>
          </div>
        ) : notFound ? (
          <div className="text-center py-20">
            <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
            <p className="text-xl text-gray-500 mb-8">Page introuvable</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour à l&apos;accueil
            </Link>
          </div>
        ) : page ? (
          <>
            <h1 className="text-4xl font-bold text-gray-900 mb-8">{page.titre}</h1>

            {/* Contenu Markdown de la page */}
            {page.contenu && (
              <div className="bg-white rounded-lg shadow-lg p-8 prose prose-lg max-w-none mb-10">
                <ReactMarkdown>{page.contenu}</ReactMarkdown>
              </div>
            )}

            {/* Section Tarifs (uniquement pour slug=tarifs) */}
            {slug === 'tarifs' && plans.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {plans.map((plan, index) => {
                  const isPopular = index === 1;
                  return (
                    <div
                      key={plan.id}
                      className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                        isPopular ? 'ring-2 ring-purple-500 shadow-purple-100' : ''
                      }`}
                    >
                      {/* Bande couleur en haut */}
                      <div
                        className="h-2"
                        style={{ backgroundColor: plan.couleur ?? '#6366f1' }}
                      />

                      {isPopular && (
                        <div className="absolute top-4 right-4 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                          Populaire
                        </div>
                      )}

                      <div className="p-8">
                        <h3 className="text-xl font-bold text-gray-900">{plan.nom}</h3>
                        {plan.description && (
                          <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                        )}

                        <div className="mt-6 mb-2">
                          <span className="text-4xl font-extrabold text-gray-900">
                            {Number(plan.prixMensuel).toFixed(0)}€
                          </span>
                          <span className="text-gray-500 ml-1">/mois</span>
                        </div>
                        {plan.prixAnnuel && (
                          <p className="text-sm text-gray-400">
                            ou {Number(plan.prixAnnuel).toFixed(0)}€/an
                            <span className="text-green-600 font-medium ml-1">
                              (-{Math.round((1 - Number(plan.prixAnnuel) / (Number(plan.prixMensuel) * 12)) * 100)}%)
                            </span>
                          </p>
                        )}
                        <p className="text-xs text-purple-600 mt-1 font-medium">
                          {plan.essaiJours} jours d&apos;essai gratuit
                        </p>

                        <div className="mt-6 border-t border-gray-100 pt-6">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                            Inclus
                          </h4>
                          <ul className="space-y-2.5">
                            {plan.planModules.map((pm) => (
                              <li key={pm.id} className="flex items-start gap-2.5">
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-700">{pm.module.nomAffiche}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <Link
                          href="/inscription"
                          className={`mt-8 block text-center py-3 px-6 rounded-lg font-semibold transition ${
                            isPopular
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                          }`}
                        >
                          Commencer l&apos;essai gratuit
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CTA */}
            {slug === 'tarifs' && (
              <div className="mt-16 text-center bg-white rounded-2xl shadow-lg p-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Besoin d&apos;un plan sur mesure ?
                </h2>
                <p className="text-gray-500 mb-6 max-w-lg mx-auto">
                  Contactez-nous pour un devis personnalisé adapté aux besoins spécifiques de votre entreprise.
                </p>
                <Link
                  href="/#contact"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                >
                  Nous contacter
                </Link>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Footer léger */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="container mx-auto px-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} TalosPrimes. Tous droits réservés.
          <span className="mx-2">·</span>
          <Link href="/mentions-legales" className="hover:text-purple-600 transition">Mentions légales</Link>
          <span className="mx-2">·</span>
          <Link href="/cgu" className="hover:text-purple-600 transition">CGU</Link>
          <span className="mx-2">·</span>
          <Link href="/confidentialite" className="hover:text-purple-600 transition">Confidentialité</Link>
        </div>
      </footer>
    </div>
  );
}
