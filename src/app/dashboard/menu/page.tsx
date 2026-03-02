'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package,
  Store,
  Users,
  Settings,
  Bell,
  LogOut,
  ChevronRight,
  UserCircle,
  DollarSign,
  BarChart3,
  Columns,
  Upload,
} from 'lucide-react';

const menuItems = [
  { href: '/dashboard/products', label: 'Ürünler', icon: Package, desc: 'Ürün kataloğu' },
  { href: '/dashboard/customers', label: 'Müşteriler', icon: UserCircle, desc: 'Müşteri CRM' },
  { href: '/dashboard/pricing', label: 'Fiyatlandırma', icon: DollarSign, desc: 'Maliyet ayarları' },
  { href: '/dashboard/reports', label: 'Raporlar', icon: BarChart3, desc: 'Detaylı analizler' },
  { href: '/dashboard/orders/kanban', label: 'Kanban Board', icon: Columns, desc: 'Sipariş pipeline' },
  { href: '/dashboard/orders/import', label: 'Toplu İçe Aktar', icon: Upload, desc: 'CSV/Excel yükleme' },
  { href: '/dashboard/stores', label: 'Mağazalar', icon: Store, desc: 'Mağaza yönetimi' },
  { href: '/dashboard/users', label: 'Kullanıcılar', icon: Users, desc: 'Ekip yönetimi' },
  { href: '/dashboard/notifications', label: 'Bildirimler', icon: Bell, desc: 'Bildirim merkezi' },
  { href: '/dashboard/settings', label: 'Ayarlar', icon: Settings, desc: 'Sistem ayarları' },
];

export default function MobileMenuPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      {/* Kullanıcı Bilgisi */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-bold text-primary">
                {session?.user?.name?.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <p className="font-semibold text-lg">{session?.user?.name}</p>
              <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
              <p className="text-xs text-primary mt-1">
                {(session?.user as any)?.role === 'ADMIN' ? 'Yönetici' : 'Kullanıcı'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menü Öğeleri */}
      <Card>
        <CardContent className="p-0">
          {menuItems.map((item, i) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center justify-between p-4 hover:bg-muted/50 active:bg-muted transition-colors ${
                  i !== menuItems.length - 1 ? 'border-b' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <span className="font-medium text-sm">{item.label}</span>
                    {item.desc && <p className="text-xs text-muted-foreground">{item.desc}</p>}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Çıkış */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Çıkış Yap
      </Button>

      {/* Versiyon */}
      <p className="text-center text-xs text-muted-foreground">
        Etsy Manager v1.0.0
      </p>
    </div>
  );
}
