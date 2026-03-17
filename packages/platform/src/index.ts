import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import { env } from './config/env.js';
import { prisma } from './config/database.js';
import { setLogger } from './config/logger.js';
import { authMiddleware, requireRole } from './middleware/auth.middleware.js';
import { authRoutes } from './api/routes/auth.routes.js';
import { clientsRoutes } from './api/routes/clients.routes.js';
import { subscriptionsRoutes } from './api/routes/subscriptions.routes.js';
import { invoicesRoutes } from './api/routes/invoices.routes.js';
import { n8nRoutes } from './api/routes/n8n.routes.js';
import { leadsRoutes } from './api/routes/leads.routes.js';
import { notificationsRoutes } from './api/routes/notifications.routes.js';
import { tenantRoutes } from './api/routes/tenant.routes.js';
import { usersRoutes } from './api/routes/users.routes.js';
import { logsRoutes } from './api/routes/logs.routes.js';
import { landingRoutes } from './api/routes/landing.routes.js';
import { agentRoutes } from './api/routes/agent.routes.js';
import { articleCodesRoutes } from './api/routes/article-codes.routes.js';
import { bonsCommandeRoutes } from './api/routes/bons-commande.routes.js';
import { devisRoutes } from './api/routes/devis.routes.js';
import { avoirRoutes } from './api/routes/avoir.routes.js';
import { proformaRoutes } from './api/routes/proforma.routes.js';
import { callLogsRoutes } from './api/routes/call-logs.routes.js';
import { twilioConfigRoutes } from './api/routes/twilio-config.routes.js';
import { smsRoutes } from './api/routes/sms.routes.js';
import { questionnairesRoutes } from './api/routes/questionnaires.routes.js';
import { comptabiliteRoutes } from './api/routes/comptabilite.routes.js';
import { conformiteFranceRoutes } from './api/routes/conformite-france.routes.js';
import { clientSpacesRoutes } from './api/routes/client-spaces.routes.js';
import { plansRoutes } from './api/routes/plans.routes.js';
import { clientModulesRoutes } from './api/routes/client-modules.routes.js';
import { equipeRoutes } from './api/routes/equipe.routes.js';
import { projetsRoutes } from './api/routes/projets.routes.js';
import { btpRoutes } from './api/routes/btp.routes.js';
import { rhRoutes } from './api/routes/rh.routes.js';
import { agentKnowledgeRoutes } from './api/routes/agent-knowledge.routes.js';
import { rgpdRoutes } from './api/routes/rgpd.routes.js';
import { qontoRoutes } from './api/routes/qonto.routes.js';
import { rapprochementRoutes } from './api/routes/rapprochement.routes.js';
import { encryptionRoutes } from './api/routes/encryption.routes.js';
import { partnersRoutes } from './api/routes/partners.routes.js';
import { revenueRoutes } from './api/routes/revenue.routes.js';
import { stockManagementRoutes } from './api/routes/stock-management.routes.js';
import { marketingRoutes } from './api/routes/marketing.routes.js';
import { newsletterRoutes } from './api/routes/newsletter.routes.js';
import { automationsRoutes } from './api/routes/automations.routes.js';

// Créer l'instance Fastify
const fastify = Fastify({
  // Limite globale de taille du body (100 Mo pour upload vidéos marketing)
  bodyLimit: 100 * 1024 * 1024, // 100 Mo
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
});

// Initialiser le logger partagé avec l'instance Fastify
setLogger(fastify.log);

// Déclarer les types pour TypeScript
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authMiddleware;
    requireRole: typeof requireRole;
  }
}

// ── Error handler global ────────────────────────────────────────────
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error, 'Unhandled error');

  // Erreur de validation Fastify (bodyLimit, schema, etc.)
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: 'Validation échouée',
      message: error.message,
    });
  }

  // Rate limit dépassé
  if (error.statusCode === 429) {
    return reply.status(429).send({
      success: false,
      error: 'Trop de requêtes',
      message: 'Veuillez réessayer plus tard',
    });
  }

  // Payload trop grand
  if (error.statusCode === 413) {
    return reply.status(413).send({
      success: false,
      error: 'Payload trop volumineux',
      message: 'La taille de la requête dépasse la limite autorisée',
    });
  }

  const statusCode = error.statusCode ?? 500;
  return reply.status(statusCode).send({
    success: false,
    error: statusCode >= 500 ? 'Erreur serveur' : 'Erreur',
    message: statusCode >= 500 ? 'Une erreur interne est survenue' : error.message,
  });
});

// NOTE : la compression gzip est gérée par nginx (reverse proxy).
// NE PAS utiliser @fastify/compress ici — double compression = réponses JSON corrompues.

