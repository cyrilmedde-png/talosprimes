// Constantes partagées

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  COLLABORATEUR: 'collaborateur',
  LECTURE_SEULE: 'lecture_seule',
} as const;

export const TENANT_STATUS = {
  ACTIF: 'actif',
  SUSPENDU: 'suspendu',
  RÉSILIÉ: 'résilié',
} as const;

export const CLIENT_FINAL_TYPES = {
  B2B: 'b2b',
  B2C: 'b2c',
} as const;

export const INVOICE_STATUS = {
  BROUILLON: 'brouillon',
  ENVOYÉE: 'envoyée',
  PAYÉE: 'payée',
  EN_RETARD: 'en_retard',
  ANNULÉE: 'annulée',
} as const;

