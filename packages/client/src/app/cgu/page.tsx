'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { LegalPageLayout, LegalSection } from '@/components/LegalPageLayout';

export default function CGUPage() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/content`)
      .then((r) => r.json())
      .then((data) => {
        setContent(data.legal_cgu || '');
        setLoading(false);
      })
      .catch((err) => {
        console.error('Erreur chargement:', err);
        setLoading(false);
      });
  }, []);

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <LegalPageLayout title="Conditions Générales d'Utilisation (CGU)" lastUpdated={today}>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
        </div>
      ) : content ? (
        <div className="prose prose-slate prose-sm max-w-none prose-headings:text-slate-900 prose-headings:font-semibold prose-p:text-slate-600 prose-p:leading-relaxed prose-a:text-slate-900 prose-a:underline prose-a:underline-offset-2">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      ) : (
        <>
          <LegalSection number="1" title="Objet">
            <p>
              Les présentes Conditions Générales d&apos;Utilisation (ci-après &laquo; CGU &raquo;) régissent l&apos;accès et l&apos;utilisation
              de la plateforme TalosPrimes (ci-après &laquo; la Plateforme &raquo;) éditée par TalosPrimes SaaS.
            </p>
            <p>En accédant à la Plateforme, vous acceptez sans réserve les présentes CGU.</p>
          </LegalSection>

          <LegalSection number="2" title="Accès à la Plateforme">
            <p>
              L&apos;accès à la Plateforme est réservé aux personnes physiques majeures ou personnes morales disposant
              de la capacité juridique pour contracter.
            </p>
            <p>
              L&apos;accès à certaines fonctionnalités nécessite la création d&apos;un compte utilisateur. Vous vous engagez
              à fournir des informations exactes et à maintenir ces informations à jour.
            </p>
          </LegalSection>

          <LegalSection number="3" title="Création de compte">
            <p>Pour créer un compte, vous devez :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Fournir des informations exactes, complètes et à jour</li>
              <li>Choisir un mot de passe sécurisé</li>
              <li>Ne pas partager vos identifiants de connexion</li>
              <li>Nous informer immédiatement de toute utilisation non autorisée de votre compte</li>
            </ul>
            <p>Vous êtes responsable de toutes les activités effectuées depuis votre compte.</p>
          </LegalSection>

          <LegalSection number="4" title="Services proposés">
            <p>TalosPrimes propose une plateforme de gestion d&apos;entreprise incluant :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Un CRM pour la gestion de vos clients</li>
              <li>Un système de facturation automatisée</li>
              <li>Des workflows d&apos;automatisation via n8n</li>
              <li>La gestion d&apos;équipe et des utilisateurs</li>
              <li>Des modules métiers adaptables</li>
            </ul>
          </LegalSection>

          <LegalSection number="5" title="Obligations de l'Utilisateur">
            <p>En utilisant la Plateforme, vous vous engagez à :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Respecter les lois et règlements en vigueur</li>
              <li>Ne pas utiliser la Plateforme à des fins illégales ou frauduleuses</li>
              <li>Ne pas tenter d&apos;accéder à des données ou fonctionnalités non autorisées</li>
              <li>Ne pas perturber le fonctionnement de la Plateforme</li>
              <li>Ne pas transmettre de virus, malwares ou tout code malveillant</li>
              <li>Respecter les droits de propriété intellectuelle</li>
            </ul>
          </LegalSection>

          <LegalSection number="6" title="Propriété intellectuelle">
            <p>
              Tous les éléments de la Plateforme (code source, design, textes, images, logos, etc.) sont la
              propriété exclusive de TalosPrimes SaaS et sont protégés par le droit de la propriété intellectuelle.
            </p>
            <p>
              Vous conservez la propriété de vos données. TalosPrimes s&apos;engage à ne pas utiliser vos données à
              des fins autres que la fourniture du service.
            </p>
          </LegalSection>

          <LegalSection number="7" title="Protection des données">
            <p>
              TalosPrimes s&apos;engage à protéger vos données personnelles conformément au RGPD et à la loi
              Informatique et Libertés.
            </p>
            <p>
              Pour plus d&apos;informations, consultez notre{' '}
              <Link href="/confidentialite" className="text-slate-900 underline underline-offset-2 hover:text-slate-600 transition">
                Politique de confidentialité
              </Link>.
            </p>
          </LegalSection>

          <LegalSection number="8" title="Disponibilité du service">
            <p>
              TalosPrimes s&apos;efforce d&apos;assurer une disponibilité maximale de la Plateforme, mais ne peut garantir
              une disponibilité à 100%.
            </p>
            <p>Des interruptions peuvent survenir pour maintenance, mises à jour ou cas de force majeure.</p>
          </LegalSection>

          <LegalSection number="9" title="Limitation de responsabilité">
            <p>TalosPrimes ne saurait être tenu responsable :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>De tout dommage direct ou indirect résultant de l&apos;utilisation de la Plateforme</li>
              <li>De la perte de données résultant d&apos;un cas de force majeure</li>
              <li>Des dysfonctionnements dus à votre matériel ou connexion internet</li>
              <li>De l&apos;utilisation frauduleuse de vos identifiants par un tiers</li>
            </ul>
          </LegalSection>

          <LegalSection number="10" title="Suspension et résiliation">
            <p>TalosPrimes se réserve le droit de suspendre ou résilier votre accès en cas de :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Non-respect des présentes CGU</li>
              <li>Non-paiement de votre abonnement</li>
              <li>Utilisation frauduleuse ou abusive de la Plateforme</li>
              <li>Demande de votre part</li>
            </ul>
          </LegalSection>

          <LegalSection number="11" title="Modifications des CGU">
            <p>
              TalosPrimes se réserve le droit de modifier les présentes CGU à tout moment. Les modifications
              entreront en vigueur dès leur publication sur la Plateforme.
            </p>
            <p>
              Il vous appartient de consulter régulièrement les CGU pour prendre connaissance des éventuelles
              modifications.
            </p>
          </LegalSection>

          <LegalSection number="12" title="Droit applicable et juridiction">
            <p>
              Les présentes CGU sont régies par le droit français. En cas de litige, les tribunaux français
              seront seuls compétents.
            </p>
          </LegalSection>

          <LegalSection number="13" title="Contact">
            <p>Pour toute question concernant ces CGU, vous pouvez nous contacter :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Par email : contact@talosprimes.com</li>
              <li>Par téléphone : +33 1 23 45 67 89</li>
              <li>Par courrier : 123 Avenue de la Tech, 75001 Paris, France</li>
            </ul>
          </LegalSection>
        </>
      )}
    </LegalPageLayout>
  );
}