// Plugins de sécurité
await fastify.register(helmet, {
  contentSecurityPolicy: false, // Désactivé car on gère CORS séparément
});

// CORS - Autoriser le domaine frontend + sous-domaines clients
const CORS_BASE = env.CORS_ORIGIN || 'https://talosprimes.com';

await fastify.register(cors, {
  origin: env.NODE_ENV === 'production'
    ? (origin, callback) => {
        // Autoriser: talosprimes.com, api.talosprimes.com, *.talosprimes.com
        if (!origin || origin === CORS_BASE || /^https:\/\/[a-z0-9-]+\.talosprimes\.com$/.test(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'), false);
        }
      }
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-TalosPrimes-N8N-Secret', 'X-Idempotency-Key'],
});

// Rate limiting
await fastify.register(rateLimit, {
  max: 100, // 100 requêtes
  timeWindow: '1 minute', // par minute
});

// Multipart (upload fichiers) — max 100 Mo par fichier (vidéos)
await fastify.register(multipart, {
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 Mo (vidéos marketing)
    files: 1,
  },
});

// Servir les fichiers uploadés statiquement
await fastify.register(fastifyStatic, {
  root: join(process.cwd(), 'uploads'),
  prefix: '/uploads/',
  decorateReply: false,
});

// Route de santé (health check)
fastify.get('/health', async (_request, reply) => {
  const start = Date.now();
  let dbStatus = 'connected';
  let dbLatency = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
  } catch (error) {
    dbStatus = 'disconnected';
    fastify.log.error(error, 'Database connection failed');
  }

  const health = {
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      latencyMs: dbLatency,
    },
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
    responseMs: Date.now() - start,
  };

  return reply.status(dbStatus === 'connected' ? 200 : 503).send(health);
});

// Décorer Fastify avec les middlewares d'authentification
fastify.decorate('authenticate', authMiddleware);
fastify.decorate('requireRole', requireRole);

// Enregistrer les routes d'authentification
await fastify.register(async (fastify) => {
  await fastify.register(authRoutes, { prefix: '/api/auth' });
});

// Enregistrer les routes clients finaux
await fastify.register(async (fastify) => {
  await fastify.register(clientsRoutes, { prefix: '/api/clients' });
});

// Enregistrer les routes abonnements
await fastify.register(async (fastify) => {
  await fastify.register(subscriptionsRoutes, { prefix: '/api/subscriptions' });
});

// Enregistrer les routes factures
await fastify.register(async (fastify) => {
  await fastify.register(invoicesRoutes, { prefix: '/api/invoices' });
});

// Enregistrer les routes n8n (admin uniquement)
await fastify.register(async (fastify) => {
  await fastify.register(n8nRoutes, { prefix: '/api/n8n' });
});

// Enregistrer les routes leads (public pour création, admin pour consultation)
await fastify.register(async (fastify) => {
  await fastify.register(leadsRoutes, { prefix: '/api/leads' });
});

// Enregistrer les routes tenant (profil entreprise)
await fastify.register(async (fastify) => {
  await fastify.register(tenantRoutes, { prefix: '/api/tenant' });
});

// Enregistrer les routes users (gestion utilisateurs)
await fastify.register(async (fastify) => {
  await fastify.register(usersRoutes, { prefix: '/api/users' });
});

// Enregistrer les routes notifications
await fastify.register(async (fastify) => {
  await fastify.register(notificationsRoutes, { prefix: '/api/notifications' });
});

// Enregistrer les routes logs
await fastify.register(async (fastify) => {
  await fastify.register(logsRoutes, { prefix: '/api/logs' });
});

// Enregistrer les routes landing (public + admin)
await fastify.register(async (fastify) => {
  await fastify.register(landingRoutes);
});

// Enregistrer les routes agent IA (chat super-assistant)
await fastify.register(async (fastify) => {
  await fastify.register(agentRoutes, { prefix: '/api/agent' });
});

// Enregistrer les routes codes articles
await fastify.register(async (fastify) => {
  await fastify.register(articleCodesRoutes, { prefix: '/api/article-codes' });
});

// Enregistrer les routes bons de commande
await fastify.register(async (fastify) => {
  await fastify.register(bonsCommandeRoutes, { prefix: '/api/bons-commande' });
  await fastify.register(devisRoutes, { prefix: '/api/devis' });
});

// Enregistrer les routes avoirs
await fastify.register(async (fastify) => {
  await fastify.register(avoirRoutes, { prefix: '/api/avoirs' });
});

// Enregistrer les routes proformas
await fastify.register(async (fastify) => {
  await fastify.register(proformaRoutes, { prefix: '/api/proformas' });
});

