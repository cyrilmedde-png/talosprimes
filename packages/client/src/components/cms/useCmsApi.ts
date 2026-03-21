'use client';

import { useCallback, useMemo } from 'react';
import { getAccessToken } from '@/lib/auth';
import type { LandingSection, GlobalConfig, Testimonial, CMSPage, ContactMessage } from './types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getHeaders() {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function useCmsApi() {
  // ─── SECTIONS ───
  const fetchSections = useCallback(async (): Promise<LandingSection[]> => {
    const res = await fetch(`${API}/api/landing/sections/all`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur chargement sections');
    const json = await res.json();
    return (json.data || json || []).sort((a: LandingSection, b: LandingSection) => a.ordre - b.ordre);
  }, []);

  const createSection = useCallback(async (data: Partial<LandingSection>) => {
    const res = await fetch(`${API}/api/landing/sections`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Erreur création section');
    return res.json();
  }, []);

  const updateSection = useCallback(async (id: string, data: Partial<LandingSection>) => {
    const res = await fetch(`${API}/api/landing/sections/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Erreur mise à jour section');
    return res.json();
  }, []);

  const deleteSection = useCallback(async (id: string) => {
    const res = await fetch(`${API}/api/landing/sections/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur suppression section');
    return res.json();
  }, []);

  const reorderSections = useCallback(async (orderedIds: { id: string; ordre: number }[]) => {
    const res = await fetch(`${API}/api/landing/sections/reorder`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ items: orderedIds }) });
    if (!res.ok) throw new Error('Erreur réordonnancement');
    return res.json();
  }, []);

  // ─── GLOBAL CONFIG ───
  const fetchGlobalConfig = useCallback(async (): Promise<GlobalConfig> => {
    const res = await fetch(`${API}/api/landing/global-config/all`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur chargement config');
    const json = await res.json();
    return json.data || json || {};
  }, []);

  const updateGlobalConfig = useCallback(async (section: string, config: Record<string, unknown>) => {
    const res = await fetch(`${API}/api/landing/global-config/${section}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ config }) });
    if (!res.ok) throw new Error('Erreur mise à jour config');
    return res.json();
  }, []);

  // ─── TESTIMONIALS ───
  const fetchTestimonials = useCallback(async (): Promise<Testimonial[]> => {
    const res = await fetch(`${API}/api/landing/testimonials/all`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur chargement témoignages');
    const json = await res.json();
    return json.data || json || [];
  }, []);

  const createTestimonial = useCallback(async (data: Partial<Testimonial>) => {
    const res = await fetch(`${API}/api/landing/testimonials`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Erreur création témoignage');
    return res.json();
  }, []);

  const updateTestimonial = useCallback(async (id: string, data: Partial<Testimonial>) => {
    const res = await fetch(`${API}/api/landing/testimonials/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Erreur mise à jour témoignage');
    return res.json();
  }, []);

  const deleteTestimonial = useCallback(async (id: string) => {
    const res = await fetch(`${API}/api/landing/testimonials/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur suppression témoignage');
    return res.json();
  }, []);

  // ─── PAGES ───
  const fetchPages = useCallback(async (): Promise<CMSPage[]> => {
    const res = await fetch(`${API}/api/landing/pages/all`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur chargement pages');
    const json = await res.json();
    return json.data || json || [];
  }, []);

  const createPage = useCallback(async (data: Partial<CMSPage>) => {
    const res = await fetch(`${API}/api/landing/pages`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Erreur création page');
    return res.json();
  }, []);

  const updatePage = useCallback(async (id: string, data: Partial<CMSPage>) => {
    const res = await fetch(`${API}/api/landing/pages/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Erreur mise à jour page');
    return res.json();
  }, []);

  const deletePage = useCallback(async (id: string) => {
    const res = await fetch(`${API}/api/landing/pages/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur suppression page');
    return res.json();
  }, []);

  // ─── MESSAGES ───
  const fetchMessages = useCallback(async (): Promise<ContactMessage[]> => {
    const res = await fetch(`${API}/api/landing/contact`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur chargement messages');
    const json = await res.json();
    return json.data || json || [];
  }, []);

  const markMessageHandled = useCallback(async (id: string) => {
    const res = await fetch(`${API}/api/landing/contact/${id}/traite`, { method: 'PATCH', headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur');
    return res.json();
  }, []);

  const deleteMessage = useCallback(async (id: string) => {
    const res = await fetch(`${API}/api/landing/contact/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur suppression message');
    return res.json();
  }, []);

  // ─── LEGAL AI ───
  const generateLegal = useCallback(async (pageId: string, data: Record<string, string>) => {
    const res = await fetch(`${API}/api/landing/generate-legal/${pageId}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Erreur génération');
    return res.json();
  }, []);

  return useMemo(() => ({
    fetchSections, createSection, updateSection, deleteSection, reorderSections,
    fetchGlobalConfig, updateGlobalConfig,
    fetchTestimonials, createTestimonial, updateTestimonial, deleteTestimonial,
    fetchPages, createPage, updatePage, deletePage,
    fetchMessages, markMessageHandled, deleteMessage,
    generateLegal,
  }), [
    fetchSections, createSection, updateSection, deleteSection, reorderSections,
    fetchGlobalConfig, updateGlobalConfig,
    fetchTestimonials, createTestimonial, updateTestimonial, deleteTestimonial,
    fetchPages, createPage, updatePage, deletePage,
    fetchMessages, markMessageHandled, deleteMessage,
    generateLegal,
  ]);
}
