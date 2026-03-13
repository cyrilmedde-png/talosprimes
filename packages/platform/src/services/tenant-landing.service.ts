import { prisma } from '../config/database.js';
import type { InputJsonValue } from '../types/prisma-helpers.js';

/**
 * Génère les sections de landing page personnalisées selon le métier et le nom de l'entreprise.
 */
function buildSectionsForTenant(nomEntreprise: string, metier?: string): Array<{
  type: string;
  titre: string;
  ordre: number;
  config: Record<string, unknown>;
}> {
  const nom = nomEntreprise || 'Notre entreprise';

  // Config hero personnalisée selon le métier
  const heroConfigs: Record<string, Record<string, unknown>> = {
    'btp': {
      titre: `${nom} — Votre partenaire BTP`,
      sousTitre: 'Gérez vos chantiers, devis et factures en toute simplicité',
      ctaTexte: 'Découvrir nos services',
      theme: 'construction',
    },
    'restaurant': {
      titre: `${nom} — Restauration d'excellence`,
      sousTitre: 'Gestion de commandes, réservations et fidélisation client',
      ctaTexte: 'Voir notre carte',
      theme: 'food',
    },
    'immobilier': {
      titre: `${nom} — Votre expert immobilier`,
      sousTitre: 'Estimation, gestion locative et transactions immobilières',
      ctaTexte: 'Nos biens disponibles',
      theme: 'realestate',
    },
    'sante': {
      titre: `${nom} — Au service de votre santé`,
      sousTitre: 'Prise de rendez-vous, suivi patient et téléconsultation',
      ctaTexte: 'Prendre rendez-vous',
      theme: 'health',
    },
    'commerce': {
      titre: `${nom} — Votre commerce en ligne`,
      sousTitre: 'Catalogue produits, paiements et livraisons simplifiés',
      ctaTexte: 'Découvrir nos produits',
      theme: 'ecommerce',
    },
    'consulting': {
      titre: `${nom} — Conseil et expertise`,
      sousTitre: 'Accompagnement stratégique et transformation digitale',
      ctaTexte: 'Nos expertises',
      theme: 'consulting',
    },
    'artisan': {
      titre: `${nom} — Artisan de confiance`,
      sousTitre: 'Devis gratuits, interventions rapides et travail de qualité',
      ctaTexte: 'Demander un devis',
      theme: 'craft',
    },
    'transport': {
      titre: `${nom} — Solutions de transport`,
      sousTitre: 'Livraisons, logistique et suivi en temps réel',
      ctaTexte: 'Obtenir un tarif',
      theme: 'logistics',
    },
    'formation': {
      titre: `${nom} — Centre de formation`,
      sousTitre: 'Formations professionnelles, certifiantes et sur mesure',
      ctaTexte: 'Voir nos formations',
      theme: 'education',
    },
    'beaute': {
      titre: `${nom} — Beauté & Bien-être`,
      sousTitre: 'Soins, coiffure et moments de détente sur rendez-vous',
      ctaTexte: 'Réserver un créneau',
      theme: 'beauty',
    },
  };

  const defaultHero = {
    titre: `Bienvenue chez ${nom}`,
    sousTitre: 'Découvrez nos services et laissez-nous vous accompagner',
    ctaTexte: 'En savoir plus',
    theme: 'default',
  };

  const heroConfig = (metier && heroConfigs[metier]) || defaultHero;

  // Stats personnalisées selon le métier
  const statsConfigs: Record<string, Record<string, unknown>> = {
    'btp': { items: [{ label: 'Chantiers réalisés', valeur: '150+' }, { label: 'Clients satisfaits', valeur: '98%' }, { label: "Années d'expérience", valeur: '15+' }] },
    'restaurant': { items: [{ label: 'Couverts par jour', valeur: '200+' }, { label: 'Avis positifs', valeur: '4.8/5' }, { label: 'Plats signatures', valeur: '30+' }] },
    'immobilier': { items: [{ label: 'Biens vendus', valeur: '500+' }, { label: 'Clients accompagnés', valeur: '1200+' }, { label: 'Villes couvertes', valeur: '25+' }] },
    'sante': { items: [{ label: 'Patients suivis', valeur: '3000+' }, { label: 'Consultations/an', valeur: '5000+' }, { label: 'Spécialités', valeur: '10+' }] },
    'commerce': { items: [{ label: 'Produits', valeur: '500+' }, { label: 'Clients fidèles', valeur: '2000+' }, { label: 'Livraisons/mois', valeur: '800+' }] },
  };

  const defaultStats = { items: [{ label: 'Clients satisfaits', valeur: '500+' }, { label: "Années d'expérience", valeur: '10+' }, { label: 'Projets réalisés', valeur: '1000+' }] };
  const statsConfig = (metier && statsConfigs[metier]) || defaultStats;

  // Services personnalisés
  const servicesConfigs: Record<string, Record<string, unknown>> = {
    'btp': { titre: 'Nos prestations', items: ['Construction neuve', 'Rénovation', 'Extension', 'Aménagement extérieur'] },
    'restaurant': { titre: 'Nos services', items: ['Sur place', 'À emporter', 'Livraison', 'Événements privés'] },
    'immobilier': { titre: 'Nos services', items: ['Achat / Vente', 'Location', 'Gestion locative', 'Estimation gratuite'] },
    'sante': { titre: 'Nos spécialités', items: ['Médecine générale', 'Suivi personnalisé', 'Téléconsultation', 'Bilan de santé'] },
    'commerce': { titre: 'Nos rayons', items: ['Nouveautés', 'Meilleures ventes', 'Promotions', 'Collections'] },
  };

  const defaultServices = { titre: 'Nos services', items: ['Service 1', 'Service 2', 'Service 3', 'Service 4'] };
  const servicesConfig = (metier && servicesConfigs[metier]) || defaultServices;

  // CTA personnalisé
  const ctaConfigs: Record<string, Record<string, unknown>> = {
    'btp': { titre: 'Un projet de construction ?', sousTitre: 'Demandez votre devis gratuit dès maintenant', boutonTexte: 'Devis gratuit' },
    'restaurant': { titre: 'Réservez votre table', sousTitre: 'Pour un moment inoubliable en famille ou entre amis', boutonTexte: 'Réserver' },
    'immobilier': { titre: 'Votre projet immobilier commence ici', sousTitre: 'Estimation gratuite et accompagnement personnalisé', boutonTexte: 'Estimer mon bien' },
    'sante': { titre: 'Prenez soin de vous', sousTitre: 'Consultations disponibles en ligne et en cabinet', boutonTexte: 'Prendre RDV' },
  };

  const defaultCta = { titre: 'Prêt à démarrer ?', sousTitre: 'Contactez-nous pour en savoir plus sur nos services', boutonTexte: 'Nous contacter' };
  const ctaConfig = (metier && ctaConfigs[metier]) || defaultCta;

  return [
    { type: 'hero', titre: 'Hero', ordre: 0, config: heroConfig },
    { type: 'stats', titre: 'Chiffres clés', ordre: 1, config: statsConfig },
    { type: 'modules', titre: servicesConfig.titre as string, ordre: 2, config: servicesConfig },
    { type: 'testimonials', titre: 'Ce que disent nos clients', ordre: 3, config: { titre: 'Témoignages' } },
    { type: 'contact', titre: 'Nous contacter', ordre: 4, config: { titre: `Contactez ${nom}`, email: '' } },
    { type: 'cta', titre: 'Appel à action', ordre: 5, config: ctaConfig },
  ];
}

