'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Globe,
  Store,
  Package,
  Download,
  Loader2,
  RefreshCw,
  Percent,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
} from 'recharts';

interface ReportData {
  period: string;
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    avgOrderValue: number;
    avgProfit: number;
    profitMargin: number;
  };
  storeComparison: {
    id: string;
    name: string;
    orders: number;
    revenue: number;
    cost: number;
    profit: number;
    avgOrderValue: number;
  }[];
  countryAnalysis: {
    name: string;
    orders: number;
    revenue: number;
    profit: number;
  }[];
  topProducts: {
    name: string;
    count: number;
    revenue: number;
  }[];
  weeklyPerformance: {
    week: string;
    orders: number;
    revenue: number;
    profit: number;
  }[];
  statusDistribution: { status: string; count: number }[];
}

const statusLabels: Record<string, string> = {
  NEW: 'Yeni', PROCESSING: 'İşleniyor', PRODUCTION: 'Üretimde',
  READY: 'Hazır', SHIPPED: 'Kargoda', DELIVERED: 'Teslim',
  RETURNED: 'İade', CANCELLED: 'İptal', PROBLEM: 'Problem',
};

const PIE_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#6b7280', '#ec4899'];

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchReport(period);
  }, [period]);

  const fetchReport = async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?period=${p}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error('Rapor yüklenemedi:', error);
    }
    setLoading(false);
  };

  const exportPDF = () => {
    if (!data) return;
    // CSV export as fallback
    const csvRows = [
      'Metrik,Değer',
      `Toplam Sipariş,${data.summary.totalOrders}`,
      `Toplam Gelir,$${data.summary.totalRevenue.toFixed(2)}`,
      `Toplam Maliyet,$${data.summary.totalCost.toFixed(2)}`,
      `Toplam Kar,$${data.summary.totalProfit.toFixed(2)}`,
      `Kar Marjı,%${data.summary.profitMargin.toFixed(1)}`,
      `Ort. Sipariş Değeri,$${data.summary.avgOrderValue.toFixed(2)}`,
      '',
      'Mağaza,Sipariş,Gelir,Maliyet,Kar',
      ...data.storeComparison.map((s) =>
        `${s.name},${s.orders},$${s.revenue.toFixed(2)},$${s.cost.toFixed(2)},$${s.profit.toFixed(2)}`
      ),
      '',
      'Ülke,Sipariş,Gelir,Kar',
      ...data.countryAnalysis.map((c) =>
        `${c.name},${c.orders},$${c.revenue.toFixed(2)},$${c.profit.toFixed(2)}`
      ),
      '',
      'Ürün,Adet,Gelir',
      ...data.topProducts.map((p) =>
        `"${p.name}",${p.count},$${p.revenue.toFixed(2)}`
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapor-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Raporlar</h1>
          <p className="text-muted-foreground">Detaylı performans analizi</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Bu Hafta</SelectItem>
              <SelectItem value="month">Bu Ay</SelectItem>
              <SelectItem value="quarter">Bu Çeyrek</SelectItem>
              <SelectItem value="year">Bu Yıl</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportPDF}>
            <Download className="mr-2 h-4 w-4" /> CSV İndir
          </Button>
          <Button variant="outline" size="icon" onClick={() => fetchReport(period)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Sipariş</p>
                <p className="text-2xl font-bold">{summary.totalOrders}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Gelir</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalRevenue, 'USD')}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Kar</p>
                <p className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.totalProfit, 'USD')}
                </p>
              </div>
              <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kar Marjı</p>
                <p className="text-2xl font-bold">%{summary.profitMargin.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Ort: {formatCurrency(summary.avgOrderValue, 'USD')}/sipariş</p>
              </div>
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900">
                <Percent className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Haftalık Trend */}
      {data.weeklyPerformance.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Haftalık Performans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.weeklyPerformance.map((w) => ({
                  ...w,
                  weekLabel: new Date(w.week).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, '']} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name="Gelir" stroke="#3b82f6" fill="#3b82f680" />
                  <Area type="monotone" dataKey="profit" name="Kar" stroke="#22c55e" fill="#22c55e80" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mağaza Karşılaştırma + Ülke Analizi */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4" /> Mağaza Karşılaştırma
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.storeComparison.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Veri yok</p>
            ) : (
              <>
                <div className="h-48 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.storeComparison}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, '']} />
                      <Legend />
                      <Bar dataKey="revenue" name="Gelir" fill="#3b82f6" />
                      <Bar dataKey="profit" name="Kar" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {data.storeComparison.map((store) => {
                    const margin = store.revenue > 0 ? (store.profit / store.revenue) * 100 : 0;
                    return (
                      <div key={store.id} className="flex items-center justify-between text-sm p-2 rounded-lg border">
                        <div>
                          <p className="font-medium">{store.name}</p>
                          <p className="text-xs text-muted-foreground">{store.orders} sipariş · %{margin.toFixed(0)} marj</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(store.revenue, 'USD')}</p>
                          <p className={`text-xs font-medium ${store.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(store.profit, 'USD')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" /> Ülke Bazlı Satış
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.countryAnalysis.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Veri yok</p>
            ) : (
              <>
                <div className="h-48 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.countryAnalysis.slice(0, 8)}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="revenue"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {data.countryAnalysis.slice(0, 8).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Gelir']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {data.countryAnalysis.slice(0, 10).map((country, i) => (
                    <div key={country.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span>{country.name}</span>
                        <Badge variant="secondary" className="text-[10px]">{country.orders}</Badge>
                      </div>
                      <span className="font-medium">{formatCurrency(country.revenue, 'USD')}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* En Çok Satan Ürünler + Durum Dağılımı */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> En Çok Satan Boyut/Çerçeve
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Veri yok</p>
            ) : (
              <div className="space-y-2">
                {data.topProducts.map((product, i) => {
                  const maxCount = data.topProducts[0]?.count || 1;
                  return (
                    <div key={product.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                          <span className="font-medium truncate max-w-[200px]">{product.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{product.count} adet</span>
                          <span className="font-medium">{formatCurrency(product.revenue, 'USD')}</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 ml-7">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${(product.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sipariş Durumu Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {data.statusDistribution.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Veri yok</p>
            ) : (
              <>
                <div className="h-48 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.statusDistribution.map((s) => ({
                          ...s,
                          name: statusLabels[s.status] || s.status,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="count"
                        nameKey="name"
                      >
                        {data.statusDistribution.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5">
                  {data.statusDistribution.sort((a, b) => b.count - a.count).map((s, i) => (
                    <div key={s.status} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span>{statusLabels[s.status] || s.status}</span>
                      </div>
                      <span className="font-medium">{s.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
