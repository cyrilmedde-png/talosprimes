// Types partagés entre plateforme et client

export type UserRole = 'super_admin' | 'admin' | 'collaborateur' | 'lecture_seule';

export type TenantStatus = 'actif' | 'suspendu' | 'resilie';

export type UserStatus = 'actif' | 'inactif';

export type ClientFinalType = 'b2b' | 'b2c';

export type ClientFinalStatus = 'actif' | 'inactif' | 'suspendu';

export type SubscriptionStatus = 'actif' | 'annule' | 'en_retard' | 'suspendu';

export type PaymentStatus = 'ok' | 'en_retard' | 'suspendu';

export type InvoiceStatus = 'brouillon' | 'envoyee' | 'payee' | 'en_retard' | 'annulee';

export type InvoiceType = 'facture_entreprise' | 'facture_client_final';

export type WorkflowStatus = 'actif' | 'inactif';

export type EventExecutionStatus = 'succes' | 'erreur' | 'en_attente';

// Types pour les entités
export interface ClientFinal {
  id: string;
  tenantId: string;
  type: ClientFinalType;
  raisonSociale?: string | null;
  nom?: string | null;
  prenom?: string | null;
  email: string;
  telephone?: string | null;
  adresse?: string | null;
  tags: string[];
  statut: ClientFinalStatus;
  createdAt: string;
  updatedAt: string;
}

