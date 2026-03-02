'use client';

import { useState, useEffect, useRef } from 'react';
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
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface ParsedRow {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  shippingCountry: string;
  salePrice: number;
  saleCurrency: string;
  orderDate: string;
  status: string;
  notes: string;
  trackingNumber: string;
  trackingCompany: string;
}

interface Store {
  id: string;
  name: string;
}

export default function ImportPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: number; errorDetails: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/stores').then((r) => r.json()).then(setStores).catch(() => {});
  }, []);

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));

    // Sütun eşleştirme
    const map: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (h.includes('order') && (h.includes('number') || h.includes('no') || h.includes('#'))) map['orderNumber'] = i.toString();
      else if (h.includes('customer') || h.includes('name') || h.includes('müşteri') || h.includes('musteri')) map['customerName'] = i.toString();
      else if (h.includes('email') || h.includes('mail')) map['customerEmail'] = i.toString();
      else if (h.includes('address') || h.includes('adres')) map['shippingAddress'] = i.toString();
      else if (h.includes('country') || h.includes('ülke') || h.includes('ulke')) map['shippingCountry'] = i.toString();
      else if (h.includes('price') || h.includes('total') || h.includes('fiyat') || h.includes('tutar') || h.includes('amount')) map['salePrice'] = i.toString();
      else if (h.includes('currency') || h.includes('para')) map['saleCurrency'] = i.toString();
      else if (h.includes('date') || h.includes('tarih')) map['orderDate'] = i.toString();
      else if (h.includes('status') || h.includes('durum')) map['status'] = i.toString();
      else if (h.includes('note') || h.includes('not')) map['notes'] = i.toString();
      else if (h.includes('tracking') || h.includes('takip')) map['trackingNumber'] = i.toString();
      else if (h.includes('carrier') || h.includes('kargo') || h.includes('company')) map['trackingCompany'] = i.toString();
    });

    // Otomatik eşleştirme bulunamazsa indeks bazlı
    if (!map['orderNumber'] && headers.length > 0) map['orderNumber'] = '0';
    if (!map['customerName'] && headers.length > 1) map['customerName'] = '1';
    if (!map['salePrice'] && headers.length > 2) map['salePrice'] = '2';

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0 || !values[0]) continue;

      const get = (key: string) => {
        const idx = map[key];
        return idx !== undefined ? values[parseInt(idx)]?.trim() || '' : '';
      };

      rows.push({
        orderNumber: get('orderNumber'),
        customerName: get('customerName'),
        customerEmail: get('customerEmail'),
        shippingAddress: get('shippingAddress'),
        shippingCountry: get('shippingCountry'),
        salePrice: parseFloat(get('salePrice').replace(/[^0-9.-]/g, '')) || 0,
        saleCurrency: get('saleCurrency') || 'USD',
        orderDate: get('orderDate'),
        status: get('status'),
        notes: get('notes'),
        trackingNumber: get('trackingNumber'),
        trackingCompany: get('trackingCompany'),
      });
    }

    return rows.filter((r) => r.orderNumber && r.customerName);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      setParsedRows(rows);
      if (rows.length === 0) {
        toast.error('Dosyadan veri ayrıştırılamadı. CSV formatını kontrol edin.');
      } else {
        toast.success(`${rows.length} satır okundu`);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    if (!selectedStore) {
      toast.error('Lütfen bir mağaza seçin');
      return;
    }
    if (parsedRows.length === 0) {
      toast.error('İçe aktarılacak veri yok');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/orders/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: selectedStore,
          rows: parsedRows,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
        toast.success(`${data.created} sipariş oluşturuldu`);
      } else {
        toast.error(data.error || 'İçe aktarma başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
    setImporting(false);
  };

  const downloadTemplate = () => {
    const csvContent = 'order_number,customer_name,customer_email,shipping_address,country,sale_price,currency,order_date,status,notes,tracking_number,tracking_company\n' +
      '12345,John Doe,john@example.com,"123 Main St, New York",US,45.99,USD,2024-01-15,NEW,Test note,,\n' +
      '12346,Jane Smith,jane@example.com,"456 Oak Ave, London",GB,59.99,USD,2024-01-16,SHIPPED,,ABC123,DHL\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'siparis-import-sablon.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Toplu Sipariş İçe Aktar</h1>
          <p className="text-muted-foreground text-sm">CSV dosyasından sipariş yükleyin</p>
        </div>
      </div>

      {/* Step 1: Mağaza & Dosya */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> 1. Dosya ve Mağaza Seçin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Mağaza Seçin" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> Şablon İndir
            </Button>
          </div>

          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">CSV dosyasını sürükleyin veya tıklayın</p>
            <p className="text-xs text-muted-foreground mt-1">
              {fileName ? `Seçili: ${fileName}` : 'Desteklenen format: .csv (UTF-8)'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Önizleme */}
      {parsedRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" /> 2. Önizleme ({parsedRows.length} satır)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Sipariş No</th>
                    <th className="text-left p-2">Müşteri</th>
                    <th className="text-left p-2">Fiyat</th>
                    <th className="text-left p-2">Tarih</th>
                    <th className="text-left p-2">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-b hover:bg-muted/30">
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2 font-medium">{row.orderNumber}</td>
                      <td className="p-2">{row.customerName}</td>
                      <td className="p-2">${row.salePrice.toFixed(2)}</td>
                      <td className="p-2 text-muted-foreground">{row.orderDate || '-'}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">{row.status || 'NEW'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 20 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  +{parsedRows.length - 20} satır daha...
                </p>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <Button onClick={handleImport} disabled={importing || !selectedStore}>
                {importing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> İçe Aktarılıyor...</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" /> {parsedRows.length} Siparişi İçe Aktar</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Sonuç */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">3. Sonuç</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700">{result.created}</p>
                <p className="text-xs text-green-600">Oluşturuldu</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-yellow-700">{result.skipped}</p>
                <p className="text-xs text-yellow-600">Atlandı (Duplikat)</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
                <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-700">{result.errors}</p>
                <p className="text-xs text-red-600">Hata</p>
              </div>
            </div>

            {result.errorDetails.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3 text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                {result.errorDetails.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Link href="/dashboard/orders">
                <Button>Siparişlere Git</Button>
              </Link>
              <Button variant="outline" onClick={() => {
                setParsedRows([]);
                setResult(null);
                setFileName('');
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}>
                Yeni İçe Aktarma
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
