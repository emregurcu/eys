'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  Frame,
  Ruler,
  Truck,
  DollarSign,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';

interface CanvasSize {
  id: string;
  name: string;
  width: number;
  height: number;
  baseCost: number;
  isActive: boolean;
  sortOrder: number;
}

interface FrameOption {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  sortOrder: number;
}

interface Country {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

interface CanvasSizeVariant {
  id: string;
  canvasSizeId: string;
  frameOptionId: string;
  totalCost: number;
  isActive: boolean;
}

interface SizeShippingRate {
  id: string;
  canvasSizeId: string;
  countryId: string;
  shippingCost: number;
  estimatedDays: string | null;
  isActive: boolean;
}

export default function PricingPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [sizes, setSizes] = useState<CanvasSize[]>([]);
  const [frames, setFrames] = useState<FrameOption[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [variants, setVariants] = useState<CanvasSizeVariant[]>([]);
  const [shippingRates, setShippingRates] = useState<SizeShippingRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Selected size for detailed pricing
  const [selectedSizeId, setSelectedSizeId] = useState<string>('');

  // Dialog states
  const [showSizeDialog, setShowSizeDialog] = useState(false);
  const [showFrameDialog, setShowFrameDialog] = useState(false);
  const [showCountryDialog, setShowCountryDialog] = useState(false);
  const [editingSize, setEditingSize] = useState<CanvasSize | null>(null);
  const [editingFrame, setEditingFrame] = useState<FrameOption | null>(null);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);

  // Form states
  const [sizeForm, setSizeForm] = useState({ name: '', width: '', height: '', baseCost: '' });
  const [frameForm, setFrameForm] = useState({ name: '', code: '' });
  const [countryForm, setCountryForm] = useState({ code: '', name: '' });

