import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { eventService } from './event.service.js';

/**
 * Mapping des anciens workflowN8nId (underscore) vers les chemins webhook n8n (tiret).
 * Les workflows JSON utilisent path: "invoice-created", pas "invoice_create".
 */
const WEBHOOK_PATH_ALIASES: Record<string, string> = {
  // Factures
  invoice_create: 'invoice-created',
  invoice_paid: 'invoice-paid',
  invoice_overdue: 'invoice-overdue',
  invoice_get: 'invoice-get',
  invoice_update: 'invoice-update',
  invoice_generate_pdf: 'invoice-generate-pdf',
  invoices_list: 'invoices-list',
  // Abonnements
  subscription_renewal: 'subscription-renewal',
  subscription_cancelled: 'subscription-cancelled',
  subscription_suspended: 'subscription-suspended',
  subscription_upgrade: 'subscription-upgrade',
  // Clients
  client_create: 'client-create',
  client_create_from_lead: 'client-create-from-lead',
  client_delete: 'client-delete',
  client_get: 'client-get',
  client_update: 'client-update',
  clients_list: 'clients-list',
  client_deleted_cleanup_lead: 'client-deleted-cleanup-lead',
  client_onboarding: 'client-onboarding',
  stripe_checkout_completed: 'stripe-checkout-completed',
  // Leads
  lead_create: 'lead-create',
  leads_list: 'leads-list',
  lead_get: 'lead-get',
  lead_delete: 'lead-delete',
  lead_update_status: 'lead-update-status',
  lead_confirmation: 'lead-confirmation',
  lead_entretien: 'lead-entretien',
  lead_questionnaire: 'lead-questionnaire',
  lead_inscription: 'lead-inscription',
  workflow_inscription: 'workflow-inscription',
  // Codes articles
  article_codes_list: 'article-codes-list',
  article_code_create: 'article-code-created',
  article_code_update: 'article-code-updated',
  article_code_delete: 'article-code-deleted',
  // Devis
  devis_list: 'devis-list',
  devis_get: 'devis-get',
  devis_create: 'devis-created',
  devis_send: 'devis-sent',
  devis_accept: 'devis-accepted',
  devis_convert_to_invoice: 'devis-convert-to-invoice',
  devis_delete: 'devis-deleted',
  // Bons de commande
  bdc_list: 'bdc-list',
  bdc_get: 'bdc-get',
  bdc_create: 'bdc-created',
  bdc_validate: 'bdc-validated',
  bdc_convert_to_invoice: 'bdc-convert-to-invoice',
  bdc_delete: 'bdc-deleted',
  // Avoirs (notes de crédit)
  avoir_list: 'avoir-list',
  avoir_get: 'avoir-get',
  avoir_create: 'avoir-created',
  avoir_validate: 'avoir-validated',
  avoir_delete: 'avoir-deleted',
  // Proformas
  proforma_list: 'proforma-list',
  proforma_get: 'proforma-get',
  proforma_create: 'proforma-created',
  proforma_send: 'proforma-sent',
  proforma_accept: 'proforma-accepted',
  proforma_convert_to_invoice: 'proforma-convert-to-invoice',
  proforma_delete: 'proforma-deleted',
  // Logs
  logs_list: 'logs-list',
  logs_stats: 'logs-stats',
  // Notifications
  notifications_list: 'notifications-list',
  notification_create: 'notification-created',
  notification_read: 'notification-read',
  notification_delete: 'notification-deleted',
  // Call Logs
  call_log_list: 'call-log-list',
  call_log_get: 'call-log-get',
  call_log_stats: 'call-log-stats',
  call_log_create: 'call-log-create',
  call_log_update: 'call-log-update',
  call_log_delete: 'call-log-delete',
  // Twilio Config
  twilio_config_get: 'twilio-config-get',
  twilio_config_update: 'twilio-config-update',
  twilio_test_call: 'twilio-test-call',
  twilio_outbound_call: 'twilio-outbound-call',
  // SMS
  sms_list: 'sms-list',
  sms_stats: 'sms-stats',
  sms_send: 'sms-send',
  sms_log_create: 'sms-log-create',
  // Questionnaires
  questionnaire_list: 'questionnaire-list',
  questionnaire_get: 'questionnaire-get',
  questionnaire_create: 'questionnaire-create',
  questionnaire_update: 'questionnaire-update',
  questionnaire_delete: 'questionnaire-delete',
};

