'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ShoppingCart,
  AlertTriangle,
  CreditCard,
  Settings,
  Filter,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDistanceToNow, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

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

const typeLabels: Record<string, string> = {
  NEW_ORDER: 'Yeni Sipariş',
  ORDER_STATUS: 'Sipariş Durumu',
  ISSUE_CREATED: 'Yeni Sorun',
  ISSUE_ASSIGNED: 'Sorun Atandı',
  ISSUE_RESOLVED: 'Sorun Çözüldü',
  PAYMENT_RECEIVED: 'Ödeme',
  SYSTEM: 'Sistem',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=100');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      toast.error('Bildirimler yüklenemedi');
    }
    setLoading(false);
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.isRead;
    return n.type === filter;
  });

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PUT' });
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PUT' });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Tüm bildirimler okundu işaretlendi');
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      const deleted = notifications.find(n => n.id === id);
      setNotifications(notifications.filter(n => n.id !== id));
      if (deleted && !deleted.isRead) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
      toast.success('Bildirim silindi');
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  // Bildirimleri tarihe göre grupla
  const groupedNotifications = filteredNotifications.reduce((groups: Record<string, Notification[]>, notification) => {
    const date = format(new Date(notification.createdAt), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {});

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Bugün';
    } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Dün';
    }
    return format(date, 'd MMMM yyyy', { locale: tr });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bildirimler</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Tüm bildirimler okundu'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Tümünü Okundu İşaretle
          </Button>
        )}
      </div>

      {/* İstatistikler */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notifications.length}</p>
                <p className="text-xs text-muted-foreground">Toplam</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-100">
                <Bell className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-xs text-muted-foreground">Okunmamış</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <ShoppingCart className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {notifications.filter(n => n.type === 'NEW_ORDER').length}
                </p>
                <p className="text-xs text-muted-foreground">Sipariş</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {notifications.filter(n => n.type.includes('ISSUE')).length}
                </p>
                <p className="text-xs text-muted-foreground">Sorun</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtre */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Bildirimler</SelectItem>
                <SelectItem value="unread">Okunmamış</SelectItem>
                <SelectItem value="NEW_ORDER">Yeni Siparişler</SelectItem>
                <SelectItem value="ORDER_STATUS">Sipariş Durumları</SelectItem>
                <SelectItem value="ISSUE_CREATED">Sorunlar</SelectItem>
                <SelectItem value="SYSTEM">Sistem</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bildirim Listesi */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Yükleniyor...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Bildirim bulunamadı</p>
            </div>
          ) : (
            Object.entries(groupedNotifications).map(([date, dayNotifications]) => (
              <div key={date}>
                <div className="px-4 py-2 bg-muted/50 border-b">
                  <span className="text-sm font-medium">{formatDateHeader(date)}</span>
                </div>
                {dayNotifications.map((notification) => {
                  const Icon = typeIcons[notification.type] || Bell;
                  const colorClass = typeColors[notification.type] || 'bg-gray-100 text-gray-600';
                  
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 border-b hover:bg-muted/30 ${
                        !notification.isRead ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex gap-4">
                        <div className={`p-3 rounded-full ${colorClass} shrink-0`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={`font-medium ${!notification.isRead ? 'text-primary' : ''}`}>
                                  {notification.title}
                                </p>
                                {!notification.isRead && (
                                  <Badge variant="secondary" className="text-xs">Yeni</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {typeLabels[notification.type] || notification.type}
                                </Badge>
                                {notification.store && (
                                  <span className="text-xs text-muted-foreground">
                                    {notification.store.name}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(notification.createdAt), { 
                                    addSuffix: true,
                                    locale: tr,
                                  })}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => markAsRead(notification.id)}
                                  title="Okundu işaretle"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteNotification(notification.id)}
                                title="Sil"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
