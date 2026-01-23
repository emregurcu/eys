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
  TrendingUp,
  TrendingDown,
  Wallet,
  Package,
  Truck,
  CreditCard,
  ShoppingCart,
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

export default function FinancePage() {
  const [period, setPeriod] = useState('month');
  const [storeFilter, setStoreFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [storeStats, setStoreStats] = useState<StoreStat[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchData();
  }, [period, storeFilter]);

  useEffect(() => {
    fetchStores();
  }, []);

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
      const params = new URLSearchParams({ period });
      if (storeFilter !== 'all') params.append('storeId', storeFilter);

      const res = await fetch(`/api/finance/summary?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setStoreStats(data.storeStats);
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Finans verileri yüklenemedi');
    }
    setLoading(false);
  };

  const periodLabels: Record<string, string> = {
    week: 'Bu Hafta',
    month: 'Bu Ay',
    quarter: 'Bu Çeyrek',
    year: 'Bu Yıl',
  };

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finans</h1>
          <p className="text-muted-foreground">
            Gelir, gider ve karlılık analizi - {periodLabels[period]}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Mağaza" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Mağazalar</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </div>
      </div>

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
                  {summary.orderCount} sipariş
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
                  %{summary.profitMargin.toFixed(1)} kar marjı
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
                  %{summary.totalRevenue > 0 ? ((summary.totalEtsyFees / summary.totalRevenue) * 100).toFixed(1) : 0}
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <CreditCard className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${summary.totalCost > 0 ? (summary.totalProductCost / summary.totalCost) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <span>Kargo Maliyeti</span>
                  </div>
                  <span className="font-medium">{formatCurrency(summary.totalShippingCost, 'USD')}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${summary.totalCost > 0 ? (summary.totalShippingCost / summary.totalCost) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-orange-600" />
                    <span>Etsy Kesintileri</span>
                  </div>
                  <span className="font-medium">{formatCurrency(summary.totalEtsyFees, 'USD')}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${summary.totalCost > 0 ? (summary.totalEtsyFees / summary.totalCost) * 100 : 0}%` }}
                  />
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
                {storeStats.map((store) => (
                  <div key={store.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-bold text-sm">
                          {store.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{store.name}</p>
                        <p className="text-sm text-muted-foreground">{store.orderCount} sipariş</p>
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Son Siparişler - Kar/Zarar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sipariş Bazlı Kar/Zarar</CardTitle>
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
                    <th className="text-left p-3 font-medium hidden md:table-cell">Tarih</th>
                    <th className="text-right p-3 font-medium">Satış</th>
                    <th className="text-right p-3 font-medium">Maliyet</th>
                    <th className="text-right p-3 font-medium">Kar</th>
                    <th className="text-right p-3 font-medium">Marj</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 20).map((order) => (
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
    </div>
  );
}