  // Variant prices state (çerçeve -> fiyat)
  const [variantPrices, setVariantPrices] = useState<Record<string, string>>({});
  // Shipping prices state (ülke -> fiyat)
  const [shippingPrices, setShippingPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  useEffect(() => {
    // Seçili boyut değiştiğinde ilgili fiyatları getir
    if (selectedSizeId) {
      fetchSizePricing(selectedSizeId);
    }
  }, [selectedSizeId]);

  const fetchData = async () => {
    setPageLoading(true);
    try {
      const [sizesRes, framesRes, countriesRes] = await Promise.all([
        fetch('/api/canvas-sizes'),
        fetch('/api/frame-options'),
        fetch('/api/countries'),
      ]);

      if (sizesRes.ok) {
        const sizesData = await sizesRes.json();
        setSizes(sizesData);
        if (sizesData.length > 0 && !selectedSizeId) {
          setSelectedSizeId(sizesData[0].id);
        }
      }
      if (framesRes.ok) setFrames(await framesRes.json());
      if (countriesRes.ok) setCountries(await countriesRes.json());
    } catch (error) {
      toast.error('Veri yüklenemedi');
    }
    setPageLoading(false);
  };

  const fetchSizePricing = async (canvasSizeId: string) => {
    try {
      const [variantsRes, shippingRes] = await Promise.all([
        fetch(`/api/canvas-variants?canvasSizeId=${canvasSizeId}`),
        fetch(`/api/size-shipping-rates?canvasSizeId=${canvasSizeId}`),
      ]);

      if (variantsRes.ok) {
        const variantsData = await variantsRes.json();
        setVariants(variantsData);
        const variantMap: Record<string, string> = {};
        variantsData.forEach((v: any) => {
          variantMap[v.frameOptionId] = v.totalCost.toString();
        });
        setVariantPrices(variantMap);
      }

      if (shippingRes.ok) {
        const shippingData = await shippingRes.json();
        setShippingRates(shippingData);
        const shippingMap: Record<string, string> = {};
        shippingData.forEach((r: any) => {
          shippingMap[r.countryId] = r.shippingCost.toString();
        });
        setShippingPrices(shippingMap);
      }
    } catch (error) {
      console.error('Fiyat verileri yüklenemedi');
    }
  };

  // ============ BOYUT İŞLEMLERİ ============
  const openSizeDialog = (size?: CanvasSize) => {
    if (size) {
      setEditingSize(size);
      setSizeForm({
        name: size.name,
        width: size.width.toString(),
        height: size.height.toString(),
        baseCost: size.baseCost.toString(),
      });
    } else {
      setEditingSize(null);
      setSizeForm({ name: '', width: '', height: '', baseCost: '' });
    }
    setShowSizeDialog(true);
  };

  const saveSize = async () => {
    if (!sizeForm.width || !sizeForm.height || !sizeForm.baseCost) {
      toast.error('Genişlik, yükseklik ve fiyat zorunludur');
      return;
    }

    setLoading(true);
    try {
      const url = editingSize ? `/api/canvas-sizes/${editingSize.id}` : '/api/canvas-sizes';
      const method = editingSize ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sizeForm.name || `${sizeForm.width}x${sizeForm.height} cm`,
          width: parseInt(sizeForm.width),
          height: parseInt(sizeForm.height),
          baseCost: parseFloat(sizeForm.baseCost),
        }),
      });

      if (res.ok) {
        toast.success(editingSize ? 'Boyut güncellendi' : 'Boyut eklendi');
        setShowSizeDialog(false);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'İşlem başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
    setLoading(false);
  };

  const deleteSize = async (id: string) => {
    if (!confirm('Bu boyutu silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/canvas-sizes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Boyut silindi');
        if (selectedSizeId === id) {
          setSelectedSizeId(sizes.find((s) => s.id !== id)?.id || '');
        }
        fetchData();
      } else {
        toast.error('Silme başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  // ============ ÇERÇEVE İŞLEMLERİ ============
  const openFrameDialog = (frame?: FrameOption) => {
    if (frame) {
      setEditingFrame(frame);
      setFrameForm({ name: frame.name, code: frame.code });
    } else {
      setEditingFrame(null);
      setFrameForm({ name: '', code: '' });
    }
    setShowFrameDialog(true);
  };

  const saveFrame = async () => {
    if (!frameForm.name || !frameForm.code) {
      toast.error('Ad ve kod zorunludur');
      return;
    }

    setLoading(true);
    try {
      const url = editingFrame ? `/api/frame-options/${editingFrame.id}` : '/api/frame-options';
      const method = editingFrame ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: frameForm.name,
          code: frameForm.code.toLowerCase(),
        }),
      });

      if (res.ok) {
        toast.success(editingFrame ? 'Çerçeve güncellendi' : 'Çerçeve eklendi');
        setShowFrameDialog(false);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'İşlem başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
    setLoading(false);
  };

  const deleteFrame = async (id: string) => {
    if (!confirm('Bu çerçeveyi silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/frame-options/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Çerçeve silindi');
        fetchData();
      } else {
        toast.error('Silme başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  // ============ ÜLKE İŞLEMLERİ ============
  const openCountryDialog = (country?: Country) => {
    if (country) {
      setEditingCountry(country);
      setCountryForm({ code: country.code, name: country.name });
    } else {
      setEditingCountry(null);
      setCountryForm({ code: '', name: '' });
    }
    setShowCountryDialog(true);
  };

  const saveCountry = async () => {
    if (!countryForm.code || !countryForm.name) {
      toast.error('Ülke kodu ve adı zorunludur');
      return;
    }

    setLoading(true);
    try {
      const url = editingCountry ? `/api/countries/${editingCountry.id}` : '/api/countries';
      const method = editingCountry ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: countryForm.code.toUpperCase(),
          name: countryForm.name,
        }),
      });

      if (res.ok) {
        toast.success(editingCountry ? 'Ülke güncellendi' : 'Ülke eklendi');
        setShowCountryDialog(false);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'İşlem başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
    setLoading(false);
  };

  const deleteCountry = async (id: string) => {
    if (!confirm('Bu ülkeyi silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/countries/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Ülke silindi');
        fetchData();
      } else {
        toast.error('Silme başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  // ============ FİYAT KAYDETME ============
  const savePricesForSize = async () => {
    if (!selectedSizeId) return;

    setLoading(true);
    try {
      // Çerçeve fiyatlarını kaydet
      const variantsToSave = Object.entries(variantPrices)
        .filter(([_, price]) => price && parseFloat(price) > 0)
        .map(([frameId, price]) => ({
          canvasSizeId: selectedSizeId,
          frameOptionId: frameId,
          totalCost: price,
        }));

      // Kargo fiyatlarını kaydet
      const shippingToSave = Object.entries(shippingPrices)
        .filter(([_, price]) => price && parseFloat(price) > 0)
        .map(([countryId, price]) => ({
          canvasSizeId: selectedSizeId,
          countryId,
          shippingCost: price,
        }));

      const promises = [];

      if (variantsToSave.length > 0) {
        promises.push(
          fetch('/api/canvas-variants', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variants: variantsToSave }),
          })
        );
      }

      if (shippingToSave.length > 0) {
        promises.push(
          fetch('/api/size-shipping-rates', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rates: shippingToSave }),
          })
        );
      }

      await Promise.all(promises);
      toast.success('Fiyatlar kaydedildi');
      fetchData();
    } catch (error) {
      toast.error('Kaydetme başarısız');
    }
    setLoading(false);
  };

  const selectedSize = sizes.find((s) => s.id === selectedSizeId);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Bu sayfaya erişim yetkiniz yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fiyatlandırma</h1>
        <p className="text-muted-foreground">
          Kanvas boyutları, çerçeve seçenekleri ve kargo fiyatlarını yönetin
        </p>
      </div>

      <Tabs defaultValue="pricing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pricing">
            <DollarSign className="h-4 w-4 mr-2" />
            Boyut Fiyatlandırma
          </TabsTrigger>
          <TabsTrigger value="sizes">
            <Ruler className="h-4 w-4 mr-2" />
            Boyutlar
          </TabsTrigger>
          <TabsTrigger value="frames">
            <Frame className="h-4 w-4 mr-2" />
            Çerçeveler
          </TabsTrigger>
          <TabsTrigger value="countries">
            <Globe className="h-4 w-4 mr-2" />
            Ülkeler
          </TabsTrigger>
        </TabsList>

        {/* BOYUT FİYATLANDIRMA TABİ */}
        <TabsContent value="pricing">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Sol: Boyut Seçimi */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Boyut Seçin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sizes.filter((s) => s.isActive).map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSizeId(size.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedSizeId === size.id
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent hover:bg-muted'
                    }`}
                  >
                    <p className="font-medium">{size.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Baz: ${size.baseCost.toFixed(2)}
                    </p>
                  </button>
                ))}
                {sizes.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Henüz boyut eklenmemiş
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Sağ: Fiyat Girişi */}
            <div className="lg:col-span-2 space-y-6">
              {selectedSize ? (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>{selectedSize.name} - Çerçeve Fiyatları</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Her çerçeve seçeneği için toplam ürün maliyetini girin
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {frames.filter((f) => f.isActive).map((frame) => (
                          <div key={frame.id} className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="text-sm font-medium">{frame.name}</label>
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={variantPrices[frame.id] || ''}
                                  onChange={(e) =>
                                    setVariantPrices((prev) => ({
                                      ...prev,
                                      [frame.id]: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {frames.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          Önce çerçeve seçenekleri ekleyin
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div>
                        <CardTitle>{selectedSize.name} - Kargo Maliyetleri</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Her ülke için kargo maliyetini girin
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {countries.filter((c) => c.isActive).map((country) => (
                          <div key={country.id} className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="text-sm font-medium">
                                {country.name} ({country.code})
                              </label>
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={shippingPrices[country.id] || ''}
                                  onChange={(e) =>
                                    setShippingPrices((prev) => ({
                                      ...prev,
                                      [country.id]: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {countries.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          Önce ülkeler ekleyin
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button onClick={savePricesForSize} disabled={loading} size="lg">
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? 'Kaydediliyor...' : 'Bu Boyut İçin Kaydet'}
                    </Button>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Fiyat girmek için sol taraftan bir boyut seçin
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* BOYUTLAR TABİ */}
        <TabsContent value="sizes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Kanvas Boyutları</CardTitle>
              <Button onClick={() => openSizeDialog()}>
                <Plus className="h-4 w-4 mr-2" /> Boyut Ekle
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Boyut</th>
                      <th className="text-left p-3 font-medium">Genişlik</th>
                      <th className="text-left p-3 font-medium">Yükseklik</th>
                      <th className="text-left p-3 font-medium">Baz Maliyet</th>
                      <th className="text-left p-3 font-medium">Durum</th>
                      <th className="text-right p-3 font-medium">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizes.map((size) => (
                      <tr key={size.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium">{size.name}</td>
                        <td className="p-3">{size.width} cm</td>
                        <td className="p-3">{size.height} cm</td>
                        <td className="p-3">${size.baseCost.toFixed(2)}</td>
                        <td className="p-3">
                          <Badge variant={size.isActive ? 'default' : 'secondary'}>
                            {size.isActive ? 'Aktif' : 'Pasif'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="icon" onClick={() => openSizeDialog(size)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteSize(size.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {sizes.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          Henüz boyut eklenmemiş
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ÇERÇEVELER TABİ */}
        <TabsContent value="frames">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Çerçeve Seçenekleri</CardTitle>
              <Button onClick={() => openFrameDialog()}>
                <Plus className="h-4 w-4 mr-2" /> Çerçeve Ekle
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Ad</th>
                      <th className="text-left p-3 font-medium">Kod</th>
                      <th className="text-left p-3 font-medium">Durum</th>
                      <th className="text-right p-3 font-medium">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frames.map((frame) => (
                      <tr key={frame.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium">{frame.name}</td>
                        <td className="p-3">
                          <Badge variant="outline">{frame.code}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant={frame.isActive ? 'default' : 'secondary'}>
                            {frame.isActive ? 'Aktif' : 'Pasif'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="icon" onClick={() => openFrameDialog(frame)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteFrame(frame.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {frames.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          Henüz çerçeve eklenmemiş
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ÜLKELER TABİ */}
        <TabsContent value="countries">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Kargo Ülkeleri</CardTitle>
              <Button onClick={() => openCountryDialog()}>
                <Plus className="h-4 w-4 mr-2" /> Ülke Ekle
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Ülke</th>
                      <th className="text-left p-3 font-medium">Kod</th>
                      <th className="text-left p-3 font-medium">Durum</th>
                      <th className="text-right p-3 font-medium">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {countries.map((country) => (
                      <tr key={country.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium">{country.name}</td>
                        <td className="p-3">
                          <Badge variant="outline">{country.code}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant={country.isActive ? 'default' : 'secondary'}>
                            {country.isActive ? 'Aktif' : 'Pasif'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="icon" onClick={() => openCountryDialog(country)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteCountry(country.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {countries.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          Henüz ülke eklenmemiş
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* BOYUT DIALOG */}
      <Dialog open={showSizeDialog} onOpenChange={setShowSizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSize ? 'Boyut Düzenle' : 'Yeni Boyut Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ad (Opsiyonel)</label>
              <Input
                placeholder="Örn: 20x30 cm"
                value={sizeForm.name}
                onChange={(e) => setSizeForm({ ...sizeForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Genişlik (cm) *</label>
                <Input
                  type="number"
                  placeholder="20"
                  value={sizeForm.width}
                  onChange={(e) => setSizeForm({ ...sizeForm, width: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Yükseklik (cm) *</label>
                <Input
                  type="number"
                  placeholder="30"
                  value={sizeForm.height}
                  onChange={(e) => setSizeForm({ ...sizeForm, height: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Baz Maliyet (USD) *</label>
              <Input
                type="number"
                step="0.01"
                placeholder="10.00"
                value={sizeForm.baseCost}
                onChange={(e) => setSizeForm({ ...sizeForm, baseCost: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Çerçevesiz kanvas maliyeti</p>
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowSizeDialog(false)}>
                İptal
              </Button>
              <Button className="flex-1" onClick={saveSize} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ÇERÇEVE DIALOG */}
      <Dialog open={showFrameDialog} onOpenChange={setShowFrameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFrame ? 'Çerçeve Düzenle' : 'Yeni Çerçeve Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ad *</label>
              <Input
                placeholder="Örn: Siyah Çerçeve"
                value={frameForm.name}
                onChange={(e) => setFrameForm({ ...frameForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Kod *</label>
              <Input
                placeholder="Örn: black"
                value={frameForm.code}
                onChange={(e) => setFrameForm({ ...frameForm, code: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Sistem içi tanımlayıcı (küçük harf)</p>
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowFrameDialog(false)}>
                İptal
              </Button>
              <Button className="flex-1" onClick={saveFrame} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ÜLKE DIALOG */}
      <Dialog open={showCountryDialog} onOpenChange={setShowCountryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCountry ? 'Ülke Düzenle' : 'Yeni Ülke Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ülke Kodu *</label>
              <Input
                placeholder="US"
                maxLength={2}
                value={countryForm.code}
                onChange={(e) => setCountryForm({ ...countryForm, code: e.target.value.toUpperCase() })}
              />
              <p className="text-xs text-muted-foreground mt-1">ISO 2 harfli ülke kodu</p>
            </div>
            <div>
              <label className="text-sm font-medium">Ülke Adı *</label>
              <Input
                placeholder="United States"
                value={countryForm.name}
                onChange={(e) => setCountryForm({ ...countryForm, name: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowCountryDialog(false)}>
                İptal
              </Button>
              <Button className="flex-1" onClick={saveCountry} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
