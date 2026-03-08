import { PrismaClient } from '@prisma/client';

/**
 * Script de migration : convertit les données existantes (LandingContent clé/valeur + données hardcodées)
 * vers le nouveau système de sections configurables (LandingSection + LandingGlobalConfig).
 *
 * Usage : npx tsx packages/platform/prisma/migrate-cms-data.ts
 */

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Migration CMS → Sections configurables...\n');

  // ── 1. Lire le contenu existant (LandingContent) ──
  const existingContent: Record<string, string> = {};
  try {
    const rows = await prisma.landingContent.findMany();
    for (const row of rows) {
      existingContent[row.section] = row.contenu;
    }
    console.log(`📖 ${rows.length} entrées LandingContent lues`);
  } catch (e) {
    console.log('⚠️  Pas de LandingContent existant, utilisation des valeurs par défaut');
  }

  // Helper pour récupérer une valeur existante ou un fallback
  const get = (key: string, fallback: string) => existingContent[key] || fallback;

  // ── 2. Créer les sections ──
  const sections = [
    // ─── HERO ───
    {
      type: 'hero',
      titre: 'Hero principal',
      ordre: 0,
      actif: true,
      config: {
        title: get('hero_title', 'La plateforme tout-en-un pour piloter votre entreprise'),
        subtitle: get('hero_subtitle', 'Facturation, comptabilité, CRM, RH, BTP, agent IA et 190+ automatisations — tout dans une seule plateforme.'),
        badge: {
          text: 'Agent IA vocal intégré — disponible 24/7',
          icon: 'Bot',
          actif: true,
        },
        ctaPrimary: {
          text: get('hero_cta_primary', 'Essayer gratuitement'),
          link: '/inscription',
        },
        ctaSecondary: {
          text: get('hero_cta_secondary', 'Découvrir les services'),
          link: '#services',
        },
        bgGradient: 'from-slate-50/80 to-white',
      },
    },

    // ─── STATS ───
    {
      type: 'stats',
      titre: 'Statistiques clés',
      ordre: 1,
      actif: true,
      config: {
        items: [
          { value: get('stats_1_value', '10+'), label: get('stats_1_label', 'Modules métier') },
          { value: get('stats_2_value', '190+'), label: get('stats_2_label', 'Workflows automatisés') },
          { value: get('stats_3_value', '24/7'), label: get('stats_3_label', 'Agent IA disponible') },
          { value: '100%', label: 'Conforme RGPD' },
        ],
      },
    },

    // ─── TRUST BADGES ───
    {
      type: 'trust_badges',
      titre: 'Bande de confiance',
      ordre: 2,
      actif: true,
      config: {
        items: [
          { icon: 'Lock', text: 'SSL/HTTPS' },
          { icon: 'Shield', text: 'RGPD natif' },
          { icon: 'Landmark', text: 'Hébergé en France' },
          { icon: 'CreditCard', text: 'Paiement Stripe' },
          { icon: 'Layers', text: 'Multi-tenant' },
        ],
        bgColor: 'bg-slate-50',
      },
    },

    // ─── MODULES / SERVICES ───
    {
      type: 'modules',
      titre: 'Modules métier',
      ordre: 3,
      actif: true,
      config: {
        badge: { text: '10 modules intégrés', icon: 'Sparkles' },
        title: get('features_title', 'Tous vos outils métier, une seule plateforme'),
        subtitle: get('features_subtitle', 'Activez uniquement les modules dont vous avez besoin. Tarification à la carte, sans engagement.'),
        items: [
          {
            icon: 'FileText',
            title: 'Facturation complète',
            description: 'Factures, devis, avoirs, proformas et bons de commande. Génération PDF automatique, numérotation séquentielle et suivi des paiements.',
            features: ['Factures & Avoirs', 'Devis & Proformas', 'Bons de commande', 'OCR intelligent', 'Paiement Stripe'],
            color: 'from-blue-500 to-blue-600',
          },
          {
            icon: 'Calculator',
            title: 'Comptabilité intégrée',
            description: 'Plan comptable OHADA/français, écritures automatiques, lettrage, rapprochement bancaire et déclarations TVA.',
            features: ['Plan comptable', 'Écritures automatiques', 'Rapprochement bancaire', 'Déclarations TVA', 'Immobilisations & amortissements'],
            color: 'from-emerald-500 to-emerald-600',
          },
          {
            icon: 'Users',
            title: 'CRM & Leads',
            description: 'Gestion complète du pipeline commercial : leads, conversion en clients, suivi des contacts et historique des interactions.',
            features: ['Pipeline de leads', 'Conversion automatique', 'Fiches clients', 'Historique complet', 'Notifications temps réel'],
            color: 'from-violet-500 to-violet-600',
          },
          {
            icon: 'Bot',
            title: 'Agent IA vocal & texte',
            description: 'Assistant intelligent disponible 24/7 sur Telegram (vocal + texte), téléphonie entrante/sortante via Twilio et campagnes SMS.',
            features: ['Telegram vocal & texte', 'Téléphonie Twilio', 'Campagnes SMS', 'Base de connaissances', 'Calendrier IA'],
            color: 'from-amber-500 to-orange-500',
          },
          {
            icon: 'UserCheck',
            title: 'Ressources Humaines',
            description: '8 modules RH complets : contrats, bulletins de paie, congés, documents, entretiens, formations, inscriptions et évaluations.',
            features: ['Contrats de travail', 'Bulletins de paie', 'Gestion des congés', 'Formations & évaluations', 'Documents RH'],
            color: 'from-pink-500 to-rose-500',
          },
          {
            icon: 'HardHat',
            title: 'BTP & Chantiers',
            description: 'Module spécialisé pour le bâtiment : suivi de chantiers, situations de travaux, gestion des équipes terrain.',
            features: ['Fiches chantier', 'Situations de travaux', 'Suivi financier', 'Équipes terrain', 'Documents chantier'],
            color: 'from-orange-500 to-red-500',
          },
          {
            icon: 'Briefcase',
            title: 'Gestion de projets',
            description: 'Créez des projets, assignez des tâches, suivez l\'avancement et collaborez efficacement avec votre équipe.',
            features: ['Projets & tâches', 'Assignation d\'équipe', 'Suivi d\'avancement', 'Deadlines & priorités', 'Vue tableau'],
            color: 'from-cyan-500 to-blue-500',
          },
          {
            icon: 'ClipboardList',
            title: 'Gestion d\'équipe',
            description: 'Gérez vos collaborateurs, pointages, absences et plannings. Visibilité totale sur l\'activité de votre équipe.',
            features: ['Membres & rôles', 'Pointages', 'Absences & congés', 'Plannings', 'Performance'],
            color: 'from-teal-500 to-emerald-500',
          },
          {
            icon: 'Zap',
            title: '190+ Workflows automatisés',
            description: 'Moteur n8n intégré avec 190+ workflows prêts à l\'emploi : onboarding, relances, notifications, rapports automatiques.',
            features: ['Onboarding auto', 'Relances impayés', 'Notifications Telegram', 'Rapports automatiques', 'Webhooks temps réel'],
            color: 'from-yellow-500 to-amber-500',
          },
          {
            icon: 'Shield',
            title: 'Sécurité & RGPD',
            description: 'Conformité RGPD native, registre des consentements, droit à l\'effacement, journalisation et chiffrement SSL.',
            features: ['Conformité RGPD', 'Registre consentements', 'Droit à l\'effacement', 'Logs d\'audit', 'Chiffrement SSL'],
            color: 'from-slate-500 to-slate-600',
          },
        ],
      },
    },

    // ─── AGENT IA ───
    {
      type: 'agent_ia',
      titre: 'Agent IA section',
      ordre: 4,
      actif: true,
      config: {
        badge: { text: 'Intelligence Artificielle', icon: 'Brain' },
        title: 'Votre assistant IA,',
        titleHighlight: 'disponible 24h/24',
        subtitle: 'Notre agent IA comprend le contexte de votre entreprise, répond à vos clients par téléphone et Telegram, prend des rendez-vous et envoie des notifications en temps réel.',
        features: [
          { icon: 'MessageSquare', text: 'Telegram vocal & texte — réponses instantanées' },
          { icon: 'PhoneCall', text: 'Téléphonie entrante & sortante via Twilio' },
          { icon: 'Mail', text: 'Campagnes SMS personnalisées' },
          { icon: 'BookOpen', text: 'Base de connaissances personnalisable' },
          { icon: 'Calendar', text: 'Prise de RDV automatique Google Calendar' },
          { icon: 'Bell', text: 'Notifications Telegram temps réel' },
        ],
        chatMessages: [
          { role: 'user', text: 'Bonjour, je souhaiterais un devis pour une installation complète.' },
          { role: 'assistant', text: 'Bien sûr ! Je vais vous mettre en relation avec notre commercial. Quand êtes-vous disponible cette semaine ?' },
          { role: 'user', text: 'Jeudi à 14h, c\'est possible ?' },
          { role: 'assistant', text: 'Parfait ! RDV confirmé jeudi à 14h. Vous recevrez une confirmation par email. 📅' },
        ],
        bgGradient: 'from-slate-900 via-slate-900 to-slate-800',
      },
    },

    // ─── BIENTÔT DISPONIBLE ───
    {
      type: 'upcoming',
      titre: 'Bientôt disponible',
      ordre: 5,
      actif: true,
      config: {
        badge: { text: 'Roadmap 2026', icon: 'TrendingUp' },
        title: 'Bientôt disponible',
        subtitle: 'Nous travaillons continuellement pour enrichir la plateforme avec de nouvelles fonctionnalités.',
        items: [
          { icon: 'Receipt', title: 'Factur-X / e-invoicing', description: 'Facturation électronique conforme aux normes européennes 2026.' },
          { icon: 'PenTool', title: 'Signature électronique', description: 'Signez vos devis et contrats directement depuis la plateforme.' },
          { icon: 'Smartphone', title: 'Application mobile', description: 'Accédez à toutes vos données en déplacement depuis iOS et Android.' },
          { icon: 'Globe', title: 'Multi-devises', description: 'Facturez dans la devise de vos clients internationaux.' },
          { icon: 'BarChart3', title: 'Analytics avancé', description: 'Tableaux de bord personnalisables et rapports BI intégrés.' },
          { icon: 'Banknote', title: 'Intégration Qonto', description: 'Synchronisation bancaire automatique avec votre compte Qonto.' },
        ],
        bgColor: 'bg-slate-50/60',
      },
    },

    // ─── COMMENT ÇA MARCHE ───
    {
      type: 'how_it_works',
      titre: 'Comment ça marche',
      ordre: 6,
      actif: true,
      config: {
        title: 'Démarrez en 3 étapes',
        subtitle: 'Simple, rapide et sans engagement.',
        steps: [
          {
            number: '01',
            title: 'Inscrivez-vous',
            description: 'Créez votre espace en quelques clics. Période d\'essai gratuite incluse.',
            icon: 'BadgeCheck',
          },
          {
            number: '02',
            title: 'Configurez vos modules',
            description: 'Activez uniquement les modules dont vous avez besoin : facturation, comptabilité, RH, BTP…',
            icon: 'Layers',
          },
          {
            number: '03',
            title: 'Automatisez & pilotez',
            description: 'Laissez les 190+ workflows gérer le quotidien. Concentrez-vous sur votre métier.',
            icon: 'Zap',
          },
        ],
      },
    },

    // ─── TESTIMONIALS ───
    {
      type: 'testimonials',
      titre: 'Témoignages',
      ordre: 7,
      actif: true,
      config: {
        title: 'Ils nous font confiance',
        subtitle: 'Ce que nos clients disent de TalosPrimes.',
      },
    },

    // ─── CONTACT ───
    {
      type: 'contact',
      titre: 'Section Contact',
      ordre: 8,
      actif: true,
      config: {
        title: 'Contactez-nous',
        subtitle: 'Une question ? Notre équipe vous répond rapidement.',
        rappelIA: {
          title: 'Rappel IA immédiat',
          description: 'Cliquez sur la bulle en bas à droite pour être rappelé instantanément par notre agent IA.',
          actif: true,
        },
      },
    },

    // ─── CTA FINAL ───
    {
      type: 'cta',
      titre: 'CTA final',
      ordre: 9,
      actif: true,
      config: {
        title: get('cta_section_title', 'Prêt à simplifier votre gestion ?'),
        subtitle: get('cta_section_subtitle', 'Rejoignez les entreprises qui automatisent leur quotidien avec TalosPrimes.'),
        ctaPrimary: {
          text: 'Commencer gratuitement',
          link: '/inscription',
        },
        ctaSecondary: {
          text: 'Parler à un conseiller',
          link: '#contact',
          icon: 'Headphones',
        },
        bgGradient: 'from-slate-900 via-slate-900 to-slate-800',
      },
    },
  ];

  console.log(`\n📦 Création de ${sections.length} sections...`);

  for (const section of sections) {
    await prisma.landingSection.create({
      data: {
        type: section.type,
        titre: section.titre,
        ordre: section.ordre,
        actif: section.actif,
        config: section.config as any,
      },
    });
    console.log(`  ✅ Section "${section.type}" (ordre: ${section.ordre})`);
  }

  // ── 3. Créer les configs globales ──
  console.log('\n🌐 Création des configs globales...');

  const globalConfigs = [
    {
      section: 'navbar',
      config: {
        logo: {
          text: get('footer_company_name', 'TalosPrimes'),
          image: null,
        },
        links: [
          { text: 'Services', href: '#services', type: 'anchor' },
          { text: 'Témoignages', href: '#testimonials', type: 'anchor' },
          { text: 'Tarifs', href: '/page/tarifs', type: 'page' },
          { text: 'Contact', href: '#contact', type: 'anchor' },
        ],
        ctaButton: {
          text: get('hero_cta_primary', 'Essayer gratuitement'),
          href: '/inscription',
        },
        bgColor: 'bg-white/80',
        sticky: true,
      },
    },
    {
      section: 'footer',
      config: {
        companyName: get('footer_company_name', 'TalosPrimes SaaS'),
        description: get('footer_company_desc', "La plateforme de gestion d'entreprise intelligente et automatisée."),
        columns: [
          {
            title: 'Produit',
            links: [
              { text: 'Services', href: '#services' },
              { text: 'Tarifs', href: '/page/tarifs' },
              { text: 'Témoignages', href: '#testimonials' },
            ],
          },
          {
            title: 'Légal',
            links: [
              { text: 'Mentions légales', href: '/mentions-legales' },
              { text: 'CGU', href: '/cgu' },
              { text: 'CGV', href: '/cgv' },
              { text: 'Confidentialité & RGPD', href: '/confidentialite' },
            ],
          },
          {
            title: 'Support',
            links: [
              { text: 'Contact', href: '#contact' },
              { text: 'Connexion', href: '/login' },
            ],
          },
        ],
        copyright: '© {year} {companyName}. Tous droits réservés.',
      },
    },
    {
      section: 'seo',
      config: {
        metaTitle: 'TalosPrimes — Plateforme de gestion d\'entreprise automatisée',
        metaDescription: 'CRM, facturation, comptabilité, RH, BTP et agent IA vocal. 190+ workflows automatisés. Hébergé en France, conforme RGPD.',
        ogImage: null,
        favicon: null,
      },
    },
    {
      section: 'theme',
      config: {
        primaryColor: '#1e293b',   // slate-800
        accentColor: '#f59e0b',    // amber-500
        bgColor: '#ffffff',
        textColor: '#1e293b',
        fontFamily: 'Inter',
      },
    },
  ];

  for (const gc of globalConfigs) {
    await prisma.landingGlobalConfig.upsert({
      where: { section: gc.section },
      update: { config: gc.config as any },
      create: {
        section: gc.section,
        config: gc.config as any,
      },
    });
    console.log(`  ✅ Config globale "${gc.section}"`);
  }

  console.log('\n🎉 Migration terminée avec succès !');
  console.log(`   → ${sections.length} sections créées`);
  console.log(`   → ${globalConfigs.length} configs globales créées`);
  console.log('\n💡 Vous pouvez maintenant utiliser les nouvelles routes API :');
  console.log('   GET /api/landing/sections');
  console.log('   GET /api/landing/global-config');
}

main()
  .catch((e) => {
    console.error('❌ Erreur migration :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
