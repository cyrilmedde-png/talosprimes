import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../config/database.js';
import { z } from 'zod';
import type { StatutJuridique } from '@talosprimes/shared';

// Schéma de validation pour la mise à jour du tenant
const updateTenantSchema = z.object({
  nomEntreprise: z.string().min(1).optional(),
  siret: z.string().optional().nullable(),
  siren: z.string().optional().nullable(),
  codeAPE: z.string().optional().nullable(),
  codeNAF: z.string().optional().nullable(),
  statutJuridique: z.enum([
    'SA', 'SARL', 'SAS', 'SASU', 'SCI', 'SNC', 'SCS', 'SCA',
    'EURL', 'SCP', 'SEL', 'SELARL', 'SELAS', 'SELAFA',
    'AUTO_ENTREPRENEUR', 'EIRL', 'ENTREPRISE_INDIVIDUELLE'
  ]).optional().nullable(),
  adressePostale: z.string().optional().nullable(),
  codePostal: z.string().optional().nullable(),
  ville: z.string().optional().nullable(),
  pays: z.string().optional(),
  telephone: z.string().optional().nullable(),
  emailContact: z.string().email().optional(),
  metier: z.string().optional(),
});

export async function tenantRoutes(fastify: FastifyInstance) {
  // Obtenir le profil de l'entreprise (nécessite authentification)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;

      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          error: 'Non authentifié',
        });
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          nomEntreprise: true,
          siret: true,
          siren: true,
          codeAPE: true,
          codeNAF: true,
          statutJuridique: true,
          adressePostale: true,
          codePostal: true,
          ville: true,
          pays: true,
          telephone: true,
          emailContact: true,
          devise: true,
          langue: true,
          metier: true,
          statut: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!tenant) {
        return reply.status(404).send({
          success: false,
          error: 'Entreprise non trouvée',
        });
      }

      return reply.send({
        success: true,
        data: { tenant },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération du profil',
      });
    }
  });

  // Mettre à jour le profil de l'entreprise (nécessite authentification admin)
  fastify.put('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;

      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          error: 'Non authentifié',
        });
      }

      // Vérifier que l'utilisateur est admin ou super_admin
      if (request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({
          success: false,
          error: 'Accès refusé',
        });
      }

      // Valider les données
      const validationResult = updateTenantSchema.safeParse(request.body);
      
      if (!validationResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Données invalides',
          details: validationResult.error.errors,
        });
      }

      const data = validationResult.data;

      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          nomEntreprise: data.nomEntreprise,
          siret: data.siret ?? undefined,
          siren: data.siren ?? undefined,
          codeAPE: data.codeAPE ?? undefined,
          codeNAF: data.codeNAF ?? undefined,
          statutJuridique: data.statutJuridique ?? undefined,
          adressePostale: data.adressePostale ?? undefined,
          codePostal: data.codePostal ?? undefined,
          ville: data.ville ?? undefined,
          pays: data.pays,
          telephone: data.telephone ?? undefined,
          emailContact: data.emailContact,
          metier: data.metier,
        },
        select: {
          id: true,
          nomEntreprise: true,
          siret: true,
          siren: true,
          codeAPE: true,
          codeNAF: true,
          statutJuridique: true,
          adressePostale: true,
          codePostal: true,
          ville: true,
          pays: true,
          telephone: true,
          emailContact: true,
          devise: true,
          langue: true,
          metier: true,
          statut: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return reply.send({
        success: true,
        message: 'Profil entreprise mis à jour',
        data: { tenant },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Erreur lors de la mise à jour du profil',
      });
    }
  });
}

