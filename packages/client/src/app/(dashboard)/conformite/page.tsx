'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  ShieldCheckIcon,
  DocumentTextIcon,
  DocumentArrowUpIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  FingerPrintIcon,
  ArchiveBoxIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

type ConformiteDashboardData = {
  fec?: { count: number; lastDate: string | null; compliant: boolean };
  facturx?: { total: number; transmis: number; enAttente: number };
  eReporting?: { statut: string; periodeCourante: string | null };
  ediTva?: { statut: string; periodeCourante: string | null };
  das2?: { statut: string; annee: number | null };
  pisteAudit?: { nbChaines: number };
  archives?: { count: number; integrityOk: boolean };
  sirene?: { lastCheck: string | null; count: number };
  periodes?: { ouvertes: number; cloturees: number };
};

export default function ConformitePage() {
  const [dashboard, setDashboard] = useState<ConformiteDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.conformite.dashboard();
      if (res.success && res.data) {
        setDashboard(res.data);
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Erreur lors du chargement du tableau de bord';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-28 bg-gray-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShieldCheckIcon className="h-8 w-8 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Conformité France</h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Conformité Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* FEC Card */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">FEC</span>
            <DocumentTextIcon className="h-5 w-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{dashboard?.fec?.count ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-2">
            {dashboard?.fec?.lastDate ? formatDate(dashboard.fec.lastDate) : 'Jamais'}
          </p>
          <div className="mt-3 flex items-center gap-1">
            <div
              className={`h-2 w-2 rounded-full ${
                dashboard?.fec?.compliant ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className={`text-xs font-medium ${dashboard?.fec?.compliant ? 'text-green-400' : 'text-red-400'}`}>
              {dashboard?.fec?.compliant ? 'Conforme' : 'Non conforme'}
            </span>
          </div>
        </div>

        {/* Factur-X Card */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Factur-X</span>
            <DocumentArrowUpIcon className="h-5 w-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">{dashboard?.facturx?.total ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-2">
            {dashboard?.facturx?.transmis ?? '—'} transmises
          </p>
          <div className="mt-3">
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              (dashboard?.facturx?.enAttente ?? 0) > 0
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-green-500/20 text-green-400'
            }`}>
              {dashboard?.facturx?.enAttente ?? 0} en attente
            </span>
          </div>
        </div>

        {/* E-Reporting Card */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">E-Reporting</span>
            <BuildingLibraryIcon className="h-5 w-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white capitalize">{dashboard?.eReporting?.statut ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-2">
            Période: {dashboard?.eReporting?.periodeCourante ?? '—'}
          </p>
          <div className="mt-3">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  dashboard?.eReporting?.statut === 'actif' ? 'bg-green-500' : 'bg-gray-600'
                }`}
                style={{
                  width: dashboard?.eReporting?.statut === 'actif' ? '100%' : '30%',
                }}
              />
            </div>
          </div>
        </div>

        {/* EDI-TVA Card */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">EDI-TVA</span>
            <BanknotesIcon className="h-5 w-5 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-white capitalize">{dashboard?.ediTva?.statut ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-2">
            Période: {dashboard?.ediTva?.periodeCourante ?? '—'}
          </p>
          <div className="mt-3 flex items-center gap-1">
            <div
              className={`h-2 w-2 rounded-full ${
                dashboard?.ediTva?.statut === 'transmise' ? 'bg-green-500' : 'bg-yellow-500'
              }`}
            />
            <span className={`text-xs font-medium ${
              dashboard?.ediTva?.statut === 'transmise' ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {dashboard?.ediTva?.statut === 'transmise' ? 'Transmise' : 'À transmettre'}
            </span>
          </div>
        </div>

        {/* DAS2 Card */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">DAS2</span>
            <FingerPrintIcon className="h-5 w-5 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white capitalize">{dashboard?.das2?.statut ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-2">
            Année: {dashboard?.das2?.annee ?? '—'}
          </p>
          <div className="mt-3 flex items-center gap-1">
            <div
              className={`h-2 w-2 rounded-full ${
                dashboard?.das2?.statut === 'valide' ? 'bg-green-500' : 'bg-blue-500'
              }`}
            />
            <span className="text-xs font-medium text-blue-400">
              {dashboard?.das2?.statut === 'valide' ? 'Validée' : 'En cours'}
            </span>
          </div>
        </div>

        {/* Piste d'Audit Card */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Piste d&apos;Audit</span>
            <ArchiveBoxIcon className="h-5 w-5 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white">{dashboard?.pisteAudit?.nbChaines ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-2">Chaînes de traçabilité</p>
          <div className="mt-3">
            <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400">
              Actif
            </span>
          </div>
        </div>

        {/* Archives Card */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Archivage</span>
            <ArchiveBoxIcon className="h-5 w-5 text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-white">{dashboard?.archives?.count ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-2">Documents archivés</p>
          <div className="mt-3 flex items-center gap-1">
            <div
              className={`h-2 w-2 rounded-full ${
                dashboard?.archives?.integrityOk ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className={`text-xs font-medium ${
              dashboard?.archives?.integrityOk ? 'text-green-400' : 'text-red-400'
            }`}>
              {dashboard?.archives?.integrityOk ? 'Intégrité OK' : 'Alerte intégrité'}
            </span>
          </div>
        </div>

        {/* Sirene Card */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Sirene</span>
            <MagnifyingGlassIcon className="h-5 w-5 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-white">{dashboard?.sirene?.count ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-2">
            Vérifiée: {dashboard?.sirene?.lastCheck ? formatDate(dashboard.sirene.lastCheck) : 'Jamais'}
          </p>
          <div className="mt-3 flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-teal-500" />
            <span className="text-xs font-medium text-teal-400">À jour</span>
          </div>
        </div>
      </div>

      {/* Périodes Comptables Summary */}
      {dashboard?.periodes && (
        <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50 mb-6">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5 text-amber-400" /> Périodes comptables
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <span className="text-gray-500 text-xs">Périodes ouvertes</span>
              <p className="text-lg font-semibold text-green-400">{dashboard.periodes.ouvertes}</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Périodes clôturées</span>
              <p className="text-lg font-semibold text-gray-400">{dashboard.periodes.cloturees}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { name: 'FEC', href: '/conformite/fec', icon: DocumentTextIcon, color: 'text-blue-400' },
          { name: 'Facturation Électronique', href: '/conformite/facturx', icon: DocumentArrowUpIcon, color: 'text-green-400' },
          { name: 'E-Reporting', href: '/conformite/e-reporting', icon: BuildingLibraryIcon, color: 'text-purple-400' },
          { name: 'EDI-TVA', href: '/conformite/edi-tva', icon: BanknotesIcon, color: 'text-red-400' },
          { name: 'DAS2 Honoraires', href: '/conformite/das2', icon: FingerPrintIcon, color: 'text-indigo-400' },
          { name: 'Piste d&apos;Audit', href: '/conformite/piste-audit', icon: ArchiveBoxIcon, color: 'text-cyan-400' },
          { name: 'Archivage Légal', href: '/conformite/archives', icon: ArchiveBoxIcon, color: 'text-orange-400' },
          { name: 'Vérification Sirene', href: '/conformite/sirene', icon: MagnifyingGlassIcon, color: 'text-teal-400' },
        ].map((link) => (
          <a
            key={link.name}
            href={link.href}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-4 transition-colors group"
          >
            <link.icon className={`h-6 w-6 ${link.color} mb-2 group-hover:scale-110 transition-transform`} />
            <span className="text-white text-sm font-medium">{link.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
