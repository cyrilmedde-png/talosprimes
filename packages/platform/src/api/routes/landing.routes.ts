import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database.js';
import { generateLegalContent } from '../../services/openai.service.js';
import { n8nService } from '../../services/n8n.service.js';
import { ApiError } from '../../utils/api-errors.js';

// Templates pour génération IA
const legalTemplates = {
  'mentions-legales': (data: Record<string, string>) => `Génère des mentions légales complètes et conformes pour une entreprise française avec les informations suivantes:
- Raison sociale: ${data.companyName}
- SIRET: ${data.siret}
- TVA: ${data.tva}
- Adresse: ${data.address}
- Email: ${data.email}
- Téléphone: ${data.phone}

Le texte doit inclure: informations légales, directeur de publication, hébergement (OVH), propriété intellectuelle, protection des données RGPD, cookies, limitation de responsabilité, droit applicable.
Format: Markdown avec titres ## et sections numérotées.`,

  'cgu': (data: Record<string, string>) => `Génère des Conditions Générales d'Utilisation (CGU) complètes pour une plateforme SaaS française nommée "${data.companyName}".
La plateforme propose: CRM multi-tenant, facturation automatisée, workflows n8n, gestion d'équipe.

Inclure: objet, accès, création de compte, services, obligations utilisateur, propriété intellectuelle, protection données RGPD, disponibilité, limitation responsabilité, suspension/résiliation, modifications CGU, droit applicable.
Format: Markdown avec titres ## et sections numérotées.`,

  'cgv': (data: Record<string, string>) => `Génère des Conditions Générales de Vente (CGV) complètes pour "${data.companyName}", plateforme SaaS B2B française.

Services: CRM, facturation, automation n8n. Paiement via Stripe. Abonnements mensuels/annuels.

Inclure: préambule, services, tarifs et paiement, durée et renouvellement, droit de rétractation, obligations vendeur/client, garanties, responsabilité, propriété données, force majeure, modifications, droit applicable.
Format: Markdown avec titres ## et sections numérotées.`,

  'confidentialite': (data: Record<string, string>) => `Génère une Politique de Confidentialité et RGPD complète pour "${data.companyName}" (${data.email}).

Plateforme SaaS multi-tenant. Hébergement: OVH. Paiement: Stripe. Base de données: Supabase PostgreSQL.

Inclure: introduction, responsable traitement, données collectées (identification, connexion, paiement, métiers), finalités, base légale, durée conservation, destinataires, transferts hors UE, sécurité (SSL, bcrypt, isolation), droits RGPD (accès, rectification, effacement, portabilité), réclamation CNIL, cookies, modifications, contact DPO.
Format: Markdown avec titres ## et sections numérotées.`,
};

// Types
interface TestimonialBody {
  nom: string;
  prenom: string;
  entreprise?: string;
  poste?: string;
  avatar?: string;
  note: number;
  commentaire: string;
  affiche?: boolean;
  ordre?: number;
}

interface ContactMessageBody {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  entreprise?: string;
  message: string;
}

