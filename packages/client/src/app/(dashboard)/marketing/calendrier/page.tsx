'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

interface MarketingPost {
  id: string;
  plateforme: string;
  type: string;
  sujet: string;
  status: string;
  datePublication: string;
  contenuTexte?: string | null;
}

const PLATEFORME_COLORS: Record<string, string> = {
  facebook: 'bg-blue-600',
  instagram: 'bg-purple-600',
  tiktok: 'bg-gray-600',
};

const PLATEFORME_LABELS: Record<string, string> = {
  facebook: 'FB',
  instagram: 'IG',
  tiktok: 'TK',
};

const STATUS_LABELS: Record<string, string> = {
  planifie: 'Planifié',
  publie: 'Publié',
  erreur: 'Erreur',
};

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export default function CalendrierPage() {
  const [posts, setPosts] = useState<MarketingPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Charger les publications du mois courant
  useEffect(() => {
    const loadPosts = async () => {
      setIsLoading(true);
      try {
        const dateFrom = new Date(year, month, 1).toISOString();
        const dateTo = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

        const response = await apiClient.marketing.listPosts({
          dateFrom,
          dateTo,
          limit: 100,
        });
        if (response.success) {
          setPosts(response.data.posts);
        }
      } catch (error) {
        console.error('Erreur chargement calendrier:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPosts();
  }, [year, month]);

  // Organiser les posts par jour
  const postsByDay = useMemo(() => {
    const map: Record<string, MarketingPost[]> = {};
    posts.forEach(post => {
      const day = new Date(post.datePublication).toISOString().split('T')[0];
      if (!map[day]) map[day] = [];
      map[day].push(post);
    });
    return map;
  }, [posts]);

  // Générer la grille du calendrier
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Lundi = 0

    const days: Array<{ date: Date; isCurrentMonth: boolean; dateStr: string }> = [];

    // Jours du mois précédent
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false, dateStr: d.toISOString().split('T')[0] });
    }

    // Jours du mois courant
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push({ date, isCurrentMonth: true, dateStr: date.toISOString().split('T')[0] });
    }

    // Compléter la dernière semaine
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
  const goToToday = () => setCurrentDate(new Date());

  const selectedDayPosts = selectedDay ? (postsByDay[selectedDay] || []) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/marketing" className="hover:text-cyan-400">Marketing</Link>
            <span>/</span>
            <span className="text-white">Calendrier</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Calendrier éditorial</h1>
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
            {/* Jours de la semaine */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(day => (
                <div key={day} className="text-center text-gray-400 text-xs font-medium py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Grille des jours */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, isCurrentMonth, dateStr }) => {
                const dayPosts = postsByDay[dateStr] || [];
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
                    <div className="mt-1 space-y-0.5">
                      {dayPosts.slice(0, 3).map(post => (
                        <div
                          key={post.id}
                          className={`text-[10px] text-white px-1 py-0.5 rounded truncate ${PLATEFORME_COLORS[post.plateforme] || 'bg-gray-600'}`}
                          title={`${post.sujet} (${post.plateforme})`}
                        >
                          {PLATEFORME_LABELS[post.plateforme]} {post.sujet.substring(0, 15)}
                        </div>
                      ))}
                      {dayPosts.length > 3 && (
                        <div className="text-[10px] text-gray-400 px-1">+{dayPosts.length - 3}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panneau latéral - détail du jour sélectionné */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 className="text-white font-semibold mb-3">
              {selectedDay
                ? new Date(selectedDay + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                : 'Sélectionnez un jour'
              }
            </h3>

            {selectedDay ? (
              selectedDayPosts.length > 0 ? (
                <div className="space-y-3">
                  {selectedDayPosts.map(post => (
                    <div key={post.id} className="bg-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] text-white ${PLATEFORME_COLORS[post.plateforme]}`}>
                          {PLATEFORME_LABELS[post.plateforme]}
                        </span>
                        <span className={`text-[10px] ${post.status === 'publie' ? 'text-green-400' : post.status === 'erreur' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {STATUS_LABELS[post.status]}
                        </span>
                      </div>
                      <p className="text-white text-sm font-medium">{post.sujet}</p>
                      {post.contenuTexte && (
                        <p className="text-gray-400 text-xs mt-1 line-clamp-3">{post.contenuTexte}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Aucune publication ce jour</p>
              )
            ) : (
              <p className="text-gray-500 text-sm">Cliquez sur un jour pour voir les publications planifiées</p>
            )}

            {/* Légende */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <p className="text-gray-400 text-xs font-medium mb-2">Plateformes</p>
              <div className="space-y-1">
                {Object.entries(PLATEFORME_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${PLATEFORME_COLORS[key]}`}></div>
                    <span className="text-gray-300 text-xs">{label === 'FB' ? 'Facebook' : label === 'IG' ? 'Instagram' : 'TikTok'}</span>
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
