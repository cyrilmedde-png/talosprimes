-- =============================================================
-- SEED KB COMPLETE : base de connaissances exhaustive agent vocal
-- Couvre 100% des fonctionnalités de la plateforme TalosPrimes
-- Convention : seed-*.sql → exécuté auto par update-vps.sh
-- =============================================================

-- Supprimer les anciennes entrées pour repartir propre (contrainte unique sur tenant_id+titre)
DELETE FROM agent_knowledge_entries
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

-- ============================================================
-- CATÉGORIE : info_entreprise
-- ============================================================

INSERT INTO agent_knowledge_entries (id, tenant_id, categorie, titre, contenu, reponse_vocale, mots_cles, actif, ordre, created_at, updated_at) VALUES

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'info_entreprise',
'Présentation TalosPrimes',
'TalosPrimes est une plateforme SaaS tout-en-un de gestion commerciale, comptable et RH. Elle s''adresse aux TPE, PME, indépendants et entreprises du BTP. Accessible 100% en ligne depuis navigateur, tablette ou mobile. Hébergement en France, conforme RGPD.',
'TalosPrimes est une plateforme tout-en-un pour gérer votre activité. On couvre la facturation, la comptabilité, les devis, la gestion de clients, les ressources humaines, le stock, les projets, et bien plus encore. Tout est en ligne et accessible depuis n''importe quel appareil. Est-ce qu''il y a un domaine en particulier qui vous intéresse ?',
'talosprimes,présentation,c''est quoi,que faites-vous,plateforme,activité,saas',
true, 1, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'info_entreprise',
'Horaires et disponibilité',
'Bureaux ouverts du lundi au vendredi de 9h à 18h. Support disponible sur les mêmes horaires par téléphone, email et chat. En dehors des horaires, possibilité de laisser un message. La plateforme est accessible 24h/24, 7j/7.',
'Nos bureaux sont ouverts du lundi au vendredi, de neuf heures à dix-huit heures. Vous pouvez nous joindre par téléphone, email ou chat sur ces créneaux. La plateforme elle-même est accessible vingt-quatre heures sur vingt-quatre. En dehors des heures d''ouverture, vous pouvez me laisser un message et on vous recontacte dès le lendemain matin.',
'horaires,heures,ouverture,disponible,quand,fermé,week-end,samedi,dimanche',
true, 2, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'info_entreprise',
'Contact',
'Email : contact@talosprimes.com. Téléphone : ce numéro. Site web : talosprimes.com. Chat disponible en bas à droite du site. Formulaire de contact sur la page Contact.',
'Vous pouvez nous joindre par email à contact@talosprimes.com, par téléphone sur ce numéro, ou via le chat en bas à droite de notre site talosprimes.com. On a aussi un formulaire de contact sur le site. Comment puis-je vous aider aujourd''hui ?',
'contact,joindre,email,téléphone,adresse,site,chat',
true, 3, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'info_entreprise',
'Hébergement et sécurité',
'Hébergement en France (serveurs Scaleway/OVH). Données chiffrées en transit et au repos. Sauvegardes quotidiennes automatiques. Authentification sécurisée avec hachage de mot de passe. Conformité RGPD totale. Registre des sous-traitants maintenu. Chiffrement des données sensibles (appels, SMS).',
'Vos données sont hébergées en France, entièrement chiffrées et sauvegardées tous les jours. On est conformes au RGPD et on maintient un registre des sous-traitants comme la loi l''exige. L''accès à votre compte est protégé par authentification sécurisée. Est-ce que vous avez d''autres questions sur la sécurité ?',
'sécurité,securite,données,rgpd,hébergement,chiffrement,sauvegarde,france,conforme',
true, 4, NOW(), NOW());

-- ============================================================

-- ============================================================

