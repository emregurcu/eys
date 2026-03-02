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
  Package,
  Ruler,
  Frame,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

interface ProductVariant {
  id: string;
  frameOptionId: string;
  frameName: string;
  frameCode: string;
  totalCost: number;
  isActive: boolean;
  orderCount: number;
}

interface Product {
  id: string;
  name: string;
  width: number;
  height: number;
  baseCost: number;
  isActive: boolean;
  variants: ProductVariant[];
  shippingRateCount: number;
  totalOrders: number;
  totalRevenue: number;
}

interface TopVariant {
  sizeName: string;
  frameName: string;
  orderCount: number;
  revenue: number;
}

interface CatalogData {
  products: Product[];
  frames: { id: string; name: string; code: string }[];
  topVariants: TopVariant[];
  summary: {
    totalSizes: number;
    totalFrames: number;
    totalVariants: number;
    totalOrders: number;
  };
}

export default function ProductsPage() {
  const [data, setData] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products/catalog');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error('Katalog yüklenemedi:', error);
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

  const filteredProducts = data.products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      `${p.width}x${p.height}`.includes(search);
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && p.isActive) ||
      (statusFilter === 'inactive' && !p.isActive);
    return matchSearch && matchStatus;
  });

  const totalRevenue = data.products.reduce((sum, p) => sum + p.totalRevenue, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ürün Kataloğu</h1>
          <p className="text-muted-foreground">
            Kanvas boyutları, çerçeve seçenekleri ve satış performansı
          </p>
        </div>
        <Link href="/dashboard/pricing">
          <Button variant="outline">
            <ExternalLink className="mr-2 h-4 w-4" /> Fiyatlandırma Yönetimi
          </Button>
        </Link>
      </div>

      {/* Özet Kartları */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Ruler className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.summary.totalSizes}</p>
                <p className="text-xs text-muted-foreground">Aktif Boyut</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100">
                <Frame className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.summary.totalVariants}</p>
                <p className="text-xs text-muted-foreground">Ürün Varyantı</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <ShoppingCart className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.summary.totalOrders}</p>
                <p className="text-xs text-muted-foreground">Toplam Satış</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100">
                <DollarSign className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue, 'USD')}</p>
                <p className="text-xs text-muted-foreground">Toplam Gelir</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* En Çok Satanlar */}
      {data.topVariants.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" /> En Çok Satan Ürünler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {data.topVariants.map((tv, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{tv.sizeName}</p>
                    <p className="text-xs text-muted-foreground">{tv.frameName} · {tv.orderCount} adet</p>
                  </div>
                </div>
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
                placeholder="Boyut adı ara... (örn: 20x30)"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Pasif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ürün Kartları */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => {
          const activeVariants = product.variants.filter((v) => v.isActive);
          const minCost = activeVariants.length > 0
            ? Math.min(...activeVariants.map((v) => v.totalCost))
            : product.baseCost;
          const maxCost = activeVariants.length > 0
            ? Math.max(...activeVariants.map((v) => v.totalCost))
            : product.baseCost;

          return (
            <Card
              key={product.id}
              className={`overflow-hidden cursor-pointer hover:border-primary transition-colors ${!product.isActive ? 'opacity-60' : ''}`}
              onClick={() => setSelectedProduct(product)}
            >
              <div className="aspect-[16/9] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center relative">
                <div className="text-center">
                  <p className="text-3xl font-bold text-muted-foreground/40">
                    {product.width}×{product.height}
                  </p>
                  <p className="text-sm text-muted-foreground/40">cm</p>
                </div>
                {!product.isActive && (
                  <Badge className="absolute top-2 right-2 bg-gray-500">Pasif</Badge>
                )}
                {product.totalOrders > 0 && (
                  <Badge className="absolute top-2 left-2 bg-green-600">
                    <ShoppingCart className="h-3 w-3 mr-1" /> {product.totalOrders} satış
                  </Badge>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activeVariants.length} çerçeve seçeneği · {product.shippingRateCount} kargo bölgesi
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Maliyet Aralığı</p>
                    <p className="font-bold text-lg">
                      ${minCost.toFixed(2)}
                      {minCost !== maxCost && <span className="text-sm font-normal text-muted-foreground"> - ${maxCost.toFixed(2)}</span>}
                    </p>
                  </div>
                  {product.totalRevenue > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Gelir</p>
                      <p className="font-bold text-green-600">{formatCurrency(product.totalRevenue, 'USD')}</p>
                    </div>
                  )}
                </div>

                {activeVariants.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {activeVariants.slice(0, 4).map((v) => (
                      <Badge key={v.id} variant="outline" className="text-[10px]">
                        {v.frameName}
                      </Badge>
                    ))}
                    {activeVariants.length > 4 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{activeVariants.length - 4}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Ürün bulunamadı</p>
            <p className="text-sm mt-1">
              Fiyatlandırma sayfasından yeni boyut ekleyebilirsiniz.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Ürün Detay Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              {/* Boyut Bilgisi */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Boyut</p>
                  <p className="font-bold">{selectedProduct.width}×{selectedProduct.height} cm</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Baz Maliyet</p>
                  <p className="font-bold">${selectedProduct.baseCost.toFixed(2)}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Toplam Satış</p>
                  <p className="font-bold">{selectedProduct.totalOrders}</p>
                </div>
              </div>

              {/* Çerçeve Varyantları */}
              <div>
                <p className="text-sm font-medium mb-2">Çerçeve Varyantları</p>
                {selectedProduct.variants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Henüz varyant tanımlanmamış</p>
                ) : (
                  <div className="space-y-2">
                    {selectedProduct.variants.map((v) => (
                      <div
                        key={v.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${!v.isActive ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <Frame className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{v.frameName}</p>
                            <p className="text-xs text-muted-foreground">{v.frameCode}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-bold">${v.totalCost.toFixed(2)}</p>
                            {v.orderCount > 0 && (
                              <p className="text-xs text-green-600">{v.orderCount} satış</p>
                            )}
                          </div>
                          <Badge variant={v.isActive ? 'default' : 'secondary'} className="text-[10px]">
                            {v.isActive ? 'Aktif' : 'Pasif'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Gelir Bilgisi */}
              {selectedProduct.totalRevenue > 0 && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-green-600" />
                      <p className="text-sm font-medium text-green-800">Toplam Gelir</p>
                    </div>
                    <p className="font-bold text-green-700">
                      {formatCurrency(selectedProduct.totalRevenue, 'USD')}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Link href="/dashboard/pricing" className="flex-1">
                  <Button variant="outline" className="w-full">Fiyatları Düzenle</Button>
                </Link>
                <Button variant="outline" onClick={() => setSelectedProduct(null)}>Kapat</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
