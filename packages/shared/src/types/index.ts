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

// Statuts juridiques français
export type StatutJuridique = 
  | 'SA'                    // Société Anonyme
  | 'SARL'                  // Société à Responsabilité Limitée
  | 'SAS'                   // Société par Actions Simplifiée
  | 'SASU'                  // Société par Actions Simplifiée Unipersonnelle
  | 'SCI'                   // Société Civile Immobilière
  | 'SNC'                   // Société en Nom Collectif
  | 'SCS'                   // Société en Commandite Simple
  | 'SCA'                   // Société en Commandite par Actions
  | 'EURL'                  // Entreprise Unipersonnelle à Responsabilité Limitée
  | 'SCP'                   // Société Civile Professionnelle
  | 'SEL'                   // Société d'Exercice Libéral
  | 'SELARL'                // Société d'Exercice Libéral à Responsabilité Limitée
  | 'SELAS'                 // Société d'Exercice Libéral par Actions Simplifiée
  | 'SELAFA'                // Société d'Exercice Libéral par Actions Forme Anonyme
  | 'AUTO_ENTREPRENEUR'     // Auto-entrepreneur / Micro-entreprise
  | 'EIRL'                  // Entreprise Individuelle à Responsabilité Limitée
  | 'ENTREPRISE_INDIVIDUELLE'; // Entreprise Individuelle

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

export interface Lead {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  statut: 'nouveau' | 'contacte' | 'converti' | 'abandonne';
  source: string | null;
  notes: string | null;
  dateContact: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  nomEntreprise: string;
  siret: string | null;
  siren: string | null;
  codeAPE: string | null;
  codeNAF: string | null;
  statutJuridique: StatutJuridique | null;
  adressePostale: string | null;
  codePostal: string | null;
  ville: string | null;
  pays: string;
  telephone: string | null;
  emailContact: string;
  devise: string;
  langue: string;
  metier: string;
  statut: TenantStatus;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  statut: UserStatus;
  nom: string | null;
  prenom: string | null;
  telephone: string | null;
  fonction: string | null;
  salaire: number | null;
  dateEmbauche: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

