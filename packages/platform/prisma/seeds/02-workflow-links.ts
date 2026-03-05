import { PrismaClient } from '@prisma/client';

type WfDef = { typeEvenement: string; workflowN8nId: string; workflowN8nNom: string };

const FACTURATION_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'invoice_create', workflowN8nId: 'invoice_create', workflowN8nNom: 'invoice-created' },
  { typeEvenement: 'invoices_list', workflowN8nId: 'invoices_list', workflowN8nNom: 'invoices-list' },
  { typeEvenement: 'invoice_get', workflowN8nId: 'invoice_get', workflowN8nNom: 'invoice-get' },
  { typeEvenement: 'invoice_update', workflowN8nId: 'invoice_update', workflowN8nNom: 'invoice-update' },
  { typeEvenement: 'invoice_send', workflowN8nId: 'invoice_send', workflowN8nNom: 'invoice-sent' },
  { typeEvenement: 'invoice_paid', workflowN8nId: 'invoice_paid', workflowN8nNom: 'invoice-paid' },
  { typeEvenement: 'invoice_overdue', workflowN8nId: 'invoice_overdue', workflowN8nNom: 'invoice-overdue' },
  { typeEvenement: 'invoice_delete', workflowN8nId: 'invoice_delete', workflowN8nNom: 'invoice-deleted' },
  { typeEvenement: 'invoice_generate_pdf', workflowN8nId: 'invoice_generate_pdf', workflowN8nNom: 'invoice-generate-pdf' },
  { typeEvenement: 'invoice_convert_to_avoir', workflowN8nId: 'invoice_convert_to_avoir', workflowN8nNom: 'invoice-convert-to-avoir' },
];

const ARTICLES_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'article_codes_list', workflowN8nId: 'article_codes_list', workflowN8nNom: 'article-codes-list' },
  { typeEvenement: 'article_code_create', workflowN8nId: 'article_code_create', workflowN8nNom: 'article-code-created' },
  { typeEvenement: 'article_code_update', workflowN8nId: 'article_code_update', workflowN8nNom: 'article-code-updated' },
  { typeEvenement: 'article_code_delete', workflowN8nId: 'article_code_delete', workflowN8nNom: 'article-code-deleted' },
];

const DEVIS_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'devis_list', workflowN8nId: 'devis_list', workflowN8nNom: 'devis-list' },
  { typeEvenement: 'devis_get', workflowN8nId: 'devis_get', workflowN8nNom: 'devis-get' },
  { typeEvenement: 'devis_create', workflowN8nId: 'devis_create', workflowN8nNom: 'devis-created' },
  { typeEvenement: 'devis_send', workflowN8nId: 'devis_send', workflowN8nNom: 'devis-sent' },
  { typeEvenement: 'devis_accept', workflowN8nId: 'devis_accept', workflowN8nNom: 'devis-accepted' },
  { typeEvenement: 'devis_convert_to_invoice', workflowN8nId: 'devis_convert_to_invoice', workflowN8nNom: 'devis-convert-to-invoice' },
  { typeEvenement: 'devis_convert_to_bdc', workflowN8nId: 'devis_convert_to_bdc', workflowN8nNom: 'devis-convert-to-bdc' },
  { typeEvenement: 'devis_delete', workflowN8nId: 'devis_delete', workflowN8nNom: 'devis-deleted' },
];

const BDC_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'bdc_list', workflowN8nId: 'bdc_list', workflowN8nNom: 'bdc-list' },
  { typeEvenement: 'bdc_get', workflowN8nId: 'bdc_get', workflowN8nNom: 'bdc-get' },
  { typeEvenement: 'bdc_create', workflowN8nId: 'bdc_create', workflowN8nNom: 'bdc-created' },
  { typeEvenement: 'bdc_validate', workflowN8nId: 'bdc_validate', workflowN8nNom: 'bdc-validated' },
  { typeEvenement: 'bdc_convert_to_invoice', workflowN8nId: 'bdc_convert_to_invoice', workflowN8nNom: 'bdc-convert-to-invoice' },
  { typeEvenement: 'bdc_delete', workflowN8nId: 'bdc_delete', workflowN8nNom: 'bdc-deleted' },
];

