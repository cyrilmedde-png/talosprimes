import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';

async function logEvent(tenantId: string, typeEvenement: string, entiteType: string, entiteId: string, payload: Record<string, unknown>, statut: 'succes' | 'erreur' = 'succes', messageErreur?: string) {
  try {
    await prisma.eventLog.create({
      data: {
        tenantId,
        typeEvenement,
        entiteType,
        entiteId,
        payload: payload as any,
        workflowN8nDeclenche: true,
        workflowN8nId: typeEvenement,
        statutExecution: statut,
        messageErreur: messageErreur || null,
      },
    });
    // Notification uniquement en cas d'erreur
    if (statut === 'erreur') {
      await prisma.notification.create({
        data: {
          tenantId,
          type: `${typeEvenement}_erreur`,
          titre: `Erreur: ${typeEvenement}`,
          message: messageErreur || `Erreur lors de ${typeEvenement}`,
          donnees: { entiteType, entiteId, typeEvenement } as any,
        },
      });
    }
  } catch (e) {
    console.error('[logEvent] Erreur logging:', e);
  }
}

const lineSchema = z.object({
  codeArticle: z.string().optional().nullable(),
  designation: z.string().min(1),
  quantite: z.number().int().positive().default(1),
  prixUnitaireHt: z.number().positive(),
});

const createSchema = z.object({
  clientFinalId: z.string().uuid(),
  montantHt: z.number().positive(),
  tvaTaux: z.number().min(0).max(100).default(20),
  dateBdc: z.string().optional().nullable(),
  dateValidite: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  modePaiement: z.string().optional().nullable(),
  lines: z.array(lineSchema).optional(),
});

const paramsSchema = z.object({ id: z.string().uuid() });

