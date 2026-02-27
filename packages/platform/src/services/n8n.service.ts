import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Convertit récursivement les clés snake_case en camelCase.
 * Nécessaire car PostgreSQL renvoie des colonnes en snake_case
 * mais le frontend attend du camelCase (conventions TypeScript/React).
 */
function snakeToCamelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function transformKeys(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) return data.map(transformKeys);
  if (typeof data === 'object' && data !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[snakeToCamelKey(key)] = transformKeys(value);
    }
    return result;
  }
  return data;
}

/**
 * Mapping des anciens workflowN8nId (underscore) vers les chemins webhook n8n (tiret).
 * Les workflows JSON utilisent path: "invoice-created", pas "invoice_create".
 */
const WEBHOOK_PATH_ALIASES: Record<string, string> = {
  // Factures
  invoice_create: 'invoice-created',
  invoice_send: 'invoice-sent',
  invoice_paid: 'invoice-paid',
  invoice_overdue: 'invoice-overdue',
  invoice_get: 'invoice-get',
  invoice_update: 'invoice-update',
  invoice_delete: 'invoice-deleted',
  invoice_generate_pdf: 'invoice-generate-pdf',
  invoices_list: 'invoices-list',
  // Abonnements
  subscription_renewal: 'subscription-renewal',
  subscription_cancelled: 'subscription-cancelled',
  subscription_suspended: 'subscription-suspended',
  subscription_upgrade: 'subscription-upgrade',
  // Clients
  client_create: 'client_create',
  client_create_from_lead: 'client_create_from_lead',
  client_delete: 'client_delete',
  client_get: 'client_get',
  client_update: 'client_update',
  clients_list: 'clients_list',
  client_deleted_cleanup_lead: 'client-deleted-cleanup-lead',
  client_onboarding: 'client-onboarding',
  stripe_checkout_completed: 'stripe-checkout-completed',
  // Leads
  lead_create: 'lead_create',
  leads_list: 'leads_list',
  lead_get: 'lead_get',
  lead_delete: 'lead_delete',
  lead_update_status: 'lead_update_status',
  lead_confirmation: 'lead_confirmation',
  lead_entretien: 'lead_entretien',
  lead_questionnaire: 'lead_questionnaire',
  lead_inscription: 'inscription',
  workflow_inscription: 'inscription',
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
  devis_convert_to_bdc: 'devis-convert-to-bdc',
  devis_update: 'devis-update',
  devis_delete: 'devis-deleted',
  // Bons de commande
  bdc_list: 'bdc-list',
  bdc_get: 'bdc-get',
  bdc_create: 'bdc-created',
  bdc_update: 'bdc-update',
  bdc_validate: 'bdc-validated',
  bdc_convert_to_invoice: 'bdc-convert-to-invoice',
  bdc_delete: 'bdc-deleted',
  // Avoirs (notes de crédit)
  avoir_list: 'avoir-list',
  avoir_get: 'avoir-get',
  avoir_create: 'avoir-created',
  avoir_validate: 'avoir-validated',
  avoir_delete: 'avoir-deleted',
  invoice_convert_to_avoir: 'invoice-convert-to-avoir',
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
  twilio_inbound_voice: 'twilio-inbound-voice',
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
  // OCR / Scan de documents
  invoice_scan_ocr: 'invoice-scan-ocr',
  // Comptabilité
  compta_init: 'compta-init',
  compta_plan_comptable_list: 'compta-plan-comptable-list',
  compta_ecriture_create: 'compta-ecriture-create',
  compta_ecritures_list: 'compta-ecritures-list',
  compta_ecriture_get: 'compta-ecriture-get',
  compta_auto_facture: 'compta-auto-facture',
  compta_auto_avoir: 'compta-auto-avoir',
  compta_auto_paiement: 'compta-auto-paiement',
  compta_grand_livre: 'compta-grand-livre',
  compta_balance: 'compta-balance',
  compta_bilan: 'compta-bilan',
  compta_compte_resultat: 'compta-compte-resultat',
  compta_tva: 'compta-tva',
  compta_lettrage: 'compta-lettrage',
  compta_cloture: 'compta-cloture',
  compta_exercices_list: 'compta-exercices-list',
  compta_dashboard: 'compta-dashboard',
  compta_ia_agent: 'compta-ia-agent',
  // Espaces clients
  client_space_create: 'client-space-create',
  client_space_validate: 'client-space-validate',
  client_space_list: 'client-space-list',
  client_space_get: 'client-space-get',
  client_space_resend_email: 'client-space-resend-email',
  // Gestion d'équipe
  equipe_membres_list: 'equipe-membres-list',
  equipe_membre_get: 'equipe-membre-get',
  equipe_membre_create: 'equipe-membre-create',
  equipe_membre_update: 'equipe-membre-update',
  equipe_membre_delete: 'equipe-membre-delete',
  equipe_absences_list: 'equipe-absences-list',
  equipe_absence_create: 'equipe-absence-create',
  equipe_absence_update: 'equipe-absence-update',
  equipe_absence_delete: 'equipe-absence-delete',
  equipe_pointages_list: 'equipe-pointages-list',
  equipe_pointage_create: 'equipe-pointage-create',
  equipe_pointage_update: 'equipe-pointage-update',
  equipe_pointage_delete: 'equipe-pointage-delete',
  equipe_dashboard: 'equipe-dashboard',
  // Gestion de projets
  projets_list: 'projets-list',
  projet_get: 'projet-get',
  projet_create: 'projet-create',
  projet_update: 'projet-update',
  projet_delete: 'projet-delete',
  projet_taches_list: 'projet-taches-list',
  projet_tache_create: 'projet-tache-create',
  projet_tache_update: 'projet-tache-update',
  projet_tache_delete: 'projet-tache-delete',
  projets_dashboard: 'projets-dashboard',
  // BTP
  btp_chantiers_list: 'btp-chantiers-list',
  btp_chantier_get: 'btp-chantier-get',
  btp_chantier_create: 'btp-chantier-create',
  btp_chantier_update: 'btp-chantier-update',
  btp_chantier_delete: 'btp-chantier-delete',
  btp_situations_list: 'btp-situations-list',
  btp_situation_create: 'btp-situation-create',
  btp_situation_update: 'btp-situation-update',
  btp_situation_delete: 'btp-situation-delete',
  btp_situation_valider: 'btp-situation-valider',
  btp_dashboard: 'btp-dashboard',
  // Ressources Humaines
  rh_contrats_list: 'rh/contrats/list',
  rh_contrat_get: 'rh/contrat/get',
  rh_contrat_create: 'rh/contrat/create',
  rh_contrat_update: 'rh/contrat/update',
  rh_contrat_delete: 'rh/contrat/delete',
  rh_paie_list: 'rh/paie/list',
  rh_bulletin_get: 'rh/bulletin/get',
  rh_bulletin_create: 'rh/bulletin/create',
  rh_bulletin_update: 'rh/bulletin/update',
  rh_bulletin_delete: 'rh/bulletin/delete',
  rh_conges_list: 'rh/conges/list',
  rh_conge_get: 'rh/conge/get',
  rh_conge_create: 'rh/conge/create',
  rh_conge_update: 'rh/conge/update',
  rh_conge_delete: 'rh/conge/delete',
  rh_conge_approuver: 'rh/conge/approuver',
  rh_conge_rejeter: 'rh/conge/rejeter',
  rh_documents_list: 'rh/documents/list',
  rh_document_get: 'rh/document/get',
  rh_document_create: 'rh/document/create',
  rh_document_update: 'rh/document/update',
  rh_document_delete: 'rh/document/delete',
  rh_entretiens_list: 'rh/entretiens/list',
  rh_entretien_get: 'rh/entretien/get',
  rh_entretien_create: 'rh/entretien/create',
  rh_entretien_update: 'rh/entretien/update',
  rh_entretien_delete: 'rh/entretien/delete',
  rh_formations_list: 'rh/formations/list',
  rh_formation_get: 'rh/formation/get',
  rh_formation_create: 'rh/formation/create',
  rh_formation_update: 'rh/formation/update',
  rh_formation_delete: 'rh/formation/delete',
  rh_formation_inscrire: 'rh/formation/inscrire',
  rh_evaluations_list: 'rh/evaluations/list',
  rh_evaluation_get: 'rh/evaluation/get',
  rh_evaluation_create: 'rh/evaluation/create',
  rh_evaluation_update: 'rh/evaluation/update',
  rh_evaluation_delete: 'rh/evaluation/delete',
  rh_dashboard: 'rh/dashboard',
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
      logger.warn('N8N_API_URL non configuré - les workflows ne seront pas déclenchés');
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
      throw new Error('n8n non configuré');
    }

    // 1. Chercher un WorkflowLink en DB pour ce tenant + event type
    const workflowLink = await prisma.workflowLink.findFirst({
      where: {
        tenantId,
        typeEvenement: eventType,
        statut: 'actif',
      },
    });

    // 2. Déterminer le chemin webhook :
    //    - Si WorkflowLink trouvé → utiliser workflowN8nId (résolu via aliases)
    //    - Sinon → utiliser WEBHOOK_PATH_ALIASES (permet aux tenants sans seed de fonctionner)
    let webhookPath: string;
    if (workflowLink) {
      webhookPath = this.getWebhookPath(workflowLink.workflowN8nId);
    } else {
      const aliasPath = WEBHOOK_PATH_ALIASES[eventType];
      if (!aliasPath) {
        throw new Error(`Workflow non trouvé pour ${eventType}`);
      }
      webhookPath = aliasPath;
      logger.info({ eventType, tenantId, webhookPath }, '[n8n] Pas de WorkflowLink, résolution via alias');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const response = await fetch(`${this.apiUrl}/webhook/${webhookPath}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event: eventType,
        tenantId,
        timestamp: new Date().toISOString(),
        ...payload,     // champs à plat pour les nouveaux workflows
        data: payload,   // wrapper data pour les anciens workflows
      }),
      signal: AbortSignal.timeout(30_000), // 30 s max
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n API error: ${response.status} - ${errorText}`);
    }

    let rawData: unknown;
    try {
      rawData = await response.json();
    } catch {
      logger.warn({ eventType, webhookPath }, '[n8n] Réponse non-JSON reçue du webhook');
      return { success: false, data: {} as T, error: 'Réponse n8n invalide (non-JSON)' };
    }
    // Convertir les clés snake_case (PostgreSQL) en camelCase (frontend)
    const data = transformKeys(rawData as Record<string, unknown>) as T;
    return { success: true, data };
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
      logger.info({ eventType }, '[n8n] Événement non déclenché (n8n non configuré)');
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

      // Déterminer le chemin webhook (via aliases si pas de WorkflowLink)
      let webhookPath: string;
      if (workflowLink) {
        webhookPath = this.getWebhookPath(workflowLink.workflowN8nId);
      } else {
        const aliasPath = WEBHOOK_PATH_ALIASES[eventType];
        if (!aliasPath) {
          logger.info({ eventType, tenantId }, '[n8n] Aucun workflow actif trouvé pour l\'événement');
          return { success: true, workflowId: undefined };
        }
        webhookPath = aliasPath;
        logger.info({ eventType, tenantId, webhookPath }, '[n8n] Pas de WorkflowLink, résolution via alias');
      }

      // Préparer le payload pour n8n — à plat + data wrapper pour compatibilité
      const n8nPayload = {
        event: eventType,
        tenantId,
        timestamp: new Date().toISOString(),
        ...payload,     // champs à plat pour les nouveaux workflows
        data: payload,   // wrapper data pour les anciens workflows
        metadata: {
          workflowId: workflowLink?.workflowN8nId ?? webhookPath,
          workflowName: workflowLink?.workflowN8nNom ?? webhookPath,
          module: workflowLink?.moduleMetier?.code ?? 'unknown',
        },
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const response = await fetch(`${this.apiUrl}/webhook/${webhookPath}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(n8nPayload),
        signal: AbortSignal.timeout(30_000), // 30 s max pour éviter les requêtes bloquées
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`n8n API error: ${response.status} - ${errorText}`);
      }

      // Consommer le body (nécessaire pour libérer la connexion)
      await response.json().catch(() => ({}));

      logger.info({ workflowName: workflowLink?.workflowN8nNom ?? webhookPath, eventType }, '[n8n] Workflow déclenché avec succès');

      return {
        success: true,
        workflowId: workflowLink?.workflowN8nId ?? webhookPath,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error({ error, eventType, tenantId }, '[n8n] Erreur lors du déclenchement du workflow');

      // NOTE : la mise à jour du statut EventLog est maintenant gérée par
      // EventService.processWorkflow() qui appelle cette méthode.
      // On ne fait plus de findFirst ici pour éviter la race condition
      // où deux appels concurrents pourraient mettre à jour le mauvais EventLog.

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

      return workflowLinks.map((link: typeof workflowLinks[0]) => ({
        id: link.workflowN8nId,
        name: link.workflowN8nNom,
      }));
    } catch (error) {
      logger.error({ error }, '[n8n] Erreur lors de la récupération des workflows');
      return [];
    }
  }
  /**
   * Publie tous les workflows n8n : active via API + docker restart.
   *
   * IMPORTANT (n8n bug #21614) : L'API REST de n8n (POST /activate, PATCH active:true)
   * marque les workflows comme "actifs" dans la DB mais N'ENREGISTRE PAS les webhooks.
   * Seul le bouton "Publish" de l'UI n8n enregistre les webhooks.
   *
   * WORKAROUND : Activer via API (met le flag active=true en DB) puis redémarrer n8n.
   * Au démarrage, n8n lit tous les workflows actifs et enregistre leurs webhooks.
   */
  async publishAllWorkflows(): Promise<{ success: boolean; message: string; count?: number }> {
    if (!this.apiUrl || !this.apiKey) {
      return { success: false, message: 'N8N_API_URL ou N8N_API_KEY non configuré' };
    }

    const baseUrl = this.apiUrl.replace(/\/$/, '');

    try {
      // 1. Lister TOUS les workflows (pas seulement les actifs)
      const allWorkflows: Array<{ id: string; name: string; active: boolean }> = [];
      let cursor = '';

      for (let page = 0; page < 20; page++) {
        const url = cursor
          ? `${baseUrl}/api/v1/workflows?limit=250&cursor=${cursor}`
          : `${baseUrl}/api/v1/workflows?limit=250`;

        const listResp = await fetch(url, {
          headers: { 'X-N8N-API-KEY': this.apiKey },
          signal: AbortSignal.timeout(15_000),
        });

        if (!listResp.ok) {
          return { success: false, message: `Erreur API n8n: HTTP ${listResp.status}` };
        }

        const listData = await listResp.json() as {
          data?: Array<{ id: string; name: string; active: boolean }>;
          nextCursor?: string;
        };
        const workflows = listData.data || [];
        allWorkflows.push(...workflows);

        cursor = listData.nextCursor || '';
        if (!cursor || workflows.length === 0) break;
      }

      // 2. Activer chaque workflow inactif via POST /activate (met le flag en DB)
      const inactiveWorkflows = allWorkflows.filter(wf => !wf.active);
      let successCount = 0;
      let errorCount = 0;

      for (const wf of inactiveWorkflows) {
        try {
          const resp = await fetch(`${baseUrl}/api/v1/workflows/${wf.id}/activate`, {
            method: 'POST',
            headers: { 'X-N8N-API-KEY': this.apiKey! },
            signal: AbortSignal.timeout(10_000),
          });
          if (resp.ok) {
            successCount++;
          } else {
            errorCount++;
            logger.warn({ workflowId: wf.id, workflowName: wf.name, status: resp.status }, '[n8n] Échec activation workflow');
          }
        } catch {
          errorCount++;
        }
      }

      const alreadyActive = allWorkflows.length - inactiveWorkflows.length;
      const totalActive = alreadyActive + successCount;

      // 3. Redémarrer n8n pour enregistrer les webhooks
      // Le restart est OBLIGATOIRE car l'API ne register pas les webhooks (bug #21614)
      logger.info('[n8n] Redémarrage de n8n pour enregistrer les webhooks...');

      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      try {
        await execAsync('docker restart n8n', { timeout: 30_000 });
      } catch (restartErr) {
        logger.error({ error: restartErr }, '[n8n] Erreur docker restart');
        return {
          success: false,
          message: `${totalActive}/${allWorkflows.length} workflows activés en DB mais docker restart échoué — webhooks non enregistrés`,
          count: totalActive,
        };
      }

      // 4. Attendre que n8n soit prêt (health check)
      let n8nReady = false;
      for (let i = 0; i < 30; i++) {
        try {
          const healthResp = await fetch(`${baseUrl}/healthz`, {
            signal: AbortSignal.timeout(3_000),
          });
          if (healthResp.ok) {
            n8nReady = true;
            break;
          }
        } catch { /* n8n pas encore prêt */ }
        await new Promise(resolve => setTimeout(resolve, 2_000));
      }

      if (!n8nReady) {
        return {
          success: true,
          message: `${totalActive}/${allWorkflows.length} workflows activés, n8n redémarré mais health check échoué — vérifier manuellement`,
          count: totalActive,
        };
      }

      const message = errorCount > 0
        ? `${totalActive}/${allWorkflows.length} workflows publiés (${errorCount} erreurs d'activation, ${alreadyActive} déjà actifs) — webhooks enregistrés`
        : `${totalActive}/${allWorkflows.length} workflows publiés — webhooks enregistrés`;

      return { success: true, message, count: totalActive };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return { success: false, message: `Erreur: ${errorMessage}` };
    }
  }
}

export const n8nService = new N8nService();
