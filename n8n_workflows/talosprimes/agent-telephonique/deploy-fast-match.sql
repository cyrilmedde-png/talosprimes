-- =============================================================
-- DEPLOY FAST-MATCH : réponses vocales pré-calculées
-- Exécuter sur la DB Supabase/Postgres du VPS
-- =============================================================

-- 1. Ajouter la colonne reponse_vocale
ALTER TABLE agent_knowledge_entries
ADD COLUMN IF NOT EXISTS reponse_vocale TEXT;

-- 2. Peupler les réponses vocales pour chaque entrée KB
-- Ces réponses sont optimisées pour être lues au téléphone :
-- naturelles, courtes, sans listes ni jargon technique

-- INFO ENTREPRISE
UPDATE agent_knowledge_entries SET reponse_vocale =
'TalosPrimes est une plateforme tout-en-un de gestion commerciale. On propose la facturation, la gestion de clients, les devis, et bien plus, le tout accessible en ligne depuis n''importe quel appareil.'
WHERE titre ILIKE '%présentation%' OR titre ILIKE '%presentation%' OR titre ILIKE '%entreprise%'
AND reponse_vocale IS NULL;

UPDATE agent_knowledge_entries SET reponse_vocale =
'Nos bureaux sont ouverts du lundi au vendredi, de neuf heures à dix-huit heures. En dehors de ces horaires, vous pouvez nous laisser un message et on vous rappellera dès le lendemain matin.'
WHERE titre ILIKE '%horaire%' OR titre ILIKE '%heure%ouverture%'
AND reponse_vocale IS NULL;

UPDATE agent_knowledge_entries SET reponse_vocale =
'Vous pouvez nous contacter par téléphone sur ce numéro, par email à contact@talosprimes.com, ou directement via le chat sur notre site web talosprimes.com. Est-ce que je peux vous aider avec autre chose ?'
WHERE titre ILIKE '%contact%' OR titre ILIKE '%joindre%'
AND reponse_vocale IS NULL;

-- TARIFS & ABONNEMENTS
UPDATE agent_knowledge_entries SET reponse_vocale =
'On propose trois formules. L''offre Starter à vingt-neuf euros par mois pour les indépendants, l''offre Pro à soixante-neuf euros par mois pour les PME, et l''offre Enterprise sur devis pour les grandes structures. Toutes les formules incluent un essai gratuit de quatorze jours. Quelle formule vous intéresserait ?'
WHERE titre ILIKE '%tarif%' OR titre ILIKE '%prix%' OR titre ILIKE '%abonnement%'
AND reponse_vocale IS NULL;

UPDATE agent_knowledge_entries SET reponse_vocale =
'La formule Starter à vingt-neuf euros par mois inclut la facturation, la gestion de clients, les devis, et jusqu''à trois utilisateurs. C''est idéal pour les indépendants et auto-entrepreneurs. Voulez-vous plus de détails ?'
WHERE titre ILIKE '%starter%' OR titre ILIKE '%formule de base%'
AND reponse_vocale IS NULL;

UPDATE agent_knowledge_entries SET reponse_vocale =
'La formule Pro à soixante-neuf euros par mois inclut tout le Starter plus le CRM avancé, les campagnes email, les rapports détaillés et jusqu''à dix utilisateurs. C''est notre offre la plus populaire. Souhaitez-vous un essai gratuit ?'
WHERE titre ILIKE '%pro%' AND (titre ILIKE '%formule%' OR titre ILIKE '%offre%')
AND reponse_vocale IS NULL;

UPDATE agent_knowledge_entries SET reponse_vocale =
'La formule Enterprise est sur mesure et sur devis. Elle inclut toutes les fonctionnalités, un nombre illimité d''utilisateurs, un support dédié et des intégrations personnalisées. Je peux vous mettre en relation avec notre équipe commerciale si vous le souhaitez.'
WHERE titre ILIKE '%enterprise%' OR titre ILIKE '%sur mesure%'
AND reponse_vocale IS NULL;

-- MODULES & FONCTIONNALITÉS
UPDATE agent_knowledge_entries SET reponse_vocale =
'Le module de facturation vous permet de créer vos factures en quelques clics, avec gestion automatique de la TVA, suivi des paiements et relances. Tout est conforme à la réglementation française. Est-ce que ça répond à votre question ?'
WHERE titre ILIKE '%facturation%' OR titre ILIKE '%facture%'
AND reponse_vocale IS NULL;

UPDATE agent_knowledge_entries SET reponse_vocale =
'Notre CRM vous permet de gérer vos clients et prospects au même endroit. Vous avez l''historique complet des échanges, le suivi des opportunités et des rappels automatiques. C''est inclus dans toutes les formules.'
WHERE titre ILIKE '%CRM%' OR titre ILIKE '%gestion client%'
AND reponse_vocale IS NULL;

