/**
 * Service du Super Agent IA : chat avec OpenAI et exécution des outils TalosPrimes.
 * Les outils interrogent la base via Prisma (isolation tenant).
 */

import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { SUPER_AGENT_SYSTEM_PROMPT } from '../agent/super-agent-prompt.js';
import {
  listEmails as listEmailsService,
  getEmail as getEmailService,
  sendEmail as sendEmailService,
  isEmailReadConfigured,
  isEmailSendConfigured,
} from './email-agent.service.js';
import { listQontoTransactions, isQontoConfigured } from './qonto-agent.service.js';

// Types pour l'API OpenAI (chat completions + tools)
type OpenAIMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: { name: string; arguments: string };
      }>;
    }
  | {
      role: 'tool';
      tool_call_id: string;
      content: string;
    };

export interface AgentChatOptions {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  tenantId: string;
  userRole: string;
}

export interface AgentChatResult {
  reply: string;
  success: boolean;
  error?: string;
}

const OPENAI_MODEL = 'gpt-4o-mini';
const MAX_ITERATIONS = 8;

const AGENT_TOOLS: Array<{
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description?: string; enum?: string[] }>;
      required?: string[];
    };
  };
}> = [
  {
    type: 'function',
    function: {
      name: 'list_leads',
      description: 'Lister les leads (prospects). Optionnel: filtrer par statut (nouveau, contacte, converti, abandonne) ou limit.',
      parameters: {
        type: 'object',
        properties: {
          statut: { type: 'string', description: 'Filtrer par statut', enum: ['nouveau', 'contacte', 'converti', 'abandonne'] },
          limit: { type: 'string', description: 'Nombre max (ex: 50)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_lead',
      description: 'Récupérer le détail d\'un lead par son ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'UUID du lead' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_clients',
      description: 'Lister les clients du tenant. Optionnel: filtrer par statut (actif, inactif, suspendu).',
      parameters: {
        type: 'object',
        properties: {
          statut: { type: 'string', description: 'Filtrer par statut', enum: ['actif', 'inactif', 'suspendu'] },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_client',
      description: 'Récupérer le détail d\'un client (avec abonnement et factures récentes) par son ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'UUID du client' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_invoices',
      description: 'Lister les factures du tenant. Filtres optionnels: statut (brouillon, envoyee, payee, en_retard, annulee), clientFinalId, limit.',
      parameters: {
        type: 'object',
        properties: {
          statut: { type: 'string', enum: ['brouillon', 'envoyee', 'payee', 'en_retard', 'annulee'] },
          clientFinalId: { type: 'string', description: 'UUID du client' },
          limit: { type: 'string', description: 'Nombre max (ex: 20)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_subscriptions',
      description: 'Lister les abonnements clients du tenant. Optionnel: filtrer par statut (actif, suspendu, annule, en_retard).',
      parameters: {
        type: 'object',
        properties: {
          statut: { type: 'string', enum: ['actif', 'suspendu', 'annule', 'en_retard'] },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_tenant',
      description: 'Récupérer le profil entreprise (tenant) : nom, SIRET, contact, etc.',
      parameters: { type: 'object', properties: {} },
      required: [],
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_notifications',
      description: 'Lister les notifications du tenant. Optionnel: lu (true/false), limit.',
      parameters: {
        type: 'object',
        properties: {
          lu: { type: 'string', description: 'Filtrer par lu', enum: ['true', 'false'] },
          limit: { type: 'string', description: 'Nombre max' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_logs',
      description: 'Lister les logs d\'événements (workflows n8n). Filtres: typeEvenement, statutExecution (succes, erreur, en_attente), limit.',
      parameters: {
        type: 'object',
        properties: {
          statutExecution: { type: 'string', enum: ['succes', 'erreur', 'en_attente'] },
          limit: { type: 'string', description: 'Nombre max' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_emails',
      description: 'Lister les derniers emails de la boîte (INBOX). Optionnel: limit (nombre max, défaut 20), folder (défaut INBOX). Nécessite configuration IMAP dans .env.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'string', description: 'Nombre max d\'emails (ex: 20)' },
          folder: { type: 'string', description: 'Dossier IMAP (défaut: INBOX)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_email',
      description: 'Lire le contenu d\'un email par son UID (retourné par list_emails).',
      parameters: {
        type: 'object',
        properties: {
          uid: { type: 'string', description: 'UID du message (nombre)' },
          folder: { type: 'string', description: 'Dossier IMAP (défaut: INBOX)' },
        },
        required: ['uid'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Envoyer un email. À utiliser seulement après confirmation de l\'utilisateur pour les envois importants. Nécessite configuration SMTP dans .env.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Adresse du destinataire' },
          subject: { type: 'string', description: 'Objet' },
          text: { type: 'string', description: 'Corps du message (texte brut)' },
          html: { type: 'string', description: 'Corps HTML (optionnel)' },
        },
        required: ['to', 'subject'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_calendar_events',
      description: 'Lister les événements de l\'agenda du tenant. Optionnel: dateFrom (ISO), dateTo (ISO), limit.',
      parameters: {
        type: 'object',
        properties: {
          dateFrom: { type: 'string', description: 'Date de début (ISO 8601)' },
          dateTo: { type: 'string', description: 'Date de fin (ISO 8601)' },
          limit: { type: 'string', description: 'Nombre max (défaut 50)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'Créer un événement dans l\'agenda. debut et fin en ISO 8601.',
      parameters: {
        type: 'object',
        properties: {
          titre: { type: 'string', description: 'Titre de l\'événement' },
          debut: { type: 'string', description: 'Date/heure de début (ISO 8601)' },
          fin: { type: 'string', description: 'Date/heure de fin (ISO 8601)' },
          description: { type: 'string', description: 'Description (optionnel)' },
          lieu: { type: 'string', description: 'Lieu (optionnel)' },
          rappelMin: { type: 'string', description: 'Rappel X minutes avant (optionnel)' },
        },
        required: ['titre', 'debut', 'fin'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_calendar_event',
      description: 'Modifier un événement existant par son ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'UUID de l\'événement' },
          titre: { type: 'string' },
          debut: { type: 'string' },
          fin: { type: 'string' },
          description: { type: 'string' },
          lieu: { type: 'string' },
          rappelMin: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_calendar_event',
      description: 'Supprimer un événement de l\'agenda par son ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'UUID de l\'événement' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'qonto_transactions',
      description: 'Lister les mouvements bancaires Qonto (entrées et sorties d\'argent). Optionnel: settledAtFrom, settledAtTo (ISO 8601), side (credit ou debit), perPage. Nécessite QONTO_API_SECRET et QONTO_BANK_ACCOUNT_ID dans .env. Lecture seule.',
      parameters: {
        type: 'object',
        properties: {
          settledAtFrom: { type: 'string', description: 'Date de début (ISO 8601)' },
          settledAtTo: { type: 'string', description: 'Date de fin (ISO 8601)' },
          side: { type: 'string', enum: ['credit', 'debit'], description: 'Filtrer entrées (credit) ou sorties (debit)' },
          perPage: { type: 'string', description: 'Nombre max (défaut 50)' },
        },
        required: [],
      },
    },
  },
];

function serializeForModel(value: unknown): string {
  if (value === undefined || value === null) return String(value);
  if (typeof value === 'object' && value !== null && 'toJSON' in value) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  try {
    return JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? Number(v) : v));
  } catch {
    return String(value);
  }
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  tenantId: string
): Promise<string> {
  try {
    switch (name) {
      case 'list_leads': {
        const statut = args.statut as string | undefined;
        const limit = args.limit ? Math.min(Number(args.limit) || 50, 100) : 50;
        const leads = await prisma.lead.findMany({
          where: statut ? { statut: statut as 'nouveau' | 'contacte' | 'converti' | 'abandonne' } : undefined,
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
            statut: true,
            source: true,
            createdAt: true,
          },
        });
        return serializeForModel({ count: leads.length, leads });
      }

      case 'get_lead': {
        const id = args.id as string;
        if (!id) return serializeForModel({ error: 'id requis' });
        const lead = await prisma.lead.findUnique({
          where: { id },
        });
        if (!lead) return serializeForModel({ error: 'Lead non trouvé', id });
        return serializeForModel(lead);
      }

      case 'list_clients': {
        const statut = args.statut as string | undefined;
        const clients = await prisma.clientFinal.findMany({
          where: {
            tenantId,
            ...(statut ? { statut: statut as 'actif' | 'inactif' | 'suspendu' } : {}),
          },
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            type: true,
            raisonSociale: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
            statut: true,
            createdAt: true,
          },
        });
        return serializeForModel({ count: clients.length, clients });
      }

      case 'get_client': {
        const id = args.id as string;
        if (!id) return serializeForModel({ error: 'id requis' });
        const client = await prisma.clientFinal.findFirst({
          where: { id, tenantId },
          include: {
            subscriptions: {
              orderBy: { updatedAt: 'desc' },
              take: 1,
            },
            invoices: {
              orderBy: { dateFacture: 'desc' },
              take: 5,
              select: {
                id: true,
                numeroFacture: true,
                dateFacture: true,
                dateEcheance: true,
                montantTtc: true,
                statut: true,
              },
            },
          },
        });
        if (!client) return serializeForModel({ error: 'Client non trouvé ou pas dans ce tenant', id });
        return serializeForModel(client);
      }

      case 'list_invoices': {
        const statut = args.statut as string | undefined;
        const clientFinalId = args.clientFinalId as string | undefined;
        const limit = args.limit ? Math.min(Number(args.limit) || 20, 100) : 20;
        const invoices = await prisma.invoice.findMany({
          where: {
            tenantId,
            ...(statut ? { statut: statut as 'brouillon' | 'envoyee' | 'payee' | 'en_retard' | 'annulee' } : {}),
            ...(clientFinalId ? { clientFinalId } : {}),
          },
          orderBy: { dateFacture: 'desc' },
          take: limit,
          select: {
            id: true,
            numeroFacture: true,
            dateFacture: true,
            dateEcheance: true,
            montantHt: true,
            montantTtc: true,
            statut: true,
            clientFinalId: true,
          },
        });
        return serializeForModel({ count: invoices.length, invoices });
      }

      case 'list_subscriptions': {
        const statut = args.statut as string | undefined;
        const subs = await prisma.clientSubscription.findMany({
          where: {
            clientFinal: { tenantId },
            ...(statut ? { statut: statut as 'actif' | 'suspendu' | 'annule' | 'en_retard' } : {}),
          },
          orderBy: { updatedAt: 'desc' },
          include: {
            clientFinal: {
              select: { id: true, email: true, nom: true, prenom: true, raisonSociale: true },
            },
          },
        });
        return serializeForModel({ count: subs.length, subscriptions: subs });
      }

      case 'get_tenant': {
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            nomEntreprise: true,
            siret: true,
            siren: true,
            emailContact: true,
            telephone: true,
            adressePostale: true,
            codePostal: true,
            ville: true,
            devise: true,
            langue: true,
            statut: true,
          },
        });
        if (!tenant) return serializeForModel({ error: 'Tenant non trouvé' });
        return serializeForModel(tenant);
      }

      case 'list_notifications': {
        const lu = args.lu === 'true' ? true : args.lu === 'false' ? false : undefined;
        const limit = args.limit ? Math.min(Number(args.limit) || 20, 50) : 20;
        const notifications = await prisma.notification.findMany({
          where: { tenantId, ...(lu !== undefined ? { lu } : {}) },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
        return serializeForModel({ count: notifications.length, notifications });
      }

      case 'list_logs': {
        const statutExecution = args.statutExecution as string | undefined;
        const limit = args.limit ? Math.min(Number(args.limit) || 30, 100) : 30;
        const logs = await prisma.eventLog.findMany({
          where: {
            tenantId,
            ...(statutExecution ? { statutExecution: statutExecution as 'succes' | 'erreur' | 'en_attente' } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            typeEvenement: true,
            entiteType: true,
            entiteId: true,
            statutExecution: true,
            messageErreur: true,
            createdAt: true,
          },
        });
        return serializeForModel({ count: logs.length, logs });
      }

      case 'list_emails': {
        if (!isEmailReadConfigured()) {
          return serializeForModel({ error: 'Lecture email non configurée. Définir IMAP_HOST, IMAP_USER, IMAP_PASSWORD dans .env' });
        }
        const limit = args.limit ? Math.min(Number(args.limit) || 20, 50) : 20;
        const folder = (args.folder as string) || 'INBOX';
        const result = await listEmailsService(folder, limit);
        if (result.error) return serializeForModel({ error: result.error });
        return serializeForModel({ count: result.count ?? 0, emails: result.emails ?? [] });
      }

      case 'get_email': {
        if (!isEmailReadConfigured()) {
          return serializeForModel({ error: 'Lecture email non configurée. Définir IMAP_HOST, IMAP_USER, IMAP_PASSWORD dans .env' });
        }
        const uid = Number(args.uid);
        if (!Number.isFinite(uid)) return serializeForModel({ error: 'uid invalide (nombre requis)' });
        const folder = (args.folder as string) || 'INBOX';
        const result = await getEmailService(uid, folder);
        if (result.error) return serializeForModel({ error: result.error });
        return serializeForModel(result.email);
      }

      case 'send_email': {
        if (!isEmailSendConfigured()) {
          return serializeForModel({ error: 'Envoi email non configuré. Définir SMTP_HOST, SMTP_USER, SMTP_PASSWORD (et optionnellement SMTP_FROM) dans .env' });
        }
        const to = args.to as string;
        const subject = args.subject as string;
        const text = args.text as string | undefined;
        const html = args.html as string | undefined;
        if (!to?.trim() || !subject?.trim()) {
          return serializeForModel({ error: 'to et subject sont requis' });
        }
        const result = await sendEmailService({ to: to.trim(), subject: subject.trim(), text, html });
        if (result.error) return serializeForModel({ error: result.error });
        return serializeForModel({ success: true, message: 'Email envoyé' });
      }

      case 'list_calendar_events': {
        const dateFrom = args.dateFrom as string | undefined;
        const dateTo = args.dateTo as string | undefined;
        const limit = args.limit ? Math.min(Number(args.limit) || 50, 100) : 50;
        const where: { tenantId: string; debut?: { gte?: Date; lte?: Date } } = { tenantId };
        if (dateFrom || dateTo) {
          where.debut = {};
          if (dateFrom) where.debut.gte = new Date(dateFrom);
          if (dateTo) where.debut.lte = new Date(dateTo);
        }
        const events = await prisma.agentCalendarEvent.findMany({
          where,
          orderBy: { debut: 'asc' },
          take: limit,
        });
        return serializeForModel({ count: events.length, events });
      }

      case 'create_calendar_event': {
        const titre = args.titre as string;
        const debut = args.debut as string;
        const fin = args.fin as string;
        const description = args.description as string | undefined;
        const lieu = args.lieu as string | undefined;
        const rappelMin = args.rappelMin != null ? Number(args.rappelMin) : undefined;
        if (!titre?.trim() || !debut || !fin) {
          return serializeForModel({ error: 'titre, debut et fin sont requis (ISO 8601)' });
        }
        const event = await prisma.agentCalendarEvent.create({
          data: {
            tenantId,
            titre: titre.trim(),
            debut: new Date(debut),
            fin: new Date(fin),
            description: description?.trim() || null,
            lieu: lieu?.trim() || null,
            rappelMin: Number.isFinite(rappelMin) ? rappelMin! : null,
          },
        });
        return serializeForModel(event);
      }

      case 'update_calendar_event': {
        const id = args.id as string;
        if (!id) return serializeForModel({ error: 'id requis' });
        const existing = await prisma.agentCalendarEvent.findFirst({
          where: { id, tenantId },
        });
        if (!existing) return serializeForModel({ error: 'Événement non trouvé ou pas dans ce tenant', id });
        const data: { titre?: string; debut?: Date; fin?: Date; description?: string | null; lieu?: string | null; rappelMin?: number | null } = {};
        if (args.titre != null) data.titre = String(args.titre);
        if (args.debut != null) data.debut = new Date(args.debut as string);
        if (args.fin != null) data.fin = new Date(args.fin as string);
        if (args.description !== undefined) data.description = args.description ? String(args.description) : null;
        if (args.lieu !== undefined) data.lieu = args.lieu ? String(args.lieu) : null;
        if (args.rappelMin !== undefined) data.rappelMin = Number(args.rappelMin) || null;
        const updated = await prisma.agentCalendarEvent.update({
          where: { id },
          data,
        });
        return serializeForModel(updated);
      }

      case 'delete_calendar_event': {
        const id = args.id as string;
        if (!id) return serializeForModel({ error: 'id requis' });
        const event = await prisma.agentCalendarEvent.findFirst({
          where: { id, tenantId },
        });
        if (!event) return serializeForModel({ error: 'Événement non trouvé ou pas dans ce tenant', id });
        await prisma.agentCalendarEvent.delete({ where: { id } });
        return serializeForModel({ success: true, message: 'Événement supprimé' });
      }

      case 'qonto_transactions': {
        if (!isQontoConfigured()) {
          return serializeForModel({ error: 'Qonto non configuré. Définir QONTO_API_SECRET et QONTO_BANK_ACCOUNT_ID (ou QONTO_ORG_ID) dans .env' });
        }
        const settledAtFrom = args.settledAtFrom as string | undefined;
        const settledAtTo = args.settledAtTo as string | undefined;
        const side = args.side as 'credit' | 'debit' | undefined;
        const perPage = args.perPage ? Math.min(Number(args.perPage) || 50, 100) : 50;
        const result = await listQontoTransactions({
          settledAtFrom,
          settledAtTo,
          side,
          perPage,
        });
        if (result.error) return serializeForModel({ error: result.error });
        return serializeForModel({
          transactions: result.transactions,
          meta: result.meta,
          summary: result.summary,
        });
      }

      default:
        return serializeForModel({ error: `Outil inconnu: ${name}` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return serializeForModel({ error: message });
  }
}

export async function chatAgent(options: AgentChatOptions): Promise<AgentChatResult> {
  const { message, history = [], tenantId } = options;

  if (!env.OPENAI_API_KEY) {
    return {
      reply: "L'assistant IA n'est pas configuré (OPENAI_API_KEY manquante). Configurez la clé dans .env puis redémarrez.",
      success: false,
      error: 'OPENAI_API_KEY manquante',
    };
  }

  const messages: OpenAIMessage[] = [
    { role: 'system', content: SUPER_AGENT_SYSTEM_PROMPT },
    ...history.map((h) =>
      h.role === 'user'
        ? { role: 'user' as const, content: h.content }
        : { role: 'assistant' as const, content: h.content }
    ),
    { role: 'user', content: message },
  ];

  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations += 1;

    const body: Record<string, unknown> = {
      model: OPENAI_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 2000,
      tools: AGENT_TOOLS,
      tool_choice: 'auto',
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      const errMsg = errData?.error?.message || response.statusText;
      return {
        reply: `Erreur API OpenAI : ${errMsg}. Vérifiez votre clé et quota.`,
        success: false,
        error: errMsg,
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: Array<{
            id: string;
            type: 'function';
            function: { name: string; arguments: string };
          }>;
        };
      }>;
    };
    const choice = data.choices?.[0]?.message;
    if (!choice) {
      return {
        reply: "Réponse vide de l'assistant.",
        success: false,
        error: 'Empty response',
      };
    }

    messages.push({
      role: 'assistant',
      content: choice.content ?? null,
      tool_calls: choice.tool_calls,
    });

    if (!choice.tool_calls?.length) {
      const reply = choice.content?.trim() || "Je n'ai pas de réponse à afficher.";
      return { reply, success: true };
    }

    for (const tc of choice.tool_calls) {
      let toolArgs: Record<string, unknown> = {};
      try {
        toolArgs = JSON.parse(tc.function.arguments || '{}');
      } catch {
        // ignore
      }
      const toolResult = await executeTool(tc.function.name, toolArgs, tenantId);
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: toolResult,
      });
    }
  }

  return {
    reply: "Nombre maximum d'étapes atteint. Réessayez avec une demande plus simple.",
    success: false,
    error: 'Max iterations',
  };
}
