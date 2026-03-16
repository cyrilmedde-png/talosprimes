import { FastifyInstance } from 'fastify';
import { n8nService } from '../../services/n8n.service.js';

export async function newsletterRoutes(fastify: FastifyInstance) {

  // ===== SUBSCRIBERS =====

  fastify.get('/subscribers', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    const { limit, offset, search, status, source, listId } = request.query as any;

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'subscribers_list', {
        limit: limit || 50,
        offset: offset || 0,
        search,
        status,
        source,
        listId
      });

      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  fastify.post('/subscribers', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    const { email, telephone, nom, prenom, entreprise, source, tags } = request.body as any;

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'subscribers_create', {
        email,
        telephone,
        nom,
        prenom,
        entreprise,
        source,
        tags
      });

      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  fastify.put('/subscribers/:id', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    const { id } = request.params as any;
    const { email, nom, prenom, telephone, entreprise, tags, status } = request.body as any;

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'subscribers_update', {
        id,
        email,
        nom,
        prenom,
        telephone,
        entreprise,
        tags,
        status
      });

      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  fastify.delete('/subscribers/:id', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    const { id } = request.params as any;

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'subscribers_delete', {
        id
      });

      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  // ===== SUBSCRIBER LISTS =====

  fastify.get('/subscribers/lists', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'subscriber_lists_list', {});

      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  fastify.post('/subscribers/lists', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    const { nom, description, type, couleur, subscriberIds } = request.body as any;

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'subscriber_lists_create', {
        nom,
        description,
        type,
        couleur,
        subscriberIds
      });

      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  // ===== EMAIL TEMPLATES =====

  fastify.get('/templates', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    const { categorie } = request.query as any;

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'email_templates_list', {
        categorie
      });

      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  fastify.get('/templates/:id', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    const { id } = request.params as any;

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'email_templates_get', {
        id
      });

      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  fastify.post('/templates', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    const { nom, sujet, contenuHtml, contenuText, variables, categorie } = request.body as any;

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'email_templates_create', {
        nom,
        sujet,
        contenuHtml,
        contenuText,
        variables,
        categorie
      });

      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  fastify.put('/templates/:id', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    const { id } = request.params as any;
    const { nom, sujet, contenuHtml, contenuText, variables, categorie } = request.body as any;

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'email_templates_update', {
        id,
        nom,
        sujet,
        contenuHtml,
        contenuText,
        variables,
        categorie
      });

      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  fastify.delete('/templates/:id', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    const { id } = request.params as any;

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'email_templates_delete', {
        id
      });

      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  // ===== CAMPAIGNS =====

  fastify.get('/campaigns/stats', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'newsletter_campaigns_stats', {});

      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  fastify.get('/campaigns', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    const { limit, offset, status } = request.query as any;

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'newsletter_campaigns_list', {
        limit: limit || 50,
        offset: offset || 0,
        status
      });

      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  fastify.get('/campaigns/:id', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    const { id } = request.params as any;

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'newsletter_campaigns_get', {
        id
      });

      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  fastify.post('/campaigns', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    const {
      nom,
      sujet,
      templateId,
      listId,
      contenuHtml,
      contenuText,
      expediteurNom,
      expediteurEmail,
      scheduledAt
    } = request.body as any;

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'newsletter_campaigns_create', {
        nom,
        sujet,
        templateId,
        listId,
        contenuHtml,
        contenuText,
        expediteurNom,
        expediteurEmail,
        scheduledAt
      });

      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  fastify.put('/campaigns/:id', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    const { id } = request.params as any;
    const {
      nom,
      sujet,
      templateId,
      listId,
      contenuHtml,
      contenuText,
      expediteurNom,
      expediteurEmail,
      scheduledAt
    } = request.body as any;

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'newsletter_campaigns_update', {
        id,
        nom,
        sujet,
        templateId,
        listId,
        contenuHtml,
        contenuText,
        expediteurNom,
        expediteurEmail,
        scheduledAt
      });

      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  fastify.delete('/campaigns/:id', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    const { id } = request.params as any;

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'newsletter_campaigns_delete', {
        id
      });

      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  // ===== SMS CAMPAIGNS =====

  fastify.get('/sms-campaigns/stats', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'sms_campaigns_stats', {});
      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  fastify.get('/sms-campaigns', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    const { limit, offset, status } = request.query as any;

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'sms_campaigns_list', {
        limit: limit || 50,
        offset: offset || 0,
        status
      });
      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  fastify.post('/sms-campaigns', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    const { nom, contenu, listId, scheduledAt } = request.body as any;

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'sms_campaigns_create', {
        nom, contenu, listId, scheduledAt
      });
      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  // ===== SUBSCRIBER STATS =====

  fastify.get('/subscribers/stats', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'subscribers_stats', {});
      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });

  // ===== ANALYTICS =====

  fastify.get('/analytics', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) return reply.status(401).send({ error: 'Non autorisé' });

    try {
      const res = await n8nService.callWorkflowReturn(tenantId, 'newsletter_analytics', {});
      const data = res.data as any;
      return reply.send({ success: true, data });
    } catch (error) {
      return reply.status(200).send({
        success: false,
        error: `Erreur n8n: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    }
  });
}