const AVOIR_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'avoir_list', workflowN8nId: 'avoir_list', workflowN8nNom: 'avoir-list' },
  { typeEvenement: 'avoir_get', workflowN8nId: 'avoir_get', workflowN8nNom: 'avoir-get' },
  { typeEvenement: 'avoir_create', workflowN8nId: 'avoir_create', workflowN8nNom: 'avoir-created' },
  { typeEvenement: 'avoir_validate', workflowN8nId: 'avoir_validate', workflowN8nNom: 'avoir-validated' },
  { typeEvenement: 'avoir_delete', workflowN8nId: 'avoir_delete', workflowN8nNom: 'avoir-deleted' },
];

const PROFORMA_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'proforma_list', workflowN8nId: 'proforma_list', workflowN8nNom: 'proforma-list' },
  { typeEvenement: 'proforma_get', workflowN8nId: 'proforma_get', workflowN8nNom: 'proforma-get' },
  { typeEvenement: 'proforma_create', workflowN8nId: 'proforma_create', workflowN8nNom: 'proforma-created' },
  { typeEvenement: 'proforma_send', workflowN8nId: 'proforma_send', workflowN8nNom: 'proforma-sent' },
  { typeEvenement: 'proforma_accept', workflowN8nId: 'proforma_accept', workflowN8nNom: 'proforma-accepted' },
  { typeEvenement: 'proforma_convert_to_invoice', workflowN8nId: 'proforma_convert_to_invoice', workflowN8nNom: 'proforma-convert-to-invoice' },
  { typeEvenement: 'proforma_delete', workflowN8nId: 'proforma_delete', workflowN8nNom: 'proforma-deleted' },
];

const LOGS_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'logs_list', workflowN8nId: 'logs_list', workflowN8nNom: 'logs-list' },
  { typeEvenement: 'logs_stats', workflowN8nId: 'logs_stats', workflowN8nNom: 'logs-stats' },
];

const AGENT_TELEPHONIQUE_WORKFLOWS: WfDef[] = [
  // Call Logs
  { typeEvenement: 'call_log_list', workflowN8nId: 'call_log_list', workflowN8nNom: 'call-log-list' },
  { typeEvenement: 'call_log_get', workflowN8nId: 'call_log_get', workflowN8nNom: 'call-log-get' },
  { typeEvenement: 'call_log_stats', workflowN8nId: 'call_log_stats', workflowN8nNom: 'call-log-stats' },
  { typeEvenement: 'call_log_create', workflowN8nId: 'call_log_create', workflowN8nNom: 'call-log-create' },
  { typeEvenement: 'call_log_update', workflowN8nId: 'call_log_update', workflowN8nNom: 'call-log-update' },
  { typeEvenement: 'call_log_delete', workflowN8nId: 'call_log_delete', workflowN8nNom: 'call-log-delete' },
  // Twilio Config
  { typeEvenement: 'twilio_config_get', workflowN8nId: 'twilio_config_get', workflowN8nNom: 'twilio-config-get' },
  { typeEvenement: 'twilio_config_update', workflowN8nId: 'twilio_config_update', workflowN8nNom: 'twilio-config-update' },
  { typeEvenement: 'twilio_test_call', workflowN8nId: 'twilio_test_call', workflowN8nNom: 'twilio-test-call' },
  { typeEvenement: 'twilio_outbound_call', workflowN8nId: 'twilio_outbound_call', workflowN8nNom: 'twilio-outbound-call' },
  // SMS
  { typeEvenement: 'sms_list', workflowN8nId: 'sms_list', workflowN8nNom: 'sms-list' },
  { typeEvenement: 'sms_stats', workflowN8nId: 'sms_stats', workflowN8nNom: 'sms-stats' },
  { typeEvenement: 'sms_send', workflowN8nId: 'sms_send', workflowN8nNom: 'sms-send' },
  { typeEvenement: 'sms_log_create', workflowN8nId: 'sms_log_create', workflowN8nNom: 'sms-log-create' },
  // Questionnaires
  { typeEvenement: 'questionnaire_list', workflowN8nId: 'questionnaire_list', workflowN8nNom: 'questionnaire-list' },
  { typeEvenement: 'questionnaire_get', workflowN8nId: 'questionnaire_get', workflowN8nNom: 'questionnaire-get' },
  { typeEvenement: 'questionnaire_create', workflowN8nId: 'questionnaire_create', workflowN8nNom: 'questionnaire-create' },
  { typeEvenement: 'questionnaire_update', workflowN8nId: 'questionnaire_update', workflowN8nNom: 'questionnaire-update' },
  { typeEvenement: 'questionnaire_delete', workflowN8nId: 'questionnaire_delete', workflowN8nNom: 'questionnaire-delete' },
];

