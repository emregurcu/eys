'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Settings,
  ExternalLink,
  Users,
  ShoppingCart,
  MoreVertical,
  Edit,
  Trash2,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface StoreData {
  id: string;
  name: string;
  etsyShopId: string;
  isActive: boolean;
  currency: string;
  etsyTransactionFee: number;
  etsyPaymentFee: number;
  etsyListingFee: number;
  etsyApiKey: string | null;
  notificationEmail: string | null;
  managers: { user: { id: string; name: string } }[];
  _count: { orders: number };
}

export default function StoresPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreData | null>(null);

  const [form, setForm] = useState({
    name: '',
    etsyShopId: '',
    etsyApiKey: '',
    etsyApiSecret: '',
    notificationEmail: '',
    currency: 'USD',
    etsyTransactionFee: '6.5',
    etsyPaymentFee: '4',
    etsyListingFee: '0.20',
  });

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores');
      if (res.ok) {
        setStores(await res.json());
      }
    } catch (error) {
      toast.error('Mağazalar yüklenemedi');
    }
  };

  const openDialog = (store?: StoreData) => {
    if (store) {
      setEditingStore(store);
      setForm({
        name: store.name,
        etsyShopId: store.etsyShopId,
        etsyApiKey: '',
        etsyApiSecret: '',
        notificationEmail: store.notificationEmail || '',
        currency: store.currency,
        etsyTransactionFee: store.etsyTransactionFee.toString(),
        etsyPaymentFee: store.etsyPaymentFee.toString(),
        etsyListingFee: store.etsyListingFee.toString(),
      });
    } else {
      setEditingStore(null);
      setForm({
        name: '',
        etsyShopId: '',
        etsyApiKey: '',
        etsyApiSecret: '',
        notificationEmail: '',
        currency: 'USD',
        etsyTransactionFee: '6.5',
        etsyPaymentFee: '4',
        etsyListingFee: '0.20',
      });
    }
    setShowDialog(true);
  };

  const saveStore = async () => {
    if (!form.name || !form.etsyShopId) {
      toast.error('Mağaza adı ve Etsy Shop ID zorunludur');
      return;
    }

    setLoading(true);
    try {
      const url = editingStore ? `/api/stores/${editingStore.id}` : '/api/stores';
      const method = editingStore ? 'PUT' : 'POST';

      const body: any = {
        name: form.name,
        etsyShopId: form.etsyShopId,
        currency: form.currency,
        etsyTransactionFee: parseFloat(form.etsyTransactionFee),
        etsyPaymentFee: parseFloat(form.etsyPaymentFee),
        etsyListingFee: parseFloat(form.etsyListingFee),
        notificationEmail: form.notificationEmail.trim() || null,
      };

      if (form.etsyApiKey) body.etsyApiKey = form.etsyApiKey;
      if (form.etsyApiSecret) body.etsyApiSecret = form.etsyApiSecret;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingStore ? 'Mağaza güncellendi' : 'Mağaza eklendi');
        setShowDialog(false);
        fetchStores();
      } else {
        const data = await res.json();
        toast.error(data.error || 'İşlem başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
    setLoading(false);
  };

  const deleteStore = async (id: string) => {
    if (!confirm('Bu mağazayı silmek istediğinize emin misiniz? Tüm siparişler de silinecek!')) return;

    try {
      const res = await fetch(`/api/stores/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Mağaza silindi');
        fetchStores();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Silme başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mağazalar</h1>
          <p className="text-muted-foreground">
            Etsy mağazalarınızı yönetin
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => openDialog()}>
            <Plus className="mr-2 h-4 w-4" /> Mağaza Ekle
          </Button>
        )}
      </div>

      {/* Mağaza Kartları */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => (
          <Card key={store.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{store.name}</CardTitle>
                  <a
                    href={`https://www.etsy.com/shop/${store.etsyShopId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {store.etsyShopId}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={store.isActive ? 'default' : 'secondary'}>
                    {store.isActive ? 'Aktif' : 'Pasif'}
                  </Badge>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDialog(store)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteStore(store.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* İstatistikler */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <ShoppingCart className="h-4 w-4" />
                    <span className="text-xs">Toplam Sipariş</span>
                  </div>
                  <p className="text-xl font-bold">{store._count.orders}</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Settings className="h-4 w-4" />
                    <span className="text-xs">Para Birimi</span>
                  </div>
                  <p className="text-xl font-bold">{store.currency}</p>
                </div>
              </div>

              {/* Etsy Kesinti Oranları */}
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Etsy Kesintileri:</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">İşlem: %{store.etsyTransactionFee}</Badge>
                  <Badge variant="outline">Ödeme: %{store.etsyPaymentFee}</Badge>
                  <Badge variant="outline">Liste: ${store.etsyListingFee}</Badge>
                </div>
              </div>

              {/* Yöneticiler */}
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Users className="h-4 w-4" />
                  <span>Yöneticiler</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {store.managers.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Atanmamış</span>
                  ) : (
                    store.managers.map((m) => (
                      <Badge key={m.user.id} variant="outline" className="text-xs">
                        {m.user.name}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              {/* API Durumu */}
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <span className="text-sm">API Bağlantısı</span>
                <Badge className={store.etsyApiKey ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {store.etsyApiKey ? 'Bağlı' : 'Manuel'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}

        {stores.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              Henüz mağaza eklenmemiş
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mağaza Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingStore ? 'Mağaza Düzenle' : 'Yeni Mağaza Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Mağaza Adı *</label>
                <Input
                  placeholder="Canvas Art Store"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Etsy Shop ID *</label>
                <Input
                  placeholder="canvasart"
                  value={form.etsyShopId}
                  onChange={(e) => setForm({ ...form, etsyShopId: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">API Key (Opsiyonel)</label>
                <Input
                  placeholder="API anahtarı"
                  value={form.etsyApiKey}
                  onChange={(e) => setForm({ ...form, etsyApiKey: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">API Secret (Opsiyonel)</label>
                <Input
                  type="password"
                  placeholder="API secret"
                  value={form.etsyApiSecret}
                  onChange={(e) => setForm({ ...form, etsyApiSecret: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Bildirim e-postası</label>
              <Input
                type="email"
                placeholder="mağaza@gmail.com (sipariş/takip mailleri buraya gider)"
                value={form.notificationEmail}
                onChange={(e) => setForm({ ...form, notificationEmail: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Webhook mağaza eşlemesi ve sipariş/takip bildirimleri bu adrese de gider.</p>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Etsy Kesinti Oranları</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">İşlem Ücreti (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.etsyTransactionFee}
                    onChange={(e) => setForm({ ...form, etsyTransactionFee: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Ödeme Ücreti (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.etsyPaymentFee}
                    onChange={(e) => setForm({ ...form, etsyPaymentFee: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Liste Ücreti ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.etsyListingFee}
                    onChange={(e) => setForm({ ...form, etsyListingFee: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>
                İptal
              </Button>
              <Button className="flex-1" onClick={saveStore} disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