INSERT INTO agent_knowledge_entries (id, tenant_id, categorie, titre, contenu, reponse_vocale, mots_cles, actif, ordre, created_at, updated_at) VALUES

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'tarifs',
'Formules et tarifs généraux',
'3 formules : Starter à 29€/mois (indépendants, 3 utilisateurs), Pro à 69€/mois (PME, 10 utilisateurs), Enterprise sur devis (illimité, support dédié). Essai gratuit 14 jours sans CB. Tarifs annuels avec réduction.',
'On propose trois formules. Le Starter à vingt-neuf euros par mois, c''est idéal pour les indépendants avec jusqu''à trois utilisateurs. Le Pro à soixante-neuf euros par mois convient aux PME avec jusqu''à dix utilisateurs et toutes les fonctionnalités avancées. Et l''Enterprise, qui est sur devis, pour les grandes structures avec un support dédié. Toutes les formules commencent par un essai gratuit de quatorze jours, sans carte bancaire. Quelle formule vous intéresserait ?',
'tarif,prix,combien,coût,formule,abonnement,offre,starter,pro,enterprise,mensuel,annuel',
true, 1, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'tarifs',
'Détail formule Starter',
'Starter 29€/mois : Facturation complète, Devis et bons de commande, CRM basique, Gestion clients, Dashboard, 3 utilisateurs max, Support email, Essai gratuit 14j.',
'La formule Starter à vingt-neuf euros par mois inclut la facturation complète avec TVA automatique, la création de devis et bons de commande, la gestion de vos clients, un tableau de bord clair, et jusqu''à trois utilisateurs. Le support est par email. C''est parfait pour démarrer. Vous pouvez l''essayer gratuitement pendant quatorze jours.',
'starter,vingt-neuf,29,indépendant,auto-entrepreneur,petite,basique,démarrer',
true, 2, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'tarifs',
'Détail formule Pro',
'Pro 69€/mois : Tout le Starter + CRM avancé, Comptabilité complète (écritures, TVA, FEC, bilan), RH (paie, congés, contrats), Stock, Projets, Marketing, Tickets, Agent téléphonique IA, 10 utilisateurs max, Support prioritaire tel+chat.',
'La formule Pro à soixante-neuf euros par mois inclut tout ce qu''il y a dans le Starter, plus le CRM avancé, la comptabilité complète avec les déclarations de TVA et le FEC, le module RH avec la paie et les congés, la gestion de stock, les projets, le marketing, le support par tickets, et même un agent téléphonique intelligent. Vous pouvez avoir jusqu''à dix utilisateurs et vous avez un support prioritaire par téléphone et chat. C''est notre formule la plus populaire.',
'pro,soixante-neuf,69,pme,avancé,comptabilité,rh,stock,populaire',
true, 3, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'tarifs',
'Détail formule Enterprise',
'Enterprise sur devis : Tout le Pro + utilisateurs illimités, support dédié avec interlocuteur unique, intégrations personnalisées, migration données gratuite, SLA garanti, formation incluse.',
'La formule Enterprise est sur mesure. Elle inclut toutes les fonctionnalités de la plateforme sans aucune limite d''utilisateurs. Vous avez un interlocuteur dédié, des intégrations sur mesure, la migration gratuite de vos données depuis votre ancien logiciel, un niveau de service garanti, et la formation de vos équipes incluse. Si ça vous intéresse, je peux prendre vos coordonnées pour qu''on vous prépare un devis personnalisé.',
'enterprise,entreprise,sur mesure,devis,illimité,dédié,grand,migration',
true, 4, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'tarifs',
'Moyens de paiement',
'Paiement par carte bancaire (Visa, Mastercard) et prélèvement SEPA. Facturation mensuelle ou annuelle (réduction 2 mois offerts). Intégration Stripe pour les paiements. Possibilité de paiement par virement pour Enterprise.',
'On accepte la carte bancaire, Visa et Mastercard, ainsi que le prélèvement SEPA. Si vous choisissez le paiement annuel, vous économisez l''équivalent de deux mois. Pour les formules Enterprise, on accepte aussi le virement bancaire.',
'paiement,carte,bancaire,sepa,virement,payer,régler,stripe,visa,mastercard',
true, 5, NOW(), NOW());

-- ============================================================

-- ============================================================

