// Types partagés entre plateforme et client

export type UserRole = 'super_admin' | 'admin' | 'collaborateur' | 'lecture_seule';

export type TenantStatus = 'actif' | 'suspendu' | 'résilié';

export type UserStatus = 'actif' | 'inactif';

export type ClientFinalType = 'b2b' | 'b2c';

export type ClientFinalStatus = 'actif' | 'inactif' | 'suspendu';

export type SubscriptionStatus = 'actif' | 'annulé' | 'en_retard' | 'suspendu';

export type PaymentStatus = 'ok' | 'en_retard' | 'suspendu';

export type InvoiceStatus = 'brouillon' | 'envoyée' | 'payée' | 'en_retard' | 'annulée';

export type InvoiceType = 'facture_entreprise' | 'facture_client_final';

export type WorkflowStatus = 'actif' | 'inactif';

export type EventExecutionStatus = 'succès' | 'erreur' | 'en_attente';

