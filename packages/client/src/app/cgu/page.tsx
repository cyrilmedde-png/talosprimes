'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Workflow } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function CGUPage() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/content`)
      .then(r => r.json())
      .then(data => {
        setContent(data.legal_cgu || '');
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
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Conditions Générales d'Utilisation (CGU)</h1>

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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Objet</h2>
            <p className="text-gray-700">
              Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès et l'utilisation 
              de la plateforme TalosPrimes (ci-après « la Plateforme ») éditée par TalosPrimes SaaS.
            </p>
            <p className="text-gray-700 mt-3">
              En accédant à la Plateforme, vous acceptez sans réserve les présentes CGU.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Accès à la Plateforme</h2>
            <p className="text-gray-700">
              L'accès à la Plateforme est réservé aux personnes physiques majeures ou personnes morales disposant 
              de la capacité juridique pour contracter.
            </p>
            <p className="text-gray-700 mt-3">
              L'accès à certaines fonctionnalités nécessite la création d'un compte utilisateur. Vous vous engagez 
              à fournir des informations exactes et à maintenir ces informations à jour.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Création de compte</h2>
            <p className="text-gray-700">
              Pour créer un compte, vous devez :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>Fournir des informations exactes, complètes et à jour</li>
              <li>Choisir un mot de passe sécurisé</li>
              <li>Ne pas partager vos identifiants de connexion</li>
              <li>Nous informer immédiatement de toute utilisation non autorisée de votre compte</li>
            </ul>
            <p className="text-gray-700 mt-3">
              Vous êtes responsable de toutes les activités effectuées depuis votre compte.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Services proposés</h2>
            <p className="text-gray-700">
              TalosPrimes propose une plateforme de gestion d'entreprise incluant :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>Un CRM pour la gestion de vos clients</li>
              <li>Un système de facturation automatisée</li>
              <li>Des workflows d'automatisation via n8n</li>
              <li>La gestion d'équipe et des utilisateurs</li>
              <li>Des modules métiers adaptables</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Obligations de l'Utilisateur</h2>
            <p className="text-gray-700">
              En utilisant la Plateforme, vous vous engagez à :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>Respecter les lois et règlements en vigueur</li>
              <li>Ne pas utiliser la Plateforme à des fins illégales ou frauduleuses</li>
              <li>Ne pas tenter d'accéder à des données ou fonctionnalités non autorisées</li>
              <li>Ne pas perturber le fonctionnement de la Plateforme</li>
              <li>Ne pas transmettre de virus, malwares ou tout code malveillant</li>
              <li>Respecter les droits de propriété intellectuelle</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Propriété intellectuelle</h2>
            <p className="text-gray-700">
              Tous les éléments de la Plateforme (code source, design, textes, images, logos, etc.) sont la 
              propriété exclusive de TalosPrimes SaaS et sont protégés par le droit de la propriété intellectuelle.
            </p>
            <p className="text-gray-700 mt-3">
              Vous conservez la propriété de vos données. TalosPrimes s'engage à ne pas utiliser vos données à 
              des fins autres que la fourniture du service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Protection des données</h2>
            <p className="text-gray-700">
              TalosPrimes s'engage à protéger vos données personnelles conformément au RGPD et à la loi 
              Informatique et Libertés.
            </p>
            <p className="text-gray-700 mt-3">
              Pour plus d'informations, consultez notre{' '}
              <Link href="/confidentialite" className="text-purple-600 hover:underline">
                Politique de confidentialité
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Disponibilité du service</h2>
            <p className="text-gray-700">
              TalosPrimes s'efforce d'assurer une disponibilité maximale de la Plateforme, mais ne peut garantir 
              une disponibilité à 100%.
            </p>
            <p className="text-gray-700 mt-3">
              Des interruptions peuvent survenir pour maintenance, mises à jour ou cas de force majeure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Limitation de responsabilité</h2>
            <p className="text-gray-700">
              TalosPrimes ne saurait être tenu responsable :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>De tout dommage direct ou indirect résultant de l'utilisation de la Plateforme</li>
              <li>De la perte de données résultant d'un cas de force majeure</li>
              <li>Des dysfonctionnements dus à votre matériel ou connexion internet</li>
              <li>De l'utilisation frauduleuse de vos identifiants par un tiers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Suspension et résiliation</h2>
            <p className="text-gray-700">
              TalosPrimes se réserve le droit de suspendre ou résilier votre accès en cas de :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>Non-respect des présentes CGU</li>
              <li>Non-paiement de votre abonnement</li>
              <li>Utilisation frauduleuse ou abusive de la Plateforme</li>
              <li>Demande de votre part</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Modifications des CGU</h2>
            <p className="text-gray-700">
              TalosPrimes se réserve le droit de modifier les présentes CGU à tout moment. Les modifications 
              entreront en vigueur dès leur publication sur la Plateforme.
            </p>
            <p className="text-gray-700 mt-3">
              Il vous appartient de consulter régulièrement les CGU pour prendre connaissance des éventuelles 
              modifications.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Droit applicable et juridiction</h2>
            <p className="text-gray-700">
              Les présentes CGU sont régies par le droit français. En cas de litige, les tribunaux français 
              seront seuls compétents.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Contact</h2>
            <p className="text-gray-700">
              Pour toute question concernant ces CGU, vous pouvez nous contacter :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>Par email : contact@talosprimes.com</li>
              <li>Par téléphone : +33 1 23 45 67 89</li>
              <li>Par courrier : 123 Avenue de la Tech, 75001 Paris, France</li>
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
