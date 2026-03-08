'use client';

import { Mail, Phone, MapPin, Sparkles } from 'lucide-react';
import { LandingContactForm } from '@/components/landing/LandingContactForm';

interface ContactConfig {
  title?: string;
  subtitle?: string;
  email?: string;
  phone?: string;
  address?: string;
  rappelIA?: { title?: string; description?: string; actif?: boolean };
}

export function ContactSection({
  config,
  contactInfo,
}: {
  config: ContactConfig;
  contactInfo?: { email?: string; phone?: string; address?: string };
  theme?: any;
}) {
  const email = config.email || contactInfo?.email || 'contact@talosprimes.com';
  const phone = config.phone || contactInfo?.phone || '+33 1 23 45 67 89';
  const address = config.address || contactInfo?.address || '123 Avenue de la Tech\n75001 Paris';

  return (
    <section id="contact" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            {config.title || 'Contactez-nous'}
          </h2>
          <p className="text-slate-500 text-base">
            {config.subtitle || 'Une question ? Notre équipe vous répond rapidement.'}
          </p>
        </div>
        <div className="grid md:grid-cols-5 gap-8">
          <LandingContactForm className="md:col-span-3 space-y-3" />
          <div className="md:col-span-2 space-y-3">
            <div className="flex gap-4 p-4 rounded-xl border border-slate-200/80 bg-white">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <div className="font-medium text-slate-900 text-sm">Email</div>
                <p className="text-slate-500 text-sm mt-0.5">{email}</p>
              </div>
            </div>
            <div className="flex gap-4 p-4 rounded-xl border border-slate-200/80 bg-white">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <div className="font-medium text-slate-900 text-sm">Téléphone</div>
                <p className="text-slate-500 text-sm mt-0.5">{phone}</p>
              </div>
            </div>
            <div className="flex gap-4 p-4 rounded-xl border border-slate-200/80 bg-white">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <div className="font-medium text-slate-900 text-sm">Adresse</div>
                <p className="text-slate-500 text-sm mt-0.5 whitespace-pre-line">{address}</p>
              </div>
            </div>
            {config.rappelIA?.actif !== false && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white">
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
