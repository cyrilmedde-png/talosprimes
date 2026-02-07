import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
      preHandler: [fastify.authenticate as any, fastify.requireRole(['super_admin', 'admin'] as any)],
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
      preHandler: [fastify.authenticate as any, fastify.requireRole(['super_admin', 'admin'] as any)],
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
      preHandler: [fastify.authenticate as any, fastify.requireRole(['super_admin', 'admin'] as any)],
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
      preHandler: [fastify.authenticate as any, fastify.requireRole(['super_admin', 'admin'] as any)],
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
      preHandler: [fastify.authenticate as any, fastify.requireRole(['super_admin', 'admin'] as any)],
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
      preHandler: [fastify.authenticate as any, fastify.requireRole(['super_admin', 'admin'] as any)],
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
      preHandler: [fastify.authenticate as any, fastify.requireRole(['super_admin', 'admin'] as any)],
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
      preHandler: [fastify.authenticate as any, fastify.requireRole(['super_admin', 'admin'] as any)],
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
}
