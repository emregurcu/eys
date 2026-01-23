'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  Eye,
  Truck,
  MoreVertical,
  Trash2,
  TrendingUp,
  TrendingDown,
  Calculator,
  FileDown,
  Image,
  Link,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  orderStatusLabels,
  orderStatusColors,
  formatCurrency,
  formatDate,
  formatShortDate,
} from '@/lib/utils';
import { exportSingleOrderPDF, exportOrderListPDF } from '@/lib/pdf-export';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  shippingAddress?: string | null;
  shippingCountry: string | null;
  status: string;
  salePrice: number;
  saleCurrency: string;
  productCost: number;
  shippingCost: number;
  etsyFees: number;
  totalCost: number;
  netProfit: number;
  profitMargin: number;
  trackingNumber?: string | null;
  trackingCompany?: string | null;
  imageUrl?: string | null;
  notes?: string | null;
  orderDate: string;
  store: { id: string; name: string };
  country: { name: string; code: string } | null;
  items?: any[];
  _count?: { items: number };
}

interface Store {
  id: string;
  name: string;
  etsyTransactionFee: number;
  etsyPaymentFee: number;
  etsyListingFee: number;
}

interface CanvasSize {
  id: string;
  name: string;
  width: number;
  height: number;
  baseCost: number;
}

interface FrameOption {
  id: string;
  name: string;
  code: string;
}

interface Country {
  id: string;
  code: string;
  name: string;
}

interface CanvasSizeVariant {
  id: string;
  canvasSizeId: string;
  frameOptionId: string;
  totalCost: number;
}

