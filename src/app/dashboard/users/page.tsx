'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  MoreVertical,
  Shield,
  User,
  Wrench,
  Eye,
  Edit,
  Trash2,
  Store,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

const roleLabels: Record<string, string> = {
  ADMIN: 'Yönetici',
  MANAGER: 'Mağaza Yöneticisi',
  PRODUCER: 'Üretici',
  VIEWER: 'Görüntüleyici',
};

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  MANAGER: 'bg-blue-100 text-blue-800',
  PRODUCER: 'bg-purple-100 text-purple-800',
  VIEWER: 'bg-gray-100 text-gray-800',
};

const roleIcons: Record<string, any> = {
  ADMIN: Shield,
  MANAGER: User,
  PRODUCER: Wrench,
  VIEWER: Eye,
};

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  managedStores: { store: { id: string; name: string } }[];
}

interface StoreData {
  id: string;
  name: string;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [users, setUsers] = useState<UserData[]>([]);
  const [stores, setStores] = useState<StoreData[]>([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'VIEWER',
    isActive: true,
    storeIds: [] as string[],
  });

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchStores();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (error) {
      toast.error('Kullanıcılar yüklenemedi');
    }
  };

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores');
      if (res.ok) {
        setStores(await res.json());
      }
    } catch (error) {
      console.error('Mağazalar yüklenemedi');
    }
  };

  const filteredUsers = users.filter(
    (user) => roleFilter === 'all' || user.role === roleFilter
  );

  const openDialog = (user?: UserData) => {
    if (user) {
      setEditingUser(user);
      setForm({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        isActive: user.isActive,
        storeIds: user.managedStores.map((m) => m.store.id),
      });
    } else {
      setEditingUser(null);
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'VIEWER',
        isActive: true,
        storeIds: [],
      });
    }
    setShowDialog(true);
  };

  const saveUser = async () => {
    if (!form.name || !form.email || (!editingUser && !form.password)) {
      toast.error('Ad, email ve şifre zorunludur');
      return;
    }

    setLoading(true);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const body: any = {
        name: form.name,
        email: form.email,
        role: form.role,
        isActive: form.isActive,
        storeIds: form.storeIds,
      };

      if (form.password) {
        body.password = form.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingUser ? 'Kullanıcı güncellendi' : 'Kullanıcı eklendi');
        setShowDialog(false);
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || 'İşlem başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
    setLoading(false);
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Kullanıcı silindi');
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Silme başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const toggleStoreSelection = (storeId: string) => {
    if (form.storeIds.includes(storeId)) {
      setForm({ ...form, storeIds: form.storeIds.filter((id) => id !== storeId) });
    } else {
      setForm({ ...form, storeIds: [...form.storeIds, storeId] });
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Bu sayfaya erişim yetkiniz yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kullanıcılar</h1>
          <p className="text-muted-foreground">
            Ekip üyelerini ve yetkilerini yönetin
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Kullanıcı Ekle
        </Button>
      </div>

      {/* Rol Kartları */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(roleLabels).map(([role, label]) => {
          const Icon = roleIcons[role];
          const count = users.filter((u) => u.role === role).length;
          return (
            <Card key={role}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${roleColors[role]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{count} kullanıcı</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filtre */}
      <div className="flex gap-4">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Rol Filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Roller</SelectItem>
            <SelectItem value="ADMIN">Yönetici</SelectItem>
            <SelectItem value="MANAGER">Mağaza Yöneticisi</SelectItem>
            <SelectItem value="PRODUCER">Üretici</SelectItem>
            <SelectItem value="VIEWER">Görüntüleyici</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kullanıcı Listesi */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Kullanıcı</th>
                  <th className="text-left p-4 font-medium hidden md:table-cell">Rol</th>
                  <th className="text-left p-4 font-medium hidden lg:table-cell">Mağazalar</th>
                  <th className="text-left p-4 font-medium">Durum</th>
                  <th className="text-right p-4 font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const RoleIcon = roleIcons[user.role];
                  return (
                    <tr key={user.id} className="border-b hover:bg-muted/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="font-medium text-primary">
                              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <Badge className={roleColors[user.role]}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {roleLabels[user.role]}
                        </Badge>
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        {user.role === 'ADMIN' ? (
                          <span className="text-sm text-muted-foreground">Tüm mağazalar</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {user.managedStores.length === 0 ? (
                              <span className="text-sm text-muted-foreground">-</span>
                            ) : (
                              user.managedStores.map((m) => (
                                <Badge key={m.store.id} variant="outline" className="text-xs">
                                  <Store className="h-3 w-3 mr-1" />
                                  {m.store.name}
                                </Badge>
                              ))
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.isActive ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDialog(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteUser(user.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Kullanıcı bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Kullanıcı Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ad Soyad *</label>
              <Input
                placeholder="Ahmet Yılmaz"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">E-posta *</label>
              <Input
                type="email"
                placeholder="ornek@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Şifre {editingUser ? '(boş bırakılırsa değişmez)' : '*'}
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Rol</label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Yönetici</SelectItem>
                  <SelectItem value="MANAGER">Mağaza Yöneticisi</SelectItem>
                  <SelectItem value="PRODUCER">Üretici</SelectItem>
                  <SelectItem value="VIEWER">Görüntüleyici</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.role !== 'ADMIN' && (
              <div>
                <label className="text-sm font-medium">Atanacak Mağazalar</label>
                <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                  {stores.map((store) => (
                    <label key={store.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={form.storeIds.includes(store.id)}
                        onChange={() => toggleStoreSelection(store.id)}
                      />
                      <span className="text-sm">{store.name}</span>
                    </label>
                  ))}
                  {stores.length === 0 && (
                    <p className="text-sm text-muted-foreground">Henüz mağaza eklenmemiş</p>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <label htmlFor="isActive" className="text-sm">Aktif kullanıcı</label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>
                İptal
              </Button>
              <Button className="flex-1" onClick={saveUser} disabled={loading}>
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
