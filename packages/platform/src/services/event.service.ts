import { prisma } from '../config/database.js';
import { n8nService } from './n8n.service.js';

// Type local (en attendant que shared soit buildé)
type EventExecutionStatus = 'succes' | 'erreur' | 'en_attente';

/**
 * Service pour émettre des événements métiers
 * Ces événements seront traités par n8n (à implémenter)
 */
export class EventService {
  /**
   * Émet un événement métier et le log dans EventLog
   * TODO: Déclencher le workflow n8n correspondant
   */
  async emit(
    tenantId: string,
    eventType: string,
    entityType: string,
    entityId: string,
    payload: Record<string, unknown>
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

      // Déclencher le workflow n8n de manière asynchrone (ne pas bloquer)
      // On utilise setImmediate pour exécuter après la transaction
      setImmediate(async () => {
        try {
          const result = await n8nService.triggerWorkflow(tenantId, eventType, payload);
          
          // Mettre à jour le statut de l'événement
          await this.updateEventStatus(
            eventLog.id,
            result.success ? 'succes' : 'erreur',
            result.workflowId,
            result.error
          );
        } catch (error) {
          console.error('Erreur lors du déclenchement n8n:', error);
          await this.updateEventStatus(
            eventLog.id,
            'erreur',
            undefined,
            error instanceof Error ? error.message : 'Erreur inconnue'
          );
        }
      });
    } catch (error) {
      // Logger l'erreur mais ne pas faire échouer la transaction principale
      console.error('Erreur lors de l\'émission de l\'événement:', error);
    }
  }

  /**
   * Met à jour le statut d'exécution d'un événement
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
          workflowN8nDeclenche: status === 'succes',
          messageErreur: errorMessage,
        },
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  }
}

export const eventService = new EventService();

