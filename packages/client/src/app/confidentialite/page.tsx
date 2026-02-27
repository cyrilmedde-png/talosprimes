'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { LegalPageLayout, LegalSection } from '@/components/LegalPageLayout';

export default function ConfidentialitePage() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/content`)
      .then((r) => r.json())
      .then((data) => {
        setContent(data.legal_confidentialite || '');
        setLoading(false);
      })
      .catch((err) => {
        console.error('Erreur chargement:', err);
        setLoading(false);
      });
  }, []);

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <LegalPageLayout title="Politique de Confidentialité et RGPD" lastUpdated={today}>
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
          <LegalSection number="1" title="Introduction">
            <p>
              TalosPrimes SaaS (ci-après &laquo; nous &raquo; ou &laquo; TalosPrimes &raquo;) s&apos;engage à protéger la vie privée et les
              données personnelles de ses utilisateurs conformément au Règlement Général sur la Protection des
              Données (RGPD) et à la loi Informatique et Libertés.
            </p>
            <p>
              Cette politique explique comment nous collectons, utilisons, stockons et protégeons vos données
              personnelles.
            </p>
          </LegalSection>

          <LegalSection number="2" title="Responsable du traitement">
            <p><strong className="text-slate-800">Raison sociale :</strong> TalosPrimes SaaS</p>
            <p><strong className="text-slate-800">Adresse :</strong> 123 Avenue de la Tech, 75001 Paris, France</p>
            <p><strong className="text-slate-800">Email :</strong> rgpd@talosprimes.com</p>
            <p><strong className="text-slate-800">Téléphone :</strong> +33 1 23 45 67 89</p>
          </LegalSection>

          <LegalSection number="3" title="Données collectées">
            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">3.1 Données d&apos;identification</h3>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Nom, prénom</li>
              <li>Adresse email</li>
              <li>Numéro de téléphone</li>
              <li>Nom de l&apos;entreprise</li>
              <li>SIRET/SIREN (pour les entreprises)</li>
            </ul>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">3.2 Données de connexion</h3>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Adresse IP</li>
              <li>Date et heure de connexion</li>
              <li>Type de navigateur</li>
              <li>Pages visitées</li>
            </ul>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">3.3 Données de paiement</h3>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Informations bancaires (via Stripe — nous ne stockons pas ces données)</li>
              <li>Historique de facturation</li>
              <li>Montants payés</li>
            </ul>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">3.4 Données métiers</h3>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Données clients (que vous importez dans le CRM)</li>
              <li>Factures et transactions</li>
              <li>Workflows et automations</li>
            </ul>
          </LegalSection>

          <LegalSection number="4" title="Finalités du traitement">
            <p>Nous collectons et traitons vos données pour les finalités suivantes :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Fourniture et gestion du service TalosPrimes</li>
              <li>Création et gestion de votre compte utilisateur</li>
              <li>Facturation et recouvrement</li>
              <li>Support client et assistance technique</li>
              <li>Amélioration de nos services</li>
              <li>Respect de nos obligations légales</li>
              <li>Envoi de communications importantes (mises à jour, maintenance)</li>
              <li>Statistiques anonymisées</li>
            </ul>
          </LegalSection>

          <LegalSection number="5" title="Base légale du traitement">
            <p>Nos traitements de données reposent sur :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li><strong className="text-slate-800">L&apos;exécution d&apos;un contrat :</strong> fourniture du service</li>
              <li><strong className="text-slate-800">L&apos;intérêt légitime :</strong> amélioration du service, sécurité</li>
              <li><strong className="text-slate-800">Le consentement :</strong> communications marketing (opt-in)</li>
              <li><strong className="text-slate-800">L&apos;obligation légale :</strong> facturation, comptabilité</li>
            </ul>
          </LegalSection>

          <LegalSection number="6" title="Durée de conservation">
            <p>Nous conservons vos données pour les durées suivantes :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li><strong className="text-slate-800">Données de compte :</strong> durée du contrat + 1 an</li>
              <li><strong className="text-slate-800">Données de facturation :</strong> 10 ans (obligation légale)</li>
              <li><strong className="text-slate-800">Données métiers :</strong> durée du contrat + 30 jours après résiliation</li>
              <li><strong className="text-slate-800">Logs de connexion :</strong> 1 an</li>
            </ul>
          </LegalSection>

          <LegalSection number="7" title="Destinataires des données">
            <p>Vos données peuvent être transmises à :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li><strong className="text-slate-800">Personnel autorisé de TalosPrimes</strong> (support, développement)</li>
              <li><strong className="text-slate-800">Sous-traitants :</strong> OVH (hébergement), Stripe (paiements), Supabase (base de données)</li>
              <li><strong className="text-slate-800">Autorités légales</strong> (sur demande judiciaire)</li>
            </ul>
          </LegalSection>

          <LegalSection number="8" title="Transferts hors UE">
            <p>
              Certains de nos sous-traitants peuvent stocker des données hors de l&apos;Union Européenne. Dans ce cas,
              nous nous assurons que des garanties appropriées sont en place (clauses contractuelles types,
              Privacy Shield, etc.).
            </p>
          </LegalSection>

          <LegalSection number="9" title="Sécurité des données">
            <p>Nous mettons en oeuvre des mesures techniques et organisationnelles pour protéger vos données :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Chiffrement SSL/TLS (HTTPS)</li>
              <li>Chiffrement des mots de passe (bcrypt)</li>
              <li>Isolation multi-tenant stricte</li>
              <li>Sauvegardes automatiques quotidiennes</li>
              <li>Contrôle d&apos;accès basé sur les rôles (RBAC)</li>
              <li>Surveillance et détection des intrusions</li>
              <li>Mises à jour de sécurité régulières</li>
            </ul>
          </LegalSection>

          <LegalSection number="10" title="Vos droits RGPD">
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li><strong className="text-slate-800">Droit d&apos;accès :</strong> obtenir une copie de vos données</li>
              <li><strong className="text-slate-800">Droit de rectification :</strong> corriger vos données inexactes</li>
              <li><strong className="text-slate-800">Droit à l&apos;effacement :</strong> supprimer vos données (&laquo; droit à l&apos;oubli &raquo;)</li>
              <li><strong className="text-slate-800">Droit à la limitation :</strong> limiter le traitement</li>
              <li><strong className="text-slate-800">Droit à la portabilité :</strong> récupérer vos données dans un format structuré</li>
              <li><strong className="text-slate-800">Droit d&apos;opposition :</strong> vous opposer à certains traitements</li>
              <li><strong className="text-slate-800">Droit de retirer votre consentement</strong></li>
            </ul>
            <p>Pour exercer ces droits, contactez-nous à : <strong className="text-slate-800">rgpd@talosprimes.com</strong></p>
            <p>Nous nous engageons à répondre dans un délai maximum de 1 mois.</p>
          </LegalSection>

          <LegalSection number="11" title="Réclamation">
            <p>
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès
              de la CNIL (Commission Nationale de l&apos;Informatique et des Libertés) :
            </p>
            <p><strong className="text-slate-800">Adresse :</strong> 3 Place de Fontenoy - TSA 80715 - 75334 PARIS CEDEX 07</p>
            <p><strong className="text-slate-800">Téléphone :</strong> 01 53 73 22 22</p>
            <p>
              <strong className="text-slate-800">Site web :</strong>{' '}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-slate-900 underline underline-offset-2 hover:text-slate-600 transition">
                www.cnil.fr
              </a>
            </p>
          </LegalSection>

          <LegalSection number="12" title="Cookies">
            <p>Nous utilisons des cookies pour :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li><strong className="text-slate-800">Cookies essentiels :</strong> authentification, sécurité (obligatoires)</li>
              <li><strong className="text-slate-800">Cookies de performance :</strong> statistiques anonymisées (facultatifs)</li>
              <li><strong className="text-slate-800">Cookies fonctionnels :</strong> préférences utilisateur (facultatifs)</li>
            </ul>
            <p>Vous pouvez paramétrer vos préférences de cookies dans votre navigateur.</p>
          </LegalSection>

          <LegalSection number="13" title="Modifications de la politique">
            <p>
              Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. Toute
              modification sera publiée sur cette page avec une date de mise à jour.
            </p>
            <p>En cas de modification substantielle, nous vous en informerons par email.</p>
          </LegalSection>

          <LegalSection number="14" title="Contact">
            <p>Pour toute question concernant cette politique de confidentialité :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>Email RGPD : <strong className="text-slate-800">rgpd@talosprimes.com</strong></li>
              <li>Email général : contact@talosprimes.com</li>
              <li>Téléphone : +33 1 23 45 67 89</li>
              <li>Adresse : 123 Avenue de la Tech, 75001 Paris, France</li>
            </ul>
          </LegalSection>
        </>
      )}
    </LegalPageLayout>
  );
}