INSERT INTO agent_knowledge_entries (id, tenant_id, categorie, titre, contenu, reponse_vocale, mots_cles, actif, ordre, created_at, updated_at) VALUES


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Module Facturation',
'Création de factures en quelques clics. Types : facture entreprise, facture client final, facture achat. Numérotation automatique unique. TVA automatique multi-taux (0%, 2.1%, 5.5%, 10%, 20%). Suivi statut : brouillon, envoyée, payée, en retard, annulée. Génération PDF. Envoi par email. Relances automatiques. Avoirs (notes de crédit). Proformas. Factures d''achat avec OCR fournisseur.',
'Le module de facturation vous permet de créer vos factures en quelques clics. La numérotation est automatique et unique. La TVA se calcule toute seule, quel que soit le taux. Vous pouvez suivre le statut de chaque facture, générer des PDF, les envoyer par email, et même programmer des relances automatiques pour les impayés. On gère aussi les avoirs, les proformas, et les factures d''achat avec reconnaissance automatique des données fournisseur. Tout est conforme à la réglementation française.',
'facture,facturation,créer facture,envoyer facture,pdf,relance,impayé,avoir,proforma,achat,tvA',
true, 10, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Module Devis et Bons de commande',
'Création de devis professionnels avec lignes détaillées. Cycle de vie : brouillon → envoyé → accepté/refusé → facturé. Signature électronique par le client. Conversion automatique en facture ou bon de commande. Bons de commande avec suivi complet. Validité configurable. Articles réutilisables depuis le catalogue.',
'Vous pouvez créer des devis professionnels en quelques minutes avec toutes les lignes détaillées. Le client reçoit le devis par email et peut l''accepter en un clic. Une fois accepté, le devis se transforme automatiquement en facture ou en bon de commande, comme vous préférez. Vous avez aussi un catalogue d''articles réutilisables pour aller encore plus vite.',
'devis,bon de commande,bdc,proposer,chiffrer,accepter,signer,convertir',
true, 11, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Module CRM et gestion clients',
'Gestion clients B2B et B2C. Fiches complètes : coordonnées, historique, tags. Leads et prospects avec scoring 0-100. Statuts : nouveau, contacté, qualifié, converti, abandonné. Suivi des relances automatiques. Attribution aux partenaires. Historique complet des échanges. Conversion lead → client en un clic.',
'Le CRM vous permet de gérer tous vos clients et prospects au même endroit. Chaque fiche client contient les coordonnées complètes, l''historique de tous les échanges, et des tags pour les organiser. Pour les prospects, on a un système de scoring qui les note de zéro à cent selon leur intérêt. Vous pouvez suivre les relances, et quand un prospect est prêt, il se transforme en client en un clic.',
'crm,client,prospect,lead,contact,fiche client,relance,scoring,suivi,pipeline',
true, 12, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Module Comptabilité',
'Comptabilité complète intégrée. Plan comptable français standard. Journaux : Ventes, Achats, Banque, Opérations diverses, À-nouveaux. Écritures comptables manuelles et automatiques. Lettrage des comptes. Rapprochement bancaire. Exercices comptables. Périodes mensuelles avec clôture. Bilan, compte de résultat, balance, grand livre. Intelligence artificielle pour suggestions comptables.',
'La comptabilité est entièrement intégrée à la plateforme. Vous avez le plan comptable français, tous les journaux nécessaires, les écritures se créent automatiquement à partir de vos factures. Le rapprochement bancaire et le lettrage sont simplifiés. Vous pouvez générer votre bilan, votre compte de résultat, la balance et le grand livre à tout moment. Et on a même une intelligence artificielle qui vous aide avec des suggestions comptables.',
'comptabilité,compta,écriture,journal,bilan,résultat,balance,grand livre,lettrage,rapprochement,exercice',
true, 13, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Déclarations TVA',
'Déclarations de TVA mensuelle et trimestrielle. Calcul automatique : TVA collectée, TVA déductible, TVA à payer, crédit de TVA. Statuts : brouillon, validée, transmise. EDI-TVA (télédéclaration) : format EDIFACT, formulaires CA3 et CA12. Régimes supportés : réel normal, réel simplifié, mini-réel. Ventilation par taux (20%, 10%, 5.5%, 2.1%).',
'Les déclarations de TVA sont automatisées. La plateforme calcule la TVA collectée et déductible à partir de vos factures et achats. Vous pouvez faire vos déclarations mensuelles ou trimestrielles, avec la ventilation par taux. On supporte la télédéclaration au format EDIFACT, les formulaires CA3 et CA12, que ce soit en régime réel normal ou simplifié.',
'tva,déclaration,collectée,déductible,ca3,ca12,télédéclaration,edi,taxe',
true, 14, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Conformité française (FEC, PAF, e-reporting)',
'FEC (Fichier des Écritures Comptables) : génération automatique avec validation SIREN, hash SHA-256 d''intégrité. Piste d''Audit Fiable (PAF) : traçabilité complète devis→commande→livraison→facture→écriture→paiement→avoir. E-Reporting des transactions B2C et internationales. Facturation électronique Factur-X/UBL (profils minimum, basic, EN16931). DAS2 pour les honoraires et commissions. Vérification SIRENE/SIRET automatique.',
'On est entièrement conformes à la réglementation française. Le FEC se génère automatiquement avec contrôle d''intégrité. La piste d''audit est tracée de bout en bout, du devis jusqu''au paiement. On gère le e-reporting, la facturation électronique au format Factur-X, les déclarations DAS2 pour les honoraires, et la vérification automatique des numéros SIRET et SIREN.',
'fec,piste audit,conformité,factur-x,das2,e-reporting,siret,siren,réglementation,légal,chorus',
true, 15, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Immobilisations et amortissements',
'Gestion des immobilisations : désignation, date et valeur d''acquisition, méthode d''amortissement (linéaire ou dégressive). Statuts : en cours, actif, cédé, mis au rebut. Calcul automatique des tableaux d''amortissement : dotation annuelle, cumul, valeur nette comptable. Suivi de la valeur résiduelle.',
'Le module d''immobilisations vous permet de suivre tous vos biens amortissables. Vous renseignez la valeur d''acquisition et la méthode, linéaire ou dégressive, et la plateforme calcule automatiquement le tableau d''amortissement avec les dotations annuelles et la valeur nette comptable. Tout est intégré à la comptabilité.',
'immobilisation,amortissement,linéaire,dégressive,bien,acquisition,vnc,dotation',
true, 16, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Module Ressources Humaines',
'Gestion complète RH. Fiches collaborateurs avec contrat, poste, département, salaire. Types de contrats : CDI, CDD, intérim, stage, alternance, freelance. Bulletins de paie : salaire base, primes, déductions, charges patronales et salariales, net à payer. Gestion des congés : CP, RTT, maladie, sans solde, maternité, paternité, formation. Workflow d''approbation. Documents RH. Entretiens annuels et professionnels. Formations avec inscriptions. Évaluations trimestrielles et annuelles.',
'Le module RH couvre tout. Les fiches de vos collaborateurs avec leurs contrats, que ce soit CDI, CDD, intérim, stage ou alternance. Les bulletins de paie avec le calcul automatique des charges. La gestion des congés avec un circuit de validation. Les entretiens annuels et professionnels. Les formations avec le suivi des inscriptions. Et les évaluations de performance. Tout est centralisé dans un seul endroit.',
'rh,ressources humaines,paie,bulletin,salaire,congé,contrat,cdi,cdd,formation,entretien,évaluation,collaborateur',
true, 17, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Module Gestion de stock',
'Multi-sites de stockage. Niveaux de stock en temps réel par article et par site. Mouvements : entrées, sorties, ajustements, transferts inter-sites. Seuils min/max avec alertes automatiques. Sessions d''inventaire avec écarts. Transferts inter-sites avec suivi. Historique complet de chaque mouvement avec traçabilité.',
'La gestion de stock couvre plusieurs sites si vous en avez besoin. Vous voyez les niveaux en temps réel pour chaque article. Les mouvements d''entrée, de sortie et les transferts entre sites sont suivis automatiquement. Des alertes se déclenchent quand le stock passe sous le seuil minimum. Vous pouvez aussi faire des inventaires avec le calcul automatique des écarts.',
'stock,inventaire,entrepôt,mouvement,entrée,sortie,transfert,alerte,seuil,article,quantité',
true, 18, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Module Projets et tâches',
'Gestion de projets avec budget, progression et responsable. Statuts : brouillon, en cours, en pause, terminé, annulé. Tâches avec priorité (basse à urgente), assignation, estimation d''heures. Sous-tâches. Suivi du temps réel vs estimé. Budget prévu vs consommé. Tags et couleurs personnalisables.',
'Le module de projets vous permet de suivre vos projets de A à Z. Vous définissez le budget, assignez un responsable, et suivez la progression en temps réel. Chaque projet contient des tâches avec des priorités, des assignations, et le suivi des heures. Vous voyez en un coup d''œil le budget consommé par rapport au prévu.',
'projet,tâche,planning,budget,progression,assignation,priorité,heures,équipe',
true, 19, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Module BTP (Bâtiment et Travaux Publics)',
'Gestion de chantiers : référence, adresse, client, responsable, dates, montant marché. Statuts : planifié, en préparation, en cours, suspendu, terminé, clôturé. Situations de travaux : numérotation par chantier, montants HT/TVA/TTC, taux d''avancement, cumul antérieur, retenues de garantie. Types : situation de travaux, DG démarrage, retenue de garantie, avenant.',
'Le module BTP est pensé pour les entreprises du bâtiment. Vous gérez vos chantiers avec le suivi du marché, l''avancement, et le responsable. Les situations de travaux se créent facilement avec le calcul automatique des montants et du cumul. On gère aussi les retenues de garantie, les acomptes de démarrage et les avenants. Tout est rattaché au bon chantier.',
'btp,chantier,situation,travaux,avancement,retenue,garantie,marché,bâtiment,construction',
true, 20, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Gestion d''équipe (pointages et absences)',
'Pointage quotidien : heure d''arrivée, de départ, pause, heures travaillées. Absences : congé payé, RTT, maladie, sans solde, maternité, paternité, formation. Circuit d''approbation par le manager. Suivi des jours pris.',
'La gestion d''équipe comprend le pointage quotidien de vos collaborateurs avec les heures d''arrivée, de départ et de pause. Pour les absences, tout passe par un circuit de validation. Le manager reçoit la demande et peut l''approuver ou la refuser directement depuis la plateforme.',
'pointage,absence,présence,heure,arrivée,départ,pause,congé,rtt,maladie',
true, 21, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Module Marketing',
'Publication automatisée sur TikTok, Instagram, Facebook. Types de posts : présentation de module, astuce, témoignage, promo. Planification par semaine. Contenu texte et visuel. Hashtags. Suivi d''engagement (likes, commentaires, partages). Statuts : planifié, publié, erreur.',
'Le module marketing vous permet de publier automatiquement sur TikTok, Instagram et Facebook. Vous planifiez vos posts, que ce soit des présentations, des astuces, des témoignages ou des promos. Le contenu est programmé et publié automatiquement, et vous suivez l''engagement de chaque publication.',
'marketing,publication,réseaux sociaux,tiktok,instagram,facebook,post,campagne,engagement',
true, 22, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Support par tickets',
'Système de tickets numérotés automatiquement. Catégories : général, technique, commercial, facturation. Priorités : basse, normale, haute, urgente. Statuts : ouvert, en cours, en attente, résolu, fermé. Réponses avec notes internes (non visibles au demandeur). Assignation à un administrateur. Tags libres.',
'Le système de tickets vous permet de suivre toutes les demandes. Chaque ticket est numéroté automatiquement et classé par catégorie et priorité. Vous pouvez ajouter des réponses, des notes internes que le demandeur ne voit pas, et assigner le ticket à la bonne personne. Vous voyez le statut de chaque demande en temps réel.',
'ticket,support,demande,assistance,problème,bug,incident,aide,réclamation',
true, 23, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Agent téléphonique IA',
'Agent vocal intelligent basé sur l''IA. Accueil personnalisé avec nom de l''entreprise. Reconnaissance vocale en français. Réponses naturelles basées sur la base de connaissances. Détection de prospects. Création de leads automatique. Journalisation des appels avec transcription. Analyse de sentiment. Envoi de SMS. Questionnaires automatisés. Gestion du calendrier.',
'L''agent téléphonique, c''est moi en fait ! Je suis une intelligence artificielle qui répond au téléphone pour vous. J''accueille vos clients, je réponds à leurs questions grâce à la base de connaissances, je détecte les prospects, et j''enregistre tous les échanges. Je peux aussi envoyer des SMS et créer des fiches prospects automatiquement.',
'agent,téléphone,vocal,ia,intelligence artificielle,appel,bot,assistante,lea',
true, 24, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Espace client (portail)',
'Portail client personnalisé par tenant. Modules activables par client. Suivi de la consommation. Dates d''expiration par module. Configuration personnalisée. Statuts : en création, en attente de validation, actif, suspendu, supprimé.',
'L''espace client est un portail en ligne dédié à chacun de vos clients. Ils accèdent à leurs factures, devis, et documents directement. Vous choisissez quels modules activer pour chaque client et vous suivez leur consommation.',
'espace client,portail,accès,self-service,en ligne,documents',
true, 25, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Programme partenaires et commissions',
'Trois types : revendeur, apporteur d''affaires, white label. Commissions à deux niveaux : niveau 1 direct (10%) et niveau 2 sous-clients (3%). Types de commission : abonnement mensuel, setup, one-shot. Suivi des paiements via Stripe Connect. Personnalisation white label : domaine, logo, couleurs.',
'On a un programme partenaires avec trois niveaux. Revendeur, apporteur d''affaires, ou marque blanche. Les commissions sont à deux niveaux : dix pour cent sur vos clients directs et trois pour cent sur les sous-clients. Les paiements sont automatiques via Stripe. Pour la marque blanche, vous pouvez personnaliser le domaine, le logo et les couleurs.',
'partenaire,revendeur,commission,affiliation,white label,marque blanche,apporteur',
true, 26, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'CMS et pages web',
'Gestion de pages web dynamiques. Landing pages avec sections configurables : hero, stats, modules, agent IA, témoignages, CTA, contact, intégrations. Pages CMS avec slug personnalisé. SEO intégré (meta title, description). Thème et configuration globale (navbar, footer). Témoignages clients avec note et affichage.',
'La plateforme inclut un système de gestion de contenu web. Vous pouvez créer vos landing pages avec des sections modulables, ajouter des pages personnalisées comme la page tarifs ou le à propos, et tout est optimisé pour le référencement. Vous gérez aussi les témoignages clients qui s''affichent sur le site.',
'cms,site web,landing page,page,seo,contenu,témoignage',
true, 27, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Catalogue d''articles',
'Bibliothèque d''articles réutilisables. Code article unique par tenant. Désignation, prix unitaire HT, taux de TVA, unité de mesure. Utilisable dans factures, devis, bons de commande, proformas. Actif/inactif.',
'Vous avez un catalogue d''articles que vous créez une fois et réutilisez partout. Chaque article a son code, sa désignation, son prix et son taux de TVA. Vous le sélectionnez ensuite dans vos factures, devis ou bons de commande en un clic.',
'article,catalogue,produit,service,référence,code article,désignation',
true, 28, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Notifications et événements',
'Système de notifications temps réel. Types : inscription lead, questionnaire complété, entretien programmé, confirmation client, erreur facture. Payload enrichi en JSON. Marquage lu/non lu. Événements déclencheurs pour workflows n8n automatisés.',
'Vous recevez des notifications en temps réel pour tout ce qui se passe sur la plateforme. Quand un prospect s''inscrit, quand un questionnaire est complété, quand une facture a un problème. Certains événements déclenchent automatiquement des actions, comme l''envoi d''un email ou la mise à jour d''un statut.',
'notification,alerte,événement,rappel,automatique,temps réel',
true, 29, NOW(), NOW()),


