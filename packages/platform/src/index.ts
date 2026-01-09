import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { prisma } from './config/database.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { authRoutes } from './api/routes/auth.routes.js';
import { clientsRoutes } from './api/routes/clients.routes.js';
import { n8nRoutes } from './api/routes/n8n.routes.js';
import { leadsRoutes } from './api/routes/leads.routes.js';
import { notificationsRoutes } from './api/routes/notifications.routes.js';
import { tenantRoutes } from './api/routes/tenant.routes.js';
import { usersRoutes } from './api/routes/users.routes.js';
import { logsRoutes } from './api/routes/logs.routes.js';

// Créer l'instance Fastify
const fastify = Fastify({
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

// Déclarer les types pour TypeScript
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authMiddleware;
  }
}

// Plugins de sécurité
await fastify.register(helmet, {
  contentSecurityPolicy: false, // Désactivé car on gère CORS séparément
});

// CORS - Autoriser uniquement le domaine frontend
await fastify.register(cors, {
  origin: env.NODE_ENV === 'production' 
    ? (env.CORS_ORIGIN || 'https://talosprimes.com') // Une seule origine (sans virgule)
    : true, // En dev, autoriser tout
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-TalosPrimes-N8N-Secret'],
});

// Rate limiting
await fastify.register(rateLimit, {
  max: 100, // 100 requêtes
  timeWindow: '1 minute', // par minute
});

// Route de santé (health check)
fastify.get('/health', async () => {
  // Vérifier la connexion DB
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'connected' };
  } catch (error) {
    fastify.log.error(error, 'Database connection failed');
    return { status: 'error', database: 'disconnected' };
  }
});

// Décorer Fastify avec le middleware d'authentification
fastify.decorate('authenticate', authMiddleware);

// Enregistrer les routes d'authentification
await fastify.register(async (fastify) => {
  await fastify.register(authRoutes, { prefix: '/api/auth' });
});

// Enregistrer les routes clients finaux
await fastify.register(async (fastify) => {
  await fastify.register(clientsRoutes, { prefix: '/api/clients' });
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