const CLIENTS_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'client_create', workflowN8nId: 'client_create', workflowN8nNom: 'client-create' },
  { typeEvenement: 'client_create_from_lead', workflowN8nId: 'client_create_from_lead', workflowN8nNom: 'client-create-from-lead' },
  { typeEvenement: 'client_delete', workflowN8nId: 'client_delete', workflowN8nNom: 'client-delete' },
  { typeEvenement: 'client_get', workflowN8nId: 'client_get', workflowN8nNom: 'client-get' },
  { typeEvenement: 'client_update', workflowN8nId: 'client_update', workflowN8nNom: 'client-update' },
  { typeEvenement: 'clients_list', workflowN8nId: 'clients_list', workflowN8nNom: 'clients-list' },
  { typeEvenement: 'client_deleted_cleanup_lead', workflowN8nId: 'client_deleted_cleanup_lead', workflowN8nNom: 'client-deleted-cleanup-lead' },
  { typeEvenement: 'client_onboarding', workflowN8nId: 'client_onboarding', workflowN8nNom: 'client-onboarding' },
  { typeEvenement: 'stripe_checkout_completed', workflowN8nId: 'stripe_checkout_completed', workflowN8nNom: 'stripe-checkout-completed' },
  { typeEvenement: 'client_space_create', workflowN8nId: 'client_space_create', workflowN8nNom: 'client-space-create' },
  { typeEvenement: 'client_space_validate', workflowN8nId: 'client_space_validate', workflowN8nNom: 'client-space-validate' },
  { typeEvenement: 'client_space_list', workflowN8nId: 'client_space_list', workflowN8nNom: 'client-space-list' },
  { typeEvenement: 'client_space_get', workflowN8nId: 'client_space_get', workflowN8nNom: 'client-space-get' },
  { typeEvenement: 'client_space_resend_email', workflowN8nId: 'client_space_resend_email', workflowN8nNom: 'client-space-resend-email' },
];

const LEADS_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'lead_create', workflowN8nId: 'lead_create', workflowN8nNom: 'lead-create' },
  { typeEvenement: 'leads_list', workflowN8nId: 'leads_list', workflowN8nNom: 'leads-list' },
  { typeEvenement: 'lead_get', workflowN8nId: 'lead_get', workflowN8nNom: 'lead-get' },
  { typeEvenement: 'lead_delete', workflowN8nId: 'lead_delete', workflowN8nNom: 'lead-delete' },
  { typeEvenement: 'lead_update_status', workflowN8nId: 'lead_update_status', workflowN8nNom: 'lead-update-status' },
  { typeEvenement: 'lead_confirmation', workflowN8nId: 'lead_confirmation', workflowN8nNom: 'lead-confirmation' },
  { typeEvenement: 'lead_entretien', workflowN8nId: 'lead_entretien', workflowN8nNom: 'lead-entretien' },
  { typeEvenement: 'lead_questionnaire', workflowN8nId: 'lead_questionnaire', workflowN8nNom: 'lead-questionnaire' },
  { typeEvenement: 'lead_inscription', workflowN8nId: 'lead_inscription', workflowN8nNom: 'lead-inscription' },
  { typeEvenement: 'workflow_inscription', workflowN8nId: 'workflow_inscription', workflowN8nNom: 'workflow-inscription' },
];

