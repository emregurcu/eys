'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Calendar,
  Filter,
  X,
  Download,
} from 'lucide-react';
import { formatCurrency, formatShortDate } from '@/lib/utils';

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

// Hızlı tarih aralıkları
function getQuickDateRange(key: string): { start: string; end: string } | null {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  switch (key) {
    case 'today': {
      const today = fmt(now);
      return { start: today, end: today };
    }
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yesterday = fmt(y);
      return { start: yesterday, end: yesterday };
    }
    case 'last7': {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      return { start: fmt(s), end: fmt(now) };
    }
    case 'last30': {
      const s = new Date(now);
      s.setDate(s.getDate() - 29);
      return { start: fmt(s), end: fmt(now) };
    }
    case 'thisMonth': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: fmt(s), end: fmt(now) };
    }
    case 'lastMonth': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: fmt(s), end: fmt(e) };
    }
    case 'thisQuarter': {
      const qStart = Math.floor(now.getMonth() / 3) * 3;
      const s = new Date(now.getFullYear(), qStart, 1);
      return { start: fmt(s), end: fmt(now) };
    }
    case 'thisYear': {
      const s = new Date(now.getFullYear(), 0, 1);
      return { start: fmt(s), end: fmt(now) };
    }
    case 'allTime':
      return null;
    default:
      return null;
  }
}