export async function landingRoutes(fastify: FastifyInstance) {
  
  // ===== LANDING CONTENT (Contenu éditable) =====

  // GET /api/landing/content - Récupérer tout le contenu
  fastify.get('/api/landing/content', async (_request, reply) => {
    try {
      const content = await prisma.landingContent.findMany({
        orderBy: { section: 'asc' }
      });
      
      // Transformer en objet clé-valeur pour faciliter l'accès
      const contentMap = content.reduce((acc: Record<string, string>, item: typeof content[0]) => {
        acc[item.section] = item.contenu;
        return acc;
      }, {} as Record<string, string>);

      return reply.send(contentMap);
    } catch (error) {
      fastify.log.error(error);
      return ApiError.internal(reply, 'Erreur lors de la récupération du contenu');
    }
  });

  // PUT /api/landing/content/:section - Mettre à jour une section (ADMIN)
  fastify.put<{ Params: { section: string }; Body: { contenu: string } }>(
    '/api/landing/content/:section',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (request, reply) => {
      const { section } = request.params;
      const { contenu } = request.body;

      try {
        const updated = await prisma.landingContent.upsert({
          where: { section },
          update: { contenu },
          create: { section, contenu },
        });

        return reply.send(updated);
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply, 'Erreur lors de la mise à jour du contenu');
      }
    }
  );

  // ===== TESTIMONIALS (Avis clients) =====

  // GET /api/landing/testimonials - Récupérer les testimonials affichés
  fastify.get('/api/landing/testimonials', async (_request, reply) => {
    try {
      const testimonials = await prisma.testimonial.findMany({
        where: { affiche: true },
        orderBy: { ordre: 'asc' }
      });
      return reply.send(testimonials);
    } catch (error) {
      fastify.log.error(error);
      return ApiError.internal(reply);
    }
  });

  // GET /api/landing/testimonials/all - Récupérer tous les testimonials (ADMIN)
  fastify.get(
    '/api/landing/testimonials/all',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (_request, reply) => {
      try {
        const testimonials = await prisma.testimonial.findMany({
          orderBy: { ordre: 'asc' }
        });
        return reply.send(testimonials);
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // POST /api/landing/testimonials - Créer un testimonial (ADMIN)
  fastify.post<{ Body: TestimonialBody }>(
    '/api/landing/testimonials',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (request, reply) => {
      const { nom, prenom, entreprise, poste, avatar, note, commentaire, affiche, ordre } = request.body;

      try {
        const testimonial = await prisma.testimonial.create({
          data: {
            nom,
            prenom,
            entreprise,
            poste,
            avatar,
            note: note || 5,
            commentaire,
            affiche: affiche ?? true,
            ordre: ordre || 0,
          },
        });

        return reply.status(201).send(testimonial);
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // PUT /api/landing/testimonials/:id - Modifier un testimonial (ADMIN)
  fastify.put<{ Params: { id: string }; Body: Partial<TestimonialBody> }>(
    '/api/landing/testimonials/:id',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { nom, prenom, entreprise, poste, avatar, note, commentaire, affiche, ordre } = request.body;

      try {
        const testimonial = await prisma.testimonial.update({
          where: { id },
          data: {
            nom,
            prenom,
            entreprise,
            poste,
            avatar,
            note,
            commentaire,
            affiche,
            ordre,
          },
        });

        return reply.send(testimonial);
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // DELETE /api/landing/testimonials/:id - Supprimer un testimonial (ADMIN)
  fastify.delete<{ Params: { id: string } }>(
    '/api/landing/testimonials/:id',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        await prisma.testimonial.delete({ where: { id } });
        return reply.send({ success: true, message: 'Témoignage supprimé' });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // ===== CONTACT MESSAGES =====

  // POST /api/landing/contact - Envoyer un message de contact (PUBLIC, rate limit strict anti-spam)
  fastify.post<{ Body: ContactMessageBody }>(
    '/api/landing/contact',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const { nom, prenom, email, telephone, entreprise, message } = request.body;

      // Validation basique
      if (!nom || !prenom || !email || !message) {
        return ApiError.badRequest(reply, 'Les champs nom, prénom, email et message sont requis');
      }

      try {
        await prisma.contactMessage.create({
          data: {
            nom,
            prenom,
            email,
            telephone,
            entreprise,
            message,
          },
        });

        // TODO: Envoyer une notification par email à l'admin
        // TODO: Déclencher un workflow n8n pour traiter le message

        return reply.status(201).send({ 
          success: true, 
          message: 'Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.' 
        });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // GET /api/landing/contact - Récupérer tous les messages de contact (ADMIN)
  fastify.get(
    '/api/landing/contact',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (_request, reply) => {
      try {
        const messages = await prisma.contactMessage.findMany({
          orderBy: { createdAt: 'desc' }
        });
        return reply.send(messages);
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // PATCH /api/landing/contact/:id/traite - Marquer un message comme traité (ADMIN)
  fastify.patch<{ Params: { id: string } }>(
    '/api/landing/contact/:id/traite',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const message = await prisma.contactMessage.update({
          where: { id },
          data: { traite: true },
        });

        return reply.send(message);
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // DELETE /api/landing/contact/:id - Supprimer un message de contact (ADMIN)
  fastify.delete<{ Params: { id: string } }>(
    '/api/landing/contact/:id',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        await prisma.contactMessage.delete({ where: { id } });
        return reply.send({ success: true, message: 'Message supprimé' });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // ===== CALLBACK IA (Rappel automatique depuis landing) =====

  // POST /api/landing/callback - Demander un rappel IA (PUBLIC, rate limit strict)
  fastify.post<{ Body: { nom?: string; telephone: string } }>(
    '/api/landing/callback',
    {
      config: {
        rateLimit: {
          max: 2,
          timeWindow: '5 minutes',
        },
      },
    },
    async (request, reply) => {
      const { nom, telephone } = request.body || {};

      if (!telephone || !/^\+?[0-9\s\-().]{6,20}$/.test(telephone.trim())) {
        return ApiError.badRequest(reply, 'Numéro de téléphone invalide');
      }

      const cleanPhone = telephone.trim().replace(/[\s\-().]/g, '');

      try {
        // 1) Sauvegarder la demande comme message de contact
        await prisma.contactMessage.create({
          data: {
            nom: nom?.trim() || 'Visiteur landing',
            prenom: '',
            email: '',
            telephone: cleanPhone,
            message: `Demande de rappel IA depuis la landing page`,
          },
        });

        // 2) Trouver le tenant qui a une config Twilio active
        const twilioConfig = await prisma.twilioConfig.findFirst({
          where: { agentActif: true },
          select: { tenantId: true },
        });

        if (!twilioConfig) {
          fastify.log.warn('Callback landing: aucun tenant avec agent IA actif');
          // On retourne quand même success pour ne pas bloquer le visiteur
          return reply.status(200).send({
            success: true,
            message: 'Demande enregistrée. Un conseiller vous rappellera.',
          });
        }

        // 3) Déclencher l'appel sortant via n8n
        const callResult = await n8nService.callWorkflowReturn<Record<string, unknown>>(
          twilioConfig.tenantId,
          'twilio_outbound_call',
          {
            to: cleanPhone,
            reason: 'landing_callback',
            callerName: nom?.trim() || 'Visiteur',
          }
        );

        if (!callResult.success) {
          fastify.log.error({ callResult }, 'Callback landing: erreur n8n');
        }

        return reply.status(200).send({
          success: true,
          message: 'Rappel en cours. Léa vous appelle dans quelques instants.',
        });
      } catch (error) {
        fastify.log.error(error, 'Erreur callback landing');
        return ApiError.internal(reply);
      }
    }
  );

  // ===== CMS PAGES DYNAMIQUES =====

  // GET /api/landing/pages - Pages publiées (PUBLIC)
  fastify.get(
    '/api/landing/pages',
    async (_request, reply) => {
      try {
        const pages = await prisma.cmsPage.findMany({
          where: { publie: true },
          orderBy: { ordre: 'asc' },
        });
        return reply.send({ success: true, data: { pages } });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // GET /api/landing/pages/all - Toutes les pages (ADMIN)
  fastify.get(
    '/api/landing/pages/all',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (_request, reply) => {
      try {
        const pages = await prisma.cmsPage.findMany({
          orderBy: { ordre: 'asc' },
        });
        return reply.send({ success: true, data: { pages } });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // GET /api/landing/pages/:slug - Page par slug (PUBLIC)
  // Pour le slug "tarifs", inclut aussi les plans actifs
  fastify.get<{ Params: { slug: string } }>(
    '/api/landing/pages/:slug',
    async (request, reply) => {
      const { slug } = request.params;
      try {
        const page = await prisma.cmsPage.findUnique({ where: { slug } });
        if (!page || !page.publie) {
          return ApiError.notFound(reply, 'Page');
        }

        // Si c'est la page tarifs, inclure les plans actifs
        if (slug === 'tarifs') {
          const plans = await prisma.plan.findMany({
            where: { actif: true },
            orderBy: { prixMensuel: 'asc' },
            include: {
              planModules: {
                include: {
                  module: { select: { code: true, nomAffiche: true, categorie: true } },
                },
              },
            },
          });
          return reply.send({ success: true, data: { page, plans } });
        }

        return reply.send({ success: true, data: { page } });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // POST /api/landing/pages - Créer une page (ADMIN)
  fastify.post<{
    Body: {
      slug: string;
      titre: string;
      contenu: string;
      metaTitle?: string;
      metaDesc?: string;
      publie?: boolean;
      ordre?: number;
    };
  }>(
    '/api/landing/pages',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (request, reply) => {
      const { slug, titre, contenu, metaTitle, metaDesc, publie, ordre } = request.body;

      if (!slug || !titre) {
        return ApiError.badRequest(reply, 'Slug et titre sont requis');
      }

      try {
        const page = await prisma.cmsPage.create({
          data: {
            slug: slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            titre,
            contenu: contenu || '',
            metaTitle: metaTitle || null,
            metaDesc: metaDesc || null,
            publie: publie ?? false,
            ordre: ordre ?? 0,
          },
        });
        return reply.status(201).send({ success: true, data: { page } });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // PUT /api/landing/pages/:id - Modifier une page (ADMIN)
  fastify.put<{
    Params: { id: string };
    Body: {
      slug?: string;
      titre?: string;
      contenu?: string;
      metaTitle?: string;
      metaDesc?: string;
      publie?: boolean;
      ordre?: number;
    };
  }>(
    '/api/landing/pages/:id',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { slug, titre, contenu, metaTitle, metaDesc, publie, ordre } = request.body;

      try {
        const data: Record<string, unknown> = {};
        if (slug !== undefined) data.slug = slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (titre !== undefined) data.titre = titre;
        if (contenu !== undefined) data.contenu = contenu;
        if (metaTitle !== undefined) data.metaTitle = metaTitle;
        if (metaDesc !== undefined) data.metaDesc = metaDesc;
        if (publie !== undefined) data.publie = publie;
        if (ordre !== undefined) data.ordre = ordre;

        const page = await prisma.cmsPage.update({ where: { id }, data });
        return reply.send({ success: true, data: { page } });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // DELETE /api/landing/pages/:id - Supprimer une page (ADMIN)
  fastify.delete<{ Params: { id: string } }>(
    '/api/landing/pages/:id',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (request, reply) => {
      const { id } = request.params;
      try {
        await prisma.cmsPage.delete({ where: { id } });
        return reply.send({ success: true, message: 'Page supprimée' });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // GET /api/landing/tarifs - Plans publics pour affichage tarifs (PUBLIC)
  fastify.get(
    '/api/landing/tarifs',
    async (_request, reply) => {
      try {
        const plans = await prisma.plan.findMany({
          where: { actif: true },
          orderBy: { prixMensuel: 'asc' },
          include: {
            planModules: {
              include: {
                module: { select: { code: true, nomAffiche: true, categorie: true } },
              },
            },
          },
        });
        return reply.send({ success: true, data: { plans } });
      } catch (error) {
        fastify.log.error(error);
        return ApiError.internal(reply);
      }
    }
  );

  // ===== GÉNÉRATION IA PAGES LÉGALES =====

  // POST /api/landing/generate-legal/:pageId - Générer contenu légal avec IA (ADMIN)
  fastify.post<{ 
    Params: { pageId: string }; 
    Body: { 
      companyName: string; 
      siret: string; 
      tva: string; 
      address: string; 
      email: string; 
      phone: string;
      hostingProvider?: string;
      hostingAddress?: string;
      insuranceCompany?: string;
      insurancePolicyNumber?: string;
      insuranceCoverage?: string;
    } 
  }>(
    '/api/landing/generate-legal/:pageId',
    {
      preHandler: [fastify.authenticate, fastify.requireRole('super_admin', 'admin')],
    },
    async (request, reply) => {
      const { pageId } = request.params;
      const companyData = request.body;

      // Vérifier que le pageId est valide
      if (!legalTemplates[pageId as keyof typeof legalTemplates]) {
        return ApiError.badRequest(reply, 'Page légale invalide');
      }

      try {
        fastify.log.info(`Génération IA pour ${pageId} - Entreprise: ${companyData.companyName}`);

        // Générer le contenu avec OpenAI
        const generatedContent = await generateLegalContent({
          pageType: pageId as 'mentions-legales' | 'cgu' | 'cgv' | 'confidentialite',
          companyName: companyData.companyName,
          siret: companyData.siret,
          tva: companyData.tva,
          address: companyData.address,
          email: companyData.email,
          phone: companyData.phone,
          hostingProvider: companyData.hostingProvider,
          hostingAddress: companyData.hostingAddress,
          insuranceCompany: companyData.insuranceCompany,
          insurancePolicyNumber: companyData.insurancePolicyNumber,
          insuranceCoverage: companyData.insuranceCoverage,
        });

        fastify.log.info(`Contenu généré avec succès pour ${pageId}`);

        return reply.send({ 
          success: true, 
          content: generatedContent,
          message: 'Contenu généré avec IA avec succès' 
        });
      } catch (error) {
        fastify.log.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la génération du contenu';
        return ApiError.internal(reply, errorMessage);
      }
    }
  );
}