const PROSPECTS_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'prospect_list', workflowN8nId: 'prospect_list', workflowN8nNom: 'prospect-list' },
  { typeEvenement: 'prospect_get', workflowN8nId: 'prospect_get', workflowN8nNom: 'prospect-get' },
  { typeEvenement: 'prospect_update', workflowN8nId: 'prospect_update', workflowN8nNom: 'prospect-update' },
  { typeEvenement: 'prospect_score', workflowN8nId: 'prospect_score', workflowN8nNom: 'prospect-score' },
  { typeEvenement: 'prospect_relance', workflowN8nId: 'prospect_relance', workflowN8nNom: 'prospect-relance' },
  { typeEvenement: 'prospect_convert', workflowN8nId: 'prospect_convert', workflowN8nNom: 'prospect-convert' },
  { typeEvenement: 'prospect_dashboard', workflowN8nId: 'prospect_dashboard', workflowN8nNom: 'prospect-dashboard' },
];

const COMPTABILITE_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'compta_init',                workflowN8nId: 'compta_init',                workflowN8nNom: 'compta-init' },
  { typeEvenement: 'compta_plan_comptable_list',  workflowN8nId: 'compta_plan_comptable_list', workflowN8nNom: 'compta-plan-comptable-list' },
  { typeEvenement: 'compta_ecriture_create',      workflowN8nId: 'compta_ecriture_create',     workflowN8nNom: 'compta-ecriture-create' },
  { typeEvenement: 'compta_ecritures_list',       workflowN8nId: 'compta_ecritures_list',      workflowN8nNom: 'compta-ecritures-list' },
  { typeEvenement: 'compta_ecriture_get',         workflowN8nId: 'compta_ecriture_get',        workflowN8nNom: 'compta-ecriture-get' },
  { typeEvenement: 'compta_auto_facture',         workflowN8nId: 'compta_auto_facture',        workflowN8nNom: 'compta-auto-facture' },
  { typeEvenement: 'compta_auto_avoir',           workflowN8nId: 'compta_auto_avoir',          workflowN8nNom: 'compta-auto-avoir' },
  { typeEvenement: 'compta_auto_paiement',        workflowN8nId: 'compta_auto_paiement',       workflowN8nNom: 'compta-auto-paiement' },
  { typeEvenement: 'compta_grand_livre',          workflowN8nId: 'compta_grand_livre',         workflowN8nNom: 'compta-grand-livre' },
  { typeEvenement: 'compta_balance',              workflowN8nId: 'compta_balance',             workflowN8nNom: 'compta-balance' },
  { typeEvenement: 'compta_bilan',                workflowN8nId: 'compta_bilan',               workflowN8nNom: 'compta-bilan' },
  { typeEvenement: 'compta_compte_resultat',      workflowN8nId: 'compta_compte_resultat',     workflowN8nNom: 'compta-compte-resultat' },
  { typeEvenement: 'compta_tva',                  workflowN8nId: 'compta_tva',                 workflowN8nNom: 'compta-tva' },
  { typeEvenement: 'compta_lettrage',             workflowN8nId: 'compta_lettrage',            workflowN8nNom: 'compta-lettrage' },
  { typeEvenement: 'compta_cloture',              workflowN8nId: 'compta_cloture',             workflowN8nNom: 'compta-cloture' },
  { typeEvenement: 'compta_dashboard',            workflowN8nId: 'compta_dashboard',           workflowN8nNom: 'compta-dashboard' },
  { typeEvenement: 'compta_ia_agent',             workflowN8nId: 'compta_ia_agent',            workflowN8nNom: 'compta-ia-agent' },
];

const PARTNERS_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'partner_create', workflowN8nId: 'partner_create', workflowN8nNom: 'partner-create' },
  { typeEvenement: 'partner_list', workflowN8nId: 'partner_list', workflowN8nNom: 'partner-list' },
  { typeEvenement: 'partner_get', workflowN8nId: 'partner_get', workflowN8nNom: 'partner-get' },
  { typeEvenement: 'partner_update', workflowN8nId: 'partner_update', workflowN8nNom: 'partner-update' },
  { typeEvenement: 'partner_dashboard', workflowN8nId: 'partner_dashboard', workflowN8nNom: 'partner-dashboard' },
];

