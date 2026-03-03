import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { n8nService } from './n8n.service.js';
import { logger } from '../config/logger.js';

// Type local (en attendant que shared soit buildé)
type EventExecutionStatus = 'succes' | 'erreur' | 'en_attente';

/**
 * Service pour émettre des événements métiers.
 * Ces événements sont loggés dans EventLog puis déclenchent un workflow n8n.
 * Si N8N_EVENTS_WEBHOOK_URL est configuré, chaque événement est aussi envoyé
 * au webhook de notifications temps réel (Telegram, etc.).
 */
export class EventService {
  /**
   * Émet un événement métier et le log dans EventLog.
   * Le workflow n8n est déclenché de manière asynchrone pour ne pas
   * bloquer la requête HTTP appelante.
   */
  async emit(
    tenantId: string,
    eventType: string,
    entityType: string,
    entityId: string,
    payload: Record<string, unknown>,
    meta?: { user?: string }
  ): Promise<void> {
    try {
      // Logger l'événement dans la base de données
      const eventLog = await prisma.eventLog.create({
        data: {
          tenantId,
          typeEvenement: eventType,
          entiteType: entityType,
          entiteId: entityId,
          payload: payload as object,
          workflowN8nDeclenche: false,
          statutExecution: 'en_attente',
        },
      });

      // Déclencher le workflow n8n de manière asynchrone.
      void this.processWorkflow(eventLog.id, tenantId, eventType, payload);

      // Envoyer la notification temps réel au webhook n8n (Telegram, etc.)
      void this.sendRealtimeNotification(eventType, payload, meta?.user);
    } catch (error) {
      // Logger l'erreur mais ne pas faire échouer la transaction principale
      logger.error({ error }, "Erreur lors de l'émission de l'événement");
    }
  }

  /**
   * Envoie un événement au webhook de notifications temps réel.
   * Fire-and-forget : ne bloque pas et ne fait jamais crasher.
   */
  private async sendRealtimeNotification(
    eventType: string,
    data: Record<string, unknown>,
    user?: string
  ): Promise<void> {
    const webhookUrl = env.N8N_EVENTS_WEBHOOK_URL;
    if (!webhookUrl) return; // Pas configuré → on skip silencieusement

    try {
      // Mapper les event types internes vers le format du workflow notif
      const eventMap: Record<string, string> = {
        lead_created: 'lead.created',
        lead_updated: 'lead.status_changed',
        lead_status_changed: 'lead.status_changed',
        lead_deleted: 'lead.deleted',
        lead_converted: 'lead.converted',
        client_created: 'client.created',
        client_updated: 'client.updated',
        client_deleted: 'client.deleted',
      };

      const event = eventMap[eventType] || eventType;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, data, user: user || 'Système' }),
        signal: AbortSignal.timeout(5000), // 5s timeout
      });

      if (!response.ok) {
        logger.warn(
          { status: response.status, eventType },
          'Webhook notification temps réel : réponse non-OK'
        );
      }
    } catch (error) {
      // Fire-and-forget : on log mais on ne crashe jamais
      logger.warn(
        { error, eventType },
        'Webhook notification temps réel : échec (ignoré)'
      );
    }
  }

  /**
   * Traite le déclenchement du workflow n8n pour un EventLog donné.
   * Méthode séparée pour isoler l'async fire-and-forget et garantir
   * qu'aucune rejection n'est perdue.
   */
  private async processWorkflow(
    eventLogId: string,
    tenantId: string,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    try {
      const result = await n8nService.triggerWorkflow(tenantId, eventType, payload);

      if (result.success && !result.workflowId) {
        // Pas de workflow configuré pour cet événement — c'est attendu,
        // on laisse le statut en 'en_attente' (rien n'a été exécuté).
        return;
      } else {
        // Workflow trouvé et déclenché (succès ou erreur).
        // workflowN8nDeclenche = true dans les deux cas car on a TENTÉ l'exécution.
        await this.updateEventStatus(
          eventLogId,
          result.success ? 'succes' : 'erreur',
          result.workflowId,
          result.error
        );
      }
    } catch (error) {
      logger.error({ error, eventLogId, eventType }, 'Erreur lors du déclenchement n8n');
      try {
        await this.updateEventStatus(
          eventLogId,
          'erreur',
          undefined,
          error instanceof Error ? error.message : 'Erreur inconnue'
        );
      } catch (updateError) {
        // Double-catch : si même la mise à jour du statut échoue, on log sans crasher
        logger.error({ updateError, eventLogId }, 'Impossible de mettre à jour le statut EventLog en erreur');
      }
    }
  }

  /**
   * Met à jour le statut d'exécution d'un événement.
   */
  async updateEventStatus(
    eventLogId: string,
    status: EventExecutionStatus,
    workflowN8nId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.eventLog.update({
        where: { id: eventLogId },
        data: {
          statutExecution: status,
          workflowN8nId,
          // true dès qu'un workflow a été déclenché (succès OU erreur),
          // false uniquement quand aucun workflow n'a été tenté (en_attente)
          workflowN8nDeclenche: status === 'succes' || status === 'erreur',
          messageErreur: errorMessage,
        },
      });
    } catch (error) {
      logger.error({ error, eventLogId, status }, 'Erreur lors de la mise à jour du statut');
    }
  }
}

export const eventService = new EventService();
