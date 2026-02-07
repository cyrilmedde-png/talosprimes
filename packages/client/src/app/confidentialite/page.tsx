import Link from 'next/link';
import { ArrowLeft, Workflow } from 'lucide-react';

export default function ConfidentialitePage() {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Politique de Confidentialité et RGPD</h1>

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700">
              TalosPrimes SaaS (ci-après « nous » ou « TalosPrimes ») s'engage à protéger la vie privée et les 
              données personnelles de ses utilisateurs conformément au Règlement Général sur la Protection des 
              Données (RGPD) et à la loi Informatique et Libertés.
            </p>
            <p className="text-gray-700 mt-3">
              Cette politique explique comment nous collectons, utilisons, stockons et protégeons vos données 
              personnelles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Responsable du traitement</h2>
            <div className="space-y-3 text-gray-700">
              <p><strong>Raison sociale :</strong> TalosPrimes SaaS</p>
              <p><strong>Adresse :</strong> 123 Avenue de la Tech, 75001 Paris, France</p>
              <p><strong>Email :</strong> rgpd@talosprimes.com</p>
              <p><strong>Téléphone :</strong> +33 1 23 45 67 89</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Données collectées</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.1 Données d'identification</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Nom, prénom</li>
              <li>Adresse email</li>
              <li>Numéro de téléphone</li>
              <li>Nom de l'entreprise</li>
              <li>SIRET/SIREN (pour les entreprises)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.2 Données de connexion</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Adresse IP</li>
              <li>Date et heure de connexion</li>
              <li>Type de navigateur</li>
              <li>Pages visitées</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.3 Données de paiement</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Informations bancaires (via Stripe - nous ne stockons pas ces données)</li>
              <li>Historique de facturation</li>
              <li>Montants payés</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.4 Données métiers</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Données clients (que vous importez dans le CRM)</li>
              <li>Factures et transactions</li>
              <li>Workflows et automations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Finalités du traitement</h2>
            <p className="text-gray-700">
              Nous collectons et traitons vos données pour les finalités suivantes :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>Fourniture et gestion du service TalosPrimes</li>
              <li>Création et gestion de votre compte utilisateur</li>
              <li>Facturation et recouvrement</li>
              <li>Support client et assistance technique</li>
              <li>Amélioration de nos services</li>
              <li>Respect de nos obligations légales</li>
              <li>Envoi de communications importantes (mises à jour, maintenance)</li>
              <li>Statistiques anonymisées</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Base légale du traitement</h2>
            <p className="text-gray-700">
              Nos traitements de données reposent sur :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li><strong>L'exécution d'un contrat :</strong> fourniture du service</li>
              <li><strong>L'intérêt légitime :</strong> amélioration du service, sécurité</li>
              <li><strong>Le consentement :</strong> communications marketing (opt-in)</li>
              <li><strong>L'obligation légale :</strong> facturation, comptabilité</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Durée de conservation</h2>
            <p className="text-gray-700">
              Nous conservons vos données pour les durées suivantes :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li><strong>Données de compte :</strong> durée du contrat + 1 an</li>
              <li><strong>Données de facturation :</strong> 10 ans (obligation légale)</li>
              <li><strong>Données métiers :</strong> durée du contrat + 30 jours après résiliation</li>
              <li><strong>Logs de connexion :</strong> 1 an</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Destinataires des données</h2>
            <p className="text-gray-700">
              Vos données peuvent être transmises à :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li><strong>Personnel autorisé de TalosPrimes</strong> (support, développement)</li>
              <li><strong>Sous-traitants :</strong>
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>OVH (hébergement)</li>
                  <li>Stripe (paiements)</li>
                  <li>Supabase (base de données)</li>
                </ul>
              </li>
              <li><strong>Autorités légales</strong> (sur demande judiciaire)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Transferts hors UE</h2>
            <p className="text-gray-700">
              Certains de nos sous-traitants peuvent stocker des données hors de l'Union Européenne. Dans ce cas, 
              nous nous assurons que des garanties appropriées sont en place (clauses contractuelles types, 
              Privacy Shield, etc.).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Sécurité des données</h2>
            <p className="text-gray-700">
              Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>Chiffrement SSL/TLS (HTTPS)</li>
              <li>Chiffrement des mots de passe (bcrypt)</li>
              <li>Isolation multi-tenant stricte</li>
              <li>Sauvegardes automatiques quotidiennes</li>
              <li>Contrôle d'accès basé sur les rôles (RBAC)</li>
              <li>Surveillance et détection des intrusions</li>
              <li>Mises à jour de sécurité régulières</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Vos droits RGPD</h2>
            <p className="text-gray-700">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li><strong>Droit d'accès :</strong> obtenir une copie de vos données</li>
              <li><strong>Droit de rectification :</strong> corriger vos données inexactes</li>
              <li><strong>Droit à l'effacement :</strong> supprimer vos données (« droit à l'oubli »)</li>
              <li><strong>Droit à la limitation :</strong> limiter le traitement</li>
              <li><strong>Droit à la portabilité :</strong> récupérer vos données dans un format structuré</li>
              <li><strong>Droit d'opposition :</strong> vous opposer à certains traitements</li>
              <li><strong>Droit de retirer votre consentement</strong></li>
            </ul>
            
            <p className="text-gray-700 mt-6">
              Pour exercer ces droits, contactez-nous à : <strong>rgpd@talosprimes.com</strong>
            </p>
            <p className="text-gray-700 mt-3">
              Nous nous engageons à répondre dans un délai maximum de 1 mois.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Réclamation</h2>
            <p className="text-gray-700">
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès 
              de la CNIL (Commission Nationale de l'Informatique et des Libertés) :
            </p>
            <div className="mt-3 space-y-2 text-gray-700">
              <p><strong>Adresse :</strong> 3 Place de Fontenoy - TSA 80715 - 75334 PARIS CEDEX 07</p>
              <p><strong>Téléphone :</strong> 01 53 73 22 22</p>
              <p><strong>Site web :</strong> <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">www.cnil.fr</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Cookies</h2>
            <p className="text-gray-700">
              Nous utilisons des cookies pour :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li><strong>Cookies essentiels :</strong> authentification, sécurité (obligatoires)</li>
              <li><strong>Cookies de performance :</strong> statistiques anonymisées (facultatifs)</li>
              <li><strong>Cookies fonctionnels :</strong> préférences utilisateur (facultatifs)</li>
            </ul>
            <p className="text-gray-700 mt-3">
              Vous pouvez paramétrer vos préférences de cookies dans votre navigateur.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Modifications de la politique</h2>
            <p className="text-gray-700">
              Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. Toute 
              modification sera publiée sur cette page avec une date de mise à jour.
            </p>
            <p className="text-gray-700 mt-3">
              En cas de modification substantielle, nous vous en informerons par email.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Contact</h2>
            <p className="text-gray-700">
              Pour toute question concernant cette politique de confidentialité :
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>Email RGPD : <strong>rgpd@talosprimes.com</strong></li>
              <li>Email général : contact@talosprimes.com</li>
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
      </div>
    </div>
  );
}
