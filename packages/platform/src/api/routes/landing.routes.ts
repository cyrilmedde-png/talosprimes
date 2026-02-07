import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { generateLegalContent } from '../../services/openai.service.js';

const prisma = new PrismaClient();

// Templates pour génération IA
const legalTemplates = {
  'mentions-legales': (data: Record<string, string>) => `Génère des mentions légales complètes et conformes pour une entreprise française avec les informations suivantes:
- Raison sociale: ${data.companyName}
- SIRET: ${data.siret}
- TVA: ${data.tva}
- Adresse: ${data.address}
- Email: ${data.email}
- Téléphone: ${data.phone}

Le texte doit inclure: informations légales, directeur de publication, hébergement (OVH), propriété intellectuelle, protection des données RGPD, cookies, limitation de responsabilité, droit applicable.
Format: Markdown avec titres ## et sections numérotées.`,

  'cgu': (data: Record<string, string>) => `Génère des Conditions Générales d'Utilisation (CGU) complètes pour une plateforme SaaS française nommée "${data.companyName}".
La plateforme propose: CRM multi-tenant, facturation automatisée, workflows n8n, gestion d'équipe.

Inclure: objet, accès, création de compte, services, obligations utilisateur, propriété intellectuelle, protection données RGPD, disponibilité, limitation responsabilité, suspension/résiliation, modifications CGU, droit applicable.
Format: Markdown avec titres ## et sections numérotées.`,

  'cgv': (data: Record<string, string>) => `Génère des Conditions Générales de Vente (CGV) complètes pour "${data.companyName}", plateforme SaaS B2B française.

Services: CRM, facturation, automation n8n. Paiement via Stripe. Abonnements mensuels/annuels.

Inclure: préambule, services, tarifs et paiement, durée et renouvellement, droit de rétractation, obligations vendeur/client, garanties, responsabilité, propriété données, force majeure, modifications, droit applicable.
Format: Markdown avec titres ## et sections numérotées.`,

  'confidentialite': (data: Record<string, string>) => `Génère une Politique de Confidentialité et RGPD complète pour "${data.companyName}" (${data.email}).

Plateforme SaaS multi-tenant. Hébergement: OVH. Paiement: Stripe. Base de données: Supabase PostgreSQL.

Inclure: introduction, responsable traitement, données collectées (identification, connexion, paiement, métiers), finalités, base légale, durée conservation, destinataires, transferts hors UE, sécurité (SSL, bcrypt, isolation), droits RGPD (accès, rectification, effacement, portabilité), réclamation CNIL, cookies, modifications, contact DPO.
Format: Markdown avec titres ## et sections numérotées.`,
};

// Types
interface TestimonialBody {
  nom: string;
  prenom: string;
  entreprise?: string;
  poste?: string;
  avatar?: string;
  note: number;
  commentaire: string;
  affiche?: boolean;
  ordre?: number;
}

interface ContactMessageBody {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  entreprise?: string;
  message: string;
}

