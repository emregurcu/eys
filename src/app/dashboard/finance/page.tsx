'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  CreditCard,
  ShoppingCart,
  RefreshCw,
  Filter,
  X,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { formatCurrency, formatShortDate } from '@/lib/utils';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ─── Types ─────────────────────────────────────────────
interface FinanceSummary {
  totalRevenue: number;
  totalProductCost: number;
  totalShippingCost: number;
  totalEtsyFees: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  orderCount: number;
}

interface Comparison {
  revenueChange: number;
  costChange: number;
  profitChange: number;
  orderCountChange: number;
  prevRevenue: number;
  prevCost: number;
  prevProfit: number;
  prevOrderCount: number;
}

interface StoreStat {
  id: string;
  name: string;
  revenue: number;
  cost: number;
  profit: number;
  orderCount: number;
}

interface DailyData {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
}

interface OrderSummary {
  id: string;
  orderNumber: string;
  orderDate: string;
  salePrice: number;
  totalCost: number;
  netProfit: number;
  profitMargin: number;
  store: { name: string };
}

// ─── Constants ─────────────────────────────────────────
const statusOptions = [
  { value: 'all', label: 'Tüm Durumlar' },
  { value: 'NEW', label: 'Yeni' },
  { value: 'PROCESSING', label: 'İşleniyor' },
  { value: 'PRODUCTION', label: 'Üretimde' },
  { value: 'READY', label: 'Hazır' },
  { value: 'SHIPPED', label: 'Kargoda' },
  { value: 'DELIVERED', label: 'Teslim Edildi' },
  { value: 'CANCELLED', label: 'İptal' },
  { value: 'PROBLEM', label: 'Problem' },
];

const PIE_COLORS = ['#8b5cf6', '#3b82f6', '#f97316'];

function getQuickDateRange(key: string): { start: string; end: string } | null {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  switch (key) {
    case 'today': { const t = fmt(now); return { start: t, end: t }; }
    case 'yesterday': { const y = new Date(now); y.setDate(y.getDate() - 1); const d = fmt(y); return { start: d, end: d }; }
    case 'last7': { const s = new Date(now); s.setDate(s.getDate() - 6); return { start: fmt(s), end: fmt(now) }; }
    case 'last30': { const s = new Date(now); s.setDate(s.getDate() - 29); return { start: fmt(s), end: fmt(now) }; }
    case 'thisMonth': { const s = new Date(now.getFullYear(), now.getMonth(), 1); return { start: fmt(s), end: fmt(now) }; }
    case 'lastMonth': { const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { start: fmt(s), end: fmt(e) }; }
    case 'thisQuarter': { const q = Math.floor(now.getMonth() / 3) * 3; const s = new Date(now.getFullYear(), q, 1); return { start: fmt(s), end: fmt(now) }; }
    case 'thisYear': { const s = new Date(now.getFullYear(), 0, 1); return { start: fmt(s), end: fmt(now) }; }
    case 'allTime': return null;
    default: return null;
  }
}

