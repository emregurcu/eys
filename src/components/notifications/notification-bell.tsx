'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Check, Trash2, ShoppingCart, AlertTriangle, CreditCard, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';
import { playOrderNotificationSound, playIssueNotificationSound } from '@/lib/notification-sounds';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  store?: { name: string } | null;
  data?: any;
}

const typeIcons: Record<string, any> = {
  NEW_ORDER: ShoppingCart,
  ORDER_STATUS: ShoppingCart,
  ISSUE_CREATED: AlertTriangle,
  ISSUE_ASSIGNED: AlertTriangle,
  ISSUE_RESOLVED: Check,
  PAYMENT_RECEIVED: CreditCard,
  SYSTEM: Settings,
};

const typeColors: Record<string, string> = {
  NEW_ORDER: 'bg-green-100 text-green-600',
  ORDER_STATUS: 'bg-blue-100 text-blue-600',
  ISSUE_CREATED: 'bg-red-100 text-red-600',
  ISSUE_ASSIGNED: 'bg-orange-100 text-orange-600',
  ISSUE_RESOLVED: 'bg-green-100 text-green-600',
  PAYMENT_RECEIVED: 'bg-purple-100 text-purple-600',
  SYSTEM: 'bg-gray-100 text-gray-600',
};

const POLL_INTERVAL_MS = 20000; // 20 saniyede bir anlık kontrol

export function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const prevUnreadIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetch = useRef(true);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (loading && !silent) return;
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/notifications?limit=15');
      if (res.ok) {
        const data = await res.json();
        const list: Notification[] = data.notifications || [];
        const newUnreadCount = data.unreadCount || 0;
        const unreadIds = new Set(
          list.filter((n: Notification) => !n.isRead).map((n: Notification) => n.id)
        );

        // Sadece admin için ve sadece yeni sipariş / yeni sorun bildiriminde ses çal
        const isAdmin = session?.user?.role === 'ADMIN';
        if (!isFirstFetch.current && isAdmin) {
          const prev = prevUnreadIdsRef.current;
          const newestNewUnread = list.find((n: Notification) => !n.isRead && !prev.has(n.id));
          if (newestNewUnread) {
            if (newestNewUnread.type === 'NEW_ORDER') playOrderNotificationSound();
            else if (newestNewUnread.type === 'ISSUE_CREATED') playIssueNotificationSound();
          }
        }
        isFirstFetch.current = false;
        prevUnreadIdsRef.current = unreadIds;

        setNotifications(list);
        setUnreadCount(newUnreadCount);
      }
    } catch (error) {
      console.error('Bildirimler yüklenemedi');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [loading, session?.user?.role]);

  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => fetchNotifications(true), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PUT' });
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Bildirim güncellenemedi');
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PUT' });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Bildirimler güncellenemedi');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications(notifications.filter(n => n.id !== id));
      const deleted = notifications.find(n => n.id === id);
      if (deleted && !deleted.isRead) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error('Bildirim silinemedi');
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-2 border-b bg-muted/30">
          <h3 className="font-semibold text-sm">Bildirimler</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
              <Check className="h-3 w-3 mr-1" />
              Okundu
            </Button>
          )}
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              Bildirim yok
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = typeIcons[notification.type] || Bell;
              const colorClass = typeColors[notification.type] || 'bg-gray-100 text-gray-600';
              
              return (
                <div
                  key={notification.id}
                  className={`p-2.5 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer ${
                    !notification.isRead ? 'bg-blue-50/50' : ''
                  }`}
                  onClick={() => !notification.isRead && markAsRead(notification.id)}
                >
                  <div className="flex gap-2.5">
                    <div className={`p-1.5 rounded-full ${colorClass} shrink-0 h-fit`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-sm leading-tight ${!notification.isRead ? 'font-medium' : ''}`}>
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0 opacity-50 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {notification.message}
                      </p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        {formatDistanceToNow(new Date(notification.createdAt), { 
                          addSuffix: true,
                          locale: tr,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        <div className="p-2 border-t">
          <Button variant="ghost" className="w-full text-sm" asChild>
            <Link href="/dashboard/notifications">Tüm Bildirimleri Gör</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
