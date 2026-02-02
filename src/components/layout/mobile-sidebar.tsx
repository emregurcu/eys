'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { X, Store } from 'lucide-react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  AlertTriangle,
  Wallet,
  Users,
  Settings,
  Bell,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/50 md:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-background border-r shadow-xl md:hidden animate-in slide-in-from-left duration-300">
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
            <div className="w-8 h-8 rounded-lg bg-etsy-orange flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">Etsy Manager</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
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
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