(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'services',
'Envoi de SMS',
'Envoi et réception de SMS via Twilio. Suivi du statut : envoyé, délivré, échoué. Lié aux appels téléphoniques. Historique complet. Chiffrement des données sensibles.',
'On peut envoyer des SMS automatiquement ou manuellement à vos clients. Par exemple après un appel pour confirmer des informations, ou pour envoyer un lien vers un devis. Tous les SMS sont tracés et le contenu sensible est chiffré.',
'sms,texto,message,envoyer,confirmer',
true, 30, NOW(), NOW());

-- ============================================================

-- ============================================================

INSERT INTO agent_knowledge_entries (id, tenant_id, categorie, titre, contenu, reponse_vocale, mots_cles, actif, ordre, created_at, updated_at) VALUES

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'faq',
'Essai gratuit',
'Essai gratuit de 14 jours sur toutes les formules. Sans engagement. Sans carte bancaire. Accès à toutes les fonctionnalités de la formule choisie. Possibilité de changer de formule à tout moment.',
'Oui, vous pouvez essayer gratuitement pendant quatorze jours, sans engagement et sans carte bancaire. Vous avez accès à toutes les fonctionnalités de la formule que vous choisissez. Et vous pouvez changer de formule à tout moment si vos besoins évoluent.',
'essai,gratuit,tester,essayer,découvrir,sans engagement,carte bancaire,14 jours',
true, 1, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'faq',
'Résiliation',
'Résiliation possible à tout moment depuis l''espace client. Sans frais. Sans engagement. Prend effet à la fin de la période en cours. Données exportables avant résiliation. Données conservées 30 jours après résiliation.',
'Vous pouvez résilier à tout moment depuis votre espace client, sans frais et sans engagement. La résiliation prend effet à la fin de votre période en cours. Vous pouvez exporter vos données avant, et on les conserve trente jours après au cas où vous changeriez d''avis.',
'résilier,résiliation,annuler,désabonner,arrêter,quitter,engagement',
true, 2, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'faq',
'Garantie satisfait ou remboursé',
'Garantie satisfait ou remboursé de 30 jours. Si la plateforme ne convient pas dans les 30 premiers jours : remboursement intégral sans condition. Applicable sur la première période de facturation uniquement.',
'Si la plateforme ne vous convient pas dans les trente premiers jours, on vous rembourse intégralement, sans condition. C''est notre garantie satisfait ou remboursé. Elle s''applique sur votre première période de facturation.',
'remboursement,garantie,satisfait,rembourser,pas content,déçu',
true, 3, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'faq',
'Intégrations disponibles',
'Intégrations : Stripe (paiements), Twilio (téléphonie et SMS), Qonto (banque), comptabilité (exports FEC), email (IMAP/SMTP). Intégrations personnalisées disponibles sur Enterprise. API disponible pour connecter des outils tiers.',
'TalosPrimes s''intègre avec Stripe pour les paiements, Twilio pour la téléphonie et les SMS, Qonto pour la banque, et vous pouvez configurer votre messagerie email. On exporte aussi au format FEC pour la comptabilité. Sur la formule Enterprise, on peut créer des intégrations personnalisées selon vos besoins.',
'intégration,connecter,api,stripe,twilio,qonto,email,logiciel,compatible,synchroniser',
true, 4, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'faq',
'Support technique',
'Support email pour tous. Support prioritaire téléphone et chat pour Pro et Enterprise. Temps de réponse : 24h email, 4h prioritaire, 1h Enterprise. Base d''aide en ligne. Formulaire de contact. Système de tickets.',
'Le support est disponible pour tous nos clients par email. Si vous êtes en formule Pro ou Enterprise, vous avez accès au support prioritaire par téléphone et chat avec un temps de réponse garanti. On a aussi une base d''aide en ligne et un système de tickets pour suivre vos demandes.',
'support,aide,technique,problème,assistance,dépannage,réponse,contacter',
true, 5, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'faq',
'Migration des données',
'Migration gratuite pour Pro (accompagnement) et Enterprise (prise en charge complète). Import possible depuis Excel, CSV. Import fournisseur pour factures achat avec OCR. Accompagnement personnalisé disponible.',
'Si vous venez d''un autre logiciel, on peut vous accompagner dans la migration de vos données. C''est gratuit pour les formules Pro et Enterprise. Vous pouvez aussi importer vous-même depuis des fichiers Excel ou CSV. Pour les factures fournisseurs, on a même la reconnaissance automatique des données.',
'migration,importer,import,données,transférer,ancien logiciel,excel,csv,déménager',
true, 6, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'faq',
'Nombre d''utilisateurs',
'Starter : jusqu''à 3 utilisateurs. Pro : jusqu''à 10 utilisateurs. Enterprise : illimité. Rôles : super admin, admin, collaborateur, lecture seule. Chaque utilisateur a ses accès personnalisés.',
'Le nombre d''utilisateurs dépend de votre formule. Avec le Starter, vous pouvez avoir jusqu''à trois utilisateurs. Avec le Pro, jusqu''à dix. Et l''Enterprise est sans limite. Chaque utilisateur peut avoir un rôle différent : administrateur, collaborateur, ou lecture seule.',
'utilisateur,utilisateurs,combien,nombre,accès,rôle,admin,collaborateur,compte,équipe',
true, 7, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'faq',
'Application mobile',
'Plateforme 100% responsive, accessible depuis navigateur mobile, tablette et ordinateur. Pas d''application native à télécharger. Fonctionne sur Chrome, Safari, Firefox, Edge. Connexion identique sur tous les appareils.',
'La plateforme est entièrement accessible depuis votre téléphone ou votre tablette via le navigateur. Pas besoin de télécharger d''application, ça fonctionne directement sur Chrome, Safari ou n''importe quel navigateur. Votre compte est le même partout.',
'mobile,application,téléphone,tablette,responsive,navigateur,app,smartphone',
true, 8, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'faq',
'Formation et prise en main',
'Documentation en ligne disponible. Vidéos tutoriels. Support par chat et email pour les questions. Formation personnalisée incluse dans Enterprise. Interface intuitive conçue pour les non-techniciens.',
'On a une documentation complète en ligne avec des vidéos tutoriels pour vous guider. Notre interface est conçue pour être intuitive, même si vous n''êtes pas à l''aise avec l''informatique. Et si vous êtes en formule Enterprise, une formation personnalisée est incluse pour vos équipes.',
'formation,tutoriel,apprendre,aide,documentation,guide,prise en main,comment,utiliser',
true, 9, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'faq',
'RGPD et protection des données',
'Conforme RGPD. Registre des sous-traitants. Consentements tracés (données personnelles, communications, cookies, partage tiers). Droit d''accès, rectification, suppression, portabilité. Demandes RGPD gérées depuis le back-office. DPO joignable.',
'On est entièrement conformes au RGPD. Tous les consentements sont tracés, vos clients peuvent exercer leurs droits d''accès, de rectification ou de suppression, et vous gérez tout ça depuis votre back-office. On a un registre des sous-traitants à jour et un responsable de la protection des données joignable.',
'rgpd,gdpr,données personnelles,consentement,droit,suppression,export,portabilité,protection',
true, 10, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'faq',
'Changer de formule',
'Passage d''une formule à l''autre possible à tout moment. Upgrade immédiat avec prorata. Downgrade à la fin de la période en cours. Pas de frais de changement.',
'Vous pouvez changer de formule à tout moment. Si vous passez à une formule supérieure, c''est immédiat et le prix est calculé au prorata. Si vous descendez de formule, le changement prend effet à la fin de votre période en cours. Il n''y a aucun frais de changement.',
'changer,formule,upgrade,passer,évoluer,monter,descendre,modifier abonnement',
true, 11, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'faq',
'Facturation électronique et Chorus Pro',
'Support Factur-X (CII et UBL). Profils : minimum, basic, EN16931. PDF hybride (PDF + XML intégré). Soumission Chorus Pro et plateformes PDP. Suivi du statut de transmission. Conforme aux obligations de facturation électronique entrées en vigueur.',
'On supporte la facturation électronique au format Factur-X, avec le PDF hybride qui contient le XML intégré. Vous pouvez soumettre vos factures via Chorus Pro ou les plateformes de dématérialisation partenaires. Le statut de chaque transmission est suivi en temps réel.',
'facturation électronique,factur-x,chorus pro,dématérialisation,xml,ubl,obligation',
true, 12, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'faq',
'Adapté à quel type d''entreprise',
'Conçu pour TPE, PME, indépendants, auto-entrepreneurs, artisans, entreprises BTP, prestataires de services, commerces. Modules métiers spécialisés activables selon l''activité. Multi-tenant pour revendeurs et groupes.',
'TalosPrimes s''adapte à tous les types d''entreprises. Que vous soyez indépendant, auto-entrepreneur, artisan, PME, entreprise du BTP ou prestataire de services, on a les modules adaptés à votre activité. Vous activez uniquement ceux dont vous avez besoin.',
'type entreprise,tpe,pme,indépendant,auto-entrepreneur,artisan,btp,prestataire,pour qui,adapté',
true, 13, NOW(), NOW());

