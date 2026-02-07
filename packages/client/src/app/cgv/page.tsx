'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Workflow } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function CGVPage() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/content`)
      .then(r => r.json())
      .then(data => {
        setContent(data.legal_cgv || '');
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur chargement:', err);
        setLoading(false);
      });
  }, []);
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
              Retour à l'accueil
            </Link>
          </div>
        </nav>
      </header>

      {/* Content */}
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Conditions Générales de Vente (CGV)</h1>

        {loading ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        ) : content ? (
          <div className="bg-white rounded-lg shadow-lg p-8 prose prose-lg max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Préambule</h2>
            <p className="text-gray-700">
              Les présentes Conditions Générales de Vente (ci-après « CGV ») régissent les relations contractuelles 
              entre TalosPrimes SaaS (ci-après « le Vendeur ») et toute personne physique ou morale (ci-après 
              « le Client ») souhaitant souscrire aux services proposés sur la plateforme TalosPrimes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Services proposés</h2>
            <p className="text-gray-700">
              TalosPrimes propose les services suivants en mode SaaS :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>Solution CRM multi-tenant</li>
              <li>Système de facturation automatisée</li>
              <li>Automatisation via workflows n8n</li>
              <li>Gestion d'équipe et utilisateurs</li>
              <li>Modules métiers personnalisables</li>
            </ul>
            <p className="text-gray-700 mt-3">
              Les services sont accessibles en ligne via un abonnement mensuel ou annuel.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Tarifs et paiement</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.1 Tarifs</h3>
            <p className="text-gray-700">
              Les tarifs des services sont indiqués en euros HT et TTC sur le site. TalosPrimes se réserve le 
              droit de modifier ses tarifs à tout moment, sous réserve d'en informer le Client 30 jours à l'avance.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.2 Modalités de paiement</h3>
            <p className="text-gray-700">
              Le paiement s'effectue :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>Par carte bancaire via Stripe</li>
              <li>Par prélèvement automatique (SEPA)</li>
              <li>Par virement bancaire (sur demande)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.3 Facturation</h3>
            <p className="text-gray-700">
              Les factures sont émises automatiquement et envoyées par email à chaque échéance d'abonnement.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.4 Retard de paiement</h3>
            <p className="text-gray-700">
              Tout retard de paiement entraînera :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>La suspension de l'accès aux services après 7 jours</li>
              <li>L'application de pénalités de retard de 3 fois le taux d'intérêt légal</li>
              <li>Une indemnité forfaitaire de 40€ pour frais de recouvrement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Durée et renouvellement</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.1 Durée de l'abonnement</h3>
            <p className="text-gray-700">
              Les abonnements sont souscrits pour une durée :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>Mensuelle (engagement mensuel)</li>
              <li>Annuelle (engagement annuel avec réduction)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.2 Renouvellement</h3>
            <p className="text-gray-700">
              Sauf résiliation, l'abonnement est renouvelé automatiquement pour la même durée.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.3 Résiliation</h3>
            <p className="text-gray-700">
              Le Client peut résilier son abonnement à tout moment :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>Pour un abonnement mensuel : résiliation effective à la fin de la période en cours</li>
              <li>Pour un abonnement annuel : résiliation effective à la date d'anniversaire</li>
            </ul>
            <p className="text-gray-700 mt-3">
              La résiliation s'effectue depuis l'espace client ou par email à support@talosprimes.com.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Droit de rétractation</h2>
            <p className="text-gray-700">
              Conformément à l'article L221-28 du Code de la consommation, le Client professionnel ne bénéficie 
              pas du droit de rétractation.
            </p>
            <p className="text-gray-700 mt-3">
              Le Client particulier dispose d'un délai de 14 jours à compter de la souscription pour exercer son 
              droit de rétractation, sauf s'il a expressément demandé la fourniture immédiate du service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Obligations du Vendeur</h2>
            <p className="text-gray-700">
              TalosPrimes s'engage à :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>Fournir un service conforme aux spécifications annoncées</li>
              <li>Assurer la disponibilité du service (objectif : 99,5% de uptime)</li>
              <li>Effectuer des sauvegardes régulières des données</li>
              <li>Garantir la sécurité et la confidentialité des données (conformité RGPD)</li>
              <li>Fournir un support technique par email</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Obligations du Client</h2>
            <p className="text-gray-700">
              Le Client s'engage à :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>Fournir des informations exactes lors de l'inscription</li>
              <li>Payer les sommes dues aux échéances prévues</li>
              <li>Utiliser le service conformément aux CGU</li>
              <li>Informer TalosPrimes de toute anomalie ou dysfonctionnement</li>
              <li>Ne pas transmettre ses identifiants à des tiers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Garanties et responsabilité</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">8.1 Garantie de disponibilité</h3>
            <p className="text-gray-700">
              TalosPrimes s'engage à fournir un service avec un taux de disponibilité de 99,5% (hors maintenance 
              programmée).
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">8.2 Limitation de responsabilité</h3>
            <p className="text-gray-700">
              La responsabilité de TalosPrimes est limitée aux dommages directs et prévisibles. En aucun cas, 
              TalosPrimes ne pourra être tenu responsable de :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>Dommages indirects (perte de données, manque à gagner, etc.)</li>
              <li>Utilisation frauduleuse du service par le Client ou un tiers</li>
              <li>Dysfonctionnements dus à la connexion internet du Client</li>
              <li>Cas de force majeure</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Propriété des données</h2>
            <p className="text-gray-700">
              Le Client reste propriétaire de l'ensemble de ses données. TalosPrimes s'engage à :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>Ne pas utiliser les données du Client à des fins autres que la fourniture du service</li>
              <li>Permettre l'export des données à tout moment</li>
              <li>Supprimer les données du Client dans un délai de 30 jours après résiliation</li>
              <li>Respecter la réglementation RGPD</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Force majeure</h2>
            <p className="text-gray-700">
              TalosPrimes ne pourra être tenu responsable de l'inexécution de ses obligations en cas de force 
              majeure, notamment : catastrophe naturelle, incendie, grève, défaillance des réseaux de 
              télécommunication, actes de terrorisme, etc.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Modification des CGV</h2>
            <p className="text-gray-700">
              TalosPrimes se réserve le droit de modifier les présentes CGV à tout moment. Les modifications 
              seront notifiées au Client 30 jours avant leur entrée en vigueur.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Droit applicable et juridiction</h2>
            <p className="text-gray-700">
              Les présentes CGV sont régies par le droit français. Tout litige sera soumis aux tribunaux compétents 
              de Paris, après tentative de résolution amiable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Contact</h2>
            <p className="text-gray-700">
              Pour toute question concernant ces CGV :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>Email : support@talosprimes.com</li>
              <li>Téléphone : +33 1 23 45 67 89</li>
              <li>Adresse : 123 Avenue de la Tech, 75001 Paris, France</li>
            </ul>
          </section>

          <div className="pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