export async function landingRoutes(fastify: FastifyInstance) {
  
  // ===== LANDING CONTENT (Contenu éditable) =====

  // GET /api/landing/content - Récupérer tout le contenu
  fastify.get('/api/landing/content', async (_request, reply) => {
    try {
      const content = await prisma.landingContent.findMany({
        orderBy: { section: 'asc' }
      });
      
      // Transformer en objet clé-valeur pour faciliter l'accès
      const contentMap = content.reduce((acc, item) => {
        acc[item.section] = item.contenu;
        return acc;
      }, {} as Record<string, string>);

      return reply.send(contentMap);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération du contenu' });
    }
  });

  // PUT /api/landing/content/:section - Mettre à jour une section (ADMIN)
  fastify.put<{ Params: { section: string }; Body: { contenu: string } }>(
    '/api/landing/content/:section',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (request, reply) => {
      const { section } = request.params;
      const { contenu } = request.body;

      try {
        const updated = await prisma.landingContent.upsert({
          where: { section },
          update: { contenu },
          create: { section, contenu },
        });

        return reply.send(updated);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Erreur lors de la mise à jour du contenu' });
      }
    }
  );

  // ===== TESTIMONIALS (Avis clients) =====

  // GET /api/landing/testimonials - Récupérer les testimonials affichés
  fastify.get('/api/landing/testimonials', async (_request, reply) => {
    try {
      const testimonials = await prisma.testimonial.findMany({
        where: { affiche: true },
        orderBy: { ordre: 'asc' }
      });
      return reply.send(testimonials);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération des témoignages' });
    }
  });

  // GET /api/landing/testimonials/all - Récupérer tous les testimonials (ADMIN)
  fastify.get(
    '/api/landing/testimonials/all',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (_request, reply) => {
      try {
        const testimonials = await prisma.testimonial.findMany({
          orderBy: { ordre: 'asc' }
        });
        return reply.send(testimonials);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Erreur lors de la récupération des témoignages' });
      }
    }
  );

  // POST /api/landing/testimonials - Créer un testimonial (ADMIN)
  fastify.post<{ Body: TestimonialBody }>(
    '/api/landing/testimonials',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (request, reply) => {
      const { nom, prenom, entreprise, poste, avatar, note, commentaire, affiche, ordre } = request.body;

      try {
        const testimonial = await prisma.testimonial.create({
          data: {
            nom,
            prenom,
            entreprise,
            poste,
            avatar,
            note: note || 5,
            commentaire,
            affiche: affiche ?? true,
            ordre: ordre || 0,
          },
        });

        return reply.status(201).send(testimonial);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Erreur lors de la création du témoignage' });
      }
    }
  );

  // PUT /api/landing/testimonials/:id - Modifier un testimonial (ADMIN)
  fastify.put<{ Params: { id: string }; Body: Partial<TestimonialBody> }>(
    '/api/landing/testimonials/:id',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { nom, prenom, entreprise, poste, avatar, note, commentaire, affiche, ordre } = request.body;

      try {
        const testimonial = await prisma.testimonial.update({
          where: { id },
          data: {
            nom,
            prenom,
            entreprise,
            poste,
            avatar,
            note,
            commentaire,
            affiche,
            ordre,
          },
        });

        return reply.send(testimonial);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Erreur lors de la mise à jour du témoignage' });
      }
    }
  );

  // DELETE /api/landing/testimonials/:id - Supprimer un testimonial (ADMIN)
  fastify.delete<{ Params: { id: string } }>(
    '/api/landing/testimonials/:id',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        await prisma.testimonial.delete({ where: { id } });
        return reply.send({ success: true, message: 'Témoignage supprimé' });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Erreur lors de la suppression du témoignage' });
      }
    }
  );

  // ===== CONTACT MESSAGES =====

  // POST /api/landing/contact - Envoyer un message de contact (PUBLIC)
  fastify.post<{ Body: ContactMessageBody }>(
    '/api/landing/contact',
    async (request, reply) => {
      const { nom, prenom, email, telephone, entreprise, message } = request.body;

      // Validation basique
      if (!nom || !prenom || !email || !message) {
        return reply.status(400).send({ error: 'Les champs nom, prénom, email et message sont requis' });
      }

      try {
        await prisma.contactMessage.create({
          data: {
            nom,
            prenom,
            email,
            telephone,
            entreprise,
            message,
          },
        });

        // TODO: Envoyer une notification par email à l'admin
        // TODO: Déclencher un workflow n8n pour traiter le message

        return reply.status(201).send({ 
          success: true, 
          message: 'Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.' 
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Erreur lors de l\'envoi du message' });
      }
    }
  );

  // GET /api/landing/contact - Récupérer tous les messages de contact (ADMIN)
  fastify.get(
    '/api/landing/contact',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (_request, reply) => {
      try {
        const messages = await prisma.contactMessage.findMany({
          orderBy: { createdAt: 'desc' }
        });
        return reply.send(messages);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Erreur lors de la récupération des messages' });
      }
    }
  );

  // PATCH /api/landing/contact/:id/traite - Marquer un message comme traité (ADMIN)
  fastify.patch<{ Params: { id: string } }>(
    '/api/landing/contact/:id/traite',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const message = await prisma.contactMessage.update({
          where: { id },
          data: { traite: true },
        });

        return reply.send(message);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Erreur lors de la mise à jour du message' });
      }
    }
  );

  // DELETE /api/landing/contact/:id - Supprimer un message de contact (ADMIN)
  fastify.delete<{ Params: { id: string } }>(
    '/api/landing/contact/:id',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        await prisma.contactMessage.delete({ where: { id } });
        return reply.send({ success: true, message: 'Message supprimé' });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Erreur lors de la suppression du message' });
      }
    }
  );

  // ===== GÉNÉRATION IA PAGES LÉGALES =====

  // POST /api/landing/generate-legal/:pageId - Générer contenu légal avec IA (ADMIN)
  fastify.post<{ 
    Params: { pageId: string }; 
    Body: { companyName: string; siret: string; tva: string; address: string; email: string; phone: string } 
  }>(
    '/api/landing/generate-legal/:pageId',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (request, reply) => {
      const { pageId } = request.params;
      const companyData = request.body;

      // Vérifier que le pageId est valide
      if (!legalTemplates[pageId as keyof typeof legalTemplates]) {
        return reply.status(400).send({ error: 'Page légale invalide' });
      }

      try {
        fastify.log.info(`Génération IA pour ${pageId} - Entreprise: ${companyData.companyName}`);

        // Générer le contenu avec OpenAI
        const generatedContent = await generateLegalContent({
          pageType: pageId as 'mentions-legales' | 'cgu' | 'cgv' | 'confidentialite',
          companyName: companyData.companyName,
          siret: companyData.siret,
          tva: companyData.tva,
          address: companyData.address,
          email: companyData.email,
          phone: companyData.phone,
        });

        fastify.log.info(`Contenu généré avec succès pour ${pageId}`);

        return reply.send({ 
          success: true, 
          content: generatedContent,
          message: 'Contenu généré avec IA avec succès' 
        });
      } catch (error) {
        fastify.log.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la génération du contenu';
        return reply.status(500).send({ error: errorMessage });
      }
    }
  );
}