export async function bonsCommandeRoutes(fastify: FastifyInstance) {
  // GET /api/bons-commande - Liste
  fastify.get('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      const query = request.query as { page?: string; limit?: string; statut?: string; clientFinalId?: string };
      const page = query.page ? parseInt(query.page, 10) : 1;
      const limit = query.limit ? parseInt(query.limit, 10) : 20;

      // Appel frontend → tout passe par n8n, pas de fallback BDD
      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<{ bons: unknown[]; count: number; total: number; totalPages: number }>(
          tenantId,
          'bdc_list',
          {
            page,
            limit,
            statut: query.statut,
            clientFinalId: query.clientFinalId,
          }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n — workflow bdc_list indisponible' });
        }
        const raw = res.data as { bons?: unknown[]; count?: number; total?: number; page?: number; limit?: number; totalPages?: number };
        const bons = Array.isArray(raw.bons) ? raw.bons : [];
        return reply.status(200).send({
          success: true,
          data: {
            bons,
            count: bons.length,
            total: raw.total ?? bons.length,
            page: raw.page ?? 1,
            limit: raw.limit ?? 20,
            totalPages: raw.totalPages ?? 1,
          },
        });
      }

      // Appel depuis n8n (callback) → lecture BDD directe
      const skip = (page - 1) * limit;
      const where: Record<string, unknown> = { tenantId };
      if (query.statut) where.statut = query.statut as 'brouillon' | 'valide' | 'facture' | 'annule';
      if (query.clientFinalId) where.clientFinalId = query.clientFinalId;

      const [bons, total] = await Promise.all([
        prisma.bonCommande.findMany({
          where,
          skip,
          take: limit,
          include: {
            clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } },
            lines: { orderBy: { ordre: 'asc' } },
          },
          orderBy: { dateBdc: 'desc' },
        }),
        prisma.bonCommande.count({ where }),
      ]);

      return reply.status(200).send({
        success: true,
        data: { bons, count: bons.length, total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      fastify.log.error(error, 'Erreur liste bons de commande');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // GET /api/bons-commande/:id
  fastify.get('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      const params = paramsSchema.parse(request.params);

      // Appel frontend → tout passe par n8n, pas de fallback BDD
      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<{ bon: unknown }>(
          tenantId,
          'bdc_get',
          { bdcId: params.id }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n — workflow bdc_get indisponible' });
        }
        return reply.status(200).send({
          success: true,
          data: res.data,
        });
      }

      // Appel depuis n8n (callback) → lecture BDD directe
      const where: Record<string, unknown> = { id: params.id };
      if (tenantId) {
        where.tenantId = tenantId;
      }

      const bon = await prisma.bonCommande.findFirst({
        where,
        include: {
          clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true, adresse: true, telephone: true } },
          lines: { orderBy: { ordre: 'asc' } },
          invoice: { select: { id: true, numeroFacture: true, statut: true } },
        },
      });

      if (!bon) return reply.status(404).send({ success: false, error: 'Bon de commande non trouvé' });
      return reply.status(200).send({ success: true, data: { bon } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: 'Validation échouée', details: error.errors });
      }
      fastify.log.error(error, 'Erreur récupération bon de commande');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // POST /api/bons-commande - Créer
  fastify.post('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const body = createSchema.parse(request.body);

      // Récupérer tenantId : depuis le body si appel n8n, sinon depuis request (JWT)
      const tenantId = fromN8n
        ? (body as { tenantId?: string }).tenantId || request.tenantId
        : request.tenantId;

      if (!tenantId) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      // Vérifier droits si pas n8n
      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

      // Vérifier que le client existe et appartient au tenant
      const client = await prisma.clientFinal.findFirst({
        where: { id: body.clientFinalId, tenantId }
      });
      if (!client) return reply.status(404).send({ success: false, error: 'Client non trouvé' });

      // Application no-code : création passe par n8n si appel depuis frontend
      if (!fromN8n) {
        const bodyWithoutTenantId = { ...body };
        if ('tenantId' in bodyWithoutTenantId) {
          delete (bodyWithoutTenantId as { tenantId?: string }).tenantId;
        }

        const res = await n8nService.callWorkflowReturn<{ bon: unknown }>(
          tenantId,
          'bdc_create',
          { ...bodyWithoutTenantId, tenantId }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
        }

        return reply.status(201).send({
          success: true,
          message: 'Bon de commande créé via n8n',
          data: res.data,
        });
      }

      // Appel depuis n8n (callback) : persister en base
      const count = await prisma.bonCommande.count({ where: { tenantId } });
      const year = new Date().getFullYear();
      const numeroBdc = `BDC-${year}-${String(count + 1).padStart(6, '0')}`;

      const tvaTaux = body.tvaTaux ?? 20;
      const montantTtc = Number((body.montantHt * (1 + tvaTaux / 100)).toFixed(2));
      const dateBdc = body.dateBdc ? new Date(body.dateBdc) : new Date();
      const dateValidite = body.dateValidite
        ? new Date(body.dateValidite)
        : new Date(dateBdc.getTime() + 30 * 24 * 60 * 60 * 1000);

      const bon = await prisma.bonCommande.create({
        data: {
          tenantId,
          clientFinalId: body.clientFinalId,
          numeroBdc,
          dateBdc,
          dateValidite,
          montantHt: body.montantHt,
          montantTtc,
          tvaTaux,
          description: body.description,
          modePaiement: body.modePaiement,
          statut: 'brouillon',
          ...(body.lines && body.lines.length > 0 ? {
            lines: {
              create: body.lines.map((l, i) => ({
                codeArticle: l.codeArticle ?? null,
                designation: l.designation,
                quantite: l.quantite ?? 1,
                prixUnitaireHt: l.prixUnitaireHt,
                totalHt: (l.quantite ?? 1) * l.prixUnitaireHt,
                ordre: i,
              })),
            },
          } : {}),
        },
        include: {
          clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } },
          lines: true,
        },
      });

      // Log the event
      await logEvent(tenantId, 'bdc_create', 'BonCommande', bon.id, { numeroBdc: bon.numeroBdc, montantTtc: Number(bon.montantTtc) }, 'succes');

      return reply.status(201).send({
        success: true,
        message: 'Bon de commande créé',
        data: { bon },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'bdc_create', 'BonCommande', 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: 'Validation échouée', details: error.errors });
      }
      fastify.log.error(error, 'Erreur création bon de commande');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // PUT /api/bons-commande/:id/validate - Valider
  fastify.put('/:id/validate', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const params = paramsSchema.parse(request.params);

      const tenantId = request.tenantId as string;

      if (!tenantId) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      // Vérifier droits si pas n8n
      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

      // Vérifier que le bon existe et appartient au tenant
      const bon = await prisma.bonCommande.findFirst({ where: { id: params.id, tenantId } });
      if (!bon) return reply.status(404).send({ success: false, error: 'Non trouvé' });
      if (bon.statut !== 'brouillon') return reply.status(400).send({ success: false, error: 'Seul un brouillon peut être validé' });

      // Si appel depuis frontend, déléguer à n8n
      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ bon: unknown }>(
          tenantId,
          'bdc_validate',
          { bdcId: params.id }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
        }
        return reply.status(200).send({
          success: true,
          message: 'Bon validé via n8n',
          data: res.data,
        });
      }

      // Appel depuis n8n : persister en base
      const updated = await prisma.bonCommande.update({
        where: { id: params.id },
        data: { statut: 'valide' },
        include: { clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } } },
      });

      // Log the event
      await logEvent(tenantId, 'bdc_validate', 'BonCommande', updated.id, { numeroBdc: bon.numeroBdc }, 'succes');

      return reply.status(200).send({ success: true, message: 'Bon validé', data: { bon: updated } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'bdc_validate', 'BonCommande', (request.params as any)?.id || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: 'Validation échouée', details: error.errors });
      }
      fastify.log.error(error, 'Erreur validation bon de commande');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // POST /api/bons-commande/:id/convert-to-invoice - Convertir en facture
  fastify.post('/:id/convert-to-invoice', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const params = paramsSchema.parse(request.params);

      const tenantId = request.tenantId as string;

      if (!tenantId) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      // Vérifier droits si pas n8n
      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

      // Vérifier que le bon existe et appartient au tenant
      const bon = await prisma.bonCommande.findFirst({
        where: { id: params.id, tenantId },
        include: { lines: { orderBy: { ordre: 'asc' } } },
      });

      if (!bon) return reply.status(404).send({ success: false, error: 'Non trouvé' });
      if (bon.statut === 'facture') return reply.status(400).send({ success: false, error: 'Déjà converti en facture' });
      if (bon.statut === 'annule') return reply.status(400).send({ success: false, error: 'Bon annulé' });

      // Si appel depuis frontend, déléguer à n8n
      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ invoice: unknown; bon: unknown }>(
          tenantId,
          'bdc_convert_to_invoice',
          { bdcId: params.id }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
        }
        return reply.status(201).send({
          success: true,
          message: 'Facture créée via n8n',
          data: res.data,
        });
      }

      // Appel depuis n8n (callback) : créer la facture et mettre à jour le bon
      const invoiceCount = await prisma.invoice.count({ where: { tenantId } });
      const year = new Date().getFullYear();
      const numeroFacture = `INV-${year}-${String(invoiceCount + 1).padStart(6, '0')}`;

      const invoice = await prisma.invoice.create({
        data: {
          tenantId,
          type: 'facture_client_final',
          clientFinalId: bon.clientFinalId,
          numeroFacture,
          dateFacture: new Date(),
          dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          montantHt: bon.montantHt,
          montantTtc: bon.montantTtc,
          tvaTaux: bon.tvaTaux,
          description: bon.description ? `BDC ${bon.numeroBdc} - ${bon.description}` : `Depuis BDC ${bon.numeroBdc}`,
          modePaiement: bon.modePaiement,
          statut: 'brouillon',
          ...(bon.lines.length > 0 ? {
            lines: {
              create: bon.lines.map((l: any, i: number) => ({
                codeArticle: l.codeArticle,
                designation: l.designation,
                quantite: l.quantite,
                prixUnitaireHt: l.prixUnitaireHt,
                totalHt: l.totalHt,
                ordre: i,
              })),
            },
          } : {}),
        },
        include: {
          clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } },
          lines: true,
        },
      });

      // Mettre à jour le bon
      const updatedBon = await prisma.bonCommande.update({
        where: { id: params.id },
        data: { statut: 'facture', invoiceId: invoice.id },
        include: {
          clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } },
        },
      });

      // Log the event
      await logEvent(tenantId, 'bdc_convert_to_invoice', 'BonCommande', bon.id, { numeroBdc: bon.numeroBdc, numeroFacture }, 'succes');

      return reply.status(201).send({
        success: true,
        message: `Facture ${numeroFacture} créée depuis ${bon.numeroBdc}`,
        data: { invoice, bon: updatedBon },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'bdc_convert_to_invoice', 'BonCommande', (request.params as any)?.id || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: 'Validation échouée', details: error.errors });
      }
      fastify.log.error(error, 'Erreur conversion bon → facture');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // DELETE /api/bons-commande/:id
  fastify.delete('/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const params = paramsSchema.parse(request.params);

      const tenantId = request.tenantId as string;

      if (!tenantId) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      // Vérifier droits si pas n8n
      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

      // Vérifier que le bon existe et appartient au tenant
      const bon = await prisma.bonCommande.findFirst({ where: { id: params.id, tenantId } });
      if (!bon) return reply.status(404).send({ success: false, error: 'Non trouvé' });
      if (bon.statut === 'facture') return reply.status(400).send({ success: false, error: 'Impossible de supprimer un bon déjà facturé' });

      // Si appel depuis frontend, déléguer à n8n
      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ success: boolean }>(
          tenantId,
          'bdc_delete',
          { bdcId: params.id }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
        }
        return reply.status(200).send({
          success: true,
          message: 'Bon de commande supprimé via n8n',
        });
      }

      // Appel depuis n8n : supprimer en base
      await prisma.bonCommande.delete({ where: { id: params.id } });

      // Log the event
      await logEvent(tenantId, 'bdc_delete', 'BonCommande', params.id, { numeroBdc: bon.numeroBdc }, 'succes');

      return reply.status(200).send({ success: true, message: 'Bon de commande supprimé' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'bdc_delete', 'BonCommande', (request.params as any)?.id || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: 'Validation échouée', details: error.errors });
      }
      fastify.log.error(error, 'Erreur suppression bon de commande');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });
}
