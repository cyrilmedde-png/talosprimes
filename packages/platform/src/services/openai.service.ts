import { env } from '../config/env.js';

interface GenerateLegalContentParams {
  pageType: 'mentions-legales' | 'cgu' | 'cgv' | 'confidentialite';
  companyName: string;
  siret: string;
  tva: string;
  address: string;
  email: string;
  phone: string;
}

/**
 * Génère du contenu légal avec OpenAI
 */
export async function generateLegalContent(params: GenerateLegalContentParams): Promise<string> {
  const { pageType, companyName, siret, tva, address, email, phone } = params;

  // Vérifier si OpenAI est configuré
  if (!env.OPENAI_API_KEY) {
    throw new Error('❌ OPENAI_API_KEY non configurée. Ajoutez OPENAI_API_KEY="sk-..." dans /var/www/talosprimes/packages/platform/.env puis redémarrez avec: pm2 restart platform');
  }

  console.log('🤖 Génération IA démarrée pour:', pageType);

  // Prompts spécifiques par type de page
  const prompts: Record<string, string> = {
    'mentions-legales': `Tu es un expert juridique français. Génère des mentions légales complètes et conformes à la législation française pour une plateforme SaaS B2B.

Informations de l'entreprise:
- Raison sociale: ${companyName}
- SIRET: ${siret}
- TVA intracommunautaire: ${tva}
- Siège social: ${address}
- Email: ${email}
- Téléphone: ${phone}
- Hébergeur: OVH, 2 rue Kellermann, 59100 Roubaix

Le document doit inclure:
1. Informations légales (raison sociale, forme juridique, capital, SIRET, TVA, siège, contact)
2. Directeur de publication
3. Hébergement (détails OVH)
4. Propriété intellectuelle
5. Protection des données personnelles (RGPD)
6. Cookies
7. Limitation de responsabilité
8. Droit applicable et juridiction
9. Contact

Format: Markdown avec titres ## et numérotation. Ton professionnel et précis. Dernière mise à jour: ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.`,

    'cgu': `Tu es un expert juridique français. Génère des Conditions Générales d'Utilisation (CGU) complètes pour "${companyName}", une plateforme SaaS B2B de gestion d'entreprise.

Services proposés:
- CRM multi-tenant
- Facturation automatisée avec Stripe
- Workflows d'automatisation n8n
- Gestion d'équipe et utilisateurs
- Modules métiers personnalisables

Contact: ${email}, ${phone}
Adresse: ${address}

Le document doit inclure:
1. Objet des CGU
2. Accès à la plateforme
3. Création de compte
4. Services proposés (détailler chaque service)
5. Obligations de l'utilisateur
6. Propriété intellectuelle
7. Protection des données (RGPD)
8. Disponibilité du service
9. Limitation de responsabilité
10. Suspension et résiliation
11. Modifications des CGU
12. Droit applicable et juridiction
13. Contact

Format: Markdown avec titres ## et numérotation. Ton juridique français professionnel.`,

    'cgv': `Tu es un expert juridique français. Génère des Conditions Générales de Vente (CGV) complètes pour "${companyName}", plateforme SaaS B2B française.

Services: CRM, facturation automatisée, automation n8n, gestion d'équipe.
Paiement: Stripe (carte bancaire, prélèvement SEPA)
Abonnements: Mensuels et annuels
Contact: ${email}, ${phone}
Siège: ${address}
SIRET: ${siret}

Le document doit inclure:
1. Préambule
2. Services proposés (détaillés)
3. Tarifs et paiement (modalités, facturation, retard)
4. Durée et renouvellement (mensuel/annuel, résiliation)
5. Droit de rétractation
6. Obligations du vendeur (disponibilité 99.5%, sauvegardes, sécurité, RGPD)
7. Obligations du client
8. Garanties et responsabilité
9. Propriété des données (client propriétaire, export, suppression après 30j)
10. Force majeure
11. Modifications des CGV
12. Droit applicable et juridiction (tribunaux de Paris)
13. Contact

Format: Markdown avec titres ## et numérotation. Conforme au droit français B2B.`,

    'confidentialite': `Tu es un expert RGPD et protection des données. Génère une Politique de Confidentialité complète et conforme RGPD pour "${companyName}" (${email}).

Contexte technique:
- Plateforme SaaS multi-tenant B2B
- Hébergement: OVH France
- Base de données: Supabase PostgreSQL
- Paiement: Stripe
- Sécurité: SSL/TLS, bcrypt, isolation multi-tenant, RBAC

Contact DPO: ${email}
Adresse: ${address}

Le document doit inclure:
1. Introduction (engagement RGPD et Informatique & Libertés)
2. Responsable du traitement (${companyName}, ${address}, ${email})
3. Données collectées (identification, connexion, paiement, métiers/CRM)
4. Finalités du traitement
5. Base légale (contrat, intérêt légitime, consentement, obligation légale)
6. Durée de conservation (compte: contrat+1an, facturation: 10ans, métiers: contrat+30j, logs: 1an)
7. Destinataires (personnel, OVH, Stripe, Supabase, autorités)
8. Transferts hors UE (garanties clauses contractuelles)
9. Sécurité (SSL, bcrypt, sauvegardes, RBAC, monitoring)
10. Droits RGPD (accès, rectification, effacement, limitation, portabilité, opposition, retrait consentement)
11. Exercice des droits (contact: ${email}, délai 1 mois)
12. Réclamation CNIL (coordonnées complètes)
13. Cookies (essentiels, performance, fonctionnels)
14. Modifications de la politique
15. Contact

Format: Markdown avec titres ## et numérotation. Très détaillé et conforme RGPD/CNIL.`,
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert juridique français spécialisé en droit des sociétés, RGPD et droit du numérique. Tu génères des documents juridiques professionnels, précis et conformes à la législation française.',
          },
          {
            role: 'user',
            content: prompts[pageType],
          },
        ],
        temperature: 0.3, // Plus déterministe pour contenu juridique
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json() as { error?: { message?: string } };
      throw new Error(`Erreur OpenAI: ${errorData.error?.message || 'Erreur inconnue'}`);
    }

    const data = await response.json() as { 
      choices?: Array<{ message?: { content?: string } }> 
    };
    const generatedContent = data.choices?.[0]?.message?.content || '';

    if (!generatedContent) {
      throw new Error('Aucun contenu généré');
    }

    return generatedContent;
  } catch (error) {
    console.error('❌ Erreur génération OpenAI:', error);
    
    // Message d'erreur détaillé
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        throw new Error('Clé API OpenAI non configurée. Vérifiez votre fichier .env');
      }
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw new Error('Clé API OpenAI invalide. Vérifiez que votre clé commence par "sk-" et est correcte');
      }
      if (error.message.includes('429') || error.message.includes('quota')) {
        throw new Error('Quota OpenAI dépassé. Vérifiez votre compte OpenAI ou attendez un peu');
      }
      if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error('Erreur de connexion à OpenAI. Vérifiez votre connexion internet');
      }
    }
    
    throw error;
  }
}