// Enregistrer les routes call logs
await fastify.register(async (fastify) => {
  await fastify.register(callLogsRoutes, { prefix: '/api/call-logs' });
});

// Enregistrer les routes chiffrement
await fastify.register(async (fastify) => {
  await fastify.register(encryptionRoutes, { prefix: '/api/encryption' });
});

// Enregistrer les routes twilio config
await fastify.register(async (fastify) => {
  await fastify.register(twilioConfigRoutes, { prefix: '/api/twilio-config' });
});

// Enregistrer les routes SMS
await fastify.register(async (fastify) => {
  await fastify.register(smsRoutes, { prefix: '/api/sms' });
});

// Enregistrer les routes questionnaires
await fastify.register(async (fastify) => {
  await fastify.register(questionnairesRoutes, { prefix: '/api/questionnaires' });

  // Comptabilité
  await fastify.register(comptabiliteRoutes, { prefix: '/api/comptabilite' });

  // Conformité France (FEC, PAF, Factur-X, e-reporting, EDI-TVA, Sirene, DAS2)
  await fastify.register(conformiteFranceRoutes, { prefix: '/api/conformite' });
});

// Enregistrer les routes espaces clients
await fastify.register(async (fastify) => {
  await fastify.register(clientSpacesRoutes, { prefix: '/api/client-spaces' });
});

// Enregistrer les routes plans et modules
await fastify.register(async (fastify) => {
  await fastify.register(plansRoutes, { prefix: '/api/plans' });
});

// Enregistrer les routes modules clients
await fastify.register(async (fastify) => {
  await fastify.register(clientModulesRoutes, { prefix: '/api/client-modules' });
});

// Enregistrer les routes gestion d'équipe
await fastify.register(async (fastify) => {
  await fastify.register(equipeRoutes, { prefix: '/api/equipe' });
});

// Enregistrer les routes gestion de projets
await fastify.register(async (fastify) => {
  await fastify.register(projetsRoutes, { prefix: '/api/projets' });
});

// Enregistrer les routes BTP
await fastify.register(async (fastify) => {
  await fastify.register(btpRoutes, { prefix: '/api/btp' });
});

// Enregistrer les routes Ressources Humaines
await fastify.register(async (fastify) => {
  await fastify.register(rhRoutes, { prefix: '/api/rh' });
});

// Enregistrer les routes Base de Connaissances Agent IA
await fastify.register(async (fastify) => {
  await fastify.register(agentKnowledgeRoutes, { prefix: '/api/agent-knowledge' });
});

// Enregistrer les routes RGPD (consentement, export, anonymisation, sous-traitants)
await fastify.register(async (fastify) => {
  await fastify.register(rgpdRoutes, { prefix: '/api/rgpd' });
});

// Enregistrer les routes Qonto (banque : solde, transactions)
await fastify.register(async (fastify) => {
  await fastify.register(qontoRoutes, { prefix: '/api/qonto' });
});

// Enregistrer les routes rapprochement bancaire (import CSV)
await fastify.register(async (fastify) => {
  await fastify.register(rapprochementRoutes, { prefix: '/api/rapprochement' });
});

// Enregistrer les routes partenaires
await fastify.register(async (fastify) => {
  await fastify.register(partnersRoutes, { prefix: '/api/partners' });
});

// Enregistrer les routes revenus & commissions
await fastify.register(async (fastify) => {
  await fastify.register(revenueRoutes, { prefix: '/api/revenue' });
});

// Enregistrer les routes gestion de stock
await fastify.register(async (fastify) => {
  await fastify.register(stockManagementRoutes, { prefix: '/api/stock' });
});

// Enregistrer les routes marketing digital
await fastify.register(async (fastify) => {
  await fastify.register(marketingRoutes, { prefix: '/api/marketing' });
});

// Enregistrer les routes newsletter
await fastify.register(async (fastify) => {
  await fastify.register(newsletterRoutes, { prefix: '/api/newsletters' });
});

// Enregistrer les routes automatisations
await fastify.register(async (fastify) => {
  await fastify.register(automationsRoutes, { prefix: '/api/automations' });
});

// Route de test
fastify.get('/', async () => {
  return { 
    message: 'TalosPrimes API',
    version: '0.1.0',
    status: 'running',
  };
});

// Démarrer le serveur
const start = async () => {
  try {
    await fastify.listen({ 
      port: env.PORT, 
      host: '0.0.0.0', // Écouter sur toutes les interfaces (important pour Docker/production)
    });
    
    fastify.log.info(`🚀 Server running on http://0.0.0.0:${env.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Gestion propre de l'arrêt
process.on('SIGINT', async () => {
  fastify.log.info('Shutting down server...');
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
});

start();

