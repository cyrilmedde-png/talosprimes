import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { eventService } from '../../services/event.service.js';
import { n8nService } from '../../services/n8n.service.js';
import { z } from 'zod';

type LeadRow = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  statut: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
};

function getN8nSecretHeader(request: FastifyRequest): string | undefined {
  const header = request.headers['x-talosprimes-n8n-secret'];
  return typeof header === 'string' ? header : undefined;
}

function isN8nInternalRequest(request: FastifyRequest): boolean {
  const secret = env.N8N_WEBHOOK_SECRET;
  if (!secret) return false;
  const provided = getN8nSecretHeader(request);
  return Boolean(provided && provided === secret);
}

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
  // Créer un lead (ADMIN via plateforme) → déclenche un workflow n8n
  fastify.post('/', {
    preHandler: [
      async (request: FastifyRequest, reply: FastifyReply) => {
        // Si l'appel vient de n8n (secret), on ne demande pas de JWT
        if (isN8nInternalRequest(request)) return;
        await fastify.authenticate(request, reply);
      },
    ],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = isN8nInternalRequest(request);
      // Vérifier droits si pas n8n
      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

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
      const tenantId = request.tenantId as string | undefined;

      // Si on délègue les écritures à n8n (full no‑code)
      // IMPORTANT: si l'appel vient déjà de n8n, ne pas redéléguer (évite boucle)
      if (!fromN8n && tenantId && env.USE_N8N_COMMANDS) {
        const res = await n8nService.callWorkflowReturn<{ lead: unknown }>(
          tenantId,
          'lead_create',
          {
            ...data,
          }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
        }
        return reply.status(201).send({
          success: true,
          message: 'Lead créé via n8n',
          data: { lead: res.data },
        });
      }

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

        // Déclencher n8n (lead mis à jour par admin) - pas si l'appel vient de n8n
        if (!fromN8n && tenantId) {
          await eventService.emit(
            tenantId,
            'lead_updated',
            'lead',
            updatedLead.id,
            {
              id: updatedLead.id,
              email: updatedLead.email,
              nom: updatedLead.nom,
              prenom: updatedLead.prenom,
              telephone: updatedLead.telephone,
              statut: updatedLead.statut,
              source: updatedLead.source,
              updatedAt: updatedLead.updatedAt,
            }
          );
        }

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

      // Déclencher n8n (lead créé par admin) - pas si l'appel vient de n8n
      if (!fromN8n && tenantId) {
        await eventService.emit(
          tenantId,
          'lead_created',
          'lead',
          lead.id,
          {
            id: lead.id,
            email: lead.email,
            nom: lead.nom,
            prenom: lead.prenom,
            telephone: lead.telephone,
            statut: lead.statut,
            source: lead.source,
            createdAt: lead.createdAt,
          }
        );
      }

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
    preHandler: [
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (isN8nInternalRequest(request)) return;
        await fastify.authenticate(request, reply);
      },
    ],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = isN8nInternalRequest(request);
      // Vérifier que l'utilisateur est admin ou super_admin
      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({
          success: false,
          error: 'Accès refusé',
        });
      }

      const query = request.query as { source?: string; statut?: string; limit?: string };
      const { source, statut, limit } = query;
      
      // Si on utilise n8n pour les vues, déléguer au workflow
      // Déléguer à n8n seulement si ce n'est pas déjà n8n (évite boucle)
      if (!fromN8n && request.tenantId && env.USE_N8N_VIEWS) {
        const result = await n8nService.callWorkflowReturn<{ leads: unknown[] }>(
          request.tenantId,
          'leads_list',
          { source, statut, limit: limit ?? '100' }
        );
        if (!result.success) {
          return reply.status(502).send({ success: false, error: result.error || 'Erreur n8n' });
        }
        return reply.send({ success: true, data: { leads: result.data?.leads ?? [] } });
      }
      
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
          leads: (leads as unknown as LeadRow[]).map((lead: LeadRow) => ({
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
    preHandler: [
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (isN8nInternalRequest(request)) return;
        await fastify.authenticate(request, reply);
      },
    ],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = isN8nInternalRequest(request);
      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({
          success: false,
          error: 'Accès refusé',
        });
      }

      const params = request.params as { id: string };

      // Déléguer à n8n si activé
      // Déléguer à n8n seulement si ce n'est pas déjà n8n (évite boucle)
      if (!fromN8n && request.tenantId && env.USE_N8N_VIEWS) {
        const result = await n8nService.callWorkflowReturn<{ lead: unknown }>(
          request.tenantId,
          'lead_get',
          { id: params.id }
        );
        if (!result.success) {
          return reply.status(502).send({ success: false, error: result.error || 'Erreur n8n' });
        }
        if (!result.data?.lead) {
          return reply.status(404).send({ success: false, error: 'Lead non trouvé' });
        }
        return reply.send({ success: true, data: { lead: result.data.lead } });
      }

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
    preHandler: [
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (isN8nInternalRequest(request)) return;
        await fastify.authenticate(request, reply);
      },
    ],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = isN8nInternalRequest(request);
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        if (!fromN8n) {
          return reply.status(403).send({ success: false, error: 'Accès refusé' });
        }
      }

      const params = request.params as { id: string };
      const body = request.body as { statut: 'nouveau' | 'contacte' | 'converti' | 'abandonne' };
      const { statut } = body;

      // Délégation éventuelle à n8n (full no‑code) - pas si appel venant de n8n
      if (!fromN8n && request.tenantId && env.USE_N8N_COMMANDS) {
        const res = await n8nService.callWorkflowReturn<{ lead: unknown }>(
          request.tenantId,
          'lead_update_status',
          { id: params.id, statut }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
        }
        return reply.send({
          success: true,
          message: 'Statut mis à jour (n8n)',
          data: { lead: res.data },
        });
      }

      const lead = await prisma.lead.update({
        where: { id: params.id },
        data: { 
          statut,
          dateContact: statut === 'contacte' ? new Date() : undefined,
        },
      });

      // Déclencher n8n (changement de statut) - pas si appel venant de n8n
      if (!fromN8n && request.tenantId) {
        await eventService.emit(
          request.tenantId,
          'lead_status_updated',
          'lead',
          lead.id,
          { id: lead.id, statut: lead.statut, dateContact: lead.dateContact }
        );
      }

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

  // Supprimer un lead (nécessite authentification admin)
  fastify.delete('/:id', {
    preHandler: [
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (isN8nInternalRequest(request)) return;
        await fastify.authenticate(request, reply);
      },
    ],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = isN8nInternalRequest(request);
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        if (!fromN8n) {
          return reply.status(403).send({ success: false, error: 'Accès refusé' });
        }
      }

      const params = request.params as { id: string };

      // Si on délègue les écritures à n8n (full no‑code) - pas si appel venant de n8n
      if (!fromN8n && request.tenantId && env.USE_N8N_COMMANDS) {
        const res = await n8nService.callWorkflowReturn(
          request.tenantId,
          'lead_delete',
          { id: params.id }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
        }
        return reply.send({
          success: true,
          message: 'Lead supprimé (n8n)',
        });
      }

      // Fallback local si non délégué à n8n
      const lead = await prisma.lead.findUnique({
        where: { id: params.id },
      });

      if (!lead) {
        return reply.status(404).send({
          success: false,
          error: 'Lead non trouvé',
        });
      }

      await prisma.lead.delete({
        where: { id: params.id },
      });

      // Émettre l'événement de suppression - pas si appel venant de n8n
      if (!fromN8n && request.tenantId) {
        await eventService.emit(
          request.tenantId,
          'lead_deleted',
          'lead',
          params.id,
          { id: params.id, email: lead.email }
        );
      }

      return reply.send({
        success: true,
        message: 'Lead supprimé avec succès',
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erreur lors de la suppression du lead',
      });
    }
  });

  // Envoyer le questionnaire au lead
  fastify.post('/:id/questionnaire', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

      const params = request.params as { id: string };
      const tenantId = request.tenantId as string | undefined;

      if (!tenantId) {
        return reply.status(400).send({ success: false, error: 'Tenant ID manquant' });
      }

      // Vérifier que le lead existe
      const lead = await prisma.lead.findUnique({
        where: { id: params.id },
      });

      if (!lead) {
        return reply.status(404).send({ success: false, error: 'Lead non trouvé' });
      }

      // Déclencher le workflow n8n
      const res = await n8nService.callWorkflowReturn<{ success: boolean; message: string }>(
        tenantId,
        'lead_questionnaire',
        { id: params.id }
      );

      if (!res.success) {
        return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
      }

      return reply.send({
        success: true,
        message: 'Questionnaire envoyé avec succès',
        data: res.data,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erreur lors de l\'envoi du questionnaire',
      });
    }
  });

  // Planifier un entretien avec le lead
  fastify.post('/:id/entretien', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

      const params = request.params as { id: string };
      const tenantId = request.tenantId as string | undefined;
      const body = request.body as { dateEntretien?: string; heureEntretien?: string; typeEntretien?: string };

      if (!tenantId) {
        return reply.status(400).send({ success: false, error: 'Tenant ID manquant' });
      }

      // Vérifier que le lead existe
      const lead = await prisma.lead.findUnique({
        where: { id: params.id },
      });

      if (!lead) {
        return reply.status(404).send({ success: false, error: 'Lead non trouvé' });
      }

      // Déclencher le workflow n8n
      const res = await n8nService.callWorkflowReturn<{ success: boolean; message: string }>(
        tenantId,
        'lead_entretien',
        {
          id: params.id,
          dateEntretien: body.dateEntretien,
          heureEntretien: body.heureEntretien,
          typeEntretien: body.typeEntretien || 'téléphonique',
        }
      );

      if (!res.success) {
        return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
      }

      return reply.send({
        success: true,
        message: 'Email d\'entretien envoyé avec succès',
        data: res.data,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erreur lors de l\'envoi de l\'email d\'entretien',
      });
    }
  });

  // Confirmer la conversion du lead
  fastify.post('/:id/confirmation', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

      const params = request.params as { id: string };
      const tenantId = request.tenantId as string | undefined;

      if (!tenantId) {
        return reply.status(400).send({ success: false, error: 'Tenant ID manquant' });
      }

      // Vérifier que le lead existe
      const lead = await prisma.lead.findUnique({
        where: { id: params.id },
      });

      if (!lead) {
        return reply.status(404).send({ success: false, error: 'Lead non trouvé' });
      }

      // Déclencher le workflow n8n
      const res = await n8nService.callWorkflowReturn<{ success: boolean; message: string }>(
        tenantId,
        'lead_confirmation',
        { id: params.id }
      );

      if (!res.success) {
        return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
      }

      return reply.send({
        success: true,
        message: 'Confirmation envoyée avec succès, lead converti',
        data: res.data,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erreur lors de la confirmation',
      });
    }
  });
}

