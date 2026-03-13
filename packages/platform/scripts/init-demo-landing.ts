/**
 * Script one-shot : initialise la landing page pour le client "demo"
 * Usage : pnpm tsx scripts/init-demo-landing.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Trouver le ClientSpace avec le slug "demo"
  const clientSpace = await prisma.clientSpace.findFirst({
    where: { tenantSlug: 'demo' },
    include: {
      clientFinal: { select: { id: true, nom: true, prenom: true, email: true } },
      tenant: { select: { id: true, nomEntreprise: true, metier: true } },
    },
  });

  if (!clientSpace) {
    console.error('❌ Aucun ClientSpace avec tenantSlug "demo" trouvé');
    process.exit(1);
  }

  console.log(`📌 ClientSpace trouvé : ${clientSpace.id}`);
  console.log(`   Slug     : ${clientSpace.tenantSlug}`);
  console.log(`   Client   : ${clientSpace.clientFinal.nom} ${clientSpace.clientFinal.prenom}`);
  console.log(`   Tenant   : ${clientSpace.tenant.nomEntreprise} (${clientSpace.tenant.id})`);
  console.log(`   Métier   : ${clientSpace.tenant.metier || 'non défini'}`);

  // 2. Nettoyer les anciennes sections si elles existent
  const existingSections = await prisma.landingSection.count({
    where: { clientSpaceId: clientSpace.id },
  });
  const existingConfigs = await prisma.landingGlobalConfig.count({
    where: { clientSpaceId: clientSpace.id },
  });

  if (existingSections > 0 || existingConfigs > 0) {
    console.log(`⚠️  ${existingSections} sections + ${existingConfigs} configs existantes. Suppression...`);
    await prisma.landingSection.deleteMany({ where: { clientSpaceId: clientSpace.id } });
    await prisma.landingGlobalConfig.deleteMany({ where: { clientSpaceId: clientSpace.id } });
    console.log('🗑️  Nettoyé.');
  }

  // 3. Créer les sections
  const nom = clientSpace.tenant.nomEntreprise || 'Demo';
  const metier = clientSpace.tenant.metier || 'consulting';

  const heroConfigs: Record<string, Record<string, unknown>> = {
    btp: { titre: `${nom} — Votre partenaire BTP`, sousTitre: 'Gérez vos chantiers, devis et factures en toute simplicité', ctaTexte: 'Découvrir nos services', theme: 'construction' },
    restaurant: { titre: `${nom} — Restauration d'excellence`, sousTitre: 'Gestion de commandes, réservations et fidélisation client', ctaTexte: 'Voir notre carte', theme: 'food' },
    immobilier: { titre: `${nom} — Votre expert immobilier`, sousTitre: 'Gestion de biens, mandats et transactions simplifiée', ctaTexte: 'Voir nos biens', theme: 'real-estate' },
    sante: { titre: `${nom} — Au service de votre santé`, sousTitre: 'Gestion de patients, rendez-vous et dossiers médicaux', ctaTexte: 'Prendre rendez-vous', theme: 'health' },
    commerce: { titre: `${nom} — Votre commerce connecté`, sousTitre: 'Stock, ventes, fidélisation — tout en un seul endroit', ctaTexte: 'Découvrir nos produits', theme: 'retail' },
    consulting: { titre: `${nom} — Expertise & Conseil`, sousTitre: 'Accompagnement sur mesure pour votre transformation digitale', ctaTexte: 'Nous contacter', theme: 'business' },
    artisan: { titre: `${nom} — L'artisanat d'excellence`, sousTitre: 'Devis, factures et suivi chantiers pour artisans', ctaTexte: 'Demander un devis', theme: 'craft' },
    transport: { titre: `${nom} — Solutions de transport`, sousTitre: 'Planification, suivi et gestion de flotte optimisés', ctaTexte: 'Demander un devis', theme: 'logistics' },
    formation: { titre: `${nom} — Centre de formation`, sousTitre: 'Gestion des apprenants, sessions et certifications', ctaTexte: 'Voir nos formations', theme: 'education' },
    beaute: { titre: `${nom} — Beauté & Bien-être`, sousTitre: 'Rendez-vous, fidélisation et gestion de salon simplifiés', ctaTexte: 'Prendre rendez-vous', theme: 'beauty' },
  };

  const heroConfig = heroConfigs[metier] || heroConfigs['consulting']!;

  const sections = [
    { type: 'hero', titre: 'Hero', ordre: 1, config: { ...heroConfig, ctaHref: '#contact' } },
    { type: 'stats', titre: 'Statistiques', ordre: 2, config: { items: [{ label: 'Clients satisfaits', value: '150+' }, { label: 'Projets réalisés', value: '500+' }, { label: 'Années d\'expérience', value: '10+' }] } },
    { type: 'how_it_works', titre: 'Comment ça marche', ordre: 3, config: { titre: 'Comment ça marche ?', etapes: [{ titre: 'Prise de contact', description: 'Échangez avec notre équipe pour définir vos besoins' }, { titre: 'Proposition sur mesure', description: 'Recevez un devis adapté à votre activité' }, { titre: 'Mise en place', description: 'Démarrez rapidement avec un accompagnement dédié' }] } },
    { type: 'testimonials', titre: 'Témoignages', ordre: 4, config: { titre: 'Ce que disent nos clients', afficherNote: true } },
    { type: 'contact', titre: 'Contact', ordre: 5, config: { titre: 'Contactez-nous', sousTitre: `Vous avez un projet ? L'équipe ${nom} est à votre écoute.`, afficherFormulaire: true } },
    { type: 'cta', titre: 'CTA Final', ordre: 6, config: { titre: 'Prêt à démarrer ?', sousTitre: `Rejoignez ${nom} et simplifiez votre gestion`, ctaTexte: 'Commencer maintenant', ctaHref: '#contact' } },
  ];

  await prisma.landingSection.createMany({
    data: sections.map(s => ({
      clientSpaceId: clientSpace.id,
      type: s.type,
      titre: s.titre,
      config: s.config,
      ordre: s.ordre,
      actif: true,
    })),
  });

  console.log(`✅ ${sections.length} sections créées`);

  // 4. Créer les configs globales (navbar, footer, seo, theme)
  const configs = [
    {
      section: 'theme',
      config: { couleurPrimaire: '#3B82F6', couleurSecondaire: '#1E40AF', police: 'Inter', nomEntreprise: nom, metier, sousDomaine: 'demo' },
    },
    {
      section: 'navbar',
      config: { logo: { text: nom }, links: [{ text: 'Accueil', href: '#hero' }, { text: 'Services', href: '#how_it_works' }, { text: 'Contact', href: '#contact' }], ctaButton: { text: 'Espace client', href: '/connexion' }, sticky: true },
    },
    {
      section: 'footer',
      config: { companyName: nom, description: `${nom} — Votre partenaire de confiance`, copyright: `© ${new Date().getFullYear()} ${nom}. Tous droits réservés.`, legalLinks: [{ text: 'Mentions légales', href: '/mentions-legales' }, { text: 'CGV', href: '/cgv' }] },
    },
    {
      section: 'seo',
      config: { metaTitle: `${nom}`, metaDescription: `Découvrez ${nom}, votre partenaire pour la gestion de votre activité.` },
    },
  ];

  for (const c of configs) {
    await prisma.landingGlobalConfig.create({
      data: {
        clientSpaceId: clientSpace.id,
        section: c.section,
        config: c.config,
      },
    });
  }

  console.log(`✅ ${configs.length} configs globales créées (navbar, footer, seo, theme)`);
  console.log(`\n🎉 Landing page de demo.talosprimes.com initialisée !`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
