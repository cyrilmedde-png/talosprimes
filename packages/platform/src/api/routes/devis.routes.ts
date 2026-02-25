import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { generateDocumentPdf } from '../../services/pdf.service.js';
import type { DocumentForPdf } from '../../services/pdf.service.js';

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

// Accepte les dates au format ISO datetime (2026-02-18T00:00:00Z) ou date simple (2026-02-18)
const flexibleDate = z.string().refine(
  (val) => !isNaN(new Date(val).getTime()),
  { message: 'Date invalide' }
).optional().nullable();

const createSchema = z.object({
  clientFinalId: z.string().uuid(),
  montantHt: z.number().positive(),
  tvaTaux: z.number().min(0).max(100).default(20),
  dateDevis: flexibleDate,
  dateValidite: flexibleDate,
  description: z.string().optional().nullable(),
  modePaiement: z.string().optional().nullable(),
  lines: z.array(lineSchema).optional(),
});

const paramsSchema = z.object({ id: z.string().uuid() });

export async function devisRoutes(fastify: FastifyInstance) {
  // GET /api/devis - Liste
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
        const res = await n8nService.callWorkflowReturn<{ devis: unknown[]; count: number; total: number; totalPages: number }>(
          tenantId,
          'devis_list',
          {
            page,
            limit,
            statut: query.statut,
            clientFinalId: query.clientFinalId,
          }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n — workflow devis_list indisponible' });
        }
        const raw = res.data as { devis?: unknown[]; count?: number; total?: number; page?: number; limit?: number; totalPages?: number };
        const devis = Array.isArray(raw.devis) ? raw.devis : [];
        return reply.status(200).send({
          success: true,
          data: {
            devis,
            count: devis.length,
            total: raw.total ?? devis.length,
            page: raw.page ?? 1,
            limit: raw.limit ?? 20,
            totalPages: raw.totalPages ?? 1,
          },
        });
      }

      // Appel depuis n8n (callback) → lecture BDD directe
      const skip = (page - 1) * limit;
      const where: Record<string, unknown> = { tenantId, deletedAt: null };
      if (query.statut) where.statut = query.statut as 'brouillon' | 'envoyee' | 'acceptee' | 'refusee' | 'expiree' | 'facturee';
      if (query.clientFinalId) where.clientFinalId = query.clientFinalId;

      const [devis, total] = await Promise.all([
        prisma.devis.findMany({
          where,
          skip,
          take: limit,
          include: {
            clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } },
            lines: { orderBy: { ordre: 'asc' } },
          },
          orderBy: { dateDevis: 'desc' },
        }),
        prisma.devis.count({ where }),
      ]);

      return reply.status(200).send({
        success: true,
        data: { devis, count: devis.length, total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      fastify.log.error(error, 'Erreur liste devis');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // GET /api/devis/:id
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
        const res = await n8nService.callWorkflowReturn<{ devis: unknown }>(
          tenantId,
          'devis_get',
          { devisId: params.id }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n — workflow devis_get indisponible' });
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

      const devis = await prisma.devis.findFirst({
        where,
        include: {
          clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true, adresse: true, telephone: true } },
          lines: { orderBy: { ordre: 'asc' } },
          invoice: { select: { id: true, numeroFacture: true, statut: true } },
        },
      });

      if (!devis) return reply.status(404).send({ success: false, error: 'Devis non trouvé' });
      return reply.status(200).send({ success: true, data: { devis } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
      }
      fastify.log.error(error, 'Erreur récupération devis');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // GET /api/devis/:id/pdf - Génère et retourne le PDF du devis
  fastify.get(
    '/:id/pdf',
    {
      preHandler: [n8nOrAuthMiddleware],
    },
    async (request: FastifyRequest & { tenantId?: string }, reply: FastifyReply) => {
      try {
        const tenantId = request.tenantId;
        const fromN8n = request.isN8nRequest === true;
        const params = paramsSchema.parse(request.params);

        if (!tenantId && !fromN8n) {
          return reply.status(401).send({ success: false, error: 'Non authentifié' });
        }

        const docWhere: Record<string, unknown> = { id: params.id };
        if (tenantId) docWhere.tenantId = tenantId;

        const devis = await prisma.devis.findFirst({
          where: docWhere,
          include: {
            tenant: {
              select: {
                nomEntreprise: true,
                siret: true,
                tvaIntracom: true,
                rib: true,
                logoBase64: true,
                adressePostale: true,
                codePostal: true,
                ville: true,
                telephone: true,
                emailContact: true,
              },
            },
            clientFinal: {
              select: {
                raisonSociale: true,
                nom: true,
                prenom: true,
                email: true,
                telephone: true,
                adresse: true,
              },
            },
            lines: {
              orderBy: { ordre: 'asc' },
              select: {
                codeArticle: true,
                designation: true,
                quantite: true,
                prixUnitaireHt: true,
                totalHt: true,
              },
            },
          },
        });

        if (!devis) {
          return reply.status(404).send({ success: false, error: 'Devis non trouvé' });
        }

        const forPdf: DocumentForPdf = {
          numero: devis.numeroDevis,
          dateDocument: devis.dateDevis,
          dateSecondaire: devis.dateValidite,
          montantHt: Number(devis.montantHt),
          montantTtc: Number(devis.montantTtc),
          tvaTaux: devis.tvaTaux != null ? Number(devis.tvaTaux) : null,
          description: devis.description ?? undefined,
          modePaiement: devis.modePaiement ?? undefined,
          statut: devis.statut,
          lines: devis.lines.map((l: any) => ({
            codeArticle: l.codeArticle,
            designation: l.designation,
            quantite: l.quantite,
            prixUnitaireHt: Number(l.prixUnitaireHt),
            totalHt: Number(l.totalHt),
          })),
          clientFinal: devis.clientFinal ?? undefined,
          tenant: devis.tenant ?? undefined,
        };

        const pdfBytes = await generateDocumentPdf(forPdf, 'devis');
        const filename = `devis-${devis.numeroDevis.replace(/\s+/g, '-')}.pdf`;

        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `inline; filename="${filename}"`)
          .send(Buffer.from(pdfBytes));
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ success: false, error: 'ID invalide', details: error.errors });
        }
        console.error('=== ERREUR GENERATION PDF DEVIS ===', error);
        fastify.log.error(error, 'Erreur génération PDF devis');
        return reply.status(500).send({ success: false, error: 'Erreur lors de la génération du PDF' });
      }
    }
  );

  // POST /api/devis - Créer
  fastify.post('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const body = createSchema.parse(request.body);

      const tenantId = fromN8n
        ? (body as { tenantId?: string }).tenantId || request.tenantId
        : request.tenantId;

      if (!tenantId) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

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

        const res = await n8nService.callWorkflowReturn<{ devis: unknown }>(
          tenantId,
          'devis_create',
          { ...bodyWithoutTenantId, tenantId }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
        }

        return reply.status(201).send({
          success: true,
          message: 'Devis créé via n8n',
          data: res.data,
        });
      }

      // Appel depuis n8n (callback) : persister en base
      // Validation supplémentaire pour éviter les enregistrements fantômes
      if (!body.clientFinalId || body.montantHt <= 0) {
        return reply.status(400).send({ success: false, error: 'clientFinalId et montantHt > 0 sont requis' });
      }
      const count = await prisma.devis.count({ where: { tenantId } });
      const year = new Date().getFullYear();
      const numeroDevis = `DEV-${year}-${String(count + 1).padStart(6, '0')}`;

      const tvaTaux = body.tvaTaux ?? 20;
      const montantTtc = Number((body.montantHt * (1 + tvaTaux / 100)).toFixed(2));
      const dateDevis = body.dateDevis ? new Date(body.dateDevis) : new Date();
      const dateValidite = body.dateValidite
        ? new Date(body.dateValidite)
        : new Date(dateDevis.getTime() + 30 * 24 * 60 * 60 * 1000);

      const devis = await prisma.devis.create({
        data: {
          tenantId,
          clientFinalId: body.clientFinalId,
          numeroDevis,
          dateDevis,
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
      await logEvent(tenantId, 'devis_create', 'Devis', devis.id, { numeroDevis: devis.numeroDevis, montantTtc: Number(devis.montantTtc) }, 'succes');

      return reply.status(201).send({
        success: true,
        message: 'Devis créé',
        data: { devis },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'devis_create', 'Devis', 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
      }
      fastify.log.error(error, 'Erreur création devis');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // PUT /api/devis/:id/send - Envoyer le devis (brouillon → envoyée)
  fastify.put('/:id/send', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const params = paramsSchema.parse(request.params);
      const tenantId = request.tenantId as string;

      if (!tenantId) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

      const devis = await prisma.devis.findFirst({ where: { id: params.id, tenantId } });
      if (!devis) return reply.status(404).send({ success: false, error: 'Non trouvé' });
      if (devis.statut !== 'brouillon') return reply.status(400).send({ success: false, error: 'Seul un brouillon peut être envoyé' });

      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ devis: unknown }>(
          tenantId,
          'devis_send',
          { devisId: params.id }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
        }
        return reply.status(200).send({
          success: true,
          message: 'Devis envoyé via n8n',
          data: res.data,
        });
      }

      const updated = await prisma.devis.update({
        where: { id: params.id },
        data: { statut: 'envoyee' },
        include: { clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } } },
      });

      // Log the event
      await logEvent(tenantId, 'devis_send', 'Devis', updated.id, { numeroDevis: devis.numeroDevis }, 'succes');

      return reply.status(200).send({ success: true, message: 'Devis envoyé', data: { devis: updated } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'devis_send', 'Devis', (request.params as any)?.id || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
      }
      fastify.log.error(error, 'Erreur envoi devis');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // PUT /api/devis/:id/accept - Accepter le devis
  fastify.put('/:id/accept', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const params = paramsSchema.parse(request.params);
      const tenantId = request.tenantId as string;

      if (!tenantId) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

      const devis = await prisma.devis.findFirst({ where: { id: params.id, tenantId } });
      if (!devis) return reply.status(404).send({ success: false, error: 'Non trouvé' });
      if (devis.statut !== 'envoyee') return reply.status(400).send({ success: false, error: 'Seul un devis envoyé peut être accepté' });

      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ devis: unknown }>(
          tenantId,
          'devis_accept',
          { devisId: params.id }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
        }
        return reply.status(200).send({
          success: true,
          message: 'Devis accepté via n8n',
          data: res.data,
        });
      }

      const updated = await prisma.devis.update({
        where: { id: params.id },
        data: { statut: 'acceptee' },
        include: { clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } } },
      });

      // Log the event
      await logEvent(tenantId, 'devis_accept', 'Devis', updated.id, { numeroDevis: devis.numeroDevis }, 'succes');

      return reply.status(200).send({ success: true, message: 'Devis accepté', data: { devis: updated } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'devis_accept', 'Devis', (request.params as any)?.id || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
      }
      fastify.log.error(error, 'Erreur acceptation devis');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // POST /api/devis/:id/convert-to-invoice - Convertir en facture
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

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

      const devis = await prisma.devis.findFirst({
        where: { id: params.id, tenantId },
        include: { lines: { orderBy: { ordre: 'asc' } } },
      });

      if (!devis) return reply.status(404).send({ success: false, error: 'Non trouvé' });
      if (devis.statut === 'facturee') return reply.status(400).send({ success: false, error: 'Déjà converti en facture' });
      if (devis.statut === 'refusee' || devis.statut === 'expiree') return reply.status(400).send({ success: false, error: 'Devis refusé ou expiré' });

      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ invoice: unknown; devis: unknown }>(
          tenantId,
          'devis_convert_to_invoice',
          { devisId: params.id }
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

      // Appel depuis n8n (callback) : création en BDD
      const invoiceCount = await prisma.invoice.count({ where: { tenantId } });
      const year = new Date().getFullYear();
      const numeroFacture = `INV-${year}-${String(invoiceCount + 1).padStart(6, '0')}`;

      const invoice = await prisma.invoice.create({
        data: {
          tenantId,
          type: 'facture_client_final',
          clientFinalId: devis.clientFinalId,
          numeroFacture,
          dateFacture: new Date(),
          dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          montantHt: devis.montantHt,
          montantTtc: devis.montantTtc,
          tvaTaux: devis.tvaTaux,
          description: devis.description ? `Devis ${devis.numeroDevis} - ${devis.description}` : `Depuis devis ${devis.numeroDevis}`,
          modePaiement: devis.modePaiement,
          statut: 'brouillon',
          ...(devis.lines.length > 0 ? {
            lines: {
              create: devis.lines.map((l: any, i: number) => ({
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

      const updatedDevis = await prisma.devis.update({
        where: { id: params.id },
        data: { statut: 'facturee', invoiceId: invoice.id },
        include: {
          clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } },
        },
      });

      // Log the event
      await logEvent(tenantId, 'devis_convert_to_invoice', 'Devis', devis.id, { numeroDevis: devis.numeroDevis, numeroFacture }, 'succes');

      return reply.status(201).send({
        success: true,
        message: `Facture ${numeroFacture} créée depuis ${devis.numeroDevis}`,
        data: { invoice, devis: updatedDevis },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'devis_convert_to_invoice', 'Devis', (request.params as any)?.id || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
      }
      fastify.log.error(error, 'Erreur conversion devis → facture');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // POST /api/devis/:id/convert-to-bdc - Convertir en bon de commande
  fastify.post('/:id/convert-to-bdc', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; user?: { role: string } }, reply: FastifyReply) => {
    try {
      const fromN8n = request.isN8nRequest === true;
      const params = paramsSchema.parse(request.params);
      const tenantId = request.tenantId as string;

      if (!tenantId) {
        return reply.status(401).send({ success: false, error: 'Non authentifié' });
      }

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

      const devis = await prisma.devis.findFirst({
        where: { id: params.id, tenantId },
        include: { lines: { orderBy: { ordre: 'asc' } } },
      });

      if (!devis) return reply.status(404).send({ success: false, error: 'Non trouvé' });
      if (devis.statut !== 'acceptee') return reply.status(400).send({ success: false, error: 'Seul un devis accepté peut être converti en bon de commande' });

      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ bdc_id: string; numero_bdc: string }>(
          tenantId,
          'devis_convert_to_bdc',
          { devisId: params.id }
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

      // Appel depuis n8n (callback) : création en BDD
      const bdcCount = await prisma.bonCommande.count({ where: { tenantId } });
      const year = new Date().getFullYear();
      const numeroBdc = `BDC-${year}-${String(bdcCount + 1).padStart(6, '0')}`;

      const bon = await prisma.bonCommande.create({
        data: {
          tenantId,
          clientFinalId: devis.clientFinalId,
          numeroBdc,
          dateBdc: new Date(),
          dateValidite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          montantHt: devis.montantHt,
          montantTtc: devis.montantTtc,
          tvaTaux: devis.tvaTaux,
          description: devis.description ? `Devis ${devis.numeroDevis} - ${devis.description}` : `Depuis devis ${devis.numeroDevis}`,
          modePaiement: devis.modePaiement,
          statut: 'brouillon',
          ...(devis.lines.length > 0 ? {
            lines: {
              create: devis.lines.map((l: any, i: number) => ({
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

      // Log the event
      await logEvent(tenantId, 'devis_convert_to_bdc', 'Devis', devis.id, { numeroDevis: devis.numeroDevis, numeroBdc }, 'succes');

      return reply.status(201).send({
        success: true,
        message: `Bon de commande ${numeroBdc} créé depuis ${devis.numeroDevis}`,
        data: { bon, devisId: devis.id, numeroDevis: devis.numeroDevis },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'devis_convert_to_bdc', 'Devis', (request.params as any)?.id || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
      }
      fastify.log.error(error, 'Erreur conversion devis → bon de commande');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // DELETE /api/devis/:id
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

      if (!fromN8n && request.user?.role !== 'super_admin' && request.user?.role !== 'admin') {
        return reply.status(403).send({ success: false, error: 'Accès refusé' });
      }

      const devis = await prisma.devis.findFirst({ where: { id: params.id, tenantId } });
      if (!devis) return reply.status(404).send({ success: false, error: 'Non trouvé' });
      if (devis.statut === 'facturee') return reply.status(400).send({ success: false, error: 'Impossible de supprimer un devis déjà facturé' });

      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ success: boolean }>(
          tenantId,
          'devis_delete',
          { devisId: params.id }
        );
        if (!res.success) {
          return reply.status(502).send({ success: false, error: res.error || 'Erreur n8n' });
        }
        return reply.status(200).send({
          success: true,
          message: 'Devis supprimé via n8n',
        });
      }

      // Soft delete : archivage au lieu de suppression définitive
      await prisma.devis.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

      // Log the event
      await logEvent(tenantId, 'devis_delete', 'Devis', params.id, { numeroDevis: devis.numeroDevis }, 'succes');

      return reply.status(200).send({ success: true, message: 'Devis supprimé' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'devis_delete', 'Devis', (request.params as any)?.id || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
      }
      fastify.log.error(error, 'Erreur suppression devis');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });
}
