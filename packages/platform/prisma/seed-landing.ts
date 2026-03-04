import { PrismaClient } from '@prisma/client';

/**
 * Seed du contenu landing + testimonials.
 * Peut être appelé depuis le seed principal en passant une instance Prisma.
 */
export async function runSeedLanding(prisma: PrismaClient): Promise<void> {
  console.log('🌱 Seed landing page...');

  // ===== LANDING CONTENT =====
  const landingContent = [
    {
      section: 'hero_title',
      contenu: 'Automatisez votre gestion d\'entreprise avec intelligence',
    },
    {
      section: 'hero_subtitle',
      contenu: 'TalosPrimes est la plateforme tout-en-un qui combine CRM, facturation, et automatisation intelligente via n8n pour libérer votre temps et booster votre productivité.',
    },
    {
      section: 'hero_cta_primary',
      contenu: 'Essayer',
    },
    {
      section: 'hero_cta_secondary',
      contenu: 'Découvrir la démo',
    },
    {
      section: 'feature_1_title',
      contenu: 'CRM intelligent et multi-tenant',
    },
    {
      section: 'feature_1_desc',
      contenu: 'Gérez vos clients finaux, suivez leur parcours et automatisez vos processus de vente avec une isolation totale des données entre tenants.',
    },
    {
      section: 'feature_2_title',
      contenu: 'Facturation automatisée',
    },
    {
      section: 'feature_2_desc',
      contenu: 'Créez, envoyez et suivez vos factures automatiquement. Intégration Stripe pour des paiements sécurisés et récurrents.',
    },
    {
      section: 'feature_3_title',
      contenu: 'Workflows n8n intégrés',
    },
    {
      section: 'feature_3_desc',
      contenu: 'Automatisez toutes vos tâches répétitives : onboarding clients, relances impayés, notifications, rapports, et bien plus.',
    },
    {
      section: 'feature_4_title',
      contenu: 'Gestion d\'équipe simplifiée',
    },
    {
      section: 'feature_4_desc',
      contenu: 'Ajoutez vos collaborateurs, définissez les rôles et permissions, et suivez l\'activité de votre équipe en temps réel.',
    },
    {
      section: 'feature_5_title',
      contenu: 'Modules métiers adaptables',
    },
    {
      section: 'feature_5_desc',
      contenu: 'Activez uniquement les modules dont vous avez besoin : comptabilité, RH, marketing, logistique... Tarification à la carte.',
    },
    {
      section: 'feature_6_title',
      contenu: 'Sécurité & conformité',
    },
    {
      section: 'feature_6_desc',
      contenu: 'Hébergement sécurisé, conformité RGPD, SSL/HTTPS, sauvegardes automatiques et isolation stricte des données.',
    },
    {
      section: 'stats_1_value',
      contenu: '95%',
    },
    {
      section: 'stats_1_label',
      contenu: 'Gain de temps sur les tâches administratives',
    },
    {
      section: 'stats_2_value',
      contenu: '24/7',
    },
    {
      section: 'stats_2_label',
      contenu: 'Automatisation continue',
    },
    {
      section: 'stats_3_value',
      contenu: '100%',
    },
    {
      section: 'stats_3_label',
      contenu: 'Satisfaction client',
    },
    {
      section: 'cta_section_title',
      contenu: 'Prêt à transformer votre gestion d\'entreprise ?',
    },
    {
      section: 'cta_section_subtitle',
      contenu: 'Rejoignez les entreprises qui automatisent leur succès avec TalosPrimes.',
    },
    {
      section: 'footer_company_name',
      contenu: 'TalosPrimes SaaS',
    },
    {
      section: 'footer_company_desc',
      contenu: 'La plateforme de gestion d\'entreprise intelligente et automatisée.',
    },
    // SECTIONS TITLES (éditables via CMS)
    {
      section: 'features_title',
      contenu: 'Tous vos outils métier, une seule plateforme',
    },
    {
      section: 'features_subtitle',
      contenu: 'Activez uniquement les modules dont vous avez besoin. Tarification à la carte, sans engagement.',
    },
    // CONFIGURATIONS
    {
      section: 'config_contact_email',
      contenu: 'contact@talosprimes.com',
    },
    {
      section: 'config_contact_phone',
      contenu: '+33 1 23 45 67 89',
    },
    {
      section: 'config_contact_address',
      contenu: '123 Avenue de la Tech\n75001 Paris, France',
    },
    {
      section: 'config_legal_company_name',
      contenu: 'TalosPrimes SAS',
    },
    {
      section: 'config_legal_legal_form',
      contenu: 'SAS (Société par Actions Simplifiée)',
    },
    {
      section: 'config_legal_capital',
      contenu: '10 000 €',
    },
    {
      section: 'config_legal_siret',
      contenu: 'XXX XXX XXX XXXXX',
    },
    {
      section: 'config_legal_tva',
      contenu: 'FR XX XXX XXX XXX',
    },
    {
      section: 'config_legal_address',
      contenu: '123 Avenue de la Tech, 75001 Paris, France',
    },
    {
      section: 'config_company_description',
      contenu: 'La plateforme de gestion d\'entreprise intelligente et automatisée.',
    },
    {
      section: 'config_company_support_email',
      contenu: 'support@talosprimes.com',
    },
    {
      section: 'config_company_rgpd_email',
      contenu: 'rgpd@talosprimes.com',
    },
    // HÉBERGEMENT
    {
      section: 'config_hosting_provider',
      contenu: 'OVH',
    },
    {
      section: 'config_hosting_company_name',
      contenu: 'OVH SAS',
    },
    {
      section: 'config_hosting_address',
      contenu: '2 rue Kellermann, 59100 Roubaix, France',
    },
    {
      section: 'config_hosting_phone',
      contenu: '1007',
    },
    {
      section: 'config_hosting_website',
      contenu: 'https://www.ovh.com',
    },
    // ASSURANCE RC PRO
    {
      section: 'config_insurance_company',
      contenu: 'AXA Assurances',
    },
    {
      section: 'config_insurance_policy_number',
      contenu: '123456789',
    },
    {
      section: 'config_insurance_coverage',
      contenu: '1 000 000 €',
    },
    {
      section: 'config_insurance_address',
      contenu: '1 Avenue de France, 75013 Paris, France',
    },
    {
      section: 'config_insurance_phone',
      contenu: '01 XX XX XX XX',
    },
  ];

  for (const content of landingContent) {
    await prisma.landingContent.upsert({
      where: { section: content.section },
      // NE PAS écraser les données existantes modifiées via le CMS
      update: {},
      create: content,
    });
  }

  console.log('✅ Landing content créé');

  // ===== TESTIMONIALS =====
  const testimonials = [
    {
      nom: 'Martin',
      prenom: 'Sophie',
      entreprise: 'Agence Créa+',
      poste: 'Directrice Générale',
      avatar: 'SM',
      note: 5,
      commentaire: 'TalosPrimes a révolutionné notre gestion quotidienne. Plus de 10h économisées par semaine grâce à l\'automatisation !',
      affiche: true,
      ordre: 1,
    },
    {
      nom: 'Dubois',
      prenom: 'Thomas',
      entreprise: 'Tech Solutions',
      poste: 'CEO',
      avatar: 'TD',
      note: 5,
      commentaire: 'L\'intégration n8n est un game changer. Nos workflows métiers sont maintenant 100% automatisés.',
      affiche: true,
      ordre: 2,
    },
    {
      nom: 'Rousseau',
      prenom: 'Céline',
      entreprise: 'Comptabilité Pro',
      poste: 'Expert-comptable',
      avatar: 'CR',
      note: 5,
      commentaire: 'Interface intuitive, facturation automatique impeccable. Je recommande vivement !',
      affiche: true,
      ordre: 3,
    },
    {
      nom: 'Bernard',
      prenom: 'Marc',
      entreprise: 'BTP Innov',
      poste: 'Directeur Commercial',
      avatar: 'MB',
      note: 4,
      commentaire: 'Excellente solution pour gérer notre pipeline de clients. Le CRM est très complet.',
      affiche: true,
      ordre: 4,
    },
    {
      nom: 'Lefevre',
      prenom: 'Julie',
      entreprise: 'Formation Expert',
      poste: 'Responsable Formation',
      avatar: 'JL',
      note: 5,
      commentaire: 'Onboarding fluide, support réactif. La plateforme s\'adapte parfaitement à nos besoins métier.',
      affiche: true,
      ordre: 5,
    },
    {
      nom: 'Moreau',
      prenom: 'Alexandre',
      entreprise: 'StartupLab',
      poste: 'Fondateur',
      avatar: 'AM',
      note: 5,
      commentaire: 'Rapport qualité-prix imbattable. Toutes les fonctionnalités dont une PME a besoin réunies en un seul outil.',
      affiche: true,
      ordre: 6,
    },
  ];

  const count = await prisma.testimonial.count();
  if (count === 0) {
    await prisma.testimonial.createMany({ data: testimonials });
    console.log('✅ Testimonials créés');
  } else {
    console.log('✅ Testimonials déjà présents (ignorés)');
  }

  console.log('🎉 Seed landing terminé avec succès !');
}
