'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { LegalPageLayout, LegalSection } from '@/components/LegalPageLayout';

export default function MentionsLegalesPage() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/content`)
      .then((r) => r.json())
      .then((data) => {
        setContent(data.legal_mentions_legales || '');
        setLoading(false);
      })
      .catch((err) => {
        console.error('Erreur chargement:', err);
        setLoading(false);
      });
  }, []);

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <LegalPageLayout title="Mentions Légales" lastUpdated={today}>
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
          <LegalSection number="1" title="Informations légales">
            <p><strong className="text-slate-800">Raison sociale :</strong> TalosPrimes SaaS</p>
            <p><strong className="text-slate-800">Forme juridique :</strong> SAS (Société par Actions Simplifiée)</p>
            <p><strong className="text-slate-800">Capital social :</strong> 10 000 &euro;</p>
            <p><strong className="text-slate-800">SIRET :</strong> XXX XXX XXX XXXXX</p>
            <p><strong className="text-slate-800">Numéro de TVA intracommunautaire :</strong> FR XX XXX XXX XXX</p>
            <p><strong className="text-slate-800">Siège social :</strong> 123 Avenue de la Tech, 75001 Paris, France</p>
            <p><strong className="text-slate-800">Téléphone :</strong> +33 1 23 45 67 89</p>
            <p><strong className="text-slate-800">Email :</strong> contact@talosprimes.com</p>
          </LegalSection>

          <LegalSection number="2" title="Directeur de publication">
            <p>Le directeur de la publication du site est le représentant légal de TalosPrimes SaaS.</p>
          </LegalSection>

          <LegalSection number="3" title="Hébergement">
            <p><strong className="text-slate-800">Hébergeur :</strong> OVH</p>
            <p><strong className="text-slate-800">Adresse :</strong> 2 rue Kellermann, 59100 Roubaix, France</p>
            <p><strong className="text-slate-800">Téléphone :</strong> 1007</p>
          </LegalSection>

          <LegalSection number="4" title="Propriété intellectuelle">
            <p>
              L&apos;ensemble du contenu de ce site (textes, images, vidéos, logos, etc.) est la propriété exclusive
              de TalosPrimes SaaS ou de ses partenaires. Toute reproduction, distribution, modification,
              adaptation, retransmission ou publication de ces éléments est strictement interdite sans l&apos;accord
              écrit préalable de TalosPrimes SaaS.
            </p>
          </LegalSection>

          <LegalSection number="5" title="Protection des données personnelles">
            <p>
              Conformément à la loi Informatique et Libertés du 6 janvier 1978 modifiée et au Règlement Général
              sur la Protection des Données (RGPD), vous disposez d&apos;un droit d&apos;accès, de rectification, de
              suppression et d&apos;opposition au traitement de vos données personnelles.
            </p>
            <p>
              Pour exercer ces droits, veuillez nous contacter à l&apos;adresse : <strong className="text-slate-800">rgpd@talosprimes.com</strong>
            </p>
            <p>
              Pour plus d&apos;informations, consultez notre{' '}
              <Link href="/confidentialite" className="text-slate-900 underline underline-offset-2 hover:text-slate-600 transition">
                Politique de confidentialité
              </Link>.
            </p>
          </LegalSection>

          <LegalSection number="6" title="Cookies">
            <p>
              Ce site utilise des cookies pour améliorer l&apos;expérience utilisateur. En poursuivant votre navigation,
              vous acceptez l&apos;utilisation de cookies. Vous pouvez à tout moment désactiver les cookies dans les
              paramètres de votre navigateur.
            </p>
          </LegalSection>

          <LegalSection number="7" title="Limitation de responsabilité">
            <p>
              TalosPrimes SaaS s&apos;efforce d&apos;assurer au mieux l&apos;exactitude et la mise à jour des informations
              diffusées sur ce site. Cependant, TalosPrimes SaaS ne peut garantir l&apos;exactitude, la précision ou
              l&apos;exhaustivité des informations mises à disposition sur ce site.
            </p>
          </LegalSection>

          <LegalSection number="8" title="Droit applicable">
            <p>
              Les présentes mentions légales sont régies par le droit français. En cas de litige, les tribunaux
              français seront seuls compétents.
            </p>
          </LegalSection>

          <LegalSection number="9" title="Contact">
            <p>Pour toute question concernant ces mentions légales, vous pouvez nous contacter :</p>
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
