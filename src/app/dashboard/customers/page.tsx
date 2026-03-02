'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Search,
  Users,
  Repeat,
  DollarSign,
  Globe,
  TrendingUp,
  Loader2,
  Mail,
  MapPin,
  ShoppingCart,
  Calendar,
} from 'lucide-react';
import { formatCurrency, formatShortDate } from '@/lib/utils';

interface Customer {
  name: string;
  email: string | null;
  country: string | null;
  orders: number;
  totalSpent: number;
  totalProfit: number;
  avgOrderValue: number;
  firstOrder: string;
  lastOrder: string;
  stores: string[];
  isRepeat: boolean;
  statuses: Record<string, number>;
}

interface CustomerData {
  customers: Customer[];
  summary: {
    totalCustomers: number;
    repeatCustomers: number;
    avgLifetimeValue: number;
    topCountries: { name: string; count: number }[];
  };
}

export default function CustomersPage() {
  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error('Müşteriler yüklenemedi:', error);
    }
    setLoading(false);
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filteredCustomers = data.customers.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.country?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' ||
      (filter === 'repeat' && c.isRepeat) ||
      (filter === 'single' && !c.isRepeat);
    return matchSearch && matchFilter;
  });

  const { summary } = data;
  const repeatRate = summary.totalCustomers > 0
    ? ((summary.repeatCustomers / summary.totalCustomers) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Müşteriler</h1>
        <p className="text-muted-foreground">Müşteri analizi ve sipariş geçmişi</p>
      </div>

      {/* Özet Kartları */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalCustomers}</p>
                <p className="text-xs text-muted-foreground">Toplam Müşteri</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                <Repeat className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.repeatCustomers}</p>
                <p className="text-xs text-muted-foreground">Tekrar Müşteri (%{repeatRate})</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
                <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(summary.avgLifetimeValue, 'USD')}</p>
                <p className="text-xs text-muted-foreground">Ort. Müşteri Değeri</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                <Globe className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.topCountries.length}</p>
                <p className="text-xs text-muted-foreground">
                  Ülke ({summary.topCountries[0]?.name || '-'})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Ülkeler */}
      {summary.topCountries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" /> Ülke Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.topCountries.map((c) => (
                <Badge key={c.name} variant="secondary" className="text-sm py-1 px-3">
                  {c.name}: {c.count} müşteri
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtreler */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Müşteri adı, email veya ülke ara..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Müşteriler</SelectItem>
                <SelectItem value="repeat">Tekrar Müşteriler</SelectItem>
                <SelectItem value="single">Tek Siparişli</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Müşteri Listesi */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Müşteri</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">Ülke</th>
                  <th className="text-center p-3 font-medium">Sipariş</th>
                  <th className="text-right p-3 font-medium">Toplam Harcama</th>
                  <th className="text-right p-3 font-medium hidden md:table-cell">Kar</th>
                  <th className="text-right p-3 font-medium hidden lg:table-cell">Son Sipariş</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.slice(0, 100).map((customer, i) => (
                  <tr
                    key={i}
                    className="border-b hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        {customer.email && (
                          <p className="text-xs text-muted-foreground">{customer.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-3 hidden sm:table-cell text-sm text-muted-foreground">
                      {customer.country || '-'}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={customer.isRepeat ? 'default' : 'secondary'} className="text-xs">
                        {customer.orders}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-medium">
                      {formatCurrency(customer.totalSpent, 'USD')}
                    </td>
                    <td className={`p-3 text-right hidden md:table-cell font-medium ${customer.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(customer.totalProfit, 'USD')}
                    </td>
                    <td className="p-3 text-right text-sm text-muted-foreground hidden lg:table-cell">
                      {formatShortDate(customer.lastOrder)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredCustomers.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              Müşteri bulunamadı
            </div>
          )}
          {filteredCustomers.length > 100 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              İlk 100 müşteri gösteriliyor (toplam {filteredCustomers.length})
            </div>
          )}
        </CardContent>
      </Card>

      {/* Müşteri Detay Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Müşteri Detayı</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {selectedCustomer.name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedCustomer.name}</h3>
                  {selectedCustomer.email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {selectedCustomer.email}
                    </p>
                  )}
                  {selectedCustomer.country && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {selectedCustomer.country}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted text-center">
                  <ShoppingCart className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xl font-bold">{selectedCustomer.orders}</p>
                  <p className="text-xs text-muted-foreground">Sipariş</p>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xl font-bold">{formatCurrency(selectedCustomer.totalSpent, 'USD')}</p>
                  <p className="text-xs text-muted-foreground">Toplam Harcama</p>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className={`text-xl font-bold ${selectedCustomer.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(selectedCustomer.totalProfit, 'USD')}
                  </p>
                  <p className="text-xs text-muted-foreground">Toplam Kar</p>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xl font-bold">{formatCurrency(selectedCustomer.avgOrderValue, 'USD')}</p>
                  <p className="text-xs text-muted-foreground">Ort. Sipariş</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> İlk Sipariş
                  </span>
                  <span>{formatShortDate(selectedCustomer.firstOrder)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Son Sipariş
                  </span>
                  <span>{formatShortDate(selectedCustomer.lastOrder)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mağazalar</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {selectedCustomer.stores.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              {selectedCustomer.isRepeat && (
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-1">
                    <Repeat className="h-4 w-4" /> Tekrar Müşteri
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
