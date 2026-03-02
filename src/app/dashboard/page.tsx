'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Store,
  Clock,
  DollarSign,
  Package,
  RefreshCw,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertCircle,
  Calendar,
  Activity,
  Eye,
  ChevronRight,
  Sun,
  Copy,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatCurrency, formatShortDate } from '@/lib/utils';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

// ─── Types ─────────────────────────────────────────────
interface DashboardData {
  stats: {
    totalOrders: number;
    pendingOrders: number;
    openIssues: number;
    monthRevenue: number;
    monthProfit: number;
    monthCost: number;
    monthOrderCount: number;
  };
  comparison: {
    revenueChange: number;
    profitChange: number;
    orderCountChange: number;
    prevRevenue: number;
    prevProfit: number;
    prevOrderCount: number;
  };
  today: {
    revenue: number;
    profit: number;
    orderCount: number;
  };
  sparkline: { date: string; revenue: number; profit: number; count: number }[];
  statusDistribution: { status: string; count: number }[];
  storesSummary: {
    id: string;
    name: string;
    orderCount: number;
    revenue: number;
    profit: number;
    cost: number;
  }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    store: { name: string };
    status: string;
    salePrice: number;
    netProfit: number;
    orderDate: string;
  }[];
  openIssuesList: {
    id: string;
    title: string;
    type: string;
    status: string;
    priority: number;
    createdAt: string;
    store: { name: string };
    order: { orderNumber: string } | null;
  }[];
  pendingActions: {
    noTracking: {
      id: string;
      orderNumber: string;
      customerName: string;
      status: string;
      orderDate: string;
      store: { name: string };
    }[];
    stuckOrders: {
      id: string;
      orderNumber: string;
      customerName: string;
      status: string;
      orderDate: string;
      store: { name: string };
    }[];
  };
  activities: {
    id: string;
    action: string;
    entity: string;
    entityId: string;
    data: any;
    createdAt: string;
    user: { name: string };
  }[];
}

// ─── Constants ─────────────────────────────────────────
const statusColors: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-yellow-100 text-yellow-800',
  PRODUCTION: 'bg-purple-100 text-purple-800',
  READY: 'bg-cyan-100 text-cyan-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  RETURNED: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  PROBLEM: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  NEW: 'Yeni',
  PROCESSING: 'İşleniyor',
  PRODUCTION: 'Üretimde',
  READY: 'Hazır',
  SHIPPED: 'Kargoda',
  DELIVERED: 'Teslim',
  RETURNED: 'İade',
  CANCELLED: 'İptal',
  PROBLEM: 'Problem',
};

const statusChartColors: Record<string, string> = {
  NEW: '#3b82f6',
  PROCESSING: '#eab308',
  PRODUCTION: '#8b5cf6',
  READY: '#06b6d4',
  SHIPPED: '#6366f1',
  DELIVERED: '#22c55e',
  RETURNED: '#f97316',
  CANCELLED: '#6b7280',
  PROBLEM: '#ef4444',
};

const issueTypeLabels: Record<string, string> = {
  SHIPPING: 'Kargo',
  RETURN: 'İade',
  PRODUCT: 'Ürün',
  CUSTOMER: 'Müşteri',
  OTHER: 'Diğer',
};

const activityLabels: Record<string, string> = {
  create: 'oluşturdu',
  update: 'güncelledi',
  delete: 'sildi',
  status_change: 'durumunu değiştirdi',
  tracking_added: 'kargo takip ekledi',
  shipped: 'kargoya verdi',
  delivered: 'teslim etti',
};

const entityLabels: Record<string, string> = {
  order: 'Sipariş',
  issue: 'Sorun',
  store: 'Mağaza',
  user: 'Kullanıcı',
};

