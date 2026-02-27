import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { n8nOrAuthMiddleware } from '../../middleware/auth.middleware.js';
import type { InputJsonValue } from '../../types/prisma-helpers.js';
import { ApiError } from '../../utils/api-errors.js';

async function logEvent(tenantId: string, typeEvenement: string, entiteType: string, entiteId: string, payload: Record<string, unknown>, statut: 'succes' | 'erreur' = 'succes', messageErreur?: string) {
  try {
    await prisma.eventLog.create({
      data: {
        tenantId,
        typeEvenement,
        entiteType,
        entiteId,
        payload: payload as InputJsonValue,
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
          donnees: { entiteType, typeEvenement } as InputJsonValue,
        },
      });
    }
  } catch (e) {
    // Silent fail for logging errors
  }
}

const AVAILABLE_NICHES = ['plomberie', 'medical', 'immobilier', 'pompes_funebres', 'serrurier', 'electricien', 'veterinaire', 'restaurant'];

const updateTwilioConfigSchema = z.object({
  agentName: z.string().optional(),
  companyName: z.string().optional(),
  niche: z.enum(['plomberie', 'medical', 'immobilier', 'pompes_funebres', 'serrurier', 'electricien', 'veterinaire', 'restaurant']).optional(),
  businessHours: z.string().optional(),
  systemPromptAddon: z.string().optional(),
  knowledgeBase: z.string().optional(),
  dispatchDelay: z.number().optional(),
  basePrice: z.string().optional(),
  humanContact: z.string().optional(),
  active: z.boolean().optional(),
});

const outboundCallSchema = z.object({
  to: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  reason: z.string().min(1),
});

export async function twilioConfigRoutes(fastify: FastifyInstance) {
  // GET /api/twilio-config - Get tenant's Twilio config
  fastify.get('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; isN8nRequest?: boolean }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return ApiError.unauthorized(reply);
      }

      // Lecture directe BDD — pas de délégation n8n pour la config
      const config = await prisma.twilioConfig.findUnique({
        where: { tenantId },
      });

      if (!config) {
        return ApiError.notFound(reply, 'TwilioConfig');
      }

      return reply.status(200).send({
        success: true,
        data: config,
      });
    } catch (error) {
      const tenantId = (request as unknown as { tenantId: string }).tenantId;
      const fromN8n = (request as unknown as { isN8nRequest?: boolean }).isN8nRequest === true;
      fastify.log.error(error, 'Erreur GET twilio config');

      if (fromN8n && tenantId) {
        await logEvent(tenantId, 'twilio_config_get', 'twilio_config', tenantId, {}, 'erreur', String(error));
      }

      return ApiError.internal(reply);
    }
  });

  // PUT /api/twilio-config - Update tenant's Twilio config
  fastify.put('/', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; isN8nRequest?: boolean }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return ApiError.unauthorized(reply);
      }

      let body;
      try {
        body = updateTwilioConfigSchema.parse(request.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }
        throw error;
      }

      // Écriture directe BDD — pas de délégation n8n pour la config
      const updateData: Record<string, unknown> = { ...body };
      const config = await prisma.twilioConfig.upsert({
        where: { tenantId: tenantId! },
        update: updateData as Record<string, unknown>,
        create: {
          tenant: { connect: { id: tenantId! } },
          ...updateData as Record<string, unknown>,
        },
      });

      await logEvent(tenantId!, 'twilio_config_update', 'twilio_config', tenantId!, body);

      return reply.status(200).send({
        success: true,
        data: config,
      });
    } catch (error) {
      const tenantId = (request as unknown as { tenantId: string }).tenantId;
      const fromN8n = (request as unknown as { isN8nRequest?: boolean }).isN8nRequest === true;
      fastify.log.error(error, 'Erreur PUT twilio config');

      if (fromN8n && tenantId) {
        const body = (request.body as Record<string, unknown>) || {};
        await logEvent(tenantId, 'twilio_config_update', 'twilio_config', tenantId, body as Record<string, unknown>, 'erreur', String(error));
      }

      return ApiError.internal(reply);
    }
  });

  // POST /api/twilio-config/test-call - Trigger a test call
  fastify.post('/test-call', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; isN8nRequest?: boolean }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return ApiError.unauthorized(reply);
      }

      // Log directe — pas de délégation n8n pour test call
      await logEvent(tenantId!, 'twilio_test_call', 'twilio_config', tenantId!, {});

      return reply.status(200).send({
        success: true,
        message: 'Test call triggered',
      });
    } catch (error) {
      const tenantId = (request as unknown as { tenantId: string }).tenantId;
      const fromN8n = (request as unknown as { isN8nRequest?: boolean }).isN8nRequest === true;
      fastify.log.error(error, 'Erreur test call twilio');

      if (fromN8n && tenantId) {
        await logEvent(tenantId, 'twilio_test_call', 'twilio_config', tenantId, {}, 'erreur', String(error));
      }

      return ApiError.internal(reply);
    }
  });

  // POST /api/twilio-config/outbound-call - Trigger outbound call
  fastify.post('/outbound-call', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; isN8nRequest?: boolean }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return ApiError.unauthorized(reply);
      }

      let body;
      try {
        body = outboundCallSchema.parse(request.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ApiError.validation(reply, error);
        }
        throw error;
      }

      // Log directe — pas de délégation n8n pour outbound call
      await logEvent(tenantId!, 'twilio_outbound_call', 'twilio_config', tenantId!, body);

      return reply.status(200).send({
        success: true,
        message: 'Outbound call triggered',
      });
    } catch (error) {
      const tenantId = (request as unknown as { tenantId: string }).tenantId;
      const fromN8n = (request as unknown as { isN8nRequest?: boolean }).isN8nRequest === true;
      fastify.log.error(error, 'Erreur outbound call twilio');

      if (fromN8n && tenantId) {
        const body = (request.body as Record<string, unknown>) || {};
        await logEvent(tenantId, 'twilio_outbound_call', 'twilio_config', tenantId, body as Record<string, unknown>, 'erreur', String(error));
      }

      return ApiError.internal(reply);
    }
  });

  // GET /api/twilio-config/niches - Get available niches list
  fastify.get('/niches', {
    preHandler: [n8nOrAuthMiddleware],
  }, async (request: FastifyRequest & { tenantId?: string; isN8nRequest?: boolean }, reply: FastifyReply) => {
    try {
      const tenantId = request.tenantId;
      const fromN8n = request.isN8nRequest === true;

      if (!tenantId && !fromN8n) {
        return ApiError.unauthorized(reply);
      }

      return reply.status(200).send({
        success: true,
        data: {
          niches: AVAILABLE_NICHES,
        },
      });
    } catch (error) {
      fastify.log.error(error, 'Erreur GET niches');
      return ApiError.internal(reply);
    }
  });
}