const REVENUS_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'revenue_dashboard', workflowN8nId: 'revenue_dashboard', workflowN8nNom: 'revenue-dashboard' },
  { typeEvenement: 'revenue_track', workflowN8nId: 'revenue_track', workflowN8nNom: 'revenue-track' },
  { typeEvenement: 'commission_payout', workflowN8nId: 'commission_payout', workflowN8nNom: 'commission-payout' },
];

const PROJETS_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'projet_create', workflowN8nId: 'projet_create', workflowN8nNom: 'projet-create' },
  { typeEvenement: 'projets_list', workflowN8nId: 'projets_list', workflowN8nNom: 'projets-list' },
  { typeEvenement: 'projet_get', workflowN8nId: 'projet_get', workflowN8nNom: 'projet-get' },
  { typeEvenement: 'projet_update', workflowN8nId: 'projet_update', workflowN8nNom: 'projet-update' },
  { typeEvenement: 'projet_delete', workflowN8nId: 'projet_delete', workflowN8nNom: 'projet-delete' },
  { typeEvenement: 'projet_tache_create', workflowN8nId: 'projet_tache_create', workflowN8nNom: 'projet-tache-create' },
  { typeEvenement: 'projet_taches_list', workflowN8nId: 'projet_taches_list', workflowN8nNom: 'projet-taches-list' },
  { typeEvenement: 'projet_tache_update', workflowN8nId: 'projet_tache_update', workflowN8nNom: 'projet-tache-update' },
  { typeEvenement: 'projet_tache_delete', workflowN8nId: 'projet_tache_delete', workflowN8nNom: 'projet-tache-delete' },
  { typeEvenement: 'projets_dashboard', workflowN8nId: 'projets_dashboard', workflowN8nNom: 'projets-dashboard' },
];

const EQUIPE_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'equipe_membre_create', workflowN8nId: 'equipe_membre_create', workflowN8nNom: 'equipe-membre-create' },
  { typeEvenement: 'equipe_membres_list', workflowN8nId: 'equipe_membres_list', workflowN8nNom: 'equipe-membres-list' },
  { typeEvenement: 'equipe_membre_get', workflowN8nId: 'equipe_membre_get', workflowN8nNom: 'equipe-membre-get' },
  { typeEvenement: 'equipe_membre_update', workflowN8nId: 'equipe_membre_update', workflowN8nNom: 'equipe-membre-update' },
  { typeEvenement: 'equipe_membre_delete', workflowN8nId: 'equipe_membre_delete', workflowN8nNom: 'equipe-membre-delete' },
  { typeEvenement: 'equipe_pointage_create', workflowN8nId: 'equipe_pointage_create', workflowN8nNom: 'equipe-pointage-create' },
  { typeEvenement: 'equipe_pointages_list', workflowN8nId: 'equipe_pointages_list', workflowN8nNom: 'equipe-pointages-list' },
  { typeEvenement: 'equipe_pointage_update', workflowN8nId: 'equipe_pointage_update', workflowN8nNom: 'equipe-pointage-update' },
  { typeEvenement: 'equipe_pointage_delete', workflowN8nId: 'equipe_pointage_delete', workflowN8nNom: 'equipe-pointage-delete' },
  { typeEvenement: 'equipe_absence_create', workflowN8nId: 'equipe_absence_create', workflowN8nNom: 'equipe-absence-create' },
  { typeEvenement: 'equipe_absences_list', workflowN8nId: 'equipe_absences_list', workflowN8nNom: 'equipe-absences-list' },
  { typeEvenement: 'equipe_absence_update', workflowN8nId: 'equipe_absence_update', workflowN8nNom: 'equipe-absence-update' },
  { typeEvenement: 'equipe_absence_delete', workflowN8nId: 'equipe_absence_delete', workflowN8nNom: 'equipe-absence-delete' },
  { typeEvenement: 'equipe_dashboard', workflowN8nId: 'equipe_dashboard', workflowN8nNom: 'equipe-dashboard' },
];

