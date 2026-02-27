import { PrismaClient } from '@prisma/client';

/**
 * Seed : Base de Connaissances Agent Téléphonique IA
 * Injecte les entrées clés structurées par catégorie pour que l'agent
 * puisse répondre à n'importe quelle demande client.
 */
export async function seedAgentKnowledge(prisma: PrismaClient, tenantId: string) {
  console.log('📚 Seed Base de Connaissances Agent IA...');

  // Nettoyer les anciennes entrées pour ce tenant (idempotent)
  await prisma.agentKnowledgeEntry.deleteMany({ where: { tenantId } });

  const entries: Array<{
    categorie: 'faq' | 'info_entreprise' | 'services' | 'tarifs' | 'politiques' | 'actions' | 'autre';
    titre: string;
    contenu: string;
    motsCles: string | null;
    ordre: number;
  }> = [
    // ═══════════════════════════════════════════
    // INFO ENTREPRISE
    // ═══════════════════════════════════════════
    {
      categorie: 'info_entreprise',
      titre: 'Présentation TalosPrimes',
      contenu: `TalosPrimes est une plateforme SaaS (Software as a Service) de gestion tout-en-un destinée aux professionnels de l'immobilier. TalosPrimes N'EST PAS une agence immobilière. C'est un éditeur de logiciel qui fournit des outils numériques aux agences, syndics, administrateurs de biens et promoteurs. L'application est accessible 24h/24 sur https://app.talosprimes.com.`,
      motsCles: 'talosprimes, plateforme, saas, immobilier, logiciel, présentation',
      ordre: 0,
    },
    {
      categorie: 'info_entreprise',
      titre: 'Public cible',
      contenu: `TalosPrimes s'adresse aux : agences immobilières (transactions, locations), administrateurs de biens (gestion locative), syndics de copropriété, promoteurs immobiliers, et courtiers/mandataires.`,
      motsCles: 'public, cible, agence, syndic, promoteur, courtier, immobilier',
      ordre: 1,
    },
    {
      categorie: 'info_entreprise',
      titre: 'Accès et inscription',
      contenu: `Pour s'inscrire, rendez-vous sur https://app.talosprimes.com/inscription. L'inscription prend quelques minutes. La plateforme est disponible immédiatement après inscription. Notre équipe accompagne les nouveaux clients pour la configuration initiale.`,
      motsCles: 'inscription, accès, compte, créer, rejoindre, commencer',
      ordre: 2,
    },

    // ═══════════════════════════════════════════
    // SERVICES / MODULES
    // ═══════════════════════════════════════════
    {
      categorie: 'services',
      titre: 'CRM et Gestion des Leads',
      contenu: `Module CRM complet : capture automatique des prospects (formulaire web, téléphone, SMS), suivi du cycle de vie (nouveau → contacté → converti ou abandonné), qualification via questionnaires intelligents, conversion lead → client en un clic, historique complet des interactions.`,
      motsCles: 'crm, leads, prospects, conversion, suivi, pipeline',
      ordre: 0,
    },
    {
      categorie: 'services',
      titre: 'Gestion des Clients',
      contenu: `Fiche client complète (coordonnées, raison sociale, SIRET), clients B2B et B2C, statuts actif/inactif/suspendu, abonnements et historique de facturation, espace client dédié avec accès aux documents, tags personnalisables.`,
      motsCles: 'clients, b2b, b2c, fiche, gestion',
      ordre: 1,
    },
    {
      categorie: 'services',
      titre: 'Facturation',
      contenu: `Création de factures avec lignes de détail. Statuts : brouillon, envoyée, payée, en retard, annulée. Génération automatique de PDF professionnel, envoi par email, suivi des paiements et relances automatiques, numérotation séquentielle, gestion TVA multi-taux.`,
      motsCles: 'facture, facturation, paiement, pdf, envoi, relance, tva',
      ordre: 2,
    },
    {
      categorie: 'services',
      titre: 'Devis',
      contenu: `Création de devis professionnels. Statuts : brouillon, envoyé, accepté, refusé, expiré, facturé. Date d'expiration configurable, conversion devis → facture ou bon de commande en un clic, génération PDF.`,
      motsCles: 'devis, proposition, estimation, conversion',
      ordre: 3,
    },
    {
      categorie: 'services',
      titre: 'Bons de Commande et Avoirs',
      contenu: `Bons de commande : création, validation, suivi et conversion en facture avec PDF professionnel. Avoirs (notes de crédit) : création d'avoirs pour remboursements ou ajustements, lien avec la facture d'origine. Factures proforma : pré-facturation avant engagement avec conversion en facture définitive.`,
      motsCles: 'bon commande, avoir, proforma, remboursement, crédit',
      ordre: 4,
    },
    {
      categorie: 'services',
      titre: 'Comptabilité complète',
      contenu: `Plan comptable général conforme aux normes françaises (PCG). Journaux : Ventes, Achats, Banque, Opérations diverses, À-nouveau. Saisie d'écritures en partie double, lettrage, rapprochement bancaire, exercices fiscaux avec clôture, déclarations TVA, immobilisations et amortissements. États financiers : Grand livre, Balance, Bilan, Compte de résultat. Assistant IA comptable pour aide à la saisie.`,
      motsCles: 'comptabilité, bilan, tva, écriture, journal, grand livre, balance, pcg',
      ordre: 5,
    },
    {
      categorie: 'services',
      titre: 'Communication : Téléphonie et SMS',
      contenu: `Numéro de téléphone professionnel dédié, agent vocal IA qui répond aux appels, enregistrement et transcription, journal des appels avec statistiques, appels sortants automatisés. SMS : envoi depuis la plateforme, journal avec statistiques, SMS de confirmation/rappel/relance, bidirectionnels.`,
      motsCles: 'téléphone, appel, sms, communication, vocal, twilio',
      ordre: 6,
    },
    {
      categorie: 'services',
      titre: 'Email et Agenda',
      contenu: `Email : lecture des emails entrants (IMAP), envoi (SMTP), agent IA capable de lire et répondre, templates personnalisables. Agenda : calendrier intégré, création/modification/suppression de rendez-vous, rappels et notifications.`,
      motsCles: 'email, agenda, calendrier, rendez-vous, imap, smtp',
      ordre: 7,
    },
    {
      categorie: 'services',
      titre: 'Agent IA (Super Agent)',
      contenu: `Assistant intelligent accessible par chat, téléphone et SMS. 17 outils intégrés : gestion leads, clients, factures, emails, agenda, banque. Exécution d'actions en temps réel (pas juste des réponses). Mode admin avec accès complet, mode client avec accès limité aux propres données.`,
      motsCles: 'agent, ia, intelligence artificielle, assistant, chat, outil',
      ordre: 8,
    },
    {
      categorie: 'services',
      titre: 'Intégrations et Automatisation',
      contenu: `Intégration bancaire Qonto (solde, transactions, historique). Intégration Stripe pour paiements récurrents. Plus de 100 workflows automatisés via n8n déclenchés sur événements (création facture, nouveau lead, etc.). Espace client dédié avec portail par client.`,
      motsCles: 'qonto, stripe, n8n, automatisation, workflow, intégration, banque',
      ordre: 9,
    },

    // ═══════════════════════════════════════════
    // TARIFS
    // ═══════════════════════════════════════════
    {
      categorie: 'tarifs',
      titre: 'Tarifs et abonnements',
      contenu: `TalosPrimes fonctionne sur un modèle d'abonnement. Les tarifs sont sur devis personnalisé selon les modules et le volume d'utilisation. Pour connaître les tarifs : visitez https://talosprimes.com, demandez un devis personnalisé, ou demandez à être rappelé par un conseiller.`,
      motsCles: 'tarif, prix, coût, abonnement, formule, devis, paiement',
      ordre: 0,
    },

    // ═══════════════════════════════════════════
    // FAQ
    // ═══════════════════════════════════════════
    {
      categorie: 'faq',
      titre: 'Comment créer une facture ?',
      contenu: `Dans le menu Facturation, cliquez sur "Nouvelle facture", sélectionnez le client, ajoutez les lignes d'articles, puis enregistrez ou envoyez directement. Les factures reprennent automatiquement les informations de votre entreprise (logo, coordonnées, SIRET).`,
      motsCles: 'créer, facture, nouvelle, comment',
      ordre: 0,
    },
    {
      categorie: 'faq',
      titre: 'Comment transformer un devis en facture ?',
      contenu: `En un clic depuis le détail du devis. Toutes les lignes sont automatiquement reprises dans la facture. Vous pouvez aussi convertir un devis en bon de commande.`,
      motsCles: 'devis, facture, convertir, transformer',
      ordre: 1,
    },
    {
      categorie: 'faq',
      titre: 'Suivi des paiements et relances',
      contenu: `Chaque facture affiche son statut de paiement. Le système envoie des relances automatiques pour les factures en retard. Vous pouvez marquer une facture comme payée manuellement ou laisser le système détecter le paiement via Stripe.`,
      motsCles: 'paiement, relance, retard, suivi, impayé',
      ordre: 2,
    },
    {
      categorie: 'faq',
      titre: 'La comptabilité est-elle conforme ?',
      contenu: `Oui, le plan comptable suit le Plan Comptable Général (PCG) français avec journaux réglementaires. Vous pouvez générer le Grand Livre, la Balance, le Bilan et le Compte de Résultat en PDF. L'assistant IA comptable aide à créer des écritures et préparer les déclarations.`,
      motsCles: 'comptabilité, conforme, norme, pcg, légal',
      ordre: 3,
    },
    {
      categorie: 'faq',
      titre: 'Comment fonctionne l\'agent téléphonique ?',
      contenu: `Un numéro professionnel est attribué à votre compte. L'agent IA répond aux appels, qualifie les prospects, et peut transférer les demandes complexes. Il peut créer des leads, chercher des clients, et effectuer des actions en temps réel.`,
      motsCles: 'agent, téléphone, appel, vocal, répondre',
      ordre: 4,
    },
    {
      categorie: 'faq',
      titre: 'Sécurité des données',
      contenu: `La plateforme utilise le chiffrement SSL, l'authentification JWT, et les données sont hébergées sur des serveurs sécurisés (Supabase/PostgreSQL). L'architecture multi-tenant garantit une isolation complète des données entre entreprises. Chaque entreprise ne voit que ses propres données.`,
      motsCles: 'sécurité, données, chiffrement, confidentialité, protection, rgpd',
      ordre: 5,
    },

    // ═══════════════════════════════════════════
    // POLITIQUES
    // ═══════════════════════════════════════════
    {
      categorie: 'politiques',
      titre: 'Support et formation',
      contenu: `Support disponible par téléphone via le numéro dédié, par email, ou directement via l'agent IA dans l'application. Formation incluse : notre équipe accompagne les nouveaux clients pour la prise en main de la plateforme.`,
      motsCles: 'support, aide, formation, contact, assistance',
      ordre: 0,
    },

    // ═══════════════════════════════════════════
    // ACTIONS (ce que l'agent peut faire)
    // ═══════════════════════════════════════════
    {
      categorie: 'actions',
      titre: 'Créer un lead / prospect',
      contenu: `L'agent peut enregistrer un nouveau prospect dans le CRM quand un appelant donne ses coordonnées ou montre un intérêt pour la plateforme. Il faut au minimum le nom et le téléphone. L'agent utilise l'outil create_lead.`,
      motsCles: 'créer, lead, prospect, enregistrer, nouveau',
      ordre: 0,
    },
    {
      categorie: 'actions',
      titre: 'Rechercher un client',
      contenu: `L'agent peut chercher un client par nom, prénom ou numéro de téléphone dans la base de données pour identifier l'appelant et accéder à son historique.`,
      motsCles: 'rechercher, client, trouver, identifier, chercher',
      ordre: 1,
    },
    {
      categorie: 'actions',
      titre: 'Actions admin (mode privilégié)',
      contenu: `En mode admin, l'agent peut : créer/modifier/supprimer des leads, créer des clients, créer des factures brouillon, créer des bons de commande, lister les leads/clients/factures, modifier le statut des factures, et supprimer des éléments (avec confirmation). Ces actions sont réservées aux administrateurs identifiés.`,
      motsCles: 'admin, créer, modifier, supprimer, facture, client, lead, action',
      ordre: 2,
    },

    // ═══════════════════════════════════════════
    // RÉSOLUTION PROBLÈMES (FAQ technique)
    // ═══════════════════════════════════════════
    {
      categorie: 'faq',
      titre: 'Problèmes de connexion',
      contenu: `"Je ne peux pas me connecter" : vérifiez vos identifiants, utilisez "Mot de passe oublié", ou contactez votre administrateur. "Mon compte est suspendu" : contactez le support pour vérifier le statut de votre abonnement.`,
      motsCles: 'connexion, erreur, mot de passe, login, accès, problème',
      ordre: 10,
    },
    {
      categorie: 'faq',
      titre: 'Problèmes de facturation',
      contenu: `"Ma facture n'est pas envoyée" : vérifiez l'email du client dans sa fiche, puis renvoyez depuis le détail. "Le statut de paiement ne se met pas à jour" : vérifiez la configuration Stripe dans les paramètres.`,
      motsCles: 'problème, facture, envoi, statut, erreur',
      ordre: 11,
    },
    {
      categorie: 'faq',
      titre: 'Problèmes techniques généraux',
      contenu: `"L'application est lente" : videz le cache du navigateur et vérifiez votre connexion internet. "Je ne vois pas certains modules" : vérifiez que votre abonnement inclut les modules concernés. "L'agent IA ne répond pas correctement" : la base de connaissances est mise à jour régulièrement, signalez les problèmes au support.`,
      motsCles: 'lent, bug, erreur, module, problème, technique',
      ordre: 12,
    },
  ];

  // Insérer toutes les entrées
  for (const entry of entries) {
    await prisma.agentKnowledgeEntry.create({
      data: {
        tenantId,
        categorie: entry.categorie,
        titre: entry.titre,
        contenu: entry.contenu,
        motsCles: entry.motsCles,
        actif: true,
        ordre: entry.ordre,
      },
    });
  }

  console.log(`✅ Base de Connaissances — ${entries.length} entrées créées`);
}