// ─── Helpers ───────────────────────────────────────────
function ChangeIndicator({ value, suffix = '' }: { value: number; suffix?: string }) {
  if (value === 0) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" /> Değişim yok</span>;
  const isPositive = value > 0;
  return (
    <span className={`text-xs flex items-center gap-0.5 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      %{Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

function CostChangeIndicator({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" /> Değişim yok</span>;
  // Maliyet artışı kötü, azalması iyi
  const isPositive = value > 0;
  return (
    <span className={`text-xs flex items-center gap-0.5 ${isPositive ? 'text-red-600' : 'text-green-600'}`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      %{Math.abs(value).toFixed(1)}
    </span>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{formatCurrency(p.value, 'USD')}</span>
        </div>
      ))}
    </div>
  );
};

// ─── CSV Export ────────────────────────────────────────
function exportCSV(orders: OrderSummary[], summary: FinanceSummary, dateLabel: string) {
  const BOM = '\uFEFF';
  const headers = ['Sipariş No', 'Mağaza', 'Tarih', 'Satış ($)', 'Maliyet ($)', 'Kar ($)', 'Marj (%)'];
  const rows = orders.map(o => [
    o.orderNumber,
    o.store.name,
    new Date(o.orderDate).toLocaleDateString('tr-TR'),
    o.salePrice.toFixed(2),
    o.totalCost.toFixed(2),
    o.netProfit.toFixed(2),
    (o.profitMargin || 0).toFixed(1),
  ]);

  // Summary satırları
  rows.push([]);
  rows.push(['ÖZET', '', dateLabel, '', '', '', '']);
  rows.push(['Toplam Satış', '', '', summary.totalRevenue.toFixed(2), '', '', '']);
  rows.push(['Toplam Maliyet', '', '', '', summary.totalCost.toFixed(2), '', '']);
  rows.push(['Ürün Maliyeti', '', '', '', summary.totalProductCost.toFixed(2), '', '']);
  rows.push(['Kargo Maliyeti', '', '', '', summary.totalShippingCost.toFixed(2), '', '']);
  rows.push(['Etsy Kesintileri', '', '', '', summary.totalEtsyFees.toFixed(2), '', '']);
  rows.push(['Net Kar', '', '', '', '', summary.totalProfit.toFixed(2), summary.profitMargin.toFixed(1)]);
  rows.push(['Sipariş Sayısı', summary.orderCount.toString(), '', '', '', '', '']);

  const csvContent = BOM + [headers, ...rows].map(r => (r as string[]).join(';')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `finans-rapor-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Main Component ────────────────────────────────────
export default function FinancePage() {
  const [quickRange, setQuickRange] = useState('thisMonth');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [storeStats, setStoreStats] = useState<StoreStat[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);

  const [sortField, setSortField] = useState<'orderDate' | 'salePrice' | 'netProfit' | 'profitMargin'>('orderDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Quick range → tarih
  useEffect(() => {
    if (quickRange === 'custom') return;
    const range = getQuickDateRange(quickRange);
    if (range) { setStartDate(range.start); setEndDate(range.end); }
    else { setStartDate(''); setEndDate(''); }
  }, [quickRange]);

  useEffect(() => { fetchStores(); }, []);
  useEffect(() => { fetchData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [startDate, endDate, storeFilter, statusFilter]);

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores');
      if (res.ok) setStores(await res.json());
    } catch { /* ignore */ }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) {
        params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
      } else {
        params.append('period', 'all');
      }
      if (storeFilter !== 'all') params.append('storeId', storeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/finance/summary?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setComparison(data.comparison || null);
        setStoreStats(data.storeStats);
        setDailyData(data.dailyData || []);
        setOrders(data.orders);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  // Sorted orders
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      let va: number, vb: number;
      switch (sortField) {
        case 'orderDate': va = new Date(a.orderDate).getTime(); vb = new Date(b.orderDate).getTime(); break;
        case 'salePrice': va = a.salePrice; vb = b.salePrice; break;
        case 'netProfit': va = a.netProfit; vb = b.netProfit; break;
        case 'profitMargin': va = a.profitMargin || 0; vb = b.profitMargin || 0; break;
        default: return 0;
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [orders, sortField, sortDir]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <span className="text-muted-foreground/40 ml-1">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const clearFilters = () => { setQuickRange('thisMonth'); setStoreFilter('all'); setStatusFilter('all'); };

  const activeFilterCount = [storeFilter !== 'all', statusFilter !== 'all', quickRange !== 'thisMonth'].filter(Boolean).length;

  const dateRangeLabel = useMemo(() => {
    const labels: Record<string, string> = {
      today: 'Bugün', yesterday: 'Dün', last7: 'Son 7 Gün', last30: 'Son 30 Gün',
      thisMonth: 'Bu Ay', lastMonth: 'Geçen Ay', thisQuarter: 'Bu Çeyrek',
      thisYear: 'Bu Yıl', allTime: 'Tüm Zamanlar',
      custom: startDate && endDate ? `${startDate} → ${endDate}` : 'Özel Aralık',
    };
    return labels[quickRange] || 'Bu Ay';
  }, [quickRange, startDate, endDate]);

  const avgOrderValue = summary && summary.orderCount > 0 ? summary.totalRevenue / summary.orderCount : 0;
  const avgOrderProfit = summary && summary.orderCount > 0 ? summary.totalProfit / summary.orderCount : 0;

  // Recharts chart data
  const chartData = useMemo(() => {
    return dailyData.map(d => ({
      ...d,
      dateLabel: formatShortDate(d.date),
    }));
  }, [dailyData]);

  // Pie chart data
  const pieData = useMemo(() => {
    if (!summary || summary.totalCost === 0) return [];
    return [
      { name: 'Ürün Maliyeti', value: summary.totalProductCost },
      { name: 'Kargo Maliyeti', value: summary.totalShippingCost },
      { name: 'Etsy Kesintileri', value: summary.totalEtsyFees },
    ];
  }, [summary]);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finans</h1>
          <p className="text-muted-foreground">Gelir, gider ve karlılık analizi — {dateRangeLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="relative">
            <Filter className="mr-2 h-4 w-4" /> Filtreler
            {activeFilterCount > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary">{activeFilterCount}</Badge>
            )}
          </Button>
          {summary && orders.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => exportCSV(orders, summary, dateRangeLabel)}>
              <Download className="mr-2 h-4 w-4" /> CSV İndir
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Yenile
          </Button>
        </div>
      </div>

      {/* Filtre Paneli */}
      {showFilters && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Hızlı Tarih Seçimi</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'today', label: 'Bugün' },
                  { key: 'yesterday', label: 'Dün' },
                  { key: 'last7', label: 'Son 7 Gün' },
                  { key: 'last30', label: 'Son 30 Gün' },
                  { key: 'thisMonth', label: 'Bu Ay' },
                  { key: 'lastMonth', label: 'Geçen Ay' },
                  { key: 'thisQuarter', label: 'Bu Çeyrek' },
                  { key: 'thisYear', label: 'Bu Yıl' },
                  { key: 'allTime', label: 'Tüm Zamanlar' },
                ].map((item) => (
                  <Button
                    key={item.key}
                    variant={quickRange === item.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setQuickRange(item.key)}
                    className="text-xs"
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div>
                <Label className="text-sm">Başlangıç Tarihi</Label>
                <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setQuickRange('custom'); }} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Bitiş Tarihi</Label>
                <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setQuickRange('custom'); }} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Mağaza</Label>
                <Select value={storeFilter} onValueChange={setStoreFilter}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Mağaza" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Mağazalar</SelectItem>
                    {stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Sipariş Durumu</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Durum" /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}><X className="mr-1 h-3 w-3" /> Filtreleri Temizle</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Boş durum */}
      {summary && summary.orderCount === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">Sipariş Bulunamadı</h3>
            <p className="text-muted-foreground text-sm">Seçilen filtreler ile eşleşen sipariş yok.</p>
          </CardContent>
        </Card>
      ) : summary && (
        <>
          {/* ─── Özet Kartları + Comparison ─── */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Toplam Satış */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Toplam Satış</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalRevenue, 'USD')}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">{summary.orderCount} sipariş</p>
                      {comparison && <ChangeIndicator value={comparison.revenueChange} />}
                    </div>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100"><ShoppingCart className="h-6 w-6 text-blue-600" /></div>
                </div>
              </CardContent>
            </Card>

            {/* Toplam Maliyet */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Toplam Maliyet</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalCost, 'USD')}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">Ürün + Kargo + Etsy</p>
                      {comparison && <CostChangeIndicator value={comparison.costChange} />}
                    </div>
                  </div>
                  <div className="p-3 rounded-full bg-red-100"><TrendingDown className="h-6 w-6 text-red-600" /></div>
                </div>
              </CardContent>
            </Card>

            {/* Net Kar */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Kar</p>
                    <p className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.totalProfit, 'USD')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">%{summary.profitMargin.toFixed(1)} marj</p>
                      {comparison && <ChangeIndicator value={comparison.profitChange} />}
                    </div>
                  </div>
                  <div className={`p-3 rounded-full ${summary.totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    {summary.totalProfit >= 0 ? <TrendingUp className="h-6 w-6 text-green-600" /> : <TrendingDown className="h-6 w-6 text-red-600" />}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sipariş Ortalaması */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sipariş Ortalaması</p>
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(avgOrderValue, 'USD')}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">Ort kar: {formatCurrency(avgOrderProfit, 'USD')}</p>
                      {comparison && <ChangeIndicator value={comparison.orderCountChange} />}
                    </div>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100"><Package className="h-6 w-6 text-purple-600" /></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── Comparison Detail Bar ─── */}
          {comparison && (comparison.prevRevenue > 0 || comparison.prevOrderCount > 0) && (
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <span className="text-muted-foreground font-medium">Önceki dönem:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Satış:</span>
                    <span className="font-medium">{formatCurrency(comparison.prevRevenue, 'USD')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Maliyet:</span>
                    <span className="font-medium">{formatCurrency(comparison.prevCost, 'USD')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Kar:</span>
                    <span className={`font-medium ${comparison.prevProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(comparison.prevProfit, 'USD')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Sipariş:</span>
                    <span className="font-medium">{comparison.prevOrderCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Gelir/Kar Grafiği (Recharts Area) ─── */}
          {chartData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Günlük Gelir &amp; Kar Trendi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" tickFormatter={(v) => `$${v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" name="Gelir" stroke="#3b82f6" strokeWidth={2} fill="url(#gradRevenue)" />
                      <Area type="monotone" dataKey="cost" name="Maliyet" stroke="#ef4444" strokeWidth={1.5} fill="url(#gradCost)" />
                      <Area type="monotone" dataKey="profit" name="Kar" stroke="#22c55e" strokeWidth={2} fill="url(#gradProfit)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Günlük Bar Chart ─── */}
          {chartData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Günlük Sipariş Gelir Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" tickFormatter={(v) => `$${v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="revenue" name="Gelir" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" name="Kar" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Maliyet Dağılımı (Pie) & Mağaza Bazlı Kar ─── */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Maliyet Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, percent }) => `${name} %${(percent * 100).toFixed(0)}`}
                            labelLine={false}
                          >
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value, 'USD')} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Alt detay */}
                    <div className="w-full space-y-3 mt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#8b5cf6]" />
                          <Package className="h-4 w-4 text-purple-600" />
                          <span className="text-sm">Ürün Maliyeti</span>
                        </div>
                        <span className="font-medium text-sm">{formatCurrency(summary.totalProductCost, 'USD')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#3b82f6]" />
                          <Truck className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">Kargo Maliyeti</span>
                        </div>
                        <span className="font-medium text-sm">{formatCurrency(summary.totalShippingCost, 'USD')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#f97316]" />
                          <CreditCard className="h-4 w-4 text-orange-600" />
                          <span className="text-sm">Etsy Kesintileri</span>
                        </div>
                        <span className="font-medium text-sm">{formatCurrency(summary.totalEtsyFees, 'USD')}</span>
                      </div>
                      <div className="border-t pt-2 flex items-center justify-between font-medium">
                        <span>Toplam Maliyet</span>
                        <span className="text-red-600">{formatCurrency(summary.totalCost, 'USD')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Maliyet verisi yok</p>
                )}
              </CardContent>
            </Card>

            {/* Mağaza Bazlı Kar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mağaza Bazlı Kar</CardTitle>
              </CardHeader>
              <CardContent>
                {storeStats.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Bu dönemde sipariş bulunmuyor</p>
                ) : (
                  <div className="space-y-4">
                    {storeStats.sort((a, b) => b.profit - a.profit).map((store) => {
                      const margin = store.revenue > 0 ? (store.profit / store.revenue) * 100 : 0;
                      const revenueShare = summary.totalRevenue > 0 ? (store.revenue / summary.totalRevenue) * 100 : 0;
                      return (
                        <div key={store.id} className="p-3 rounded-lg border space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <span className="text-primary font-bold text-sm">{store.name.substring(0, 2).toUpperCase()}</span>
                              </div>
                              <div>
                                <p className="font-medium">{store.name}</p>
                                <p className="text-sm text-muted-foreground">{store.orderCount} sipariş · %{margin.toFixed(1)} marj</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${store.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(store.profit, 'USD')}
                              </p>
                              <p className="text-xs text-muted-foreground">Satış: {formatCurrency(store.revenue, 'USD')}</p>
                            </div>
                          </div>
                          {/* Revenue share bar */}
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                              className="bg-primary h-1.5 rounded-full transition-all"
                              style={{ width: `${revenueShare}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Toplam satışın %{revenueShare.toFixed(1)}&apos;i</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ─── Sipariş Tablosu ─── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Sipariş Bazlı Kar/Zarar</CardTitle>
              <span className="text-sm text-muted-foreground">{orders.length} sipariş</span>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Bu dönemde sipariş bulunmuyor</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Sipariş</th>
                        <th className="text-left p-3 font-medium hidden md:table-cell">Mağaza</th>
                        <th className="text-left p-3 font-medium hidden md:table-cell cursor-pointer hover:text-primary select-none" onClick={() => handleSort('orderDate')}>
                          Tarih <SortIcon field="orderDate" />
                        </th>
                        <th className="text-right p-3 font-medium cursor-pointer hover:text-primary select-none" onClick={() => handleSort('salePrice')}>
                          Satış <SortIcon field="salePrice" />
                        </th>
                        <th className="text-right p-3 font-medium">Maliyet</th>
                        <th className="text-right p-3 font-medium cursor-pointer hover:text-primary select-none" onClick={() => handleSort('netProfit')}>
                          Kar <SortIcon field="netProfit" />
                        </th>
                        <th className="text-right p-3 font-medium cursor-pointer hover:text-primary select-none" onClick={() => handleSort('profitMargin')}>
                          Marj <SortIcon field="profitMargin" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedOrders.map((order) => (
                        <tr key={order.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium">{order.orderNumber}</td>
                          <td className="p-3 hidden md:table-cell">{order.store.name}</td>
                          <td className="p-3 hidden md:table-cell">{formatShortDate(order.orderDate)}</td>
                          <td className="p-3 text-right">{formatCurrency(order.salePrice, 'USD')}</td>
                          <td className="p-3 text-right text-muted-foreground">{formatCurrency(order.totalCost, 'USD')}</td>
                          <td className={`p-3 text-right font-medium ${order.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(order.netProfit, 'USD')}
                          </td>
                          <td className="p-3 text-right">
                            <Badge variant={(order.profitMargin || 0) >= 30 ? 'default' : (order.profitMargin || 0) >= 15 ? 'secondary' : 'destructive'}>
                              %{(order.profitMargin || 0).toFixed(0)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
