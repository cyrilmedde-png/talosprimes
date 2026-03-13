'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';

interface RdvEvent {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  type: string;
  contact: {
    nom: string;
    prenom: string;
    telephone: string;
    email: string;
  };
  source: string;
  statut: string;
  score: number;
  notes: string;
}

const TYPE_COLORS: Record<string, string> = {
  telephonique: 'bg-cyan-600',
  visioconference: 'bg-purple-600',
  physique: 'bg-amber-600',
  a_planifier: 'bg-gray-600',
};

const TYPE_LABELS: Record<string, string> = {
  telephonique: '📞 Tél.',
  visioconference: '📹 Visio',
  physique: '🏢 Physique',
  a_planifier: '⏳ À planifier',
};

const STATUT_COLORS: Record<string, string> = {
  nouveau: 'text-cyan-400',
  contacte: 'text-yellow-400',
  qualifie: 'text-green-400',
  converti: 'text-emerald-400',
  perdu: 'text-red-400',
};

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const N8N_BASE = process.env.NEXT_PUBLIC_N8N_URL || 'https://n8n.talosprimes.com';

export default function CalendrierRdvPage() {
  const [events, setEvents] = useState<RdvEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const { user } = useAuthStore();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true);
      try {
        const tenantId = user?.tenantId || '';
        if (!tenantId) return;

        const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month + 1, 0).getDate();
        const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const res = await fetch(
          `${N8N_BASE}/webhook/calendrier-rdv?tenantId=${tenantId}&from=${from}&to=${to}`
        );
        const data = await res.json();
        if (data.success) {
          setEvents(data.events || []);
        }
      } catch (error) {
        console.error('Erreur chargement calendrier RDV:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadEvents();
  }, [year, month, user?.tenantId]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, RdvEvent[]> = {};
    events.forEach(ev => {
      if (!ev.start) return;
      const day = ev.start.split('T')[0];
      if (!map[day]) map[day] = [];
      map[day].push(ev);
    });
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days: Array<{ date: Date; isCurrentMonth: boolean; dateStr: string }> = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false, dateStr: d.toISOString().split('T')[0] });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push({ date, isCurrentMonth: true, dateStr: date.toISOString().split('T')[0] });
    }

    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        days.push({ date: d, isCurrentMonth: false, dateStr: d.toISOString().split('T')[0] });
      }
    }

    return days;
  }, [year, month]);

  const today = new Date().toISOString().split('T')[0];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDay(today); };

  const selectedDayEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];

  const stats = useMemo(() => {
    const total = events.length;
    const aPlanifier = events.filter(e => e.type === 'a_planifier').length;
    const confirmed = events.filter(e => e.type !== 'a_planifier').length;
    return { total, aPlanifier, confirmed };
  }, [events]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/agent-ia" className="hover:text-cyan-400">Agent IA</Link>
            <span>/</span>
            <span className="text-white">Calendrier RDV</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Calendrier des rendez-vous</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
            <span className="text-cyan-400 font-bold">{stats.confirmed}</span>
            <span className="text-gray-400 text-sm ml-1">confirmés</span>
          </div>
          <div className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
            <span className="text-amber-400 font-bold">{stats.aPlanifier}</span>
            <span className="text-gray-400 text-sm ml-1">à planifier</span>
          </div>
        </div>
      </div>

      {/* Navigation mois */}
      <div className="flex items-center justify-between bg-gray-800 rounded-xl p-4 border border-gray-700">
        <button onClick={prevMonth} className="text-gray-400 hover:text-white px-3 py-1 rounded hover:bg-gray-700">
          ← Mois précédent
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-white text-lg font-semibold">
            {MONTHS[month]} {year}
          </h2>
          <button onClick={goToToday} className="text-cyan-400 hover:text-cyan-300 text-sm px-2 py-1 rounded hover:bg-gray-700">
            Aujourd&apos;hui
          </button>
        </div>
        <button onClick={nextMonth} className="text-gray-400 hover:text-white px-3 py-1 rounded hover:bg-gray-700">
          Mois suivant →
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Calendrier */}
          <div className="lg:col-span-3 bg-gray-800 rounded-xl border border-gray-700 p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(day => (
                <div key={day} className="text-center text-gray-400 text-xs font-medium py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, isCurrentMonth, dateStr }) => {
                const dayEvents = eventsByDay[dateStr] || [];
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDay;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDay(dateStr === selectedDay ? null : dateStr)}
                    className={`
                      min-h-[80px] p-1 rounded-lg text-left transition-colors relative
                      ${isCurrentMonth ? 'bg-gray-700/50' : 'bg-gray-800/50'}
                      ${isToday ? 'ring-1 ring-cyan-500' : ''}
                      ${isSelected ? 'ring-2 ring-cyan-400 bg-gray-700' : ''}
                      hover:bg-gray-700
                    `}
                  >
                    <span className={`text-xs font-medium ${isCurrentMonth ? 'text-gray-300' : 'text-gray-600'} ${isToday ? 'text-cyan-400' : ''}`}>
                      {date.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="absolute top-1 right-1">
                        <span className="bg-cyan-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {dayEvents.length}
                        </span>
                      </div>
                    )}
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map(ev => (
                        <div
                          key={ev.id}
                          className={`text-[10px] text-white px-1 py-0.5 rounded truncate ${TYPE_COLORS[ev.type] || 'bg-gray-600'}`}
                          title={ev.title}
                        >
                          {ev.start && ev.start.includes('T') ? ev.start.split('T')[1]?.substring(0, 5) + ' ' : ''}
                          {ev.title.substring(0, 12)}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] text-gray-400 px-1">+{dayEvents.length - 2}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panneau latéral */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 className="text-white font-semibold mb-3">
              {selectedDay
                ? new Date(selectedDay + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                : 'Sélectionnez un jour'
              }
            </h3>

            {selectedDay ? (
              selectedDayEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedDayEvents.map(ev => (
                    <div key={ev.id} className="bg-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] text-white ${TYPE_COLORS[ev.type] || 'bg-gray-600'}`}>
                          {TYPE_LABELS[ev.type] || ev.type}
                        </span>
                        <span className={`text-[10px] ${STATUT_COLORS[ev.statut] || 'text-gray-400'}`}>
                          {ev.statut}
                        </span>
                      </div>
                      <p className="text-white text-sm font-medium">{ev.title}</p>
                      {ev.start && ev.start.includes('T') && (
                        <p className="text-cyan-400 text-xs mt-1">
                          🕐 {ev.start.split('T')[1]?.substring(0, 5)}
                          {ev.end && ev.end.includes('T') ? ` → ${ev.end.split('T')[1]?.substring(0, 5)}` : ''}
                        </p>
                      )}
                      <div className="mt-2 space-y-1">
                        {ev.contact.telephone && (
                          <p className="text-gray-400 text-xs">📱 {ev.contact.telephone}</p>
                        )}
                        {ev.contact.email && (
                          <p className="text-gray-400 text-xs">✉️ {ev.contact.email}</p>
                        )}
                      </div>
                      {ev.notes && (
                        <p className="text-gray-500 text-xs mt-2 italic line-clamp-2">{ev.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Aucun rendez-vous ce jour</p>
              )
            ) : (
              <p className="text-gray-500 text-sm">Cliquez sur un jour pour voir les rendez-vous</p>
            )}

            {/* Légende */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <p className="text-gray-400 text-xs font-medium mb-2">Types de RDV</p>
              <div className="space-y-1">
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${TYPE_COLORS[key]}`}></div>
                    <span className="text-gray-300 text-xs">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
