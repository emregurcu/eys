import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Türkçe karakterleri PDF uyumlu karakterlere çevir
function fixTurkishChars(text: string): string {
  if (!text) return text;
  const map: { [key: string]: string } = {
    'ğ': 'g', 'Ğ': 'G',
    'ü': 'u', 'Ü': 'U',
    'ş': 's', 'Ş': 'S',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ç': 'c', 'Ç': 'C',
  };
  return text.replace(/[ğĞüÜşŞıİöÖçÇ]/g, (char) => map[char] || char);
}

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
  
  addRow('Magaza:', fixTurkishChars(order.store?.name || '-'));
  addRow('Musteri:', fixTurkishChars(order.customerName));
  addRow('Ulke:', fixTurkishChars(order.country?.name || order.shippingCountry || '-'));
  addRow('Tarih:', new Date(order.orderDate).toLocaleDateString('tr-TR'));
  
  y += 5;
  
  // Ürün Görseli
  if (order.imageUrl) {
    try {
      // Data URL kontrolü (base64 görseller)
      if (order.imageUrl.startsWith('data:image/')) {
        const imgData = order.imageUrl;
        const imgWidth = 80;
        const imgHeight = (imgWidth * 3) / 4; // 4:3 oran
        
        // Format belirleme
        let format = 'JPEG';
        if (imgData.includes('data:image/png')) format = 'PNG';
        else if (imgData.includes('data:image/jpeg') || imgData.includes('data:image/jpg')) format = 'JPEG';
        
        doc.addImage(imgData, format, pageWidth / 2 - imgWidth / 2, y, imgWidth, imgHeight);
        y += imgHeight + 10;
      } else {
        // Normal URL - Not ekle
        doc.setFont('helvetica', 'bold');
        doc.text('Gorsel URL:', 14, y);
        doc.setFont('helvetica', 'normal');
        const urlLines = doc.splitTextToSize(order.imageUrl.substring(0, 60) + '...', pageWidth - 28);
        doc.text(urlLines, 55, y);
        y += urlLines.length * 6 + 5;
      }
    } catch (error) {
      // Görsel yüklenemezse devam et
      console.error('PDF görsel hatası:', error);
    }
  }
  
  y += 5;
  
  // Ürün Bilgisi - Boyut ve Çerçeve
  doc.setFont('helvetica', 'bold');
  doc.text('Urun:', 14, y);
  doc.setFont('helvetica', 'normal');
  
  if (order.items && order.items.length > 0) {
    const productInfo = order.items.map(item => {
      const size = fixTurkishChars(item.canvasSize?.name || '-');
      const frame = fixTurkishChars(item.frameOption?.name || 'Cercevesiz');
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
    const addressLines = doc.splitTextToSize(fixTurkishChars(order.shippingAddress), pageWidth - 28);
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
    const noteLines = doc.splitTextToSize(fixTurkishChars(order.notes), pageWidth - 28);
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
  
  // Tablo - Görsel kolonu eklendi
  autoTable(doc, {
    startY: 30,
    head: [[
      'Gorsel',
      'Siparis No',
      'Magaza',
      'Musteri',
      'Urun (Boyut - Cerceve)',
      'Adres',
      'Tarih',
    ]],
    body: orders.map(order => {
      // Ürün bilgisi - Türkçe karakterleri düzelt
      let productInfo = '-';
      if (order.items && order.items.length > 0) {
        productInfo = order.items.map(item => {
          const size = fixTurkishChars(item.canvasSize?.name || '-');
          const frame = fixTurkishChars(item.frameOption?.name || 'Cercevesiz');
          return `${size} - ${frame} (x${item.quantity})`;
        }).join('\n');
      }
      
      // Görsel durumu
      let imageStatus = 'Yok';
      if (order.imageUrl) {
        if (order.imageUrl.startsWith('data:')) {
          imageStatus = 'Var (Yuklenen)';
        } else {
          imageStatus = 'Var (URL)';
        }
      }
      
      return [
        imageStatus,
        order.orderNumber,
        fixTurkishChars(order.store?.name || '-'),
        fixTurkishChars(order.customerName),
        productInfo,
        fixTurkishChars(order.shippingAddress || '-'),
        new Date(order.orderDate).toLocaleDateString('tr-TR'),
      ];
    }),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [66, 66, 66], fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 28 },
      2: { cellWidth: 30 },
      3: { cellWidth: 35 },
      4: { cellWidth: 50 },
      5: { cellWidth: 80 },
      6: { cellWidth: 22 },
    },
    didParseCell: function (data: any) {
      // Görsel kolonunda metni gizle (görsel eklenecek)
      if (data.column.index === 0 && data.row.raw[0] === 'Var (Yuklenen)') {
        data.cell.text = [];
      }
    },
    didDrawCell: function (data: any) {
      // İlk kolonda (görsel) ve base64 görsel varsa ekle
      if (data.column.index === 0 && data.row.raw[0] === 'Var (Yuklenen)') {
        const order = orders[data.row.index];
        if (order.imageUrl && order.imageUrl.startsWith('data:image/')) {
          try {
            const imgWidth = 18;
            const imgHeight = 18;
            // Hücre merkezine yerleştir - koordinatları doğru al
            const cellX = data.cell.x;
            const cellY = data.cell.y;
            const cellWidth = data.cell.width;
            const cellHeight = data.cell.height;
            
            // Hücre içinde ortala
            const x = cellX + Math.max(1, (cellWidth - imgWidth) / 2);
            const y = cellY + Math.max(1, (cellHeight - imgHeight) / 2);
            
            let format = 'JPEG';
            if (order.imageUrl.includes('data:image/png')) format = 'PNG';
            else if (order.imageUrl.includes('data:image/jpeg') || order.imageUrl.includes('data:image/jpg')) format = 'JPEG';
            
            // Sayfa sınırlarını kontrol et
            const pageHeight = doc.internal.pageSize.getHeight();
            const pageWidth = doc.internal.pageSize.getWidth();
            
            if (y + imgHeight <= pageHeight && x + imgWidth <= pageWidth && y >= 0 && x >= 0) {
              doc.addImage(order.imageUrl, format, x, y, imgWidth, imgHeight);
            }
          } catch (error) {
            console.error('PDF görsel hatası:', error);
          }
        }
      }
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
