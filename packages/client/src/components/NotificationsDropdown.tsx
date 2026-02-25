'use client';

import { useState, useEffect, useRef } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { apiClient, Notification } from '@/lib/api-client';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Charger les notifications
  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.notifications.list({ limit: 20 });
      if (response.success) {
        setNotifications(response.data.notifications);
        const unread = response.data.notifications.filter(n => !n.lu).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Charger au montage et toutes les 30 secondes
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000); // Rafraîchir toutes les 30 secondes

    // Écouter l'événement de rechargement depuis la page logs
    const handleReload = () => {
      loadNotifications();
    };
    window.addEventListener('reload-notifications', handleReload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('reload-notifications', handleReload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fermer le dropdown si clic en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Marquer comme lue
  const markAsRead = async (id: string) => {
    try {
      await apiClient.notifications.markAsRead(id, true);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erreur marquage notification:', error);
    }
  };

  // Supprimer une notification
  const deleteNotification = async (id: string) => {
    try {
      await apiClient.notifications.delete(id);
      const deleted = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (deleted && !deleted.lu) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Erreur suppression notification:', error);
    }
  };

  // Marquer toutes comme lues
  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.lu);
      await Promise.all(unread.map(n => apiClient.notifications.markAsRead(n.id, true)));
      setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Erreur marquage toutes notifications:', error);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr });
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-gray-800 p-2 rounded-full text-gray-400 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-colors"
      >
        <span className="sr-only">Voir les notifications</span>
        <BellIcon className="h-6 w-6" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center ring-2 ring-gray-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-gray-800 rounded-lg shadow-xl z-50 border border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between bg-gray-900">
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* Liste des notifications */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-gray-400">
                Chargement...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400">
                Aucune notification
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-700/50 transition-colors ${
                      !notification.lu ? 'bg-gray-700/30' : ''
                    }`}
                    onClick={() => !notification.lu && markAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <span className="text-xl flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${!notification.lu ? 'text-white' : 'text-gray-300'}`}>
                              {notification.titre}
                            </p>
                            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              {formatTime(notification.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 flex-shrink-0">
                        {!notification.lu && (
                          <div className="h-2 w-2 rounded-full bg-indigo-500 mt-2"></div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="text-gray-500 hover:text-red-400 transition-colors p-1"
                          title="Supprimer"
                        >
                          <span className="sr-only">Supprimer</span>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-700 bg-gray-900 text-center">
              <a
                href="/notifications"
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Voir toutes les notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

