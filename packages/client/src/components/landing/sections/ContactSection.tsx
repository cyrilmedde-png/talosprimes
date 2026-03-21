'use client';

import { Mail, Phone, MapPin, Sparkles, TicketIcon } from 'lucide-react';
import { LandingContactForm } from '@/components/landing/LandingContactForm';
import { LandingTicketForm } from '@/components/landing/LandingTicketForm';
import { useState } from 'react';

interface ContactConfig {
  title?: string;
  subtitle?: string;
  email?: string;
  phone?: string;
  address?: string;
  rappelIA?: { title?: string; description?: string; actif?: boolean };
  ticketing?: { actif?: boolean; titre?: string };
}

export function ContactSection({
  config,
  contactInfo,
}: {
  config: ContactConfig;
  contactInfo?: { email?: string; phone?: string; address?: string };
  theme?: Record<string, unknown>;
}) {
  const email = config.email || contactInfo?.email || 'contact@talosprimes.com';
  const phone = config.phone || contactInfo?.phone || '+33 1 23 45 67 89';
  const address = config.address || contactInfo?.address || '123 Avenue de la Tech\n75001 Paris';

  const ticketingActif = config.ticketing?.actif !== false; // actif par défaut
  const [formMode, setFormMode] = useState<'contact' | 'ticket'>(ticketingActif ? 'ticket' : 'contact');

  return (
    <section id="contact" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            {config.title || 'Contactez-nous'}
          </h2>
          <p className="text-slate-400 text-base">
            {config.subtitle || 'Une question ? Notre équipe vous répond rapidement.'}
          </p>
        </div>
        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-3">
            {/* Toggle Contact / Ticket si ticketing actif */}
            {ticketingActif && (
              <div className="flex rounded-lg border border-slate-700 overflow-hidden mb-4">
                <button
                  type="button"
                  onClick={() => setFormMode('ticket')}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition flex items-center justify-center gap-2 ${
                    formMode === 'ticket' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <TicketIcon size={15} /> {config.ticketing?.titre || 'Ouvrir un ticket'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormMode('contact')}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition flex items-center justify-center gap-2 ${
                    formMode === 'contact' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Mail size={15} /> Message rapide
                </button>
              </div>
            )}

            {formMode === 'contact' ? (
              <LandingContactForm className="space-y-3" />
            ) : (
              <LandingTicketForm className="" />
            )}
          </div>
          <div className="md:col-span-2 space-y-3">
            <div className="flex gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-white text-sm">Email</div>
                <p className="text-slate-400 text-sm mt-0.5">{email}</p>
              </div>
            </div>
            <div className="flex gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-white text-sm">Téléphone</div>
                <p className="text-slate-400 text-sm mt-0.5">{phone}</p>
              </div>
            </div>
            <div className="flex gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-white text-sm">Adresse</div>
                <p className="text-slate-400 text-sm mt-0.5 whitespace-pre-line">{address}</p>
              </div>
            </div>
            {config.rappelIA?.actif !== false && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-600/20 to-violet-600/20 border border-blue-500/20 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium">{config.rappelIA?.title || 'Rappel IA immédiat'}</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  {config.rappelIA?.description || 'Cliquez sur la bulle en bas à droite pour être rappelé instantanément par notre agent IA.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
