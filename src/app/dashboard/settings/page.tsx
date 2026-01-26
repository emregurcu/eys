'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  User,
  Bell,
  Globe,
  Palette,
  Shield,
  Smartphone,
  Mail,
} from 'lucide-react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [notifications, setNotifications] = useState({
    newOrder: true,
    shippingIssue: true,
    returnRequest: true,
    lowStock: true,
    email: false,
    push: true,
  });

  const [pushBusy, setPushBusy] = useState(false);
  const [vapidReady, setVapidReady] = useState<boolean | null>(null);
  const [orderNotificationEmail, setOrderNotificationEmail] = useState('');
  const [systemSettingsLoading, setSystemSettingsLoading] = useState(false);
  const [systemSettingsSaving, setSystemSettingsSaving] = useState(false);

  useEffect(() => {
    checkPushStatus();
    fetch('/api/push/public-key')
      .then((r) => r.json())
      .then((data) => setVapidReady(!!data?.publicKey))
      .catch(() => setVapidReady(false));
  }, []);

  useEffect(() => {
    if (isAdmin) {
      setSystemSettingsLoading(true);
      fetch('/api/settings')
        .then((r) => r.json())
        .then((data) => {
          setOrderNotificationEmail(data.orderNotificationEmail || '');
        })
        .catch(() => toast.error('Sistem ayarları yüklenemedi'))
        .finally(() => setSystemSettingsLoading(false));
    }
  }, [isAdmin]);

  const checkPushStatus = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setNotifications((prev) => ({ ...prev, push: false }));
      return;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    setNotifications((prev) => ({ ...prev, push: !!subscription }));
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const enablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Push desteklenmiyor');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast.error('Bildirim izni verilmedi');
      return;
    }

    setPushBusy(true);
    try {
      const keyRes = await fetch('/api/push/public-key');
      const keyData = await keyRes.json();
      const publicKey = keyData.publicKey;
      if (!publicKey) {
        toast.error('VAPID anahtarı eksik. Proje klasöründe npm run generate-vapid çalıştırıp .env ve Vercel ortam değişkenlerine ekleyin.');
        return;
      }

      const registration =
        (await navigator.serviceWorker.getRegistration()) ||
        (await navigator.serviceWorker.register('/sw.js'));

      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      setNotifications((prev) => ({ ...prev, push: true }));
      toast.success('Push bildirimleri aktif');
    } catch (error) {
      toast.error('Push aktif edilemedi');
    }
    setPushBusy(false);
  };

  const disablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setNotifications((prev) => ({ ...prev, push: false }));
      return;
    }

    setPushBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setNotifications((prev) => ({ ...prev, push: false }));
      toast.success('Push bildirimleri kapatıldı');
    } catch (error) {
      toast.error('Push kapatılamadı');
    }
    setPushBusy(false);
  };

  const handleSave = () => {
    toast.success('Ayarlar kaydedildi');
  };

  const handleSaveSystemSettings = async () => {
    setSystemSettingsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNotificationEmail: orderNotificationEmail.trim() || null }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrderNotificationEmail(data.orderNotificationEmail || '');
      toast.success('Sistem ayarları kaydedildi');
    } catch {
      toast.error('Kaydedilemedi');
    } finally {
      setSystemSettingsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Ayarlar</h1>
        <p className="text-muted-foreground">
          Hesap ve uygulama ayarlarınızı yönetin
        </p>
      </div>

      {/* Profil Ayarları */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Profil</CardTitle>
          </div>
          <CardDescription>Kişisel bilgilerinizi güncelleyin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Ad Soyad</label>
              <Input defaultValue="Admin Kullanıcı" />
            </div>
            <div>
              <label className="text-sm font-medium">E-posta</label>
              <Input type="email" defaultValue="admin@example.com" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Şifre Değiştir</label>
            <div className="grid gap-4 sm:grid-cols-2 mt-2">
              <Input type="password" placeholder="Mevcut şifre" />
              <Input type="password" placeholder="Yeni şifre" />
            </div>
          </div>
          <Button onClick={handleSave}>Profili Kaydet</Button>
        </CardContent>
      </Card>

      {/* Bildirim Ayarları */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Bildirimler</CardTitle>
          </div>
          <CardDescription>Hangi bildirimleri almak istediğinizi seçin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Yeni Sipariş</p>
                <p className="text-sm text-muted-foreground">Yeni sipariş geldiğinde bildirim al</p>
              </div>
              <Switch
                checked={notifications.newOrder}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, newOrder: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Kargo Sorunu</p>
                <p className="text-sm text-muted-foreground">Kargo sorunlarında bildirim al</p>
              </div>
              <Switch
                checked={notifications.shippingIssue}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, shippingIssue: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">İade Talebi</p>
                <p className="text-sm text-muted-foreground">İade taleplerinde bildirim al</p>
              </div>
              <Switch
                checked={notifications.returnRequest}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, returnRequest: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Düşük Stok</p>
                <p className="text-sm text-muted-foreground">Stok azaldığında bildirim al</p>
              </div>
              <Switch
                checked={notifications.lowStock}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, lowStock: checked })
                }
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="font-medium mb-3">Bildirim Kanalları</p>
            {vapidReady === false && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                <p className="font-medium">Push için VAPID anahtarı gerekli</p>
                <p className="mt-1 text-xs">
                  Proje klasöründe <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">npm run generate-vapid</code> çalıştırın.
                  Çıkan değerleri .env dosyasına ve Vercel → Settings → Environment Variables bölümüne ekleyin, ardından sunucuyu yeniden başlatın.
                </p>
              </div>
            )}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">E-posta Bildirimleri</p>
                  <p className="text-sm text-muted-foreground">Bildirimleri e-posta ile al</p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, email: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push Bildirimleri</p>
                  <p className="text-sm text-muted-foreground">Tarayıcı/uygulama bildirimleri</p>
                </div>
                <Switch
                  checked={notifications.push}
                  disabled={pushBusy}
                  onCheckedChange={(checked) =>
                    checked ? enablePush() : disablePush()
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uygulama Ayarları */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Uygulama</CardTitle>
          </div>
          <CardDescription>Genel uygulama ayarları</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Dil</label>
              <Select defaultValue="tr">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tr">Türkçe</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Para Birimi</label>
              <Select defaultValue="TRY">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TRY (₺)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Tema</label>
            <Select defaultValue="light">
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Açık</SelectItem>
                <SelectItem value="dark">Koyu</SelectItem>
                <SelectItem value="system">Sistem</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sistem ayarları - sadece Admin */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Sistem</CardTitle>
            </div>
            <CardDescription>Sipariş bildirim e-postası (her siparişte bu adrese mail gider)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Sipariş bildirim e-postası</label>
              <Input
                type="email"
                placeholder="siparis@ornek.com"
                value={orderNotificationEmail}
                onChange={(e) => setOrderNotificationEmail(e.target.value)}
                disabled={systemSettingsLoading}
                className="mt-2 max-w-md"
              />
            </div>
            <Button onClick={handleSaveSystemSettings} disabled={systemSettingsSaving || systemSettingsLoading}>
              {systemSettingsSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* PWA Kurulum */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Mobil Uygulama</CardTitle>
          </div>
          <CardDescription>Uygulamayı telefonunuza kurun</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Bu uygulamayı telefonunuza PWA (Progressive Web App) olarak kurabilirsiniz.
            Tarayıcınızın menüsünden &quot;Ana Ekrana Ekle&quot; seçeneğini kullanın.
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-medium mb-2">Kurulum Adımları:</p>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
              <li>Chrome/Safari tarayıcınızda bu sayfayı açın</li>
              <li>Menü ikonuna (⋮ veya paylaş) tıklayın</li>
              <li>&quot;Ana ekrana ekle&quot; seçeneğini seçin</li>
              <li>Uygulama ana ekranınıza eklenecektir</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Güvenlik */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Güvenlik</CardTitle>
          </div>
          <CardDescription>Hesap güvenliği ayarları</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">İki Faktörlü Doğrulama</p>
              <p className="text-sm text-muted-foreground">Ek güvenlik katmanı ekleyin</p>
            </div>
            <Button variant="outline">Etkinleştir</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Oturum Geçmişi</p>
              <p className="text-sm text-muted-foreground">Aktif oturumları görüntüle</p>
            </div>
            <Button variant="outline">Görüntüle</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