-- ============================================================

-- ============================================================

INSERT INTO agent_knowledge_entries (id, tenant_id, categorie, titre, contenu, reponse_vocale, mots_cles, actif, ordre, created_at, updated_at) VALUES

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'politiques',
'Conditions générales',
'Sans engagement. Résiliation à tout moment. Garantie 30 jours. Données hébergées en France. Conforme RGPD. Sauvegardes quotidiennes. Support inclus dans toutes les formules.',
'On fonctionne sans engagement, vous pouvez résilier à tout moment. Vous avez une garantie satisfait ou remboursé de trente jours. Vos données sont hébergées en France et sauvegardées quotidiennement. Le support est inclus dans toutes les formules.',
'conditions,cgv,engagement,clause,contrat,politique',
true, 1, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'politiques',
'Archives et conservation',
'Archives comptables conservées minimum 6 ans (obligation fiscale) et maximum 10 ans (obligation commerciale). Archives verrouillées avec hash SHA-256. Horodatage certifié. Types archivés : FEC, grand livre, balance, bilan, journal, TVA.',
'Vos archives comptables sont conservées selon les obligations légales, au minimum six ans pour le fiscal et jusqu''à dix ans pour le commercial. Chaque archive est verrouillée avec un contrôle d''intégrité et un horodatage certifié.',
'archive,conservation,durée,combien de temps,garder,stocker,légal,fiscal',
true, 2, NOW(), NOW());

