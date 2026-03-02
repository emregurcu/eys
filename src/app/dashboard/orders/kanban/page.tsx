'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  ArrowLeft,
  RefreshCw,
  Loader2,
  GripVertical,
  User,
  Calendar,
  Store,
  Truck,
  List,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatShortDate } from '@/lib/utils';
import Link from 'next/link';

interface KanbanOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  salePrice: number;
  netProfit: number;
  orderDate: string;
  trackingNumber: string | null;
  store: { id: string; name: string };
  items?: { canvasSize?: { name: string } | null; frameOption?: { name: string } | null; quantity: number }[];
}

const KANBAN_COLUMNS = [
  { status: 'NEW', label: 'Yeni', color: 'bg-blue-500', bg: 'bg-blue-50 border-blue-200' },
  { status: 'PROCESSING', label: 'İşleniyor', color: 'bg-yellow-500', bg: 'bg-yellow-50 border-yellow-200' },
  { status: 'PRODUCTION', label: 'Üretimde', color: 'bg-purple-500', bg: 'bg-purple-50 border-purple-200' },
  { status: 'READY', label: 'Hazır', color: 'bg-cyan-500', bg: 'bg-cyan-50 border-cyan-200' },
  { status: 'SHIPPED', label: 'Kargoda', color: 'bg-indigo-500', bg: 'bg-indigo-50 border-indigo-200' },
  { status: 'DELIVERED', label: 'Teslim', color: 'bg-green-500', bg: 'bg-green-50 border-green-200' },
];