/**
 * Initialise automatiquement la landing page d'un tenant.
 *
 * Le slug utilisé est celui du ClientSpace (sous-domaine) choisi par l'admin
 * lors de l'onboarding (ex: "demo" → demo.talosprimes.com).
 *
 * Flow réel :
 *   1. Admin crée l'espace client avec sous-domaine (POST /api/clients/:id/onboarding)
 *      → ClientSpace créé avec tenantSlug = "demo"
 *   2. N8N appelle create-credentials → crée le Tenant isolé
 *   3. create-credentials appelle initTenantLandingPage()
 *      → récupère le slug du ClientSpace
 *      → assigne ce slug au Tenant
 *      → crée les sections personnalisées selon le métier
 *
 * @param tenantId  - ID du tenant nouvellement créé
 * @param clientId  - ID du ClientFinal (pour retrouver le ClientSpace)
 * @param nomEntreprise - Nom de l'entreprise
 * @param metier    - Métier/activité du client (btp, restaurant, immobilier, etc.)
 */
export async function initTenantLandingPage(
  tenantId: string,
  clientId: string,
  nomEntreprise: string,
  metier?: string,
): Promise<{
  slug: string | null;
  sectionsCount: number;
}> {
  // 1. Récupérer le slug du ClientSpace (sous-domaine choisi par l'admin à l'onboarding)
  const clientSpace = await prisma.clientSpace.findFirst({
    where: { clientFinalId: clientId },
    select: { tenantSlug: true },
  });

  const slug = clientSpace?.tenantSlug || null;

  // 2. Assigner le slug du sous-domaine au Tenant (pour la landing page)
  if (slug) {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { slug },
    });
  }

  // 3. Créer les sections personnalisées selon le métier
  const sections = buildSectionsForTenant(nomEntreprise, metier);

  await prisma.landingSection.createMany({
    data: sections.map(s => ({
      tenantId,
      type: s.type,
      titre: s.titre,
      config: s.config as InputJsonValue,
      ordre: s.ordre,
      actif: true,
    })),
  });

  // 4. Créer la config globale de base
  await prisma.landingGlobalConfig.create({
    data: {
      tenantId,
      section: 'theme',
      config: {
        couleurPrimaire: '#3B82F6',
        couleurSecondaire: '#1E40AF',
        police: 'Inter',
        nomEntreprise,
        metier: metier || 'general',
        sousDomaine: slug || null,
      } as InputJsonValue,
    },
  });

  return { slug, sectionsCount: sections.length };
}
