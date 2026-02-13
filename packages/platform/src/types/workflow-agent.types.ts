/**
 * Types pour l'agent IA central orchestré par n8n
 * Format standard d'action (IA → n8n)
 */

export type TypeOutil = 'GMAIL' | 'CALENDAR' | 'APP_METIER' | 'FINANCE';

export type GmailAction = 'LIRE' | 'RÉPONDRE' | 'ÉCRIRE' | 'ARCHIVER' | 'SUPPRIMER';

export type CalendarAction = 'CRÉER' | 'MODIFIER' | 'SUPPRIMER';

export type AppMetierRessource = 'LEAD' | 'CLIENT' | 'FACTURE' | 'DEVIS' | 'TÂCHE' | 'AUTRE';

export type AppMetierAction = 'CRÉER' | 'LIRE' | 'MODIFIER' | 'SUPPRIMER';

export type FinanceAction = 'RÉSUMÉ' | 'LISTE_TRANSACTIONS';

/**
 * Action Gmail
 */
export interface GmailActionData {
  TypeOutil: 'GMAIL';
  Action: GmailAction;
  MessageSourceId?: string; // UID du message source (pour réponse/action sur mail existant)
  Destinataires?: string[];
  Objet?: string;
  Corps?: string;
  PiecesJointes?: string[]; // Chemins ou URLs des pièces jointes
  RemarquesPourLUtilisateur?: string;
}

/**
 * Action Calendar
 */
export interface CalendarActionData {
  TypeOutil: 'CALENDAR';
  Action: CalendarAction;
  EvenementId?: string; // Pour MODIFIER/SUPPRIMER
  Titre?: string;
  DateDebut?: string; // Format ISO 8601 ou YYYY-MM-DD
  HeureDebut?: string; // Format HH:mm
  DateFin?: string;
  HeureFin?: string;
  Participants?: string[]; // Emails
  LieuOuLienVisio?: string;
  Description?: string;
  Rappels?: string[]; // Ex: ["30m", "1h"]
  RemarquesPourLUtilisateur?: string;
}

/**
 * Action Application Métier
 */
export interface AppMetierActionData {
  TypeOutil: 'APP_METIER';
  Ressource: AppMetierRessource;
  Action: AppMetierAction;
  RessourceId?: string; // Pour LIRE/MODIFIER/SUPPRIMER
  Donnees?: Record<string, unknown>; // Champs spécifiques selon la ressource
  RemarquesPourLUtilisateur?: string;
}

/**
 * Action Finance (Quonto)
 */
export interface FinanceActionData {
  TypeOutil: 'FINANCE';
  Action: FinanceAction;
  Periode?: string; // Ex: "jour", "semaine", "mois", ou dates précises
  Filtres?: {
    montantMinimum?: number;
    typeTransaction?: 'credit' | 'debit';
    dateFrom?: string; // ISO 8601
    dateTo?: string; // ISO 8601
  };
  RemarquesPourLUtilisateur?: string;
}

/**
 * Union de toutes les actions possibles
 */
export type WorkflowAction = GmailActionData | CalendarActionData | AppMetierActionData | FinanceActionData;

/**
 * Structure complète de sortie de l'agent IA
 */
export interface AgentWorkflowResponse {
  /** Texte explicatif pour l'utilisateur */
  reponseUtilisateur: string;
  /** Liste structurée d'actions à exécuter par n8n */
  actions: WorkflowAction[];
  /** Questions de clarification si nécessaire */
  questions?: string[];
  /** Niveau de confiance (0-1) */
  confiance?: number;
}

/**
 * Résultat d'exécution d'une action par un workflow n8n
 */
export interface ActionExecutionResult {
  action: WorkflowAction;
  success: boolean;
  resultat?: Record<string, unknown>;
  erreur?: string;
  workflowId?: string;
}

/**
 * Résultat global après exécution de toutes les actions
 */
export interface WorkflowExecutionSummary {
  actionsTotal: number;
  actionsReussies: number;
  actionsEchouees: number;
  resultats: ActionExecutionResult[];
  messageFinal: string;
}

/**
 * Contexte de conversation pour l'agent
 */
export interface AgentContext {
  tenantId: string;
  userId?: string;
  userRole?: string;
  historiqueMessages?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  dernieresActions?: WorkflowAction[];
}