UPDATE agent_knowledge_entries SET reponse_vocale =
'Vous pouvez créer des devis professionnels en quelques minutes. Le client les reçoit par email et peut les accepter en un clic. Le devis se transforme automatiquement en facture une fois validé. Voulez-vous en savoir plus ?'
WHERE titre ILIKE '%devis%'
AND reponse_vocale IS NULL;

UPDATE agent_knowledge_entries SET reponse_vocale =
'Notre tableau de bord vous donne une vue complète de votre activité : chiffre d''affaires, factures en attente, prospects en cours, et les indicateurs clés. Tout en temps réel.'
WHERE titre ILIKE '%tableau de bord%' OR titre ILIKE '%dashboard%' OR titre ILIKE '%rapport%'
AND reponse_vocale IS NULL;

-- FAQ COURANTES
UPDATE agent_knowledge_entries SET reponse_vocale =
'Oui, vous pouvez essayer gratuitement pendant quatorze jours, sans engagement et sans carte bancaire. Vous aurez accès à toutes les fonctionnalités. Voulez-vous que je vous aide à démarrer ?'
WHERE titre ILIKE '%essai%' OR titre ILIKE '%gratuit%' OR titre ILIKE '%test%'
AND reponse_vocale IS NULL;

UPDATE agent_knowledge_entries SET reponse_vocale =
'On accepte les paiements par carte bancaire et par prélèvement SEPA. Les factures sont mensuelles, et vous pouvez résilier à tout moment sans frais. Est-ce que vous avez d''autres questions ?'
WHERE titre ILIKE '%paiement%' OR titre ILIKE '%carte%' OR titre ILIKE '%moyen de paiement%'
AND reponse_vocale IS NULL;

UPDATE agent_knowledge_entries SET reponse_vocale =
'Vous pouvez résilier votre abonnement à tout moment depuis votre espace client, sans frais et sans engagement. La résiliation prend effet à la fin de la période en cours.'
WHERE titre ILIKE '%résili%' OR titre ILIKE '%annul%' OR titre ILIKE '%desabonne%'
AND reponse_vocale IS NULL;

UPDATE agent_knowledge_entries SET reponse_vocale =
'La sécurité de vos données est notre priorité. Tout est hébergé en France, chiffré, et conforme au RGPD. On fait des sauvegardes quotidiennes et l''accès est protégé par authentification sécurisée.'
WHERE titre ILIKE '%sécurité%' OR titre ILIKE '%securite%' OR titre ILIKE '%RGPD%' OR titre ILIKE '%donnée%'
AND reponse_vocale IS NULL;

UPDATE agent_knowledge_entries SET reponse_vocale =
'Oui, TalosPrimes s''intègre facilement avec les outils que vous utilisez déjà, comme votre comptabilité, votre messagerie ou vos outils de paiement. On peut en discuter selon vos besoins.'
WHERE titre ILIKE '%intégration%' OR titre ILIKE '%integration%' OR titre ILIKE '%connecter%'
AND reponse_vocale IS NULL;

UPDATE agent_knowledge_entries SET reponse_vocale =
'Notre support est disponible par email, par chat et par téléphone, du lundi au vendredi. Les clients Pro et Enterprise bénéficient d''un support prioritaire avec un temps de réponse garanti.'
WHERE titre ILIKE '%support%' OR titre ILIKE '%aide%' OR titre ILIKE '%assistance%'
AND reponse_vocale IS NULL;

-- POLITIQUES
UPDATE agent_knowledge_entries SET reponse_vocale =
'Si la plateforme ne vous convient pas dans les trente premiers jours, on vous rembourse intégralement, sans condition. C''est notre garantie satisfait ou remboursé.'
WHERE titre ILIKE '%remboursement%' OR titre ILIKE '%garantie%'
AND reponse_vocale IS NULL;

UPDATE agent_knowledge_entries SET reponse_vocale =
'On peut vous accompagner dans la migration de vos données depuis votre ancien logiciel. Notre équipe s''occupe de tout, gratuitement, pour les formules Pro et Enterprise.'
WHERE titre ILIKE '%migration%' OR titre ILIKE '%import%' OR titre ILIKE '%transfert%donnée%'
AND reponse_vocale IS NULL;

-- Catch-all pour celles qui n'ont pas encore de réponse vocale
-- (ne rien faire, elles passeront par OpenAI)

-- 3. Vérification
SELECT titre,
  CASE WHEN reponse_vocale IS NOT NULL THEN 'OUI' ELSE 'NON' END as a_reponse_vocale,
  LEFT(reponse_vocale, 60) as apercu
FROM agent_knowledge_entries
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
ORDER BY categorie, ordre;