-- ============================================================

-- ============================================================

INSERT INTO agent_knowledge_entries (id, tenant_id, categorie, titre, contenu, reponse_vocale, mots_cles, actif, ordre, created_at, updated_at) VALUES

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'actions',
'Créer un lead / prospect',
'L''agent peut enregistrer un nouveau prospect avec son numéro de téléphone, son nom et des notes. Cela crée une fiche dans le CRM accessible depuis le back-office.',
'Bien sûr, je peux enregistrer vos coordonnées pour qu''un conseiller vous recontacte. Quel est votre nom s''il vous plaît ?',
'prospect,lead,intéressé,inscription,coordonnées,rappeler,contact,enregistrer',
true, 1, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'actions',
'Demander un devis',
'L''agent peut initier une demande de devis en collectant la description du besoin et le montant estimé. Le devis est créé en brouillon dans le système.',
'Je peux tout à fait initier une demande de devis pour vous. Pouvez-vous me décrire votre besoin ?',
'devis,chiffrage,estimation,proposer,demander devis,tarif personnalisé,sur mesure',
true, 2, NOW(), NOW()),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'actions',
'Prendre un rendez-vous',
'L''agent peut noter une demande de rendez-vous. L''information est enregistrée dans les notes de l''appel et une notification est envoyée à l''équipe.',
'Je note votre demande de rendez-vous. Avez-vous une préférence de date ou de créneau horaire ?',
'rendez-vous,rdv,rencontrer,disponibilité,planifier,programmer,créneau',
true, 3, NOW(), NOW());

-- ============================================================

-- ============================================================

SELECT categorie, COUNT(*) as nb_entrees,
  SUM(CASE WHEN reponse_vocale IS NOT NULL THEN 1 ELSE 0 END) as avec_vocal
FROM agent_knowledge_entries
WHERE tenant_id = '00000000-0000-0000-0000-000000000001' AND actif = true
GROUP BY categorie
ORDER BY categorie;
