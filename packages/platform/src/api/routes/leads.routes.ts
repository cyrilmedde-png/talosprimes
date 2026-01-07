import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../config/database.js';
import { z } from 'zod';

// Schéma de validation pour la création d'un lead
const createLeadSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  email: z.string().email('Format d\'email invalide'),
  telephone: z.string().min(1, 'Le téléphone est requis'),
  source: z.string().optional().default('formulaire_inscription'),
  notes: z.string().optional(),
});

export async function leadsRoutes(fastify: FastifyInstance) {
  // Créer un lead (public, pas besoin d'authentification)
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Valider les données
      const validationResult = createLeadSchema.safeParse(request.body);
      
      if (!validationResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Données invalides',
          details: validationResult.error.errors,
        });
      }

      const data = validationResult.data;

      // Vérifier si le lead existe déjà (par email)
      const existingLead = await prisma.lead.findUnique({
        where: { email: data.email },
      });

      if (existingLead) {
        // Mettre à jour le lead existant
        const updatedLead = await prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            nom: data.nom,
            prenom: data.prenom,
            telephone: data.telephone,
            source: data.source,
            notes: data.notes || existingLead.notes,
            updatedAt: new Date(),
          },
        });

        return reply.status(200).send({
          success: true,
          message: 'Lead mis à jour',
          data: {
            lead: {
              id: updatedLead.id,
              nom: updatedLead.nom,
              prenom: updatedLead.prenom,
              email: updatedLead.email,
              telephone: updatedLead.telephone,
              statut: updatedLead.statut,
              createdAt: updatedLead.createdAt.toISOString(),
            },
          },
        });
      }

      // Créer un nouveau lead
      const lead = await prisma.lead.create({
        data: {
          nom: data.nom,
          prenom: data.prenom,
          email: data.email,
          telephone: data.telephone,
          source: data.source,
          notes: data.notes,
          statut: 'nouveau',
        },
      });

      return reply.status(201).send({
        success: true,
        message: 'Lead créé avec succès',
        data: {
          lead: {
            id: lead.id,
            nom: lead.nom,
            prenom: lead.prenom,
            email: lead.email,
            telephone: lead.telephone,
            statut: lead.statut,
            createdAt: lead.createdAt.toISOString(),
          },
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erreur lors de la création du lead',
      });
    }
  });

  // Lister les leads (nécessite authentification admin)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { user?: { role: string } }, reply: FastifyReply) => {
    try {
      // Vérifier que l'utilisateur est admin ou super_admin
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({
          success: false,
          error: 'Accès refusé',
        });
      }

      const query = request.query as { source?: string; statut?: string; limit?: string };
      const { source, statut, limit } = query;
      
      const where: Record<string, unknown> = {};
      if (source) {
        where.source = source;
      }
      if (statut) {
        where.statut = statut;
      }

      const leads = await prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit, 10) : 100,
      });

      return reply.send({
        success: true,
        data: {
          leads: leads.map((lead) => ({
            id: lead.id,
            nom: lead.nom,
            prenom: lead.prenom,
            email: lead.email,
            telephone: lead.telephone,
            statut: lead.statut,
            source: lead.source,
            createdAt: lead.createdAt.toISOString(),
            updatedAt: lead.updatedAt.toISOString(),
          })),
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération des leads',
      });
    }
  });

  // Obtenir un lead par ID (nécessite authentification admin)
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { user?: { role: string } }, reply: FastifyReply) => {
    try {
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({
          success: false,
          error: 'Accès refusé',
        });
      }

      const params = request.params as { id: string };
      const lead = await prisma.lead.findUnique({
        where: { id: params.id },
      });

      if (!lead) {
        return reply.status(404).send({
          success: false,
          error: 'Lead non trouvé',
        });
      }

      return reply.send({
        success: true,
        data: { lead },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération du lead',
      });
    }
  });

  // Mettre à jour le statut d'un lead (nécessite authentification admin)
  fastify.patch('/:id/statut', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { user?: { role: string } }, reply: FastifyReply) => {
    try {
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({
          success: false,
          error: 'Accès refusé',
        });
      }

      const params = request.params as { id: string };
      const body = request.body as { statut: 'nouveau' | 'contacte' | 'converti' | 'abandonne' };
      const { statut } = body;

      const lead = await prisma.lead.update({
        where: { id: params.id },
        data: { 
          statut,
          dateContact: statut === 'contacte' ? new Date() : undefined,
        },
      });

      return reply.send({
        success: true,
        message: 'Statut mis à jour',
        data: { lead },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erreur lors de la mise à jour du statut',
      });
    }
  });
}