export default function FinancePage() {
  // Filtreler
  const [quickRange, setQuickRange] = useState('thisMonth');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Data
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [storeStats, setStoreStats] = useState<StoreStat[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);

  // Sipariş tablosu sıralama
  const [sortField, setSortField] = useState<'orderDate' | 'salePrice' | 'netProfit' | 'profitMargin'>('orderDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Quick range değişince tarihleri ayarla
  useEffect(() => {
    if (quickRange === 'custom') return;
    const range = getQuickDateRange(quickRange);
    if (range) {
      setStartDate(range.start);
      setEndDate(range.end);
    } else {
      setStartDate('');
      setEndDate('');
    }
  }, [quickRange]);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, storeFilter, statusFilter]);

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores');
      if (res.ok) {
        const data = await res.json();
        setStores(data);
      }
    } catch (error) {
      console.error('Mağazalar yüklenemedi');
    }
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
        setStoreStats(data.storeStats);
        setDailyData(data.dailyData || []);
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Finans verileri yüklenemedi');
    }
    setLoading(false);
  };

  // Sıralanmış siparişler
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      let valA: number, valB: number;
      switch (sortField) {
        case 'orderDate':
          valA = new Date(a.orderDate).getTime();
          valB = new Date(b.orderDate).getTime();
          break;
        case 'salePrice':
          valA = a.salePrice;
          valB = b.salePrice;
          break;
        case 'netProfit':
          valA = a.netProfit;
          valB = b.netProfit;
          break;
        case 'profitMargin':
          valA = a.profitMargin || 0;
          valB = b.profitMargin || 0;
          break;
        default:
          return 0;
      }
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
  }, [orders, sortField, sortDir]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <span className="text-muted-foreground/40 ml-1">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const clearFilters = () => {
    setQuickRange('thisMonth');
    setStoreFilter('all');
    setStatusFilter('all');
  };

  const activeFilterCount = [
    storeFilter !== 'all',
    statusFilter !== 'all',
    quickRange !== 'thisMonth',
  ].filter(Boolean).length;

  // Tarih aralığı label
  const dateRangeLabel = useMemo(() => {
    const labels: Record<string, string> = {
      today: 'Bugün',
      yesterday: 'Dün',
      last7: 'Son 7 Gün',
      last30: 'Son 30 Gün',
      thisMonth: 'Bu Ay',
      lastMonth: 'Geçen Ay',
      thisQuarter: 'Bu Çeyrek',
      thisYear: 'Bu Yıl',
      allTime: 'Tüm Zamanlar',
      custom: startDate && endDate ? `${startDate} - ${endDate}` : 'Özel Aralık',
    };
    return labels[quickRange] || 'Bu Ay';
  }, [quickRange, startDate, endDate]);

  // Ortalama sipariş değeri
  const avgOrderValue = summary && summary.orderCount > 0 ? summary.totalRevenue / summary.orderCount : 0;
  const avgOrderProfit = summary && summary.orderCount > 0 ? summary.totalProfit / summary.orderCount : 0;

  // Günlük bar chart (basit CSS)
  const maxDailyRevenue = Math.max(...dailyData.map(d => d.revenue), 1);

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
          <p className="text-muted-foreground">
            Gelir, gider ve karlılık analizi — {dateRangeLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtreler
            {activeFilterCount > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
      </div>

      {/* Filtre Paneli */}
      {showFilters && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Hızlı Tarih Butonları */}
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

            {/* Custom Tarih Aralığı */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div>
                <Label className="text-sm">Başlangıç Tarihi</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setQuickRange('custom');
                  }}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Bitiş Tarihi</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setQuickRange('custom');
                  }}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Mağaza</Label>
                <Select value={storeFilter} onValueChange={setStoreFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Mağaza" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Mağazalar</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Sipariş Durumu</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Durum" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filtreleri Temizle */}
            {activeFilterCount > 0 && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-3 w-3" />
                  Filtreleri Temizle
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sonuç yoksa */}
      {summary && summary.orderCount === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">Sipariş Bulunamadı</h3>
            <p className="text-muted-foreground text-sm">
              Seçilen filtreler ile eşleşen sipariş yok. Filtreleri değiştirmeyi deneyin.
            </p>
          </CardContent>
        </Card>
      ) : summary && (
        <>
          {/* Özet Kartları */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Toplam Satış</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(summary.totalRevenue, 'USD')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary.orderCount} sipariş · Ort: {formatCurrency(avgOrderValue, 'USD')}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <ShoppingCart className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Toplam Maliyet</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(summary.totalCost, 'USD')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ürün + Kargo + Etsy
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-red-100">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Kar</p>
                    <p className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.totalProfit, 'USD')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      %{summary.profitMargin.toFixed(1)} marj · Ort: {formatCurrency(avgOrderProfit, 'USD')}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${summary.totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    {summary.totalProfit >= 0 ? (
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Etsy Kesintileri</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(summary.totalEtsyFees, 'USD')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Satışın %{summary.totalRevenue > 0 ? ((summary.totalEtsyFees / summary.totalRevenue) * 100).toFixed(1) : 0}&apos;i
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-orange-100">
                    <CreditCard className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Günlük Gelir Grafiği */}
          {dailyData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Günlük Gelir / Kar Grafiği
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {dailyData.map((day) => (
                    <div key={day.date} className="flex items-center gap-3 text-sm group">
                      <span className="text-muted-foreground w-20 shrink-0 text-xs">
                        {formatShortDate(day.date)}
                      </span>
                      <div className="flex-1 flex items-center gap-1 h-6">
                        {/* Gelir bar */}
                        <div
                          className="bg-blue-400 h-4 rounded-sm transition-all group-hover:bg-blue-500"
                          style={{ width: `${(day.revenue / maxDailyRevenue) * 100}%`, minWidth: day.revenue > 0 ? '4px' : '0' }}
                          title={`Gelir: ${formatCurrency(day.revenue, 'USD')}`}
                        />
                        {/* Kar overlay */}
                        <div
                          className={`h-4 rounded-sm transition-all ${day.profit >= 0 ? 'bg-green-400 group-hover:bg-green-500' : 'bg-red-400 group-hover:bg-red-500'}`}
                          style={{ width: `${(Math.abs(day.profit) / maxDailyRevenue) * 100}%`, minWidth: Math.abs(day.profit) > 0 ? '4px' : '0' }}
                          title={`Kar: ${formatCurrency(day.profit, 'USD')}`}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                        {formatCurrency(day.revenue, 'USD')}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-blue-400" /> Gelir
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-green-400" /> Kar
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-red-400" /> Zarar
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Maliyet Dağılımı & Mağaza Kar */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Maliyet Dağılımı */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Maliyet Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-purple-600" />
                        <span>Ürün Maliyeti</span>
                      </div>
                      <span className="font-medium">{formatCurrency(summary.totalProductCost, 'USD')}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className="bg-purple-500 h-2.5 rounded-full transition-all"
                        style={{ width: `${summary.totalCost > 0 ? (summary.totalProductCost / summary.totalCost) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      %{summary.totalCost > 0 ? ((summary.totalProductCost / summary.totalCost) * 100).toFixed(1) : 0}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-blue-600" />
                        <span>Kargo Maliyeti</span>
                      </div>
                      <span className="font-medium">{formatCurrency(summary.totalShippingCost, 'USD')}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className="bg-blue-500 h-2.5 rounded-full transition-all"
                        style={{ width: `${summary.totalCost > 0 ? (summary.totalShippingCost / summary.totalCost) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      %{summary.totalCost > 0 ? ((summary.totalShippingCost / summary.totalCost) * 100).toFixed(1) : 0}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-orange-600" />
                        <span>Etsy Kesintileri</span>
                      </div>
                      <span className="font-medium">{formatCurrency(summary.totalEtsyFees, 'USD')}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className="bg-orange-500 h-2.5 rounded-full transition-all"
                        style={{ width: `${summary.totalCost > 0 ? (summary.totalEtsyFees / summary.totalCost) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      %{summary.totalCost > 0 ? ((summary.totalEtsyFees / summary.totalCost) * 100).toFixed(1) : 0}
                    </p>
                  </div>

                  {/* Toplam */}
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Toplam Maliyet</span>
                      <span className="font-bold text-red-600">{formatCurrency(summary.totalCost, 'USD')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mağaza Bazlı Kar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mağaza Bazlı Kar</CardTitle>
              </CardHeader>
              <CardContent>
                {storeStats.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Bu dönemde sipariş bulunmuyor
                  </p>
                ) : (
                  <div className="space-y-4">
                    {storeStats
                      .sort((a, b) => b.profit - a.profit)
                      .map((store) => {
                        const margin = store.revenue > 0 ? (store.profit / store.revenue) * 100 : 0;
                        return (
                          <div key={store.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <span className="text-primary font-bold text-sm">
                                  {store.name.substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{store.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {store.orderCount} sipariş · %{margin.toFixed(1)} marj
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${store.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(store.profit, 'USD')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Satış: {formatCurrency(store.revenue, 'USD')}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sipariş Bazlı Kar/Zarar Tablosu */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Sipariş Bazlı Kar/Zarar</CardTitle>
              <span className="text-sm text-muted-foreground">{orders.length} sipariş</span>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Bu dönemde sipariş bulunmuyor
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Sipariş</th>
                        <th className="text-left p-3 font-medium hidden md:table-cell">Mağaza</th>
                        <th
                          className="text-left p-3 font-medium hidden md:table-cell cursor-pointer hover:text-primary select-none"
                          onClick={() => handleSort('orderDate')}
                        >
                          Tarih <SortIcon field="orderDate" />
                        </th>
                        <th
                          className="text-right p-3 font-medium cursor-pointer hover:text-primary select-none"
                          onClick={() => handleSort('salePrice')}
                        >
                          Satış <SortIcon field="salePrice" />
                        </th>
                        <th className="text-right p-3 font-medium">Maliyet</th>
                        <th
                          className="text-right p-3 font-medium cursor-pointer hover:text-primary select-none"
                          onClick={() => handleSort('netProfit')}
                        >
                          Kar <SortIcon field="netProfit" />
                        </th>
                        <th
                          className="text-right p-3 font-medium cursor-pointer hover:text-primary select-none"
                          onClick={() => handleSort('profitMargin')}
                        >
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
                            <Badge
                              variant={
                                (order.profitMargin || 0) >= 30
                                  ? 'default'
                                  : (order.profitMargin || 0) >= 15
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
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