const RH_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'rh_contrat_create', workflowN8nId: 'rh_contrat_create', workflowN8nNom: 'rh-contrat-create' },
  { typeEvenement: 'rh_contrats_list', workflowN8nId: 'rh_contrats_list', workflowN8nNom: 'rh-contrats-list' },
  { typeEvenement: 'rh_contrat_get', workflowN8nId: 'rh_contrat_get', workflowN8nNom: 'rh-contrat-get' },
  { typeEvenement: 'rh_contrat_update', workflowN8nId: 'rh_contrat_update', workflowN8nNom: 'rh-contrat-update' },
  { typeEvenement: 'rh_contrat_delete', workflowN8nId: 'rh_contrat_delete', workflowN8nNom: 'rh-contrat-delete' },
  { typeEvenement: 'rh_conge_create', workflowN8nId: 'rh_conge_create', workflowN8nNom: 'rh-conge-create' },
  { typeEvenement: 'rh_conges_list', workflowN8nId: 'rh_conges_list', workflowN8nNom: 'rh-conges-list' },
  { typeEvenement: 'rh_conge_get', workflowN8nId: 'rh_conge_get', workflowN8nNom: 'rh-conge-get' },
  { typeEvenement: 'rh_conge_update', workflowN8nId: 'rh_conge_update', workflowN8nNom: 'rh-conge-update' },
  { typeEvenement: 'rh_conge_delete', workflowN8nId: 'rh_conge_delete', workflowN8nNom: 'rh-conge-delete' },
  { typeEvenement: 'rh_conge_approuver', workflowN8nId: 'rh_conge_approuver', workflowN8nNom: 'rh-conge-approuver' },
  { typeEvenement: 'rh_conge_rejeter', workflowN8nId: 'rh_conge_rejeter', workflowN8nNom: 'rh-conge-rejeter' },
  { typeEvenement: 'rh_bulletin_create', workflowN8nId: 'rh_bulletin_create', workflowN8nNom: 'rh-bulletin-create' },
  { typeEvenement: 'rh_paie_list', workflowN8nId: 'rh_paie_list', workflowN8nNom: 'rh-paie-list' },
  { typeEvenement: 'rh_bulletin_get', workflowN8nId: 'rh_bulletin_get', workflowN8nNom: 'rh-bulletin-get' },
  { typeEvenement: 'rh_bulletin_update', workflowN8nId: 'rh_bulletin_update', workflowN8nNom: 'rh-bulletin-update' },
  { typeEvenement: 'rh_bulletin_delete', workflowN8nId: 'rh_bulletin_delete', workflowN8nNom: 'rh-bulletin-delete' },
  { typeEvenement: 'rh_evaluation_create', workflowN8nId: 'rh_evaluation_create', workflowN8nNom: 'rh-evaluation-create' },
  { typeEvenement: 'rh_evaluations_list', workflowN8nId: 'rh_evaluations_list', workflowN8nNom: 'rh-evaluations-list' },
  { typeEvenement: 'rh_evaluation_get', workflowN8nId: 'rh_evaluation_get', workflowN8nNom: 'rh-evaluation-get' },
  { typeEvenement: 'rh_evaluation_update', workflowN8nId: 'rh_evaluation_update', workflowN8nNom: 'rh-evaluation-update' },
  { typeEvenement: 'rh_evaluation_delete', workflowN8nId: 'rh_evaluation_delete', workflowN8nNom: 'rh-evaluation-delete' },
  { typeEvenement: 'rh_formation_create', workflowN8nId: 'rh_formation_create', workflowN8nNom: 'rh-formation-create' },
  { typeEvenement: 'rh_formations_list', workflowN8nId: 'rh_formations_list', workflowN8nNom: 'rh-formations-list' },
  { typeEvenement: 'rh_formation_get', workflowN8nId: 'rh_formation_get', workflowN8nNom: 'rh-formation-get' },
  { typeEvenement: 'rh_formation_update', workflowN8nId: 'rh_formation_update', workflowN8nNom: 'rh-formation-update' },
  { typeEvenement: 'rh_formation_delete', workflowN8nId: 'rh_formation_delete', workflowN8nNom: 'rh-formation-delete' },
  { typeEvenement: 'rh_formation_inscrire', workflowN8nId: 'rh_formation_inscrire', workflowN8nNom: 'rh-formation-inscrire' },
  { typeEvenement: 'rh_entretien_create', workflowN8nId: 'rh_entretien_create', workflowN8nNom: 'rh-entretien-create' },
  { typeEvenement: 'rh_entretiens_list', workflowN8nId: 'rh_entretiens_list', workflowN8nNom: 'rh-entretiens-list' },
  { typeEvenement: 'rh_entretien_get', workflowN8nId: 'rh_entretien_get', workflowN8nNom: 'rh-entretien-get' },
  { typeEvenement: 'rh_entretien_update', workflowN8nId: 'rh_entretien_update', workflowN8nNom: 'rh-entretien-update' },
  { typeEvenement: 'rh_entretien_delete', workflowN8nId: 'rh_entretien_delete', workflowN8nNom: 'rh-entretien-delete' },
  { typeEvenement: 'rh_document_create', workflowN8nId: 'rh_document_create', workflowN8nNom: 'rh-document-create' },
  { typeEvenement: 'rh_documents_list', workflowN8nId: 'rh_documents_list', workflowN8nNom: 'rh-documents-list' },
  { typeEvenement: 'rh_document_get', workflowN8nId: 'rh_document_get', workflowN8nNom: 'rh-document-get' },
  { typeEvenement: 'rh_document_update', workflowN8nId: 'rh_document_update', workflowN8nNom: 'rh-document-update' },
  { typeEvenement: 'rh_document_delete', workflowN8nId: 'rh_document_delete', workflowN8nNom: 'rh-document-delete' },
  { typeEvenement: 'rh_dashboard', workflowN8nId: 'rh_dashboard', workflowN8nNom: 'rh-dashboard' },
];

