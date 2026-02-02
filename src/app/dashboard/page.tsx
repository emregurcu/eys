'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Store,
  Clock,
  DollarSign,
  Package,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  openIssues: number;
  monthlyRevenue: number;
  monthlyProfit: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  store: { name: string };
  status: string;
  salePrice: number;
  netProfit: number;
  orderDate: string;
}

const statusColors: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-yellow-100 text-yellow-800',
  PRODUCTION: 'bg-purple-100 text-purple-800',
  READY: 'bg-cyan-100 text-cyan-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  PROBLEM: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  NEW: 'Yeni',
  PROCESSING: 'İşleniyor',
  PRODUCTION: 'Üretimde',
  READY: 'Hazır',
  SHIPPED: 'Kargoda',
  DELIVERED: 'Teslim',
  PROBLEM: 'Problem',
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    openIssues: 0,
    monthlyRevenue: 0,
    monthlyProfit: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const ordersRes = await fetch('/api/orders?limit=5');
      if (ordersRes.ok) {
        const orders = await ordersRes.json();
        setRecentOrders(orders.slice(0, 5));

        // İstatistikleri hesapla
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const monthlyOrders = orders.filter((o: any) => new Date(o.orderDate) >= monthStart);
        const pendingStatuses = ['NEW', 'PROCESSING', 'PRODUCTION', 'READY'];
        
        setStats({
          totalOrders: orders.length,
          pendingOrders: orders.filter((o: any) => pendingStatuses.includes(o.status)).length,
          openIssues: 0, // TODO: issues API'den al
          monthlyRevenue: monthlyOrders.reduce((sum: number, o: any) => sum + (o.salePrice || 0), 0),
          monthlyProfit: monthlyOrders.reduce((sum: number, o: any) => sum + (o.netProfit || 0), 0),
        });
      }
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    }
    setLoading(false);
  };

  const statCards = [
    {
      title: 'Toplam Sipariş',
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      title: 'Bekleyen',
      value: stats.pendingOrders.toString(),
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
    },
    {
      title: 'Bu Ay Gelir',
      value: formatCurrency(stats.monthlyRevenue, 'USD'),
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      title: 'Bu Ay Kar',
      value: formatCurrency(stats.monthlyProfit, 'USD'),
      icon: TrendingUp,
      color: stats.monthlyProfit >= 0 ? 'text-green-600' : 'text-red-600',
      bg: stats.monthlyProfit >= 0 ? 'bg-green-100' : 'bg-red-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Hoş Geldin, {session?.user?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground">
            İşte mağazalarınızın güncel durumu
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchDashboardData}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Yenile
        </Button>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Son Siparişler */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Son Siparişler</CardTitle>
          <Link
            href="/dashboard/orders"
            className="text-sm text-primary hover:underline"
          >
            Tümünü Gör
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Henüz sipariş yok</div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.customerName}
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:block text-sm text-muted-foreground">
                    {order.store?.name}
                  </div>
                  <Badge className={statusColors[order.status] || 'bg-gray-100'}>
                    {statusLabels[order.status] || order.status}
                  </Badge>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(order.salePrice, 'USD')}</p>
                    <p className={`text-xs ${(order.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(order.netProfit || 0, 'USD')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hızlı Erişim */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/orders">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Siparişler</p>
                <p className="text-sm text-muted-foreground">
                  Sipariş yönetimi
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/issues">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="font-medium">Sorunlar</p>
                <p className="text-sm text-muted-foreground">
                  Sorun takibi
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/stores">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <Store className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Mağazalar</p>
                <p className="text-sm text-muted-foreground">
                  Mağaza ayarları
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