// ─── Helpers ───────────────────────────────────────────
function ChangeIndicator({ value }: { value: number }) {
  if (Math.abs(value) < 0.1) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" /> —</span>;
  const isPositive = value > 0;
  return (
    <span className={`text-xs flex items-center gap-0.5 font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      %{Math.abs(value).toFixed(1)}
    </span>
  );
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes}dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}g önce`;
  return formatShortDate(dateStr);
}

function daysSince(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  return Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
}

const SparklineTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg p-2 text-xs">
      <p className="font-medium">{payload[0]?.payload?.dateLabel}</p>
      <p className="text-blue-600">Gelir: {formatCurrency(payload[0]?.value || 0, 'USD')}</p>
      <p className="text-green-600">Kar: {formatCurrency(payload[1]?.value || 0, 'USD')}</p>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────
const AUTO_REFRESH_INTERVAL = 60_000; // 60 saniye

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL / 1000);
  const [previewOrder, setPreviewOrder] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const prevOrderCountRef = useRef<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const playNewOrderSound = () => {
    try {
      const audio = new Audio('/sound/money.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {}
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const newData: DashboardData = await res.json();
        if (prevOrderCountRef.current !== null && newData.stats.totalOrders > prevOrderCountRef.current) {
          const diff = newData.stats.totalOrders - prevOrderCountRef.current;
          playNewOrderSound();
          toast.success(`🎉 ${diff} yeni sipariş geldi!`, { duration: 5000 });
        }
        prevOrderCountRef.current = newData.stats.totalOrders;
        setData(newData);
      }
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    }
    setLoading(false);
    setCountdown(AUTO_REFRESH_INTERVAL / 1000);
  };

  const fetchOrderDetail = async (orderId: string) => {
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        setPreviewOrder(await res.json());
      }
    } catch (error) {
      console.error('Order detail fetch error:', error);
    }
    setPreviewLoading(false);
  };

  const updatePreviewOrderStatus = async (orderId: string, status: string) => {
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success('Durum güncellendi');
        setPreviewOrder((prev: any) => prev ? { ...prev, status } : null);
        // Dashboard verisini de güncelle
        fetchDashboard();
      } else {
        toast.error('Güncelleme başarısız');
      }
    } catch {
      toast.error('Güncelleme başarısız');
    }
    setStatusUpdating(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // SSE - Gerçek zamanlı güncelleme
  useEffect(() => {
    const connectSSE = () => {
      const es = new EventSource('/api/dashboard/stream');
      eventSourceRef.current = es;

      es.onopen = () => setSseConnected(true);

      es.addEventListener('new_orders', (e) => {
        try {
          const data = JSON.parse(e.data);
          playNewOrderSound();
          toast.success(`🎉 ${data.count} yeni sipariş geldi!`, { duration: 5000 });
          // Dashboard'u tam güncelle
          fetchDashboard();
        } catch {}
      });

      es.addEventListener('update', (e) => {
        try {
          const stats = JSON.parse(e.data);
          // Sadece küçük güncellemeler için state'i güncelle
          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              stats: {
                ...prev.stats,
                totalOrders: stats.totalOrders,
                pendingOrders: stats.pendingOrders,
                openIssues: stats.openIssues,
              },
            };
          });
        } catch {}
      });

      es.onerror = () => {
        setSseConnected(false);
        es.close();
        // 5 saniye sonra yeniden bağlan
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  // Fallback polling - SSE bağlantısı yoksa
  useEffect(() => {
    if (autoRefresh && !sseConnected) {
      intervalRef.current = setInterval(() => {
        fetchDashboard();
      }, AUTO_REFRESH_INTERVAL);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => (prev <= 1 ? AUTO_REFRESH_INTERVAL / 1000 : prev - 1));
      }, 1000);
    } else if (sseConnected) {
      // SSE bağlı ise polling'i kapat
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoRefresh, sseConnected]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const { stats, comparison, today, sparkline, statusDistribution, storesSummary, recentOrders, openIssuesList, pendingActions, activities } = data;

  const sparklineData = sparkline.map((d) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' }),
  }));

  const totalPendingActions = pendingActions.noTracking.length + pendingActions.stuckOrders.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            Hoş Geldin, {session?.user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground">İşte mağazalarınızın güncel durumu</p>
        </div>
        <div className="flex items-center gap-2">
          {sseConnected ? (
            <span className="flex items-center gap-1.5 text-xs text-green-600 px-2 py-1 rounded-md bg-green-50 border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Canlı
            </span>
          ) : (
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="text-xs"
            >
              {autoRefresh ? `⏱ ${countdown}s` : '⏸ Durduruldu'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchDashboard} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> <span className="hidden sm:inline">Yenile</span>
          </Button>
        </div>
      </div>

      {/* ─── Bugünün Özeti ─── */}
      <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-100">
              <Sun className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-900">Bugünün Özeti</p>
              <div className="flex flex-wrap items-center gap-4 mt-1">
                <span className="text-sm text-orange-800">
                  <strong>{today.orderCount}</strong> yeni sipariş
                </span>
                <span className="text-sm text-orange-800">
                  Gelir: <strong>{formatCurrency(today.revenue, 'USD')}</strong>
                </span>
                <span className={`text-sm font-medium ${today.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  Kar: <strong>{formatCurrency(today.profit, 'USD')}</strong>
                </span>
              </div>
            </div>
            {totalPendingActions > 0 && (
              <Badge variant="destructive" className="text-xs">
                {totalPendingActions} aksiyon bekliyor
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Stat Kartları + Comparison ─── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Sipariş</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">Bu ay: {stats.monthOrderCount}</span>
                  <ChangeIndicator value={comparison.orderCountChange} />
                </div>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bekleyen</p>
                <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.openIssues > 0 && <span className="text-red-600 font-medium">{stats.openIssues} açık sorun</span>}
                  {stats.openIssues === 0 && 'Sorun yok ✓'}
                </p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bu Ay Gelir</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.monthRevenue, 'USD')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">Geçen: {formatCurrency(comparison.prevRevenue, 'USD')}</span>
                  <ChangeIndicator value={comparison.revenueChange} />
                </div>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bu Ay Kar</p>
                <p className={`text-2xl font-bold ${stats.monthProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.monthProfit, 'USD')}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">Geçen: {formatCurrency(comparison.prevProfit, 'USD')}</span>
                  <ChangeIndicator value={comparison.profitChange} />
                </div>
              </div>
              <div className={`p-3 rounded-full ${stats.monthProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {stats.monthProfit >= 0 ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Son Siparişler + Son Aktiviteler ─── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Son Siparişler */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Son Siparişler</CardTitle>
            <Link href="/dashboard/orders" className="text-xs text-primary hover:underline flex items-center gap-1">
              Tümünü Gör <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">Henüz sipariş yok</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => fetchOrderDetail(order.id)}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div>
                        <p className="text-sm font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground truncate">{order.customerName}</p>
                      </div>
                    </div>
                    <span className="hidden sm:block text-xs text-muted-foreground">{order.store?.name}</span>
                    <Badge className={`text-[10px] ${statusColors[order.status] || 'bg-gray-100'}`}>
                      {statusLabels[order.status] || order.status}
                    </Badge>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(order.salePrice, 'USD')}</p>
                      <p className={`text-xs ${(order.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(order.netProfit || 0, 'USD')}
                      </p>
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Son Aktiviteler */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Son Aktiviteler
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">Henüz aktivite yok</p>
            ) : (
              <div className="relative">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                <div className="space-y-3">
                  {activities.map((act) => (
                    <div key={act.id} className="flex items-start gap-3 relative">
                      <div className="w-3.5 h-3.5 rounded-full bg-primary/20 border-2 border-primary shrink-0 mt-0.5 z-10" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-relaxed">
                          <span className="font-medium">{act.user.name}</span>{' '}
                          <span className="text-muted-foreground">
                            {entityLabels[act.entity] || act.entity}{' '}
                            {activityLabels[act.action] || act.action}
                          </span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(act.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Sparkline + Durum Dağılımı ─── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Son 7 gün sparkline */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Son 7 Gün Gelir &amp; Kar Trendi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sparkRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="sparkProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<SparklineTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#sparkRevenue)" />
                  <Area type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} fill="url(#sparkProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Gelir</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Kar</span>
            </div>
          </CardContent>
        </Card>

        {/* Sipariş Durumu Dağılımı */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Sipariş Durumları
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <>
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution.map((s) => ({ ...s, name: statusLabels[s.status] || s.status }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="count"
                      >
                        {statusDistribution.map((s) => (
                          <Cell key={s.status} fill={statusChartColors[s.status] || '#6b7280'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [`${value} sipariş`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-1">
                  {statusDistribution
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5)
                    .map((s) => (
                      <div key={s.status} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: statusChartColors[s.status] }} />
                          <span>{statusLabels[s.status] || s.status}</span>
                        </div>
                        <span className="font-medium">{s.count}</span>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">Veri yok</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Bekleyen Aksiyonlar ─── */}
      {totalPendingActions > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-900">
              <AlertCircle className="h-4 w-4 text-amber-600" /> Bekleyen Aksiyonlar
              <Badge variant="secondary" className="ml-auto">{totalPendingActions}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Tracking eklenmemiş */}
              {pendingActions.noTracking.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" /> Kargo Takip Bekleniyor ({pendingActions.noTracking.length})
                  </p>
                  <div className="space-y-1.5">
                    {pendingActions.noTracking.map((o) => (
                      <div key={o.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-amber-100">
                        <div>
                          <span className="font-medium">{o.orderNumber}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{o.store.name}</span>
                        </div>
                        <Badge className={`text-[10px] ${statusColors[o.status]}`}>{statusLabels[o.status]}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3+ gün bekleyen */}
              {pendingActions.stuckOrders.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> 3+ Gündür Bekleyen ({pendingActions.stuckOrders.length})
                  </p>
                  <div className="space-y-1.5">
                    {pendingActions.stuckOrders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-amber-100">
                        <div>
                          <span className="font-medium">{o.orderNumber}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{o.store.name}</span>
                        </div>
                        <span className="text-xs text-red-600 font-medium">{daysSince(o.orderDate)} gündür bekliyor</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Mağaza Özeti + Açık Sorunlar ─── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Mağaza Bazlı Bu Ay */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4" /> Mağaza Bazlı Bu Ay
            </CardTitle>
            <Link href="/dashboard/finance" className="text-xs text-primary hover:underline">Detay →</Link>
          </CardHeader>
          <CardContent>
            {storesSummary.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Bu ay sipariş yok</p>
            ) : (
              <div className="space-y-3">
                {storesSummary.sort((a, b) => b.profit - a.profit).map((store) => {
                  const margin = store.revenue > 0 ? (store.profit / store.revenue) * 100 : 0;
                  const maxRevenue = Math.max(...storesSummary.map((s) => s.revenue), 1);
                  return (
                    <div key={store.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-bold text-xs">{store.name.substring(0, 2).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{store.name}</p>
                            <p className="text-xs text-muted-foreground">{store.orderCount} sipariş · %{margin.toFixed(0)} marj</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${store.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(store.profit, 'USD')}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(store.revenue, 'USD')}</p>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${(store.revenue / maxRevenue) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Açık Sorunlar */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Açık Sorunlar
              {openIssuesList.length > 0 && (
                <Badge variant="destructive" className="text-[10px]">{openIssuesList.length}</Badge>
              )}
            </CardTitle>
            <Link href="/dashboard/issues" className="text-xs text-primary hover:underline">Tümü →</Link>
          </CardHeader>
          <CardContent>
            {openIssuesList.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">Açık sorun yok 🎉</p>
              </div>
            ) : (
              <div className="space-y-2">
                {openIssuesList.map((issue) => (
                  <div key={issue.id} className="flex items-start gap-3 p-2.5 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${issue.priority >= 3 ? 'bg-red-500' : issue.priority >= 2 ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{issue.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {issueTypeLabels[issue.type] || issue.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{issue.store.name}</span>
                        {issue.order && (
                          <span className="text-xs text-muted-foreground">#{issue.order.orderNumber}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{timeAgo(issue.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Hızlı Erişim ─── */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { href: '/dashboard/orders', icon: ShoppingCart, label: 'Siparişler', desc: 'Sipariş yönetimi', color: 'bg-primary/10 text-primary' },
          { href: '/dashboard/finance', icon: TrendingUp, label: 'Finans', desc: 'Gelir analizi', color: 'bg-green-100 text-green-600' },
          { href: '/dashboard/issues', icon: AlertTriangle, label: 'Sorunlar', desc: 'Sorun takibi', color: 'bg-red-100 text-red-600' },
          { href: '/dashboard/stores', icon: Store, label: 'Mağazalar', desc: 'Mağaza ayarları', color: 'bg-blue-100 text-blue-600' },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardContent className="p-5 flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ─── Sipariş Hızlı Önizleme Modal ─── */}
      <Dialog open={!!previewOrder} onOpenChange={() => setPreviewOrder(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Sipariş Önizleme
              {previewOrder && (
                <Badge className={`text-[10px] ${statusColors[previewOrder.status] || 'bg-gray-100'}`}>
                  {statusLabels[previewOrder.status] || previewOrder.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : previewOrder && (
            <div className="space-y-4">
              {/* Temel Bilgiler */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Sipariş No</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">{previewOrder.orderNumber}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(previewOrder.orderNumber);
                        toast.success('Kopyalandı');
                      }}
                      className="p-0.5 hover:bg-muted rounded"
                    >
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tarih</p>
                  <p className="text-sm font-medium">{formatShortDate(previewOrder.orderDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Müşteri</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">{previewOrder.customerName}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(previewOrder.customerName);
                        toast.success('Kopyalandı');
                      }}
                      className="p-0.5 hover:bg-muted rounded"
                    >
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mağaza</p>
                  <p className="text-sm font-medium">{previewOrder.store?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ülke</p>
                  <p className="text-sm font-medium">{previewOrder.country?.name || previewOrder.shippingCountry || '-'}</p>
                </div>
              </div>

              {/* Ürünler */}
              {previewOrder.items && previewOrder.items.length > 0 && (
                <div className="border rounded-lg p-3 bg-muted/20 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Ürünler</p>
                  {previewOrder.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>
                        {item.notes || `${item.canvasSize?.name || '-'} - ${item.frameOption?.name || 'Çerçevesiz'}`}
                        {item.quantity > 1 && ` (x${item.quantity})`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Finansal */}
              <div className="border rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Finansal Özet</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Satış:</span>
                    <span className="font-medium">{formatCurrency(previewOrder.salePrice, previewOrder.saleCurrency || 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Toplam Maliyet:</span>
                    <span className="font-medium">{formatCurrency(previewOrder.totalCost || 0, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ürün Maliyet:</span>
                    <span>{formatCurrency(previewOrder.productCost || 0, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kargo:</span>
                    <span>{formatCurrency(previewOrder.shippingCost || 0, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Etsy Komisyon:</span>
                    <span>{formatCurrency(previewOrder.etsyFees || 0, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Net Kar:</span>
                    <span className={`font-bold ${(previewOrder.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(previewOrder.netProfit || 0, 'USD')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Kargo */}
              {previewOrder.trackingNumber && (
                <div className="border rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Kargo Bilgisi</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{previewOrder.trackingCompany || '-'}</span>
                    <span className="text-muted-foreground">•</span>
                    <span>{previewOrder.trackingNumber}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(previewOrder.trackingNumber);
                        toast.success('Takip kodu kopyalandı');
                      }}
                      className="p-0.5 hover:bg-muted rounded"
                    >
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              )}

              {/* Adres */}
              {previewOrder.shippingAddress && (
                <div className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Teslimat Adresi</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(previewOrder.shippingAddress);
                        toast.success('Adres kopyalandı');
                      }}
                      className="p-0.5 hover:bg-muted rounded"
                    >
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{previewOrder.shippingAddress}</p>
                </div>
              )}

              {/* Notlar */}
              {previewOrder.notes && (
                <div className="border rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Notlar</p>
                  <p className="text-sm">{previewOrder.notes}</p>
                </div>
              )}

              {/* Hızlı Durum Güncelleme */}
              <div className="border rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Durumu Değiştir</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'NEW', label: 'Yeni', icon: '🆕' },
                    { key: 'PROCESSING', label: 'İşleniyor', icon: '⚙️' },
                    { key: 'PRODUCTION', label: 'Üretimde', icon: '🏭' },
                    { key: 'READY', label: 'Hazır', icon: '✅' },
                    { key: 'SHIPPED', label: 'Kargoda', icon: '📦' },
                    { key: 'DELIVERED', label: 'Teslim', icon: '🎉' },
                    { key: 'PROBLEM', label: 'Problem', icon: '⚠️' },
                  ].map((s) => (
                    <Button
                      key={s.key}
                      variant={previewOrder.status === s.key ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs h-7 px-2"
                      disabled={previewOrder.status === s.key || statusUpdating}
                      onClick={() => updatePreviewOrderStatus(previewOrder.id, s.key)}
                    >
                      <span className="mr-1">{s.icon}</span> {s.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Aksiyon Butonları */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setPreviewOrder(null);
                    router.push(`/dashboard/orders?highlight=${previewOrder.id}`);
                  }}
                >
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  Siparişe Git
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
