'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  AlertTriangle,
  Wallet,
  Store,
  Users,
  Settings,
  Bell,
  DollarSign,
} from 'lucide-react';

const menuItems = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { href: '/dashboard/orders', label: 'Siparişler', icon: ShoppingCart },
  { href: '/dashboard/pricing', label: 'Fiyatlandırma', icon: DollarSign },
  { href: '/dashboard/issues', label: 'Sorunlar', icon: AlertTriangle },
  { href: '/dashboard/finance', label: 'Finans', icon: Wallet },
  { href: '/dashboard/stores', label: 'Mağazalar', icon: Store },
  { href: '/dashboard/users', label: 'Kullanıcılar', icon: Users },
  { href: '/dashboard/notifications', label: 'Bildirimler', icon: Bell },
  { href: '/dashboard/settings', label: 'Ayarlar', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-etsy-orange flex items-center justify-center">
            <Store className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg">Etsy Manager</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