/**
 * Service pour communiquer avec n8n
 * Déclenche les workflows n8n selon les événements métiers
 */
export class N8nService {
  private apiUrl: string;
  private apiKey: string | undefined;
  private username: string | undefined;
  private password: string | undefined;

  /** Retourne le chemin webhook à appeler (compatible ancienne BDD ou nouvelle). */
  private getWebhookPath(storedWorkflowId: string): string {
    return WEBHOOK_PATH_ALIASES[storedWorkflowId] ?? storedWorkflowId;
  }

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
   * Appelle un workflow n8n et retourne la réponse JSON
   * Utile pour les vues (listage/lecture) orchestrées par n8n
   * 
   * IMPORTANT: Les webhooks n8n sont PUBLICS par défaut et n'acceptent PAS d'authentification.
   * Si n8n a une authentification activée au niveau de l'instance, les webhooks peuvent être protégés,
   * mais dans ce cas, l'authentification se fait via query parameter ou autre méthode, pas via headers.
   */
  async callWorkflowReturn<T = unknown>(
    tenantId: string,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    if (!this.apiUrl) {
      return { success: false, error: 'n8n non configuré' };
    }

    try {
      const workflowLink = await prisma.workflowLink.findFirst({
        where: {
          tenantId,
          typeEvenement: eventType,
          statut: 'actif',
        },
      });

      if (!workflowLink) {
        return { success: false, error: `Workflow non trouvé pour ${eventType}` };
      }

      // IMPORTANT: Les webhooks n8n sont publics par défaut
      // Si votre instance n8n nécessite une authentification, vous devez :
      // 1. Soit désactiver l'authentification pour les webhooks dans n8n
      // 2. Soit utiliser l'API REST de n8n au lieu des webhooks
      // 3. Soit configurer n8n pour accepter les webhooks avec authentification
      
      // Pour l'instant, on n'envoie PAS d'headers d'authentification pour les webhooks
      // car les webhooks n8n sont publics par défaut
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Si n8n nécessite une authentification pour les webhooks (configuration spéciale),
      // vous pouvez décommenter ces lignes et configurer n8n en conséquence :
      // if (this.apiKey) {
      //   headers['X-N8N-API-KEY'] = this.apiKey;
      // } else if (this.username && this.password) {
      //   const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      //   headers['Authorization'] = `Basic ${credentials}`;
      // }

      const webhookPath = this.getWebhookPath(workflowLink.workflowN8nId);
      const response = await fetch(`${this.apiUrl}/webhook/${webhookPath}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: eventType,
          tenantId,
          timestamp: new Date().toISOString(),
          data: payload,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `n8n API error: ${response.status} - ${errorText}` };
      }

      const data = (await response.json().catch(() => ({}))) as T;
      return { success: true, data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return { success: false, error: errorMessage };
    }
  }
  /**
   * Génère les headers d'authentification pour les requêtes n8n API REST
   * (pas pour les webhooks qui sont publics)
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
        // Retourner success: true car c'est un cas normal (pas de workflow configuré pour cet événement)
        // Ne pas logger comme erreur pour éviter de polluer les logs avec des "erreurs" normales
        return { success: true, workflowId: undefined };
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

      // IMPORTANT: Les webhooks n8n sont publics par défaut
      // On n'envoie PAS d'headers d'authentification pour les webhooks
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Appel à l'API n8n (webhook public) — chemin normalisé (invoice_create → invoice-created)
      const webhookPath = this.getWebhookPath(workflowLink.workflowN8nId);
      const response = await fetch(`${this.apiUrl}/webhook/${webhookPath}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(n8nPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`n8n API error: ${response.status} - ${errorText}`);
      }

      await response.json().catch(() => ({}));

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
        headers: this.getAuthHeaders(), // Pour l'API REST, on utilise l'authentification
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

      return workflowLinks.map((link: any) => ({
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
