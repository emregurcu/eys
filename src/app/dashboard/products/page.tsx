'use client';

import { useState } from 'react';
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
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Demo ürünler
const demoProducts = [
  {
    id: '1',
    title: 'Gümüş Kolye',
    sku: 'GK-001',
    price: 325,
    quantity: 5,
    isActive: true,
    store: { name: 'El Yapımı Takılar' },
    imageUrl: null,
  },
  {
    id: '2',
    title: 'Özel Tasarım Yüzük',
    sku: 'OTY-001',
    price: 845,
    quantity: 8,
    isActive: true,
    store: { name: 'El Yapımı Takılar' },
    imageUrl: null,
  },
  {
    id: '3',
    title: 'Ahşap Çerçeve',
    sku: 'AC-001',
    price: 245,
    quantity: 25,
    isActive: true,
    store: { name: 'Vintage Dekor' },
    imageUrl: null,
  },
  {
    id: '4',
    title: 'Seramik Vazo',
    sku: 'SV-001',
    price: 385,
    quantity: 0,
    isActive: false,
    store: { name: 'Vintage Dekor' },
    imageUrl: null,
  },
  {
    id: '5',
    title: 'Lavanta Sabunu Set',
    sku: 'LS-001',
    price: 60,
    quantity: 50,
    isActive: true,
    store: { name: 'Doğal Sabunlar' },
    imageUrl: null,
  },
  {
    id: '6',
    title: 'Gül Sabunu',
    sku: 'GS-001',
    price: 45,
    quantity: 3,
    isActive: true,
    store: { name: 'Doğal Sabunlar' },
    imageUrl: null,
  },
];

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const filteredProducts = demoProducts.filter((product) => {
    const matchSearch =
      product.title.toLowerCase().includes(search.toLowerCase()) ||
      product.sku?.toLowerCase().includes(search.toLowerCase());
    const matchStore = storeFilter === 'all' || product.store.name === storeFilter;
    const matchStock =
      stockFilter === 'all' ||
      (stockFilter === 'low' && product.quantity <= 5) ||
      (stockFilter === 'out' && product.quantity === 0);
    return matchSearch && matchStore && matchStock;
  });

  const lowStockCount = demoProducts.filter((p) => p.quantity <= 5 && p.quantity > 0).length;
  const outOfStockCount = demoProducts.filter((p) => p.quantity === 0).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ürünler</h1>
          <p className="text-muted-foreground">
            {lowStockCount > 0 && (
              <span className="text-yellow-600">{lowStockCount} düşük stok, </span>
            )}
            {outOfStockCount > 0 && (
              <span className="text-red-600">{outOfStockCount} tükendi</span>
            )}
            {lowStockCount === 0 && outOfStockCount === 0 && 'Tüm ürünler stokta'}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Ürün Ekle
        </Button>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ürün adı veya SKU ara..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Mağaza" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Mağazalar</SelectItem>
                <SelectItem value="El Yapımı Takılar">El Yapımı Takılar</SelectItem>
                <SelectItem value="Vintage Dekor">Vintage Dekor</SelectItem>
                <SelectItem value="Doğal Sabunlar">Doğal Sabunlar</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Stok" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Stok</SelectItem>
                <SelectItem value="low">Düşük Stok</SelectItem>
                <SelectItem value="out">Tükendi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ürün Listesi */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <div className="aspect-square bg-muted flex items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/30" />
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-medium truncate">{product.title}</h3>
                  <p className="text-sm text-muted-foreground">{product.sku}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedProduct(product)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Detay
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Düzenle
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Sil
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center justify-between mt-3">
                <p className="font-bold text-lg">{formatCurrency(product.price)}</p>
                <div className="flex items-center gap-2">
                  {product.quantity === 0 ? (
                    <Badge className="bg-red-100 text-red-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Tükendi
                    </Badge>
                  ) : product.quantity <= 5 ? (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {product.quantity} adet
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800">
                      {product.quantity} adet
                    </Badge>
                  )}
                </div>
              </div>

              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  {product.store.name}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ürün Detay Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ürün Detayı</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <Package className="h-16 w-16 text-muted-foreground/30" />
              </div>

              <div>
                <h3 className="font-semibold text-lg">{selectedProduct.title}</h3>
                <p className="text-sm text-muted-foreground">SKU: {selectedProduct.sku}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fiyat</p>
                  <p className="font-bold text-xl">{formatCurrency(selectedProduct.price)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stok</p>
                  <p className="font-bold text-xl">{selectedProduct.quantity} adet</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mağaza</p>
                  <p className="font-medium">{selectedProduct.store.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Durum</p>
                  <Badge variant={selectedProduct.isActive ? 'default' : 'secondary'}>
                    {selectedProduct.isActive ? 'Aktif' : 'Pasif'}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button className="flex-1">Stok Güncelle</Button>
                <Button variant="outline" className="flex-1">Düzenle</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
