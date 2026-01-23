import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  shippingCountry?: string;
  shippingAddress?: string;
  status: string;
  salePrice: number;
  saleCurrency: string;
  productCost: number;
  shippingCost: number;
  etsyFees: number;
  totalCost: number;
  netProfit: number;
  profitMargin: number;
  trackingNumber?: string;
  trackingCompany?: string;
  imageUrl?: string;
  notes?: string;
  orderDate: string;
  store?: { name: string };
  country?: { name: string };
  items?: Array<{
    title: string;
    quantity: number;
    salePrice: number;
    canvasSize?: { name: string };
    frameOption?: { name: string };
  }>;
}

const statusLabels: Record<string, string> = {
  NEW: 'Yeni',
  PROCESSING: 'İşleniyor',
  PRODUCTION: 'Üretimde',
  READY: 'Hazır',
  SHIPPED: 'Kargoda',
  DELIVERED: 'Teslim Edildi',
  RETURNED: 'İade',
  CANCELLED: 'İptal',
  PROBLEM: 'Problem',
};

// Tek sipariş PDF'i
export function exportSingleOrderPDF(order: Order) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Başlık
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Sipariş Detayı', pageWidth / 2, 20, { align: 'center' });
  
  // Sipariş numarası
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Sipariş No: ${order.orderNumber}`, pageWidth / 2, 30, { align: 'center' });
  
  // Temel bilgiler
  let y = 45;
  doc.setFontSize(11);
  
  const addRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 60, y);
    y += 8;
  };
  
  addRow('Mağaza:', order.store?.name || '-');
  addRow('Müşteri:', order.customerName);
  if (order.customerEmail) addRow('E-posta:', order.customerEmail);
  addRow('Ülke:', order.country?.name || order.shippingCountry || '-');
  addRow('Durum:', statusLabels[order.status] || order.status);
  addRow('Sipariş Tarihi:', new Date(order.orderDate).toLocaleDateString('tr-TR'));
  
  if (order.trackingNumber) {
    addRow('Kargo Takip:', `${order.trackingCompany || ''} - ${order.trackingNumber}`);
  }
  
  y += 5;
  
  // Adres
  if (order.shippingAddress) {
    doc.setFont('helvetica', 'bold');
    doc.text('Teslimat Adresi:', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const addressLines = doc.splitTextToSize(order.shippingAddress, pageWidth - 28);
    doc.text(addressLines, 14, y);
    y += addressLines.length * 5 + 5;
  }
  
  // Ürünler tablosu
  if (order.items && order.items.length > 0) {
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Ürünler', 14, y);
    y += 5;
    
    autoTable(doc, {
      startY: y,
      head: [['Ürün', 'Boyut', 'Çerçeve', 'Adet', 'Fiyat']],
      body: order.items.map(item => [
        item.title,
        item.canvasSize?.name || '-',
        item.frameOption?.name || '-',
        item.quantity.toString(),
        `$${item.salePrice.toFixed(2)}`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 66, 66] },
    });
    
    y = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Finansal özet
  doc.setFont('helvetica', 'bold');
  doc.text('Finansal Özet', 14, y);
  y += 8;
  
  const financialData = [
    ['Satış Fiyatı', `$${order.salePrice.toFixed(2)}`],
    ['Ürün Maliyeti', `$${order.productCost.toFixed(2)}`],
    ['Kargo Maliyeti', `$${order.shippingCost.toFixed(2)}`],
    ['Etsy Kesintileri', `$${order.etsyFees.toFixed(2)}`],
    ['Toplam Maliyet', `$${order.totalCost.toFixed(2)}`],
    ['Net Kar', `$${order.netProfit.toFixed(2)}`],
    ['Kar Marjı', `%${order.profitMargin.toFixed(1)}`],
  ];
  
  autoTable(doc, {
    startY: y,
    body: financialData,
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'right' },
    },
    theme: 'plain',
  });
  
  // Notlar
  if (order.notes) {
    y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Notlar:', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(order.notes, pageWidth - 28);
    doc.text(noteLines, 14, y);
  }
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(`Oluşturulma: ${new Date().toLocaleString('tr-TR')}`, 14, footerY);
  
  doc.save(`siparis-${order.orderNumber}.pdf`);
}

// Çoklu sipariş listesi PDF'i
export function exportOrderListPDF(orders: Order[], title: string = 'Sipariş Listesi') {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Başlık
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 15, { align: 'center' });
  
  // Tarih
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Oluşturulma: ${new Date().toLocaleString('tr-TR')}`, pageWidth / 2, 22, { align: 'center' });
  
  // Özet bilgiler
  const totalRevenue = orders.reduce((sum, o) => sum + o.salePrice, 0);
  const totalProfit = orders.reduce((sum, o) => sum + o.netProfit, 0);
  const avgMargin = orders.length > 0 
    ? orders.reduce((sum, o) => sum + o.profitMargin, 0) / orders.length 
    : 0;
  
  doc.setFontSize(10);
  doc.text(`Toplam Sipariş: ${orders.length}`, 14, 30);
  doc.text(`Toplam Ciro: $${totalRevenue.toFixed(2)}`, 80, 30);
  doc.text(`Toplam Kar: $${totalProfit.toFixed(2)}`, 150, 30);
  doc.text(`Ort. Kar Marjı: %${avgMargin.toFixed(1)}`, 220, 30);
  
  // Tablo
  autoTable(doc, {
    startY: 38,
    head: [[
      'Sipariş No',
      'Mağaza',
      'Müşteri',
      'Ülke',
      'Durum',
      'Tarih',
      'Satış',
      'Maliyet',
      'Kar',
      'Marj %',
    ]],
    body: orders.map(order => [
      order.orderNumber,
      order.store?.name || '-',
      order.customerName,
      order.country?.name || order.shippingCountry || '-',
      statusLabels[order.status] || order.status,
      new Date(order.orderDate).toLocaleDateString('tr-TR'),
      `$${order.salePrice.toFixed(2)}`,
      `$${order.totalCost.toFixed(2)}`,
      `$${order.netProfit.toFixed(2)}`,
      `${order.profitMargin.toFixed(1)}%`,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 66, 66], fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 30 },
      2: { cellWidth: 35 },
      3: { cellWidth: 25 },
      4: { cellWidth: 22 },
      5: { cellWidth: 22 },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 20, halign: 'right' },
      8: { cellWidth: 20, halign: 'right' },
      9: { cellWidth: 18, halign: 'right' },
    },
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Sayfa ${i} / ${pageCount}`, pageWidth / 2, footerY, { align: 'center' });
  }
  
  const fileName = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  doc.save(`${fileName}-${new Date().toISOString().split('T')[0]}.pdf`);
}
