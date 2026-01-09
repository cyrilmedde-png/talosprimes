'use client';

import { useState, useEffect } from 'react';
import { apiClient, Notification } from '@/lib/api-client';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [page, setPage] = useState(0);
  const limit = 50;

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const params: { limit: number; offset: number; lu?: boolean } = {
        limit,
        offset: page * limit,
      };
      
      if (filter === 'unread') {
        params.lu = false;
      } else if (filter === 'read') {
        params.lu = true;
      }

      const response = await apiClient.notifications.list(params);
      if (response.success) {
        setNotifications(response.data.notifications);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page]);

  const markAsRead = async (id: string, lu: boolean = true) => {
    try {
      await apiClient.notifications.markAsRead(id, lu);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, lu } : n));
      loadNotifications(); // Recharger pour mettre à jour le total
    } catch (error) {
      console.error('Erreur marquage notification:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await apiClient.notifications.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      loadNotifications(); // Recharger pour mettre à jour le total
    } catch (error) {
      console.error('Erreur suppression notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.lu);
      await Promise.all(unread.map(n => apiClient.notifications.markAsRead(n.id, true)));
      loadNotifications();
    } catch (error) {
      console.error('Erreur marquage toutes notifications:', error);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return formatDistanceToNow(date, { addSuffix: true, locale: fr });
      } else {
        return format(date, 'dd MMMM yyyy à HH:mm', { locale: fr });
      }
    } catch {
      return dateString;
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('error') || type.includes('erreur')) return '🚨';
    if (type.includes('converti') || type.includes('confirmation')) return '✅';
    if (type.includes('questionnaire')) return '📝';
    if (type.includes('entretien')) return '📞';
    if (type.includes('inscription') || type.includes('email') || type.includes('sms')) return '📧';
    return '📋';
  };

  const getNotificationColor = (type: string) => {
    if (type.includes('error') || type.includes('erreur')) return 'bg-red-500/10 border-red-500/20';
    if (type.includes('converti') || type.includes('confirmation')) return 'bg-green-500/10 border-green-500/20';
    if (type.includes('questionnaire')) return 'bg-blue-500/10 border-blue-500/20';
    if (type.includes('entretien')) return 'bg-purple-500/10 border-purple-500/20';
    return 'bg-gray-500/10 border-gray-500/20';
  };

  const unreadCount = notifications.filter(n => !n.lu).length;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
          <p className="text-gray-400">
            {total} notification{total > 1 ? 's' : ''} au total
            {unreadCount > 0 && ` • ${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Filtres et actions */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => { setFilter('all'); setPage(0); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => { setFilter('unread'); setPage(0); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Non lues
            </button>
            <button
              onClick={() => { setFilter('read'); setPage(0); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'read'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Lues
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>

        {/* Liste des notifications */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">
            Chargement...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            Aucune notification{filter !== 'all' ? ` ${filter === 'unread' ? 'non lue' : 'lue'}` : ''}
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-6 rounded-lg border transition-all ${
                  !notification.lu
                    ? `${getNotificationColor(notification.type)} border-opacity-40`
                    : 'bg-gray-800/50 border-gray-700'
                } hover:bg-gray-800/70`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <span className="text-3xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className={`text-lg font-semibold ${!notification.lu ? 'text-white' : 'text-gray-300'}`}>
                          {notification.titre}
                        </h3>
                        {!notification.lu && (
                          <span className="h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0 mt-2"></span>
                        )}
                      </div>
                      <p className="text-gray-400 mb-3 whitespace-pre-wrap">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{formatTime(notification.createdAt)}</span>
                        {notification.type && (
                          <span className="px-2 py-1 bg-gray-700 rounded text-xs">
                            {notification.type.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 flex-shrink-0">
                    {!notification.lu ? (
                      <button
                        onClick={() => markAsRead(notification.id, true)}
                        className="px-3 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                        title="Marquer comme lu"
                      >
                        Marquer lu
                      </button>
                    ) : (
                      <button
                        onClick={() => markAsRead(notification.id, false)}
                        className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-400 transition-colors"
                        title="Marquer comme non lu"
                      >
                        Marquer non lu
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
                      title="Supprimer"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(prev => Math.max(0, prev - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <span className="px-4 py-2 text-sm text-gray-400">
              Page {page + 1} sur {totalPages}
            </span>
            <button
              onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

