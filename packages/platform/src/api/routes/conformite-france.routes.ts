import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { n8nService } from '../../services/n8n.service.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/api-errors.js';

/* ── Schemas Zod ──────────────────────────────────────────── */

const exerciceIdParam = z.object({
  exerciceId: z.string().uuid('exerciceId doit être un UUID valide'),
});

const fecGenerateBody = z.object({
  exerciceId: z.string().uuid('exerciceId requis'),
  siren: z.string().length(9, 'SIREN doit contenir exactement 9 chiffres').regex(/^\d{9}$/, 'SIREN invalide'),
});

const fecExportQuery = z.object({
  fecId: z.string().uuid('fecId requis'),
});

const periodeComptableBody = z.object({
  exerciceId: z.string().uuid('exerciceId requis'),
});

const periodeClotureBody = z.object({
  periodeId: z.string().uuid('periodeId requis'),
});

const pisteAuditQuery = z.object({
  chaineFluide: z.string().optional(),
  documentType: z.string().optional(),
  documentId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const pisteAuditCreateBody = z.object({
  chaineFluide: z.string().min(1, 'chaineFluide requise'),
  etape: z.enum(['devis', 'bon_commande', 'bon_livraison', 'facture', 'ecriture_comptable', 'paiement', 'avoir']),
  documentType: z.string().min(1, 'documentType requis'),
  documentId: z.string().uuid('documentId doit être un UUID'),
  documentRef: z.string().min(1, 'documentRef requise'),
  dateDocument: z.string().min(1, 'dateDocument requise'),
  montantHt: z.number().nonnegative('montantHt doit être positif ou nul'),
  montantTtc: z.number().nonnegative('montantTtc doit être positif ou nul'),
  hashDocument: z.string().min(1, 'hashDocument requis'),
  etapePrecedenteId: z.string().uuid().optional(),
  metadata: z.string().optional(),
});

const archiveQuery = z.object({
  exerciceId: z.string().uuid().optional(),
  typeArchive: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const archiveCreateBody = z.object({
  exerciceId: z.string().uuid('exerciceId requis'),
  typeArchive: z.enum(['fec', 'grand_livre', 'balance', 'bilan', 'journal', 'tva']),
});

const facturXGenerateBody = z.object({
  invoiceId: z.string().uuid('invoiceId requis'),
  profil: z.enum(['minimum', 'basic', 'en16931']).default('minimum'),
  formatXml: z.enum(['CII', 'UBL']).default('CII'),
});

const facturXTransmettreBody = z.object({
  factureElectroniqueId: z.string().uuid('factureElectroniqueId requis'),
  plateformeType: z.enum(['chorus_pro', 'pdp']),
});

const facturXListQuery = z.object({
  statutTransmission: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const eReportingGenerateBody = z.object({
  periodeDebut: z.string().min(1, 'periodeDebut requise'),
  periodeFin: z.string().min(1, 'periodeFin requise'),
  typeTransaction: z.enum(['b2c_france', 'b2b_international', 'b2c_international']),
});

const eReportingTransmettreBody = z.object({
  eReportingId: z.string().uuid('eReportingId requis'),
  plateformeType: z.enum(['chorus_pro', 'pdp']),
});

const eReportingListQuery = z.object({
  statut: z.string().optional(),
  typeTransaction: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const ediTvaGenerateBody = z.object({
  declarationTvaId: z.string().uuid('declarationTvaId requis'),
  regimeTva: z.enum(['reel_normal', 'reel_simplifie', 'mini_reel']),
  formulaireCerfa: z.enum(['CA3', 'CA12']),
});

const ediTvaTransmettreBody = z.object({
  ediTvaId: z.string().uuid('ediTvaId requis'),
});

const ediTvaListQuery = z.object({
  statutTransmission: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const sireneVerifyBody = z.object({
  siret: z.string().length(14, 'SIRET doit contenir 14 chiffres').regex(/^\d{14}$/, 'SIRET invalide'),
});

const sireneBulkVerifyBody = z.object({
  sirets: z.array(z.string().length(14).regex(/^\d{14}$/)).min(1, 'Au moins un SIRET requis').max(50, 'Maximum 50 SIRET par lot'),
});

const sireneHistoryQuery = z.object({
  siret: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const das2GenerateBody = z.object({
  exerciceId: z.string().uuid('exerciceId requis'),
  annee: z.number().int().min(2000).max(2100),
  seuilMinimum: z.number().nonnegative().default(1200),
});

const das2TransmettreBody = z.object({
  das2Id: z.string().uuid('das2Id requis'),
});

const das2ListQuery = z.object({
  statut: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const das2IdParam = z.object({
  id: z.string().uuid('id requis'),
});

/* ── Helpers ──────────────────────────────────────────────── */

type AuthenticatedRequest = FastifyRequest & { tenantId?: string };

function getTenantId(request: AuthenticatedRequest, reply: FastifyReply): string | null {
  const tenantId = request.tenantId;
  if (!tenantId) {
    ApiError.unauthorized(reply);
    return null;
  }
  return tenantId;
}

/* ── Routes ───────────────────────────────────────────────── */

export async function conformiteFranceRoutes(fastify: FastifyInstance) {

  // ═══════════════════════════════════════════════════
  // FEC – Fichier des Écritures Comptables
  // ═══════════════════════════════════════════════════

  // POST /api/conformite/fec/generer — Générer un FEC pour un exercice
  fastify.post('/fec/generer', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = fecGenerateBody.parse(request.body);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_fec_generer', body);
    return reply.send(result);
  });

  // GET /api/conformite/fec/liste — Lister les FEC générés
  fastify.get('/fec/liste', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = exerciceIdParam.partial().parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_fec_liste', query);
    return reply.send(result);
  });

  // GET /api/conformite/fec/exporter — Télécharger le fichier FEC
  fastify.get('/fec/exporter', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = fecExportQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_fec_exporter', query);
    return reply.send(result);
  });

  // POST /api/conformite/fec/valider — Valider un FEC (contrôle format DGFiP)
  fastify.post('/fec/valider', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = fecExportQuery.parse(request.body);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_fec_valider', body);
    return reply.send(result);
  });

  // ═══════════════════════════════════════════════════
  // PÉRIODES COMPTABLES
  // ═══════════════════════════════════════════════════

  // POST /api/conformite/periodes/generer — Générer les 12 périodes d'un exercice
  fastify.post('/periodes/generer', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = periodeComptableBody.parse(request.body);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_periodes_generer', body);
    return reply.send(result);
  });

  // GET /api/conformite/periodes — Lister les périodes d'un exercice
  fastify.get('/periodes', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = exerciceIdParam.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_periodes_liste', query);
    return reply.send(result);
  });

  // POST /api/conformite/periodes/cloturer — Clôturer une période mensuelle
  fastify.post('/periodes/cloturer', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = periodeClotureBody.parse(request.body);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_periode_cloturer', body);
    return reply.send(result);
  });

  // ═══════════════════════════════════════════════════
  // PISTE D'AUDIT FIABLE (PAF)
  // ═══════════════════════════════════════════════════

  // GET /api/conformite/piste-audit — Lister les étapes de la piste d'audit
  fastify.get('/piste-audit', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = pisteAuditQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_piste_audit_liste', query);
    return reply.send(result);
  });

  // POST /api/conformite/piste-audit — Enregistrer une étape dans la PAF
  fastify.post('/piste-audit', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = pisteAuditCreateBody.parse(request.body);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_piste_audit_create', body);
    return reply.send(result);
  });

  // GET /api/conformite/piste-audit/chaine/:chaineFluide — Tracer la chaîne complète
  fastify.get('/piste-audit/chaine/:chaineFluide', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { chaineFluide } = z.object({ chaineFluide: z.string().min(1) }).parse(request.params);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_piste_audit_chaine', { chaineFluide });
    return reply.send(result);
  });

  // ═══════════════════════════════════════════════════
  // ARCHIVAGE LÉGAL
  // ═══════════════════════════════════════════════════

  // GET /api/conformite/archives — Lister les archives
  fastify.get('/archives', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = archiveQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_archives_liste', query);
    return reply.send(result);
  });

  // POST /api/conformite/archives/creer — Archiver un document comptable
  fastify.post('/archives/creer', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = archiveCreateBody.parse(request.body);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_archive_creer', body);
    return reply.send(result);
  });

  // POST /api/conformite/archives/verifier-integrite — Vérifier l'intégrité d'une archive
  fastify.post('/archives/verifier-integrite', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = z.object({ archiveId: z.string().uuid() }).parse(request.body);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_archive_verifier', body);
    return reply.send(result);
  });

  // ═══════════════════════════════════════════════════
  // FACTURATION ÉLECTRONIQUE (Factur-X / Chorus Pro)
  // ═══════════════════════════════════════════════════

  // POST /api/conformite/facturx/generer — Générer un PDF Factur-X
  fastify.post('/facturx/generer', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = facturXGenerateBody.parse(request.body);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_facturx_generer', body);
    return reply.send(result);
  });

  // GET /api/conformite/facturx — Lister les factures électroniques
  fastify.get('/facturx', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = facturXListQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_facturx_liste', query);
    return reply.send(result);
  });

  // POST /api/conformite/facturx/transmettre — Transmettre via Chorus Pro ou PDP
  fastify.post('/facturx/transmettre', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = facturXTransmettreBody.parse(request.body);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_facturx_transmettre', body);
    return reply.send(result);
  });

  // POST /api/conformite/facturx/statut — Récupérer le statut de transmission
  fastify.post('/facturx/statut', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = z.object({ factureElectroniqueId: z.string().uuid() }).parse(request.body);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_facturx_statut', body);
    return reply.send(result);
  });

  // ═══════════════════════════════════════════════════
  // E-REPORTING
  // ═══════════════════════════════════════════════════

  // POST /api/conformite/e-reporting/generer — Générer un rapport e-reporting
  fastify.post('/e-reporting/generer', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = eReportingGenerateBody.parse(request.body);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_ereporting_generer', body);
    return reply.send(result);
  });

  // GET /api/conformite/e-reporting — Lister les e-reportings
  fastify.get('/e-reporting', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = eReportingListQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_ereporting_liste', query);
    return reply.send(result);
  });

  // POST /api/conformite/e-reporting/transmettre — Transmettre à la plateforme
  fastify.post('/e-reporting/transmettre', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = eReportingTransmettreBody.parse(request.body);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_ereporting_transmettre', body);
    return reply.send(result);
  });

  // ═══════════════════════════════════════════════════
  // EDI-TVA (Télédéclaration)
  // ═══════════════════════════════════════════════════

  // POST /api/conformite/edi-tva/generer — Générer un fichier EDI-TVA
  fastify.post('/edi-tva/generer', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = ediTvaGenerateBody.parse(request.body);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_edi_tva_generer', body);
    return reply.send(result);
  });

  // GET /api/conformite/edi-tva — Lister les EDI-TVA
  fastify.get('/edi-tva', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = ediTvaListQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_edi_tva_liste', query);
    return reply.send(result);
  });

  // POST /api/conformite/edi-tva/transmettre — Transmettre la déclaration
  fastify.post('/edi-tva/transmettre', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = ediTvaTransmettreBody.parse(request.body);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_edi_tva_transmettre', body);
    return reply.send(result);
  });

  // ═══════════════════════════════════════════════════
  // API SIRENE / ENTREPRISE
  // ═══════════════════════════════════════════════════

  // POST /api/conformite/sirene/verifier — Vérifier un SIRET via API Sirene
  fastify.post('/sirene/verifier', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = sireneVerifyBody.parse(request.body);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_sirene_verifier', body);
    return reply.send(result);
  });

  // POST /api/conformite/sirene/verifier-lot — Vérification par lot
  fastify.post('/sirene/verifier-lot', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = sireneBulkVerifyBody.parse(request.body);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_sirene_verifier_lot', body);
    return reply.send(result);
  });

  // GET /api/conformite/sirene/historique — Historique des vérifications
  fastify.get('/sirene/historique', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = sireneHistoryQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_sirene_historique', query);
    return reply.send(result);
  });

  // ═══════════════════════════════════════════════════
  // DAS2 — Déclaration des Honoraires
  // ═══════════════════════════════════════════════════

  // POST /api/conformite/das2/generer — Générer la DAS2 à partir des comptes 622x
  fastify.post('/das2/generer', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = das2GenerateBody.parse(request.body);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_das2_generer', body);
    return reply.send(result);
  });

  // GET /api/conformite/das2 — Lister les DAS2
  fastify.get('/das2', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const query = das2ListQuery.parse(request.query);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_das2_liste', query);
    return reply.send(result);
  });

  // GET /api/conformite/das2/:id — Détail d'une DAS2 avec bénéficiaires
  fastify.get('/das2/:id', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const { id } = das2IdParam.parse(request.params);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_das2_get', { das2Id: id });
    return reply.send(result);
  });

  // POST /api/conformite/das2/transmettre — Transmettre la DAS2
  fastify.post('/das2/transmettre', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const body = das2TransmettreBody.parse(request.body);
    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_das2_transmettre', body);
    return reply.send(result);
  });

  // ═══════════════════════════════════════════════════
  // DASHBOARD CONFORMITÉ
  // ═══════════════════════════════════════════════════

  // GET /api/conformite/dashboard — Vue globale conformité
  fastify.get('/dashboard', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const tenantId = getTenantId(request, reply);
    if (!tenantId) return;

    const result = await n8nService.callWorkflowReturn(tenantId, 'compta_conformite_dashboard', {});
    return reply.send(result);
  });
}
