import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { eventService } from './event.service.js';

/**
 * Service pour communiquer avec n8n
 * Déclenche les workflows n8n selon les événements métiers
 */
export class N8nService {
  private apiUrl: string;
  private apiKey: string | undefined;
  private username: string | undefined;
  private password: string | undefined;

  constructor() {
    this.apiUrl = env.N8N_API_URL || '';
    this.apiKey = env.N8N_API_KEY;
    this.username = env.N8N_USERNAME;
    this.password = env.N8N_PASSWORD;

    if (!this.apiUrl) {
      console.warn('⚠️ N8N_API_URL non configuré - les workflows ne seront pas déclenchés');
    }
  }

  /**
   * Génère les headers d'authentification pour les requêtes n8n
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Priorité 1 : API Key (si disponible)
    if (this.apiKey) {
      headers['X-N8N-API-KEY'] = this.apiKey;
      return headers;
    }

    // Priorité 2 : Basic Auth (username/password)
    if (this.username && this.password) {
      const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
      return headers;
    }

    // Pas d'authentification configurée
    return headers;
  }

  /**
   * Déclenche un workflow n8n pour un événement donné
   */
  async triggerWorkflow(
    tenantId: string,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<{ success: boolean; workflowId?: string; error?: string }> {
    // Si n8n n'est pas configuré, on log juste l'événement
    if (!this.apiUrl) {
      console.log(`[n8n] Événement non déclenché (n8n non configuré): ${eventType}`);
      return { success: false, error: 'n8n non configuré' };
    }

    try {
      // Récupérer le workflow lié à cet événement pour ce tenant
      const workflowLink = await prisma.workflowLink.findFirst({
        where: {
          tenantId,
          typeEvenement: eventType,
          statut: 'actif',
        },
        include: {
          moduleMetier: true,
        },
      });

      if (!workflowLink) {
        console.log(`[n8n] Aucun workflow actif trouvé pour l'événement: ${eventType} (tenant: ${tenantId})`);
        return { success: false, error: 'Workflow non trouvé' };
      }

      // Préparer le payload pour n8n
      const n8nPayload = {
        event: eventType,
        tenantId,
        timestamp: new Date().toISOString(),
        data: payload,
        metadata: {
          workflowId: workflowLink.workflowN8nId,
          workflowName: workflowLink.workflowN8nNom,
          module: workflowLink.moduleMetier.code,
        },
      };

      // Appel à l'API n8n
      const response = await fetch(`${this.apiUrl}/webhook/${workflowLink.workflowN8nId}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(n8nPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`n8n API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json().catch(() => ({}));

      console.log(`[n8n] Workflow déclenché avec succès: ${workflowLink.workflowN8nNom} (${eventType})`);

      return {
        success: true,
        workflowId: workflowLink.workflowN8nId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error(`[n8n] Erreur lors du déclenchement du workflow (${eventType}):`, errorMessage);

      // Mettre à jour le statut de l'événement en erreur
      // On récupère le dernier EventLog pour cet événement
      const eventLog = await prisma.eventLog.findFirst({
        where: {
          tenantId,
          typeEvenement: eventType,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (eventLog) {
        await eventService.updateEventStatus(
          eventLog.id,
          'erreur',
          undefined,
          errorMessage
        );
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Teste la connexion à n8n
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.apiUrl) {
      return {
        success: false,
        message: 'N8N_API_URL non configuré',
      };
    }

    try {
      // Tester avec un endpoint de santé n8n (si disponible)
      const healthUrl = `${this.apiUrl.replace(/\/$/, '')}/healthz`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Connexion à n8n réussie',
        };
      }

      return {
        success: false,
        message: `n8n répond mais avec une erreur: ${response.status}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return {
        success: false,
        message: `Impossible de se connecter à n8n: ${errorMessage}`,
      };
    }
  }

  /**
   * Récupère la liste des workflows d'un tenant depuis n8n
   * (nécessite que n8n expose une API pour lister les workflows)
   */
  async listWorkflows(tenantId: string): Promise<Array<{ id: string; name: string }>> {
    if (!this.apiUrl) {
      return [];
    }

    try {
      // Cette méthode dépend de l'API n8n disponible
      // Si n8n expose une API REST pour lister les workflows, l'utiliser ici
      // Sinon, on se base sur la table WorkflowLink en DB

      const workflowLinks = await prisma.workflowLink.findMany({
        where: {
          tenantId,
          statut: 'actif',
        },
        select: {
          workflowN8nId: true,
          workflowN8nNom: true,
        },
      });

      return workflowLinks.map((link) => ({
        id: link.workflowN8nId,
        name: link.workflowN8nNom,
      }));
    } catch (error) {
      console.error('[n8n] Erreur lors de la récupération des workflows:', error);
      return [];
    }
  }
}

export const n8nService = new N8nService();

