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

// Tek sipariş PDF'i - Üretim için
export function exportSingleOrderPDF(order: Order) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Başlık
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Siparis Bilgisi', pageWidth / 2, 20, { align: 'center' });
  
  // Sipariş numarası
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Siparis No: ${order.orderNumber}`, pageWidth / 2, 30, { align: 'center' });
  
  // Temel bilgiler
  let y = 45;
  doc.setFontSize(11);
  
  const addRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 55, y);
    y += 8;
  };
  
  addRow('Magaza:', order.store?.name || '-');
  addRow('Musteri:', order.customerName);
  addRow('Ulke:', order.country?.name || order.shippingCountry || '-');
  addRow('Tarih:', new Date(order.orderDate).toLocaleDateString('tr-TR'));
  
  y += 5;
  
  // Ürün Bilgisi - Boyut ve Çerçeve
  doc.setFont('helvetica', 'bold');
  doc.text('Urun:', 14, y);
  doc.setFont('helvetica', 'normal');
  
  if (order.items && order.items.length > 0) {
    const productInfo = order.items.map(item => {
      const size = item.canvasSize?.name || '-';
      const frame = item.frameOption?.name || 'Cercevesiz';
      return `${size} - ${frame} (x${item.quantity})`;
    }).join(', ');
    
    const productLines = doc.splitTextToSize(productInfo, pageWidth - 70);
    doc.text(productLines, 55, y);
    y += productLines.length * 6 + 5;
  } else {
    doc.text('-', 55, y);
    y += 10;
  }
  
  y += 5;
  
  // Teslimat Adresi
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Teslimat Adresi:', 14, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  
  if (order.shippingAddress) {
    const addressLines = doc.splitTextToSize(order.shippingAddress, pageWidth - 28);
    doc.text(addressLines, 14, y);
    y += addressLines.length * 6 + 10;
  } else {
    doc.text('Adres bilgisi mevcut degil', 14, y);
    y += 15;
  }
  
  // Notlar
  if (order.notes) {
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
  doc.text(`Olusturulma: ${new Date().toLocaleString('tr-TR')}`, 14, footerY);
  
  doc.save(`siparis-${order.orderNumber}.pdf`);
}

// Çoklu sipariş listesi PDF'i - Sadeleştirilmiş
export function exportOrderListPDF(orders: Order[], title: string = 'Siparis Listesi') {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Başlık
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 15, { align: 'center' });
  
  // Tarih ve toplam
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Toplam: ${orders.length} siparis | Tarih: ${new Date().toLocaleDateString('tr-TR')}`, pageWidth / 2, 22, { align: 'center' });
  
  // Tablo - Maliyet ve kar bilgileri kaldırıldı
  autoTable(doc, {
    startY: 30,
    head: [[
      'Siparis No',
      'Magaza',
      'Musteri',
      'Urun (Boyut - Cerceve)',
      'Adres',
      'Tarih',
    ]],
    body: orders.map(order => {
      // Ürün bilgisi
      let productInfo = '-';
      if (order.items && order.items.length > 0) {
        productInfo = order.items.map(item => {
          const size = item.canvasSize?.name || '-';
          const frame = item.frameOption?.name || 'Cercevesiz';
          return `${size} - ${frame} (x${item.quantity})`;
        }).join('\n');
      }
      
      return [
        order.orderNumber,
        order.store?.name || '-',
        order.customerName,
        productInfo,
        order.shippingAddress || '-',
        new Date(order.orderDate).toLocaleDateString('tr-TR'),
      ];
    }),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [66, 66, 66], fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 30 },
      2: { cellWidth: 35 },
      3: { cellWidth: 50 },
      4: { cellWidth: 80 },
      5: { cellWidth: 22 },
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