const BTP_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'btp_chantier_create', workflowN8nId: 'btp_chantier_create', workflowN8nNom: 'btp-chantier-create' },
  { typeEvenement: 'btp_chantiers_list', workflowN8nId: 'btp_chantiers_list', workflowN8nNom: 'btp-chantiers-list' },
  { typeEvenement: 'btp_chantier_get', workflowN8nId: 'btp_chantier_get', workflowN8nNom: 'btp-chantier-get' },
  { typeEvenement: 'btp_chantier_update', workflowN8nId: 'btp_chantier_update', workflowN8nNom: 'btp-chantier-update' },
  { typeEvenement: 'btp_chantier_delete', workflowN8nId: 'btp_chantier_delete', workflowN8nNom: 'btp-chantier-delete' },
  { typeEvenement: 'btp_situation_create', workflowN8nId: 'btp_situation_create', workflowN8nNom: 'btp-situation-create' },
  { typeEvenement: 'btp_situations_list', workflowN8nId: 'btp_situations_list', workflowN8nNom: 'btp-situations-list' },
  { typeEvenement: 'btp_situation_update', workflowN8nId: 'btp_situation_update', workflowN8nNom: 'btp-situation-update' },
  { typeEvenement: 'btp_situation_delete', workflowN8nId: 'btp_situation_delete', workflowN8nNom: 'btp-situation-delete' },
  { typeEvenement: 'btp_situation_valider', workflowN8nId: 'btp_situation_valider', workflowN8nNom: 'btp-situation-valider' },
  { typeEvenement: 'btp_dashboard', workflowN8nId: 'btp_dashboard', workflowN8nNom: 'btp-dashboard' },
];

const NOTIFICATIONS_WORKFLOWS: WfDef[] = [
  { typeEvenement: 'notifications_list', workflowN8nId: 'notifications_list', workflowN8nNom: 'notifications-list' },
  { typeEvenement: 'notification_create', workflowN8nId: 'notification_create', workflowN8nNom: 'notification-created' },
  { typeEvenement: 'notification_read', workflowN8nId: 'notification_read', workflowN8nNom: 'notification-read' },
  { typeEvenement: 'notification_delete', workflowN8nId: 'notification_delete', workflowN8nNom: 'notification-deleted' },
];