export default function KanbanPage() {
  const [orders, setOrders] = useState<KanbanOrder[]>([]);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [storeFilter, setStoreFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  // Mobile: active column index for swipe navigation
  const [mobileColumnIndex, setMobileColumnIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  // Mobile: touch drag for moving cards between columns
  const [touchDragOrder, setTouchDragOrder] = useState<KanbanOrder | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : data.orders || []);
      }
    } catch (error) {
      toast.error('Siparişler yüklenemedi');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
    fetch('/api/stores').then((r) => r.json()).then(setStores).catch(() => {});
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        toast.success('Sipariş durumu güncellendi');
      } else {
        toast.error('Güncelleme başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  // Drag & Drop Handlers (Desktop)
  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData('orderId', orderId);
    setDraggingId(orderId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('orderId');
    setDragOverColumn(null);
    setDraggingId(null);

    const order = orders.find((o) => o.id === orderId);
    if (order && order.status !== targetStatus) {
      updateOrderStatus(orderId, targetStatus);
    }
  };

  // Mobile: swipe navigation between columns
  const handleMobileTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleMobileTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    // Only swipe if horizontal movement is dominant
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && mobileColumnIndex < KANBAN_COLUMNS.length - 1) {
        setMobileColumnIndex(mobileColumnIndex + 1);
      } else if (dx > 0 && mobileColumnIndex > 0) {
        setMobileColumnIndex(mobileColumnIndex - 1);
      }
    }
    touchStartRef.current = null;
  };

  // Mobile: move order to adjacent column
  const moveOrderMobile = (order: KanbanOrder, direction: 'left' | 'right') => {
    const currentIdx = KANBAN_COLUMNS.findIndex((c) => c.status === order.status);
    const targetIdx = direction === 'left' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx >= 0 && targetIdx < KANBAN_COLUMNS.length) {
      updateOrderStatus(order.id, KANBAN_COLUMNS[targetIdx].status);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (storeFilter !== 'all' && o.store.id !== storeFilter) return false;
    return true;
  });

  const getColumnOrders = (status: string) =>
    filteredOrders.filter((o) => o.status === status);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentMobileColumn = KANBAN_COLUMNS[mobileColumnIndex];
  const mobileColumnOrders = getColumnOrders(currentMobileColumn.status);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Sipariş Pipeline</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              <span className="hidden sm:inline">Sürükle-bırak ile sipariş durumlarını yönetin</span>
              <span className="sm:hidden">Kaydırarak kolon değiştirin, butonlarla sipariş taşıyın</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-[160px] sm:w-[180px]">
              <SelectValue placeholder="Mağaza" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Mağazalar</SelectItem>
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link href="/dashboard/orders">
            <Button variant="outline" size="icon" title="Liste Görünümü">
              <List className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="outline" size="icon" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Mobile Kanban - Single Column with Swipe */}
      <div
        className="sm:hidden"
        onTouchStart={handleMobileTouchStart}
        onTouchEnd={handleMobileTouchEnd}
      >
        {/* Column indicator dots */}
        <div className="flex items-center justify-center gap-1.5 mb-3">
          {KANBAN_COLUMNS.map((col, i) => {
            const count = getColumnOrders(col.status).length;
            return (
              <button
                key={col.status}
                onClick={() => setMobileColumnIndex(i)}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all ${
                  i === mobileColumnIndex
                    ? `${col.color} text-white`
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i === mobileColumnIndex ? col.label : ''}
                <span className={i === mobileColumnIndex ? 'bg-white/30 px-1 rounded' : ''}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Navigation arrows + Column Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={mobileColumnIndex === 0}
            onClick={() => setMobileColumnIndex(mobileColumnIndex - 1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${currentMobileColumn.color}`} />
            <h3 className="font-semibold">{currentMobileColumn.label}</h3>
            <Badge variant="secondary" className="text-xs">{mobileColumnOrders.length}</Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={mobileColumnIndex === KANBAN_COLUMNS.length - 1}
            onClick={() => setMobileColumnIndex(mobileColumnIndex + 1)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile Cards */}
        <div className={`space-y-2 rounded-xl border-2 p-2 min-h-[50vh] ${currentMobileColumn.bg}`}>
          {mobileColumnOrders.map((order) => {
            const currentStatusIdx = KANBAN_COLUMNS.findIndex((c) => c.status === order.status);
            const canMoveLeft = currentStatusIdx > 0;
            const canMoveRight = currentStatusIdx < KANBAN_COLUMNS.length - 1;

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-card rounded-lg border p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <User className="h-3 w-3" /> {order.customerName}
                    </p>
                  </div>
                  <span className="text-sm font-bold shrink-0">
                    {formatCurrency(order.salePrice, 'USD')}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px] px-1.5">
                    <Store className="h-2.5 w-2.5 mr-0.5" /> {order.store.name}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Calendar className="h-2.5 w-2.5" /> {formatShortDate(order.orderDate)}
                  </span>
                  {order.trackingNumber && <Truck className="h-3 w-3 text-green-500" />}
                </div>

                {/* Mobile move buttons */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    disabled={!canMoveLeft}
                    onClick={() => moveOrderMobile(order, 'left')}
                  >
                    <ChevronLeft className="h-3 w-3" />
                    {canMoveLeft ? KANBAN_COLUMNS[currentStatusIdx - 1].label : ''}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    disabled={!canMoveRight}
                    onClick={() => moveOrderMobile(order, 'right')}
                  >
                    {canMoveRight ? KANBAN_COLUMNS[currentStatusIdx + 1].label : ''}
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}

          {mobileColumnOrders.length === 0 && (
            <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
              Bu kolonda sipariş yok
            </div>
          )}
        </div>

        {/* Swipe hint */}
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          ← Sola/sağa kaydırarak kolon değiştirin →
        </p>
      </div>

      {/* Desktop Kanban Board */}
      <div className="hidden sm:flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '70vh' }}>
        {KANBAN_COLUMNS.map((col) => {
          const columnOrders = getColumnOrders(col.status);
          const isOver = dragOverColumn === col.status;

          return (
            <div
              key={col.status}
              className={`flex-shrink-0 w-72 rounded-xl border-2 transition-colors ${
                isOver ? 'border-primary bg-primary/5' : col.bg
              }`}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.status)}
            >
              {/* Column Header */}
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${col.color}`} />
                  <h3 className="font-semibold text-sm">{col.label}</h3>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {columnOrders.length}
                </Badge>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-[200px]">
                {columnOrders.map((order) => (
                  <div
                    key={order.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, order.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white dark:bg-card rounded-lg border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all ${
                      draggingId === order.id ? 'opacity-50 scale-95' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <User className="h-3 w-3" /> {order.customerName}
                        </p>
                      </div>
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        <Store className="h-2.5 w-2.5 mr-0.5" /> {order.store.name}
                      </Badge>
                    </div>

                    {order.items && order.items.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1.5 truncate">
                        {order.items[0].canvasSize?.name || '-'} · {order.items[0].frameOption?.name || 'Çerçevesiz'}
                        {order.items[0].quantity > 1 && ` (x${order.items[0].quantity})`}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatShortDate(order.orderDate)}
                      </span>
                      <div className="flex items-center gap-2">
                        {order.trackingNumber && (
                          <Truck className="h-3 w-3 text-green-500" />
                        )}
                        <span className="text-sm font-bold">
                          {formatCurrency(order.salePrice, 'USD')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {columnOrders.length === 0 && (
                  <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                    Sipariş yok
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
