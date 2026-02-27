'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { LegalPageLayout, LegalSection } from '@/components/LegalPageLayout';

export default function CGVPage() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/content`)
      .then((r) => r.json())
      .then((data) => {
        setContent(data.legal_cgv || '');
        setLoading(false);
      })
      .catch((err) => {
        console.error('Erreur chargement:', err);
        setLoading(false);
      });
  }, []);

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <LegalPageLayout title="Conditions Générales de Vente (CGV)" lastUpdated={today}>
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
          <LegalSection number="1" title="Préambule">
            <p>
              Les présentes Conditions Générales de Vente (ci-après &laquo; CGV &raquo;) régissent les relations contractuelles
              entre TalosPrimes SaaS (ci-après &laquo; le Vendeur &raquo;) et toute personne physique ou morale (ci-après
              &laquo; le Client &raquo;) souhaitant souscrire aux services proposés sur la plateforme TalosPrimes.
            </p>
          </LegalSection>

          <LegalSection number="2" title="Services proposés">
            <p>TalosPrimes propose les services suivants en mode SaaS :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Solution CRM multi-tenant</li>
              <li>Système de facturation automatisée</li>
              <li>Automatisation via workflows n8n</li>
              <li>Gestion d&apos;équipe et utilisateurs</li>
              <li>Modules métiers personnalisables</li>
            </ul>
            <p>Les services sont accessibles en ligne via un abonnement mensuel ou annuel.</p>
          </LegalSection>

          <LegalSection number="3" title="Tarifs et paiement">
            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">3.1 Tarifs</h3>
            <p>
              Les tarifs des services sont indiqués en euros HT et TTC sur le site. TalosPrimes se réserve le
              droit de modifier ses tarifs à tout moment, sous réserve d&apos;en informer le Client 30 jours à l&apos;avance.
            </p>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">3.2 Modalités de paiement</h3>
            <p>Le paiement s&apos;effectue :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Par carte bancaire via Stripe</li>
              <li>Par prélèvement automatique (SEPA)</li>
              <li>Par virement bancaire (sur demande)</li>
            </ul>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">3.3 Facturation</h3>
            <p>Les factures sont émises automatiquement et envoyées par email à chaque échéance d&apos;abonnement.</p>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">3.4 Retard de paiement</h3>
            <p>Tout retard de paiement entraînera :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>La suspension de l&apos;accès aux services après 7 jours</li>
              <li>L&apos;application de pénalités de retard de 3 fois le taux d&apos;intérêt légal</li>
              <li>Une indemnité forfaitaire de 40&euro; pour frais de recouvrement</li>
            </ul>
          </LegalSection>

          <LegalSection number="4" title="Durée et renouvellement">
            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">4.1 Durée de l&apos;abonnement</h3>
            <p>Les abonnements sont souscrits pour une durée :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Mensuelle (engagement mensuel)</li>
              <li>Annuelle (engagement annuel avec réduction)</li>
            </ul>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">4.2 Renouvellement</h3>
            <p>Sauf résiliation, l&apos;abonnement est renouvelé automatiquement pour la même durée.</p>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">4.3 Résiliation</h3>
            <p>Le Client peut résilier son abonnement à tout moment :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Pour un abonnement mensuel : résiliation effective à la fin de la période en cours</li>
              <li>Pour un abonnement annuel : résiliation effective à la date d&apos;anniversaire</li>
            </ul>
            <p>La résiliation s&apos;effectue depuis l&apos;espace client ou par email à support@talosprimes.com.</p>
          </LegalSection>

          <LegalSection number="5" title="Droit de rétractation">
            <p>
              Conformément à l&apos;article L221-28 du Code de la consommation, le Client professionnel ne bénéficie
              pas du droit de rétractation.
            </p>
            <p>
              Le Client particulier dispose d&apos;un délai de 14 jours à compter de la souscription pour exercer son
              droit de rétractation, sauf s&apos;il a expressément demandé la fourniture immédiate du service.
            </p>
          </LegalSection>

          <LegalSection number="6" title="Obligations du Vendeur">
            <p>TalosPrimes s&apos;engage à :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Fournir un service conforme aux spécifications annoncées</li>
              <li>Assurer la disponibilité du service (objectif : 99,5% de uptime)</li>
              <li>Effectuer des sauvegardes régulières des données</li>
              <li>Garantir la sécurité et la confidentialité des données (conformité RGPD)</li>
              <li>Fournir un support technique par email</li>
            </ul>
          </LegalSection>

          <LegalSection number="7" title="Obligations du Client">
            <p>Le Client s&apos;engage à :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Fournir des informations exactes lors de l&apos;inscription</li>
              <li>Payer les sommes dues aux échéances prévues</li>
              <li>Utiliser le service conformément aux CGU</li>
              <li>Informer TalosPrimes de toute anomalie ou dysfonctionnement</li>
              <li>Ne pas transmettre ses identifiants à des tiers</li>
            </ul>
          </LegalSection>

          <LegalSection number="8" title="Garanties et responsabilité">
            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">8.1 Garantie de disponibilité</h3>
            <p>
              TalosPrimes s&apos;engage à fournir un service avec un taux de disponibilité de 99,5% (hors maintenance programmée).
            </p>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">8.2 Limitation de responsabilité</h3>
            <p>
              La responsabilité de TalosPrimes est limitée aux dommages directs et prévisibles. En aucun cas,
              TalosPrimes ne pourra être tenu responsable de :
            </p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Dommages indirects (perte de données, manque à gagner, etc.)</li>
              <li>Utilisation frauduleuse du service par le Client ou un tiers</li>
              <li>Dysfonctionnements dus à la connexion internet du Client</li>
              <li>Cas de force majeure</li>
            </ul>
          </LegalSection>

          <LegalSection number="9" title="Propriété des données">
            <p>Le Client reste propriétaire de l&apos;ensemble de ses données. TalosPrimes s&apos;engage à :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Ne pas utiliser les données du Client à des fins autres que la fourniture du service</li>
              <li>Permettre l&apos;export des données à tout moment</li>
              <li>Supprimer les données du Client dans un délai de 30 jours après résiliation</li>
              <li>Respecter la réglementation RGPD</li>
            </ul>
          </LegalSection>

          <LegalSection number="10" title="Force majeure">
            <p>
              TalosPrimes ne pourra être tenu responsable de l&apos;inexécution de ses obligations en cas de force
              majeure, notamment : catastrophe naturelle, incendie, grève, défaillance des réseaux de
              télécommunication, actes de terrorisme, etc.
            </p>
          </LegalSection>

          <LegalSection number="11" title="Modification des CGV">
            <p>
              TalosPrimes se réserve le droit de modifier les présentes CGV à tout moment. Les modifications
              seront notifiées au Client 30 jours avant leur entrée en vigueur.
            </p>
          </LegalSection>

          <LegalSection number="12" title="Droit applicable et juridiction">
            <p>
              Les présentes CGV sont régies par le droit français. Tout litige sera soumis aux tribunaux compétents
              de Paris, après tentative de résolution amiable.
            </p>
          </LegalSection>

          <LegalSection number="13" title="Contact">
            <p>Pour toute question concernant ces CGV :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Email : support@talosprimes.com</li>
              <li>Téléphone : +33 1 23 45 67 89</li>
              <li>Adresse : 123 Avenue de la Tech, 75001 Paris, France</li>
            </ul>
          </LegalSection>
        </>
      )}
    </LegalPageLayout>
  );
}
