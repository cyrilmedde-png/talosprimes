'use client';

import { useCallback } from 'react';
import { getAccessToken } from '@/lib/auth';
import type { LandingSection, GlobalConfig, Testimonial, CMSPage, ContactMessage } from './types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function useHeaders() {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function useCmsApi() {
  const headers = useHeaders();

  // ─── SECTIONS ───
  const fetchSections = useCallback(async (): Promise<LandingSection[]> => {
    const res = await fetch(`${API}/api/landing/sections/all`, { headers });
    if (!res.ok) throw new Error('Erreur chargement sections');
    const json = await res.json();
    return (json.data || json || []).sort((a: LandingSection, b: LandingSection) => a.ordre - b.ordre);
  }, [headers]);

  const createSection = useCallback(async (data: Partial<LandingSection>) => {
    const res = await fetch(`${API}/api/landing/sections`, { method: 'POST', headers, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Erreur création section');
    return res.json();
  }, [headers]);

  const updateSection = useCallback(async (id: string, data: Partial<LandingSection>) => {
    const res = await fetch(`${API}/api/landing/sections/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Erreur mise à jour section');
    return res.json();
  }, [headers]);

  const deleteSection = useCallback(async (id: string) => {
    const res = await fetch(`${API}/api/landing/sections/${id}`, { method: 'DELETE', headers });
    if (!res.ok) throw new Error('Erreur suppression section');
    return res.json();
  }, [headers]);

  const reorderSections = useCallback(async (orderedIds: { id: string; ordre: number }[]) => {
    const res = await fetch(`${API}/api/landing/sections/reorder`, { method: 'PUT', headers, body: JSON.stringify({ sections: orderedIds }) });
    if (!res.ok) throw new Error('Erreur réordonnancement');
    return res.json();
  }, [headers]);

  // ─── GLOBAL CONFIG ───
  const fetchGlobalConfig = useCallback(async (): Promise<GlobalConfig> => {
    const res = await fetch(`${API}/api/landing/global-config/all`, { headers });
    if (!res.ok) throw new Error('Erreur chargement config');
    const json = await res.json();
    return json.data || json || {};
  }, [headers]);

  const updateGlobalConfig = useCallback(async (section: string, config: Record<string, unknown>) => {
    const res = await fetch(`${API}/api/landing/global-config/${section}`, { method: 'PUT', headers, body: JSON.stringify({ config }) });
    if (!res.ok) throw new Error('Erreur mise à jour config');
    return res.json();
  }, [headers]);

  // ─── TESTIMONIALS ───
  const fetchTestimonials = useCallback(async (): Promise<Testimonial[]> => {
    const res = await fetch(`${API}/api/landing/testimonials/all`, { headers });
    if (!res.ok) throw new Error('Erreur chargement témoignages');
    const json = await res.json();
    return json.data || json || [];
  }, [headers]);

  const createTestimonial = useCallback(async (data: Partial<Testimonial>) => {
    const res = await fetch(`${API}/api/landing/testimonials`, { method: 'POST', headers, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Erreur création témoignage');
    return res.json();
  }, [headers]);

  const updateTestimonial = useCallback(async (id: string, data: Partial<Testimonial>) => {
    const res = await fetch(`${API}/api/landing/testimonials/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Erreur mise à jour témoignage');
    return res.json();
  }, [headers]);

  const deleteTestimonial = useCallback(async (id: string) => {
    const res = await fetch(`${API}/api/landing/testimonials/${id}`, { method: 'DELETE', headers });
    if (!res.ok) throw new Error('Erreur suppression témoignage');
    return res.json();
  }, [headers]);

  // ─── PAGES ───
  const fetchPages = useCallback(async (): Promise<CMSPage[]> => {
    const res = await fetch(`${API}/api/landing/pages/all`, { headers });
    if (!res.ok) throw new Error('Erreur chargement pages');
    const json = await res.json();
    return json.data || json || [];
  }, [headers]);

  const createPage = useCallback(async (data: Partial<CMSPage>) => {
    const res = await fetch(`${API}/api/landing/pages`, { method: 'POST', headers, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Erreur création page');
    return res.json();
  }, [headers]);

  const updatePage = useCallback(async (id: string, data: Partial<CMSPage>) => {
    const res = await fetch(`${API}/api/landing/pages/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Erreur mise à jour page');
    return res.json();
  }, [headers]);

  const deletePage = useCallback(async (id: string) => {
    const res = await fetch(`${API}/api/landing/pages/${id}`, { method: 'DELETE', headers });
    if (!res.ok) throw new Error('Erreur suppression page');
    return res.json();
  }, [headers]);

  // ─── MESSAGES ───
  const fetchMessages = useCallback(async (): Promise<ContactMessage[]> => {
    const res = await fetch(`${API}/api/landing/contact`, { headers });
    if (!res.ok) throw new Error('Erreur chargement messages');
    const json = await res.json();
    return json.data || json || [];
  }, [headers]);

  const markMessageHandled = useCallback(async (id: string) => {
    const res = await fetch(`${API}/api/landing/contact/${id}/traite`, { method: 'PATCH', headers });
    if (!res.ok) throw new Error('Erreur');
    return res.json();
  }, [headers]);

  const deleteMessage = useCallback(async (id: string) => {
    const res = await fetch(`${API}/api/landing/contact/${id}`, { method: 'DELETE', headers });
    if (!res.ok) throw new Error('Erreur suppression message');
    return res.json();
  }, [headers]);

  // ─── LEGAL AI ───
  const generateLegal = useCallback(async (pageId: string, data: Record<string, string>) => {
    const res = await fetch(`${API}/api/landing/generate-legal/${pageId}`, { method: 'POST', headers, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Erreur génération');
    return res.json();
  }, [headers]);

  return {
    fetchSections, createSection, updateSection, deleteSection, reorderSections,
    fetchGlobalConfig, updateGlobalConfig,
    fetchTestimonials, createTestimonial, updateTestimonial, deleteTestimonial,
    fetchPages, createPage, updatePage, deletePage,
    fetchMessages, markMessageHandled, deleteMessage,
    generateLegal,
  };
}