interface SizeShippingRate {
  id: string;
  canvasSizeId: string;
  countryId: string;
  shippingCost: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [canvasSizes, setCanvasSizes] = useState<CanvasSize[]>([]);
  const [frameOptions, setFrameOptions] = useState<FrameOption[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [variants, setVariants] = useState<CanvasSizeVariant[]>([]);
  const [shippingRates, setShippingRates] = useState<SizeShippingRate[]>([]);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [formDataLoading, setFormDataLoading] = useState(false);
  const [formPrefetched, setFormPrefetched] = useState(false);
  
  // New order form
  const [orderForm, setOrderForm] = useState({
    storeId: '',
    orderNumber: '',
    customerName: '',
    customerEmail: '',
    countryId: '',
    shippingAddress: '',
    salePrice: '',
    saleCurrency: 'USD',
    orderDate: new Date().toISOString().split('T')[0],
    notes: '',
    imageUrl: '',
    items: [{ canvasSizeId: '', frameOptionId: '', title: '', quantity: 1, salePrice: '' }],
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  // Dialog açıldığında ek verileri yükle
  useEffect(() => {
    if (showAddDialog && canvasSizes.length === 0) {
      fetchFormData();
    }
  }, [showAddDialog]);

  const fetchOrders = async () => {
    setPageLoading(true);
    try {
      const [ordersRes, storesRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/stores'),
      ]);

      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (storesRes.ok) setStores(await storesRes.json());

      // Form verilerini arka planda önceden yükle
      if (!formPrefetched) {
        fetchFormData();
        setFormPrefetched(true);
      }
    } catch (error) {
      toast.error('Veriler yüklenirken hata oluştu');
    }
    setPageLoading(false);
  };

  const fetchFormData = async () => {
    if (formDataLoading) return;
    setFormDataLoading(true);
    try {
      const [sizesRes, framesRes, countriesRes, variantsRes, shippingRes] = await Promise.all([
        fetch('/api/canvas-sizes'),
        fetch('/api/frame-options'),
        fetch('/api/countries'),
        fetch('/api/canvas-variants'),
        fetch('/api/size-shipping-rates'),
      ]);

      if (sizesRes.ok) setCanvasSizes(await sizesRes.json());
      if (framesRes.ok) setFrameOptions(await framesRes.json());
      if (countriesRes.ok) setCountries(await countriesRes.json());
      if (variantsRes.ok) setVariants(await variantsRes.json());
      if (shippingRes.ok) setShippingRates(await shippingRes.json());
    } catch (error) {
      console.error('Form verileri yüklenemedi');
    }
    setFormDataLoading(false);
  };

  const filteredOrders = orders.filter((order) => {
    const matchSearch =
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.customerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchStore = storeFilter === 'all' || order.store.id === storeFilter;
    
    // Tarih filtresi
    let matchDate = true;
    if (dateFilter !== 'all') {
      const orderDate = new Date(order.orderDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      switch (dateFilter) {
        case 'today':
          const todayStart = new Date(today);
          matchDate = orderDate >= todayStart;
          break;
        case 'week':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - 7);
          matchDate = orderDate >= weekStart;
          break;
        case 'month':
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          matchDate = orderDate >= monthStart;
          break;
        case 'lastmonth':
          const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
          matchDate = orderDate >= lastMonthStart && orderDate <= lastMonthEnd;
          break;
        case 'year':
          const yearStart = new Date(today.getFullYear(), 0, 1);
          matchDate = orderDate >= yearStart;
          break;
      }
    }
    
    return matchSearch && matchStatus && matchStore && matchDate;
  });

  // Sıralama
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
      case 'oldest':
        return new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
      case 'highest':
        return b.salePrice - a.salePrice;
      case 'lowest':
        return a.salePrice - b.salePrice;
      case 'profit_high':
        return (b.netProfit || 0) - (a.netProfit || 0);
      case 'profit_low':
        return (a.netProfit || 0) - (b.netProfit || 0);
      case 'customer':
        return a.customerName.localeCompare(b.customerName);
      default:
        return 0;
    }
  });

  // Maliyet hesaplama - anlık önizleme
  const calculatedCosts = useMemo(() => {
    if (!orderForm.storeId || !orderForm.salePrice) {
      return null;
    }

    const store = stores.find(s => s.id === orderForm.storeId);
    if (!store) return null;

    let productCost = 0;
    let shippingCost = 0;

    for (const item of orderForm.items) {
      if (item.canvasSizeId && item.frameOptionId) {
        // Varyasyon maliyeti
        const variant = variants.find(
          v => v.canvasSizeId === item.canvasSizeId && v.frameOptionId === item.frameOptionId
        );
        if (variant) {
          productCost += variant.totalCost * item.quantity;
        }

        // Kargo maliyeti
        if (orderForm.countryId) {
          const rate = shippingRates.find(
            r => r.canvasSizeId === item.canvasSizeId && r.countryId === orderForm.countryId
          );
          if (rate) {
            shippingCost += rate.shippingCost * item.quantity;
          }
        }
      } else if (item.canvasSizeId) {
        // Sadece boyut (çerçevesiz)
        const size = canvasSizes.find(s => s.id === item.canvasSizeId);
        if (size) {
          productCost += size.baseCost * item.quantity;
        }
      }
    }

    const salePrice = parseFloat(orderForm.salePrice) || 0;
    const etsyTransactionFee = (salePrice * store.etsyTransactionFee) / 100;
    const etsyPaymentFee = (salePrice * store.etsyPaymentFee) / 100;
    const etsyListingFee = store.etsyListingFee * orderForm.items.length;
    const etsyFees = etsyTransactionFee + etsyPaymentFee + etsyListingFee;

    const totalCost = productCost + shippingCost + etsyFees;
    const netProfit = salePrice - totalCost;
    const profitMargin = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;

    return {
      productCost,
      shippingCost,
      etsyFees,
      totalCost,
      netProfit,
      profitMargin,
    };
  }, [orderForm, stores, variants, shippingRates, canvasSizes]);

  const addItem = () => {
    setOrderForm({
      ...orderForm,
      items: [...orderForm.items, { canvasSizeId: '', frameOptionId: '', title: '', quantity: 1, salePrice: '' }],
    });
  };

  const removeItem = (index: number) => {
    if (orderForm.items.length > 1) {
      setOrderForm({
        ...orderForm,
        items: orderForm.items.filter((_, i) => i !== index),
      });
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...orderForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setOrderForm({ ...orderForm, items: newItems });
  };

  // Ürün için maliyet önizleme
  const getItemCostPreview = (item: any) => {
    if (!item.canvasSizeId) return null;

    let cost = 0;
    let shipping = 0;

    if (item.frameOptionId) {
      const variant = variants.find(
        v => v.canvasSizeId === item.canvasSizeId && v.frameOptionId === item.frameOptionId
      );
      if (variant) cost = variant.totalCost;
    } else {
      const size = canvasSizes.find(s => s.id === item.canvasSizeId);
      if (size) cost = size.baseCost;
    }

    if (orderForm.countryId) {
      const rate = shippingRates.find(
        r => r.canvasSizeId === item.canvasSizeId && r.countryId === orderForm.countryId
      );
      if (rate) shipping = rate.shippingCost;
    }

    return { cost, shipping, total: (cost + shipping) * item.quantity };
  };

  const saveOrder = async () => {
    if (!orderForm.storeId || !orderForm.orderNumber || !orderForm.customerName || !orderForm.salePrice) {
      toast.error('Zorunlu alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...orderForm,
          salePrice: parseFloat(orderForm.salePrice),
          items: orderForm.items.map(item => ({
            ...item,
            quantity: parseInt(item.quantity.toString()),
            salePrice: parseFloat(item.salePrice) || 0,
          })),
        }),
      });

      if (res.ok) {
        toast.success('Sipariş eklendi');
        setShowAddDialog(false);
        setOrderForm({
          storeId: '',
          orderNumber: '',
          customerName: '',
          customerEmail: '',
          countryId: '',
          shippingAddress: '',
          salePrice: '',
          saleCurrency: 'USD',
          orderDate: new Date().toISOString().split('T')[0],
          notes: '',
          imageUrl: '',
          items: [{ canvasSizeId: '', frameOptionId: '', title: '', quantity: 1, salePrice: '' }],
        });
        fetchOrders();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Kayıt başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
    setLoading(false);
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Bu siparişi silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Sipariş silindi');
        fetchOrders();
      } else {
        toast.error('Silme başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success('Durum güncellendi');
        fetchOrders();
        setSelectedOrder(null);
      }
    } catch (error) {
      toast.error('Güncelleme başarısız');
    }
  };

  // Toplam kar/zarar hesapla
  const totalProfit = sortedOrders.reduce((sum, o) => sum + (o.netProfit || 0), 0);
  const totalRevenue = sortedOrders.reduce((sum, o) => sum + (o.salePrice || 0), 0);

  // PDF için detaylı sipariş verisi al
  const fetchOrderForPDF = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (error) {
      console.error('PDF veri hatası:', error);
    }
    return null;
  };

  const handleSinglePDF = async (order: Order) => {
    toast.info('PDF hazırlanıyor...');
    const fullOrder = await fetchOrderForPDF(order.id);
    if (fullOrder) {
      exportSingleOrderPDF(fullOrder);
    } else {
      exportSingleOrderPDF(order as any);
    }
  };

  const handleBulkPDF = async () => {
    toast.info('PDF hazırlanıyor...');
    // Tüm siparişlerin detaylarını al
    const fullOrders = await Promise.all(
      sortedOrders.map(order => fetchOrderForPDF(order.id))
    );
    const validOrders = fullOrders.filter(o => o !== null);
    if (validOrders.length > 0) {
      exportOrderListPDF(
        validOrders,
        storeFilter !== 'all'
          ? `${stores.find(s => s.id === storeFilter)?.name || 'Magaza'} Siparisleri`
          : 'Tum Siparisler'
      );
    } else {
      toast.error('Siparişler yüklenemedi');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Siparişler</h1>
          <p className="text-muted-foreground">
            {sortedOrders.length} sipariş • 
            Toplam: {formatCurrency(totalRevenue, 'USD')} • 
            <span className={totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
              {' '}Kar: {formatCurrency(totalProfit, 'USD')}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleBulkPDF}
            disabled={sortedOrders.length === 0}
          >
            <FileDown className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" /> Yeni Sipariş
          </Button>
        </div>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sipariş no veya müşteri ara..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="NEW">Yeni</SelectItem>
                <SelectItem value="PROCESSING">İşleniyor</SelectItem>
                <SelectItem value="PRODUCTION">Üretimde</SelectItem>
                <SelectItem value="READY">Hazır</SelectItem>
                <SelectItem value="SHIPPED">Kargoda</SelectItem>
                <SelectItem value="DELIVERED">Teslim Edildi</SelectItem>
                <SelectItem value="PROBLEM">Problem</SelectItem>
              </SelectContent>
            </Select>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Mağaza" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Mağazalar</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Tarih" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Tarihler</SelectItem>
                <SelectItem value="today">Bugün</SelectItem>
                <SelectItem value="week">Son 7 Gün</SelectItem>
                <SelectItem value="month">Bu Ay</SelectItem>
                <SelectItem value="lastmonth">Geçen Ay</SelectItem>
                <SelectItem value="year">Bu Yıl</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Sırala" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">En Yeni</SelectItem>
                <SelectItem value="oldest">En Eski</SelectItem>
                <SelectItem value="highest">Fiyat (Yüksek)</SelectItem>
                <SelectItem value="lowest">Fiyat (Düşük)</SelectItem>
                <SelectItem value="profit_high">Kar (Yüksek)</SelectItem>
                <SelectItem value="profit_low">Kar (Düşük)</SelectItem>
                <SelectItem value="customer">Müşteri (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sipariş Listesi */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Sipariş</th>
                  <th className="text-left p-4 font-medium hidden sm:table-cell">Tarih</th>
                  <th className="text-left p-4 font-medium hidden md:table-cell">Ürün</th>
                  <th className="text-left p-4 font-medium hidden lg:table-cell">Müşteri</th>
                  <th className="text-left p-4 font-medium hidden xl:table-cell">Mağaza</th>
                  <th className="text-left p-4 font-medium">Durum</th>
                  <th className="text-right p-4 font-medium">Satış</th>
                  <th className="text-right p-4 font-medium hidden xl:table-cell">Maliyet</th>
                  <th className="text-right p-4 font-medium">Kar</th>
                  <th className="text-right p-4 font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {pageLoading ? (
                  // Skeleton loading
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4"><div className="h-4 bg-muted rounded animate-pulse w-24" /></td>
                      <td className="p-4 hidden sm:table-cell"><div className="h-4 bg-muted rounded animate-pulse w-20" /></td>
                      <td className="p-4 hidden md:table-cell"><div className="h-4 bg-muted rounded animate-pulse w-32" /></td>
                      <td className="p-4 hidden lg:table-cell"><div className="h-4 bg-muted rounded animate-pulse w-28" /></td>
                      <td className="p-4 hidden xl:table-cell"><div className="h-4 bg-muted rounded animate-pulse w-20" /></td>
                      <td className="p-4"><div className="h-6 bg-muted rounded animate-pulse w-16" /></td>
                      <td className="p-4"><div className="h-4 bg-muted rounded animate-pulse w-16 ml-auto" /></td>
                      <td className="p-4 hidden xl:table-cell"><div className="h-4 bg-muted rounded animate-pulse w-16 ml-auto" /></td>
                      <td className="p-4"><div className="h-4 bg-muted rounded animate-pulse w-16 ml-auto" /></td>
                      <td className="p-4"><div className="h-8 bg-muted rounded animate-pulse w-8 ml-auto" /></td>
                    </tr>
                  ))
                ) : sortedOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-muted/30">
                    <td className="p-4">
                      <p className="font-medium">{order.orderNumber}</p>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <p className="text-sm">{formatShortDate(order.orderDate)}</p>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="max-w-[200px]">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item: any, idx: number) => (
                            <p key={idx} className="text-sm truncate">
                              {item.canvasSize?.name || '-'} - {item.frameOption?.name || 'Çerçevesiz'}
                              {item.quantity > 1 && ` (x${item.quantity})`}
                            </p>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {order._count?.items ? `${order._count.items} ürün` : '-'}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <div>
                        <p>{order.customerName}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.country?.name || order.shippingCountry || '-'}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 hidden xl:table-cell">
                      {order.store.name}
                    </td>
                    <td className="p-4">
                      <Badge className={orderStatusColors[order.status]}>
                        {orderStatusLabels[order.status]}
                      </Badge>
                    </td>
                    <td className="p-4 text-right font-medium">
                      {formatCurrency(order.salePrice, order.saleCurrency)}
                    </td>
                    <td className="p-4 text-right hidden xl:table-cell text-muted-foreground">
                      {formatCurrency(order.totalCost || 0, 'USD')}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(order.netProfit || 0) >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span className={(order.netProfit || 0) >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {formatCurrency(order.netProfit || 0, 'USD')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        %{(order.profitMargin || 0).toFixed(1)}
                      </p>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Detay
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSinglePDF(order)}>
                            <FileDown className="mr-2 h-4 w-4" />
                            PDF İndir
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Truck className="mr-2 h-4 w-4" />
                            Kargo Ekle
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteOrder(order.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {!pageLoading && sortedOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Sipariş bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Sipariş Detay Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sipariş Detayı</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Sipariş No</p>
                  <p className="font-medium">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Durum</p>
                  <Badge className={orderStatusColors[selectedOrder.status]}>
                    {orderStatusLabels[selectedOrder.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mağaza</p>
                  <p className="font-medium">{selectedOrder.store?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sipariş Tarihi</p>
                  <p className="font-medium">{formatDate(selectedOrder.orderDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Müşteri</p>
                  <p className="font-medium">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ülke</p>
                  <p className="font-medium">{selectedOrder.country?.name || selectedOrder.shippingCountry || '-'}</p>
                </div>
              </div>

              {/* Ürün Bilgileri */}
              <div className="border rounded-lg p-4 space-y-2 bg-muted/20">
                <h4 className="font-medium">Ürün Bilgileri</h4>
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOrder.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <div>
                          <span className="font-medium">{item.canvasSize?.name || '-'}</span>
                          <span className="text-muted-foreground"> - </span>
                          <span>{item.frameOption?.name || 'Çerçevesiz'}</span>
                          {item.quantity > 1 && <span className="text-muted-foreground"> (x{item.quantity})</span>}
                        </div>
                        {item.title && <span className="text-muted-foreground text-xs">{item.title}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Ürün bilgisi mevcut değil</p>
                )}
              </div>

              {/* Teslimat Adresi */}
              {selectedOrder.shippingAddress && (
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-medium">Teslimat Adresi</h4>
                  <p className="text-sm whitespace-pre-wrap">{selectedOrder.shippingAddress}</p>
                </div>
              )}

              {/* Maliyet Detayları */}
              <div className="border rounded-lg p-4 space-y-2">
                <h4 className="font-medium">Maliyet Analizi</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Satış Fiyatı:</span>
                    <span className="font-medium">{formatCurrency(selectedOrder.salePrice, selectedOrder.saleCurrency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ürün Maliyeti:</span>
                    <span className="text-red-600">-{formatCurrency(selectedOrder.productCost || 0, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kargo Maliyeti:</span>
                    <span className="text-red-600">-{formatCurrency(selectedOrder.shippingCost || 0, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Etsy Kesintileri:</span>
                    <span className="text-red-600">-{formatCurrency(selectedOrder.etsyFees || 0, 'USD')}</span>
                  </div>
                  <div className="col-span-2 border-t pt-2 flex justify-between font-medium">
                    <span>Net Kar:</span>
                    <span className={(selectedOrder.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(selectedOrder.netProfit || 0, 'USD')} (%{(selectedOrder.profitMargin || 0).toFixed(1)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Ürün Görseli */}
              {selectedOrder.imageUrl && (
                <div>
                  <h4 className="font-medium mb-2">Ürün Görseli</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <img 
                      src={selectedOrder.imageUrl} 
                      alt="Ürün görseli" 
                      className="max-w-full max-h-64 object-contain mx-auto"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <a 
                      href={selectedOrder.imageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block text-center text-sm text-primary p-2 hover:underline"
                    >
                      Görseli Aç
                    </a>
                  </div>
                </div>
              )}

              {/* Durum Güncelleme */}
              <div className="flex gap-2 pt-4 border-t">
                <Select 
                  defaultValue={selectedOrder.status}
                  onValueChange={(value) => updateOrderStatus(selectedOrder.id, value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">Yeni</SelectItem>
                    <SelectItem value="PROCESSING">İşleniyor</SelectItem>
                    <SelectItem value="PRODUCTION">Üretimde</SelectItem>
                    <SelectItem value="READY">Hazır</SelectItem>
                    <SelectItem value="SHIPPED">Kargoda</SelectItem>
                    <SelectItem value="DELIVERED">Teslim Edildi</SelectItem>
                    <SelectItem value="PROBLEM">Problem</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  onClick={() => handleSinglePDF(selectedOrder)}
                >
                  <FileDown className="mr-2 h-4 w-4" /> PDF İndir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Yeni Sipariş Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Sipariş Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Mağaza *</label>
                <Select value={orderForm.storeId} onValueChange={(v) => setOrderForm({ ...orderForm, storeId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Sipariş No *</label>
                <Input
                  placeholder="ETY-2024-001"
                  value={orderForm.orderNumber}
                  onChange={(e) => setOrderForm({ ...orderForm, orderNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Müşteri Adı *</label>
                <Input
                  placeholder="John Doe"
                  value={orderForm.customerName}
                  onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Kargo Ülkesi</label>
                <Select value={orderForm.countryId} onValueChange={(v) => setOrderForm({ ...orderForm, countryId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={country.id}>{country.name} ({country.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Teslimat Adresi */}
            <div>
              <label className="text-sm font-medium">Teslimat Adresi *</label>
              <textarea
                className="w-full min-h-[80px] p-3 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Müşteri adres bilgilerini buraya yapıştırın..."
                value={orderForm.shippingAddress}
                onChange={(e) => setOrderForm({ ...orderForm, shippingAddress: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Toplam Satış Fiyatı (USD) *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="49.99"
                  value={orderForm.salePrice}
                  onChange={(e) => setOrderForm({ ...orderForm, salePrice: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Sipariş Tarihi</label>
                <Input
                  type="date"
                  value={orderForm.orderDate}
                  onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })}
                />
              </div>
            </div>

            {/* Ürün Görseli */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                <label className="text-sm font-medium">Ürün Görseli (Opsiyonel)</label>
              </div>
              <div className="flex items-center gap-2">
                <Link className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Görsel URL'si yapıştırın (Etsy, Google Drive, vb.)"
                  value={orderForm.imageUrl}
                  onChange={(e) => setOrderForm({ ...orderForm, imageUrl: e.target.value })}
                />
              </div>
              {orderForm.imageUrl && (
                <div className="border rounded bg-background p-2">
                  <img 
                    src={orderForm.imageUrl} 
                    alt="Önizleme" 
                    className="max-h-40 object-contain mx-auto"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Etsy sipariş görselini buraya ekleyebilirsiniz. Google Drive, Dropbox veya direkt görsel linki kullanabilirsiniz.
              </p>
            </div>

            {/* Ürünler */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Ürünler</label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" /> Ürün Ekle
                </Button>
              </div>
              <div className="space-y-3">
                {orderForm.items.map((item, index) => {
                  const itemCost = getItemCostPreview(item);
                  return (
                    <div key={index} className="border rounded-lg p-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Ürün {index + 1}</span>
                        <div className="flex items-center gap-2">
                          {itemCost && (
                            <span className="text-xs text-muted-foreground">
                              Maliyet: ${itemCost.cost.toFixed(2)} + Kargo: ${itemCost.shipping.toFixed(2)}
                            </span>
                          )}
                          {orderForm.items.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <Input
                        placeholder="Ürün başlığı"
                        value={item.title}
                        onChange={(e) => updateItem(index, 'title', e.target.value)}
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Select value={item.canvasSizeId} onValueChange={(v) => updateItem(index, 'canvasSizeId', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Boyut" />
                          </SelectTrigger>
                          <SelectContent>
                            {canvasSizes.map((size) => (
                              <SelectItem key={size.id} value={size.id}>{size.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={item.frameOptionId} onValueChange={(v) => updateItem(index, 'frameOptionId', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Çerçeve" />
                          </SelectTrigger>
                          <SelectContent>
                            {frameOptions.map((frame) => (
                              <SelectItem key={frame.id} value={frame.id}>{frame.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Adet"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Maliyet Önizleme */}
            {calculatedCosts && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="h-4 w-4" />
                  <h4 className="font-medium">Maliyet Önizleme</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ürün Maliyeti:</span>
                    <span>${calculatedCosts.productCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kargo Maliyeti:</span>
                    <span>${calculatedCosts.shippingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Etsy Kesintileri:</span>
                    <span>${calculatedCosts.etsyFees.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Toplam Maliyet:</span>
                    <span className="font-medium">${calculatedCosts.totalCost.toFixed(2)}</span>
                  </div>
                  <div className="col-span-2 border-t pt-2 flex justify-between font-medium">
                    <span>Tahmini Net Kar:</span>
                    <span className={calculatedCosts.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ${calculatedCosts.netProfit.toFixed(2)} (%{calculatedCosts.profitMargin.toFixed(1)})
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddDialog(false)}>
                İptal
              </Button>
              <Button className="flex-1" onClick={saveOrder} disabled={loading}>
                {loading ? 'Kaydediliyor...' : 'Sipariş Ekle'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
