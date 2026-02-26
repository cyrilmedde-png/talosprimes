import type { Prisma } from '@prisma/client';
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
        payload: payload as Prisma.InputJsonValue,
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
          donnees: { entiteType, entiteId, typeEvenement } as Prisma.InputJsonValue,
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

const flexibleDate = z.string().refine(
  (val) => {
    if (!val) return true;
    return !isNaN(Date.parse(val));
  },
  { message: 'Date invalide' }
).optional().nullable();

const createSchema = z.object({
  clientFinalId: z.string().uuid(),
  montantHt: z.number().positive(),
  tvaTaux: z.number().min(0).max(100).default(20),
  dateProforma: flexibleDate,
  dateValidite: flexibleDate,
  description: z.string().optional().nullable(),
  modePaiement: z.string().optional().nullable(),
  lines: z.array(lineSchema).optional(),
});

const paramsSchema = z.object({ id: z.string().uuid() });

export async function proformaRoutes(fastify: FastifyInstance) {
  // GET /api/proforma - Liste
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

      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<{ proforma: unknown[]; count: number; total: number; totalPages: number }>(
          tenantId,
          'proforma_list',
          {
            page,
            limit,
            statut: query.statut,
            clientFinalId: query.clientFinalId,
          }
        );
        const raw = res.data as { proforma?: unknown[]; proformas?: unknown[]; count?: number; total?: number; page?: number; limit?: number; totalPages?: number };
        const proforma = Array.isArray(raw.proformas) ? raw.proformas : (Array.isArray(raw.proforma) ? raw.proforma : []);
        return reply.status(200).send({
          success: true,
          data: {
            proformas: proforma,
            count: proforma.length,
            total: raw.total ?? proforma.length,
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

      const [proforma, total] = await Promise.all([
        prisma.proforma.findMany({
          where,
          skip,
          take: limit,
          include: {
            clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } },
            lines: { orderBy: { ordre: 'asc' } },
          },
          orderBy: { dateProforma: 'desc' },
        }),
        prisma.proforma.count({ where }),
      ]);

      return reply.status(200).send({
        success: true,
        data: { proformas: proforma, count: proforma.length, total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      fastify.log.error(error, 'Erreur liste proforma');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // GET /api/proforma/:id
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

      if (!fromN8n && tenantId) {
        const res = await n8nService.callWorkflowReturn<{ proforma: unknown }>(
          tenantId,
          'proforma_get',
          { proformaId: params.id }
        );
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

      const proforma = await prisma.proforma.findFirst({
        where,
        include: {
          clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true, adresse: true, telephone: true } },
          lines: { orderBy: { ordre: 'asc' } },
          invoice: { select: { id: true, numeroFacture: true, statut: true } },
        },
      });

      if (!proforma) return reply.status(404).send({ success: false, error: 'Proforma non trouvé' });
      return reply.status(200).send({ success: true, data: { proforma } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
      }
      fastify.log.error(error, 'Erreur récupération proforma');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // GET /api/proforma/:id/pdf - Génère et retourne le PDF du proforma
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

        const proforma = await prisma.proforma.findFirst({
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

        if (!proforma) {
          return reply.status(404).send({ success: false, error: 'Proforma non trouvé' });
        }

        const forPdf: DocumentForPdf = {
          numero: proforma.numeroProforma,
          dateDocument: proforma.dateProforma,
          dateSecondaire: proforma.dateValidite,
          montantHt: Number(proforma.montantHt),
          montantTtc: Number(proforma.montantTtc),
          tvaTaux: proforma.tvaTaux != null ? Number(proforma.tvaTaux) : null,
          description: proforma.description ?? undefined,
          modePaiement: proforma.modePaiement ?? undefined,
          statut: proforma.statut,
          lines: proforma.lines.map((l: { codeArticle: string | null; designation: string; quantite: number; prixUnitaireHt: number | { toNumber(): number }; totalHt: number | { toNumber(): number } }) => ({
            codeArticle: l.codeArticle,
            designation: l.designation,
            quantite: l.quantite,
            prixUnitaireHt: typeof l.prixUnitaireHt === 'object' && 'toNumber' in l.prixUnitaireHt ? l.prixUnitaireHt.toNumber() : Number(l.prixUnitaireHt),
            totalHt: typeof l.totalHt === 'object' && 'toNumber' in l.totalHt ? l.totalHt.toNumber() : Number(l.totalHt),
          })),
          clientFinal: proforma.clientFinal ?? undefined,
          tenant: proforma.tenant ?? undefined,
        };

        const pdfBytes = await generateDocumentPdf(forPdf, 'proforma');
        const filename = `proforma-${proforma.numeroProforma.replace(/\s+/g, '-')}.pdf`;

        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `inline; filename="${filename}"`)
          .send(Buffer.from(pdfBytes));
      } catch (error) {
        if (error instanceof z.ZodError) {
          const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
          return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
        }
        console.error('=== ERREUR GENERATION PDF PROFORMA ===', error);
        fastify.log.error(error, 'Erreur génération PDF proforma');
        return reply.status(500).send({ success: false, error: 'Erreur lors de la génération du PDF' });
      }
    }
  );

  // POST /api/proforma - Créer
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

        const res = await n8nService.callWorkflowReturn<{ proforma: unknown }>(
          tenantId,
          'proforma_create',
          { ...bodyWithoutTenantId, tenantId }
        );

        return reply.status(201).send({
          success: true,
          message: 'Proforma créé via n8n',
          data: res.data,
        });
      }

      // Appel depuis n8n (callback) : persister en base
      const count = await prisma.proforma.count({ where: { tenantId } });
      const year = new Date().getFullYear();
      const numeroProforma = `PRO-${year}-${String(count + 1).padStart(6, '0')}`;

      const tvaTaux = body.tvaTaux ?? 20;
      const montantTtc = Number((body.montantHt * (1 + tvaTaux / 100)).toFixed(2));
      const dateProforma = body.dateProforma ? new Date(body.dateProforma) : new Date();
      const dateValidite = body.dateValidite
        ? new Date(body.dateValidite)
        : new Date(dateProforma.getTime() + 30 * 24 * 60 * 60 * 1000);

      const proforma = await prisma.proforma.create({
        data: {
          tenantId,
          clientFinalId: body.clientFinalId,
          numeroProforma,
          dateProforma,
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
      await logEvent(tenantId, 'proforma_create', 'Proforma', proforma.id, { numeroProforma: proforma.numeroProforma, montantTtc: Number(proforma.montantTtc) }, 'succes');

      return reply.status(201).send({
        success: true,
        message: 'Proforma créé',
        data: { proforma },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'proforma_create', 'Proforma', 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
      }
      fastify.log.error(error, 'Erreur création proforma');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // PUT /api/proforma/:id/send - Envoyer le proforma (brouillon → envoyée)
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

      const proforma = await prisma.proforma.findFirst({ where: { id: params.id, tenantId } });
      if (!proforma) return reply.status(404).send({ success: false, error: 'Non trouvé' });
      if (proforma.statut !== 'brouillon') return reply.status(400).send({ success: false, error: 'Seul un brouillon peut être envoyé' });

      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ proforma: unknown }>(
          tenantId,
          'proforma_send',
          { proformaId: params.id }
        );
        return reply.status(200).send({
          success: true,
          message: 'Proforma envoyé via n8n',
          data: res.data,
        });
      }

      const updated = await prisma.proforma.update({
        where: { id: params.id },
        data: { statut: 'envoyee' },
        include: { clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } } },
      });

      // Log the event
      await logEvent(tenantId, 'proforma_send', 'Proforma', updated.id, { numeroProforma: proforma.numeroProforma }, 'succes');

      return reply.status(200).send({ success: true, message: 'Proforma envoyé', data: { proforma: updated } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'proforma_send', 'Proforma', (request.params as Record<string, unknown>)?.id as string || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
      }
      fastify.log.error(error, 'Erreur envoi proforma');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // PUT /api/proforma/:id/accept - Accepter le proforma
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

      const proforma = await prisma.proforma.findFirst({ where: { id: params.id, tenantId } });
      if (!proforma) return reply.status(404).send({ success: false, error: 'Non trouvé' });
      if (proforma.statut !== 'envoyee') return reply.status(400).send({ success: false, error: 'Seul un proforma envoyé peut être accepté' });

      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ proforma: unknown }>(
          tenantId,
          'proforma_accept',
          { proformaId: params.id }
        );
        return reply.status(200).send({
          success: true,
          message: 'Proforma accepté via n8n',
          data: res.data,
        });
      }

      const updated = await prisma.proforma.update({
        where: { id: params.id },
        data: { statut: 'acceptee' },
        include: { clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } } },
      });

      // Log the event
      await logEvent(tenantId, 'proforma_accept', 'Proforma', updated.id, { numeroProforma: proforma.numeroProforma }, 'succes');

      return reply.status(200).send({ success: true, message: 'Proforma accepté', data: { proforma: updated } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'proforma_accept', 'Proforma', (request.params as Record<string, unknown>)?.id as string || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
      }
      fastify.log.error(error, 'Erreur acceptation proforma');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // POST /api/proforma/:id/convert-to-invoice - Convertir en facture
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

      const proforma = await prisma.proforma.findFirst({
        where: { id: params.id, tenantId },
        include: { lines: { orderBy: { ordre: 'asc' } } },
      });

      if (!proforma) return reply.status(404).send({ success: false, error: 'Non trouvé' });
      if (proforma.statut === 'facturee') return reply.status(400).send({ success: false, error: 'Déjà converti en facture' });
      if (proforma.statut === 'refusee' || proforma.statut === 'expiree') return reply.status(400).send({ success: false, error: 'Proforma refusé ou expiré' });

      if (!fromN8n) {
        const res = await n8nService.callWorkflowReturn<{ invoice: unknown; proforma: unknown }>(
          tenantId,
          'proforma_convert_to_invoice',
          { proformaId: params.id }
        );
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
          clientFinalId: proforma.clientFinalId,
          numeroFacture,
          dateFacture: new Date(),
          dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          montantHt: proforma.montantHt,
          montantTtc: proforma.montantTtc,
          tvaTaux: proforma.tvaTaux,
          description: proforma.description ? `Proforma ${proforma.numeroProforma} - ${proforma.description}` : `Depuis proforma ${proforma.numeroProforma}`,
          modePaiement: proforma.modePaiement,
          statut: 'brouillon',
          ...(proforma.lines.length > 0 ? {
            lines: {
              create: proforma.lines.map((l: { codeArticle: string | null; designation: string; quantite: number; prixUnitaireHt: number | { toNumber(): number }; totalHt: number | { toNumber(): number } }, i: number) => ({
                codeArticle: l.codeArticle,
                designation: l.designation,
                quantite: l.quantite,
                prixUnitaireHt: Number(l.prixUnitaireHt),
                totalHt: Number(l.totalHt),
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

      const updatedProforma = await prisma.proforma.update({
        where: { id: params.id },
        data: { statut: 'facturee', invoiceId: invoice.id },
        include: {
          clientFinal: { select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true } },
        },
      });

      // Log the event
      await logEvent(tenantId, 'proforma_convert_to_invoice', 'Proforma', proforma.id, { numeroProforma: proforma.numeroProforma, numeroFacture }, 'succes');

      return reply.status(201).send({
        success: true,
        message: `Facture ${numeroFacture} créée depuis ${proforma.numeroProforma}`,
        data: { invoice, proforma: updatedProforma },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'proforma_convert_to_invoice', 'Proforma', (request.params as Record<string, unknown>)?.id as string || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
      }
      fastify.log.error(error, 'Erreur conversion proforma → facture');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });

  // DELETE /api/proforma/:id
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

      const proforma = await prisma.proforma.findFirst({ where: { id: params.id, tenantId } });
      if (!proforma) return reply.status(404).send({ success: false, error: 'Non trouvé' });
      if (proforma.statut === 'facturee') return reply.status(400).send({ success: false, error: 'Impossible de supprimer un proforma déjà facturé' });

      if (!fromN8n) {
        await n8nService.callWorkflowReturn<{ success: boolean }>(
          tenantId,
          'proforma_delete',
          { proformaId: params.id }
        );
        return reply.status(200).send({
          success: true,
          message: 'Proforma supprimé via n8n',
        });
      }

      // Soft delete : archivage au lieu de suppression définitive
      await prisma.proforma.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

      // Log the event
      await logEvent(tenantId, 'proforma_delete', 'Proforma', (request.params as Record<string, unknown>)?.id as string || 'unknown', { numeroProforma: proforma.numeroProforma }, 'succes');

      return reply.status(200).send({ success: true, message: 'Proforma supprimé' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

      try {
        const _tid = request.tenantId;
        if (request.isN8nRequest && _tid) {
          await logEvent(_tid, 'proforma_delete', 'Proforma', (request.params as Record<string, unknown>)?.id as string || 'unknown', { error: errorMessage }, 'erreur', errorMessage);
        }
      } catch (_) {}
      if (error instanceof z.ZodError) {
        const msgs = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return reply.status(400).send({ success: false, error: `Validation échouée : ${msgs}`, details: error.errors });
      }
      fastify.log.error(error, 'Erreur suppression proforma');
      return reply.status(500).send({ success: false, error: 'Erreur serveur' });
    }
  });
}