/** Upsert une liste de workflow links pour un module et un tenant. */
async function seedWorkflowLinks(
  prisma: PrismaClient,
  tenantId: string,
  moduleCode: string,
  workflows: WfDef[],
  label: string
): Promise<void> {
  const mod = await prisma.moduleMetier.findUnique({ where: { code: moduleCode } });
  if (!mod) {
    console.warn(`⚠️ Module ${moduleCode} absent : exécutez d'abord seed modules.`);
    return;
  }

  console.log(`🔗 Workflow links ${label}...`);

  for (const w of workflows) {
    await prisma.workflowLink.upsert({
      where: {
        tenantId_typeEvenement: { tenantId, typeEvenement: w.typeEvenement },
      },
      update: {
        workflowN8nId: w.workflowN8nId,
        workflowN8nNom: w.workflowN8nNom,
        moduleMetierId: mod.id,
        statut: 'actif',
      },
      create: {
        tenantId,
        moduleMetierId: mod.id,
        typeEvenement: w.typeEvenement,
        workflowN8nId: w.workflowN8nId,
        workflowN8nNom: w.workflowN8nNom,
        statut: 'actif',
      },
    });
  }

  console.log(`✅ ${workflows.length} workflow links ${label} OK`);
}

/**
 * Attache les workflow links facturation au tenant donné.
 * À appeler après seed modules et seed tenant.
 */
export async function seedWorkflowLinksFacturation(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'facturation', FACTURATION_WORKFLOWS, 'facturation');
}

/**
 * Attache les workflow links codes articles au tenant donné.
 */
export async function seedWorkflowLinksArticles(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'articles', ARTICLES_WORKFLOWS, 'articles');
}

/**
 * Attache les workflow links bons de commande au tenant donné.
 */
/**
 * Attache les workflow links devis au tenant donné.
 */
export async function seedWorkflowLinksDevis(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'devis', DEVIS_WORKFLOWS, 'devis');
}

export async function seedWorkflowLinksBdc(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'bons_commande', BDC_WORKFLOWS, 'bons de commande');
}

/**
 * Attache les workflow links avoirs au tenant donné.
 */
export async function seedWorkflowLinksAvoir(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'avoirs', AVOIR_WORKFLOWS, 'avoirs');
}

/**
 * Attache les workflow links proformas au tenant donné.
 */
export async function seedWorkflowLinksProforma(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'proformas', PROFORMA_WORKFLOWS, 'proformas');
}

/**
 * Attache les workflow links agent téléphonique IA au tenant donné.
 */
export async function seedWorkflowLinksAgentTelephonique(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'agent_telephonique', AGENT_TELEPHONIQUE_WORKFLOWS, 'agent téléphonique');
}

/**
 * Attache les workflow links logs au tenant donné.
 */
export async function seedWorkflowLinksLogs(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'logs', LOGS_WORKFLOWS, 'logs');
}

/**
 * Attache les workflow links notifications au tenant donné.
 */
export async function seedWorkflowLinksClients(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'clients', CLIENTS_WORKFLOWS, 'clients');
}

export async function seedWorkflowLinksLeads(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'leads', LEADS_WORKFLOWS, 'leads');
}

export async function seedWorkflowLinksNotifications(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'notifications', NOTIFICATIONS_WORKFLOWS, 'notifications');
}

export async function seedWorkflowLinksComptabilite(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'comptabilite', COMPTABILITE_WORKFLOWS, 'comptabilité');
}

export async function seedWorkflowLinksPartenaires(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'partenaire', PARTNERS_WORKFLOWS, 'partenaires');
}

export async function seedWorkflowLinksRevenus(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'revenus', REVENUS_WORKFLOWS, 'revenus');
}

export async function seedWorkflowLinksProjets(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'gestion_projet', PROJETS_WORKFLOWS, 'projets');
}

export async function seedWorkflowLinksEquipe(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'gestion_equipe', EQUIPE_WORKFLOWS, 'équipe');
}

export async function seedWorkflowLinksRh(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'gestion_rh', RH_WORKFLOWS, 'RH');
}

export async function seedWorkflowLinksBtp(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'btp', BTP_WORKFLOWS, 'BTP');
}

export async function seedWorkflowLinksProspects(
  prisma: PrismaClient,
  tenantId: string
): Promise<void> {
  await seedWorkflowLinks(prisma, tenantId, 'prospects', PROSPECTS_WORKFLOWS, 'prospects');
}
