import Link from 'next/link';
import { ArrowLeft, Workflow } from 'lucide-react';

export default function MentionsLegalesPage() {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Mentions Légales</h1>

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Informations légales</h2>
            <div className="space-y-3 text-gray-700">
              <p><strong>Raison sociale :</strong> TalosPrimes SaaS</p>
              <p><strong>Forme juridique :</strong> SAS (Société par Actions Simplifiée)</p>
              <p><strong>Capital social :</strong> 10 000 €</p>
              <p><strong>SIRET :</strong> XXX XXX XXX XXXXX</p>
              <p><strong>Numéro de TVA intracommunautaire :</strong> FR XX XXX XXX XXX</p>
              <p><strong>Siège social :</strong> 123 Avenue de la Tech, 75001 Paris, France</p>
              <p><strong>Téléphone :</strong> +33 1 23 45 67 89</p>
              <p><strong>Email :</strong> contact@talosprimes.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Directeur de publication</h2>
            <p className="text-gray-700">
              Le directeur de la publication du site est le représentant légal de TalosPrimes SaaS.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Hébergement</h2>
            <div className="space-y-3 text-gray-700">
              <p><strong>Hébergeur :</strong> OVH</p>
              <p><strong>Adresse :</strong> 2 rue Kellermann, 59100 Roubaix, France</p>
              <p><strong>Téléphone :</strong> 1007</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Propriété intellectuelle</h2>
            <p className="text-gray-700">
              L'ensemble du contenu de ce site (textes, images, vidéos, logos, etc.) est la propriété exclusive 
              de TalosPrimes SaaS ou de ses partenaires. Toute reproduction, distribution, modification, 
              adaptation, retransmission ou publication de ces éléments est strictement interdite sans l'accord 
              écrit préalable de TalosPrimes SaaS.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Protection des données personnelles</h2>
            <p className="text-gray-700">
              Conformément à la loi Informatique et Libertés du 6 janvier 1978 modifiée et au Règlement Général 
              sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification, de 
              suppression et d'opposition au traitement de vos données personnelles.
            </p>
            <p className="text-gray-700 mt-3">
              Pour exercer ces droits, veuillez nous contacter à l'adresse : <strong>rgpd@talosprimes.com</strong>
            </p>
            <p className="text-gray-700 mt-3">
              Pour plus d'informations, consultez notre{' '}
              <Link href="/confidentialite" className="text-purple-600 hover:underline">
                Politique de confidentialité
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookies</h2>
            <p className="text-gray-700">
              Ce site utilise des cookies pour améliorer l'expérience utilisateur. En poursuivant votre navigation, 
              vous acceptez l'utilisation de cookies. Vous pouvez à tout moment désactiver les cookies dans les 
              paramètres de votre navigateur.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Limitation de responsabilité</h2>
            <p className="text-gray-700">
              TalosPrimes SaaS s'efforce d'assurer au mieux l'exactitude et la mise à jour des informations 
              diffusées sur ce site. Cependant, TalosPrimes SaaS ne peut garantir l'exactitude, la précision ou 
              l'exhaustivité des informations mises à disposition sur ce site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Droit applicable</h2>
            <p className="text-gray-700">
              Les présentes mentions légales sont régies par le droit français. En cas de litige, les tribunaux 
              français seront seuls compétents.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Contact</h2>
            <p className="text-gray-700">
              Pour toute question concernant ces mentions légales, vous pouvez nous contacter :
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
      </div>
    </div>
  );
}
