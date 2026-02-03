/**
 * ETSY SİPARİŞ MAİL WEBHOOK - Google Apps Script
 * 
 * KURULUM:
 * 1. https://script.google.com adresine gidin
 * 2. Yeni proje oluşturun
 * 3. Bu kodu yapıştırın
 * 4. CONFIG bölümündeki değerleri doldurun
 * 5. Kaydedin ve "processEtsyEmails" fonksiyonunu çalıştırın (ilk seferde izin isteyecek)
 * 6. Tetikleyici ekleyin: Düzenle > Tetikleyiciler > Tetikleyici ekle
 *    - Çalıştırılacak fonksiyon: processEtsyEmails
 *    - Olay kaynağı: Zamana dayalı
 *    - Zamana dayalı tetikleyici türü: Dakika zamanlayıcısı
 *    - Dakika aralığı: Her 5 dakikada bir
 */

// ============ CONFIG - BU DEĞERLERİ DEĞİŞTİRİN ============
const CONFIG = {
  // Sisteminizin webhook URL'i
  // ⚠️ UYARI: Domain'inizi kontrol edin!
  WEBHOOK_URL: 'https://www.dmtedarik.com/api/webhook/etsy-mail',
  
  // Webhook güvenlik anahtarı (.env dosyasındaki ETSY_MAIL_WEBHOOK_SECRET ile aynı olmalı)
  // ⚠️ UYARI: Bu değeri .env dosyanızdaki ETSY_MAIL_WEBHOOK_SECRET ile eşleştirin!
  WEBHOOK_SECRET: 'p1WdFb81WfPb',
  
  // Mağaza email adresleri (hangi maillerden sipariş geleceği)
  // ⚠️ UYARI: Kendi mağaza email adreslerinizi ekleyin!
  STORE_EMAILS: [
    'elmasgurcu59@gmail.com',
  ],
  
  // Kaç dakika geriye bakılacak (varsayılan 10 dakika)
  MINUTES_TO_CHECK: 10,
};
// ============ CONFIG SONU ============


/**
 * Ana fonksiyon - Tetikleyici tarafından çalıştırılır
 */
function processEtsyEmails() {
  const now = new Date();
  const minutesAgo = new Date(now.getTime() - CONFIG.MINUTES_TO_CHECK * 60 * 1000);
  
  // Etsy'den gelen yeni siparişleri ara
  const searchQuery = `from:transaction@etsy.com subject:"You made a sale" after:${formatDateForGmail(minutesAgo)}`;
  
  const threads = GmailApp.search(searchQuery, 0, 20);
  
  Logger.log(`Found ${threads.length} Etsy sale emails`);
  
  for (const thread of threads) {
    const messages = thread.getMessages();
    
    for (const message of messages) {
      // Zaten işlenmiş mi kontrol et
      if (message.isStarred()) {
        continue;
      }
      
      try {
        const orderData = parseEtsyEmail(message);
        
        if (orderData) {
          const result = sendToWebhook(orderData);
          
          if (result.success) {
            // İşlendiğini işaretle
            message.star();
            Logger.log(`Processed order: ${orderData.orderNumber}`);
          } else {
            Logger.log(`Failed to send webhook: ${result.error}`);
          }
        }
      } catch (error) {
        Logger.log(`Error processing email: ${error.message}`);
      }
    }
  }
}


/**
 * Etsy emailini parse et
 */
function parseEtsyEmail(message) {
  const subject = message.getSubject();
  let body = message.getPlainBody();
  const htmlBody = message.getBody();
  const to = message.getTo();
  
  // "You made a sale" kontrolü
  if (!subject.includes('You made a sale') && !subject.includes('sold')) {
    return null;
  }
  
  // HTML entities temizle
  body = cleanHtmlEntities(body);
  
  // Temel bilgileri çıkar
  const productTitle = extractProductTitle(body);
  
  // HTML'den ürün görsellerini ve linklerini çıkar
  const productImages = extractProductImagesFromHtml(htmlBody);
  
  const orderData = {
    secret: CONFIG.WEBHOOK_SECRET,
    storeEmail: extractStoreEmail(to),
    orderNumber: extractOrderNumber(body, subject),
    customerName: extractCustomerName(body),
    shippingAddress: extractShippingAddress(body),
    shippingCountry: extractCountry(body),
    totalPrice: extractOrderTotal(body, subject),
    itemPrice: extractItemPrice(body),
    currency: 'USD',
    orderDate: message.getDate().toISOString(),
    items: extractItems(body, htmlBody),
    productTitle: productTitle ? productTitle.replace(/^Item[:\s]*/i, '').trim().replace(/\s+/g, ' ') : null,
    dimensions: extractDimensions(body),
    frameOption: extractFrameOption(body),
    quantity: extractQuantity(body),
    shopName: extractShopName(body),
    transactionId: extractTransactionId(body),
    discount: extractDiscount(body),
    shippingCost: extractShippingCost(body),
    salesTax: extractSalesTax(body),
    etsyOrderUrl: extractEtsyOrderUrl(body, htmlBody),
    productImages: productImages,
    rawSubject: subject,
  };
  
  // Sipariş numarası zorunlu
  if (!orderData.orderNumber) {
    Logger.log('Could not extract order number');
    return null;
  }
  
  return orderData;
}


/**
 * HTML entities temizle
 */
function cleanHtmlEntities(text) {
  if (!text) return text;
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}


/**
 * Sipariş numarasını çıkar
 */
function extractOrderNumber(body, subject) {
  // Subject'ten: [$66.97, Order #3951008900]
  const subjectMatch = subject.match(/Order\s*#?(\d{9,12})/i);
  if (subjectMatch) {
    return subjectMatch[1];
  }
  
  // Body'den: Your order number is 3951008900
  const bodyMatch = body.match(/order number is[:\s]*(\d{9,12})/i);
  if (bodyMatch) {
    return bodyMatch[1];
  }
  
  // Genel pattern
  const patterns = [
    /Order\s*#?\s*(\d{9,12})/i,
    /Receipt\s*#?\s*(\d{9,12})/i,
    /#(\d{9,12})/,
  ];
  
  for (const pattern of patterns) {
    const match = body.match(pattern) || subject.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}


/**
 * Müşteri adını çıkar - Shipping address altındaki ilk satır
 */
function extractCustomerName(body) {
  // HTML span'dan isim çıkar: <span class='name'>Julie Mortensen</span>
  const htmlNameMatch = body.match(/<span class=['"]name['"]>([^<]+)<\/span>/i);
  if (htmlNameMatch) {
    return htmlNameMatch[1].trim();
  }
  
  // "Shipping address" altındaki isim - çeşitli formatlar
  const patterns = [
    /Shipping address\s*\n([A-Za-z][A-Za-z\s\-\.]+)/i,
    /Ship to[:\s]*\n?([A-Za-z][A-Za-z\s\-\.]+)/i,
    /Ship by[^\n]*\n[\s\S]*?([A-Z][a-z]+\s+[A-Z][a-z]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      const name = match[1].trim();
      // Eğer adres gibi görünüyorsa atla, en az iki kelime olmalı
      if (!name.match(/^\d/) && name.length > 3 && name.includes(' ')) {
        return name;
      }
    }
  }
  
  // PDF formatından: İsim genellikle adres bloğunun başında
  const addressBlock = body.match(/Shipping address[\s\S]*?United States/i);
  if (addressBlock) {
    const lines = addressBlock[0].split('\n').filter(l => l.trim());
    for (const line of lines) {
      const trimmed = line.trim();
      // İsim gibi görünen satır: sadece harfler ve boşluk, en az 2 kelime
      if (/^[A-Za-z][A-Za-z\s\-\.]+$/.test(trimmed) && trimmed.includes(' ') && trimmed.length > 3) {
        if (!trimmed.toLowerCase().includes('shipping') && !trimmed.toLowerCase().includes('address')) {
          return trimmed;
        }
      }
    }
  }
  
  return 'Unknown Customer';
}


/**
 * Teslimat adresini çıkar - Tam adres bloğu
 */
function extractShippingAddress(body) {
  // HTML span'lardan adres çıkar
  const name = body.match(/<span class=['"]name['"]>([^<]+)<\/span>/i);
  const firstLine = body.match(/<span class=['"]first-line['"]>([^<]+)<\/span>/i);
  const city = body.match(/<span class=['"]city['"]>([^<]+)<\/span>/i);
  const state = body.match(/<span class=['"]state['"]>([^<]+)<\/span>/i);
  const zip = body.match(/<span class=['"]zip['"]>([^<]+)<\/span>/i);
  const country = body.match(/<span class=['"]country-name['"]>([^<]+)<\/span>/i);
  
  if (firstLine || city) {
    const parts = [];
    if (name) parts.push(name[1].trim());
    if (firstLine) parts.push(firstLine[1].trim());
    if (city && state && zip) {
      parts.push(`${city[1].trim()}, ${state[1].trim()} ${zip[1].trim()}`);
    } else if (city) {
      parts.push(city[1].trim());
    }
    if (country) parts.push(country[1].trim());
    
    if (parts.length > 0) {
      return parts.join(', ');
    }
  }
  
  // Shipping address bloğunu bul - farklı formatlar
  const patterns = [
    /Shipping address\s*\n([\s\S]*?)(?=\n\n|USPS|Learn more|Shipping internationally)/i,
    /Shipping address\s*([\s\S]*?)(?=USPS|Learn more|Shipping internationally|Payment method)/i,
  ];
  
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      const addressLines = match[1].trim().split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed && !trimmed.toLowerCase().includes('shipping address') && !trimmed.includes('<');
      });
      if (addressLines.length > 0) {
        return addressLines.join(', ');
      }
    }
  }
  
  // PDF formatından adres çıkarma
  const pdfMatch = body.match(/Shipping address[\s\S]*?((?:[A-Za-z][A-Za-z\s\-\.]+\n)?[\d]+[^\n]+\n[^\n]+\n[^\n]*(?:United States|USA|UK|Canada|Australia|Germany|France)[^\n]*)/i);
  if (pdfMatch) {
    return pdfMatch[1].trim().replace(/\n+/g, ', ');
  }
  
  return null;
}


/**
 * Ülkeyi çıkar
 */
function extractCountry(body) {
  const countries = [
    'United States', 'USA', 'UK', 'United Kingdom', 'Canada', 'Australia',
    'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Japan',
    'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark',
    'Finland', 'Ireland', 'Portugal', 'Greece', 'Poland', 'Czech Republic',
    'New Zealand', 'Mexico', 'Brazil', 'Argentina', 'Singapore', 'Hong Kong',
    'South Korea', 'Taiwan', 'Israel', 'United Arab Emirates', 'Turkey'
  ];
  
  // Shipping address bloğunda ülkeyi ara
  const addressMatch = body.match(/Shipping address\s*\n([\s\S]*?)(?=\n\n|USPS|Learn more)/i);
  if (addressMatch) {
    const addressBlock = addressMatch[1];
    for (const country of countries) {
      if (addressBlock.includes(country)) {
        return country;
      }
    }
  }
  
  // Genel arama
  for (const country of countries) {
    if (body.includes(country)) {
      return country;
    }
  }
  
  return null;
}


/**
 * Order Total fiyatı çıkar (indirim sonrası gerçek ödenen)
 */
function extractOrderTotal(body, subject) {
  // Subject'ten: [$66.97, Order #...]
  const subjectMatch = subject.match(/\[\$(\d+(?:\.\d{2})?)/);
  if (subjectMatch) {
    return parseFloat(subjectMatch[1]);
  }
  
  // Body'den: Order total: $66.97
  const orderTotalMatch = body.match(/Order total[:\s]*\$(\d+(?:\.\d{2})?)/i);
  if (orderTotalMatch) {
    return parseFloat(orderTotalMatch[1]);
  }
  
  return 0;
}


/**
 * Item fiyatını çıkar (indirim öncesi)
 */
function extractItemPrice(body) {
  // Item total: $140.00 veya Price: $140.00
  const patterns = [
    /Item total[:\s]*\$(\d+(?:\.\d{2})?)/i,
    /Price[:\s]*\$(\d+(?:\.\d{2})?)/i,
  ];
  
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  
  return 0;
}


/**
 * Ürün başlığını çıkar
 */
function extractProductTitle(body) {
  // DIMENSIONS'dan önce gelen satır - en güvenilir yöntem
  const dimMatch = body.match(/([^\n]+)\nDIMENSIONS:/i);
  if (dimMatch) {
    let title = dimMatch[1].trim();
    // "Item:" prefix'i temizle
    title = title.replace(/^Item[:\s]*/i, '').trim();
    // Birden fazla boşluğu tek boşluğa çevir
    title = title.replace(/\s+/g, ' ');
    if (title.length > 5) {
      return title;
    }
  }
  
  // "Order details" veya "Sell with confidence" sonrasındaki ürün adı
  const patterns = [
    /Sell with confidence[\s\S]*?Learn about[\s\S]*?\.\s*\n([^\n]+(?:Canvas|Print|Art|Poster|Wall)[^\n]+)/i,
    /Order details\s*\n[\s\S]*?\n([^\n]*(?:Canvas|Print|Art|Poster|Wall)[^\n]*)/i,
  ];
  
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      let title = match[1].trim();
      title = title.replace(/^Item[:\s]*/i, '').trim();
      title = title.replace(/\s+/g, ' ');
      return title;
    }
  }
  
  return null;
}


/**
 * Boyut bilgisini çıkar
 */
function extractDimensions(body) {
  // DIMENSIONS: 16"x24" – 40x60cm
  const match = body.match(/DIMENSIONS[:\s]*([^\n]+)/i);
  if (match) {
    // HTML entities temizle
    let dim = match[1].trim();
    dim = dim.replace(/&quot;/g, '"');
    dim = dim.replace(/&amp;/g, '&');
    dim = dim.replace(/&#39;/g, "'");
    dim = dim.replace(/&lt;/g, '<');
    dim = dim.replace(/&gt;/g, '>');
    return dim;
  }
  return null;
}


/**
 * Çerçeve seçeneğini çıkar
 */
function extractFrameOption(body) {
  // FRAMED OPTIONS: STRETCHED CANVAS
  const match = body.match(/FRAMED?\s*OPTIONS?[:\s]*([^\n]+)/i);
  if (match) {
    return match[1].trim();
  }
  return null;
}


/**
 * Miktarı çıkar
 */
function extractQuantity(body) {
  // Quantity: 1
  const match = body.match(/Quantity[:\s]*(\d+)/i);
  if (match) {
    return parseInt(match[1]);
  }
  
  // Subject'ten: sale of X item
  const saleMatch = body.match(/sale of (\d+) item/i);
  if (saleMatch) {
    return parseInt(saleMatch[1]);
  }
  
  return 1;
}


/**
 * Mağaza adını çıkar
 */
function extractShopName(body) {
  // Shop: StarCanvasArtStore
  const match = body.match(/Shop[:\s]*([A-Za-z0-9_\-]+)/i);
  if (match) {
    const shopName = match[1].trim();
    // "Shipping" gibi yanlış eşleşmeleri atla
    if (!shopName.toLowerCase().includes('ship') && shopName.length > 2) {
      return shopName;
    }
  }
  return null;
}


/**
 * Transaction ID'yi çıkar
 */
function extractTransactionId(body) {
  // Transaction ID: 4927920834
  const match = body.match(/Transaction ID[:\s]*(\d+)/i);
  if (match) {
    return match[1];
  }
  return null;
}


/**
 * İndirim tutarını çıkar
 */
function extractDiscount(body) {
  // Discount: - $77.00
  const match = body.match(/Discount[:\s]*-?\s*\$(\d+(?:\.\d{2})?)/i);
  if (match) {
    return parseFloat(match[1]);
  }
  return 0;
}


/**
 * Kargo ücretini çıkar
 */
function extractShippingCost(body) {
  // Shipping: $0.00
  const match = body.match(/Shipping[:\s]*\$(\d+(?:\.\d{2})?)/i);
  if (match) {
    return parseFloat(match[1]);
  }
  return 0;
}


/**
 * Vergi tutarını çıkar
 */
function extractSalesTax(body) {
  // Sales tax: $3.97
  const match = body.match(/Sales tax[:\s]*\$(\d+(?:\.\d{2})?)/i);
  if (match) {
    return parseFloat(match[1]);
  }
  return 0;
}


/**
 * Etsy sipariş URL'sini çıkar
 */
function extractEtsyOrderUrl(body, htmlBody) {
  // View the invoice: http://www.etsy.com/your/orders/3951008900
  const match = body.match(/View the invoice[:\s]*(https?:\/\/[^\s\n]+)/i);
  if (match) {
    return match[1].trim();
  }
  
  // HTML'den
  const htmlMatch = htmlBody.match(/href="(https?:\/\/www\.etsy\.com\/your\/orders\/\d+)"/i);
  if (htmlMatch) {
    return htmlMatch[1];
  }
  
  return null;
}


/**
 * HTML'den ürün görsellerini ve transaction linklerini çıkar
 */
function extractProductImagesFromHtml(htmlBody) {
  const products = [];
  
  // Transaction link ve görsel pattern'ı:
  // <a href="https://www.etsy.com/transaction/4952067573?...">
  //   <img src="https://i.etsystatic.com/.../il_75x75.6550481224_drpi.jpg" />
  // </a>
  
  // Tüm transaction bloklarını bul
  const transactionRegex = /<a\s+href="(https?:\/\/www\.etsy\.com\/transaction\/(\d+)[^"]*)"[^>]*>\s*<img\s+src="(https?:\/\/i\.etsystatic\.com\/[^"]+)"/gi;
  
  let match;
  while ((match = transactionRegex.exec(htmlBody)) !== null) {
    const transactionUrl = match[1];
    const transactionId = match[2];
    let imageUrl = match[3];
    
    // Küçük resmi büyük resme çevir (il_75x75 -> il_570xN veya il_1588xN)
    // Örnek: il_75x75.6550481224_drpi.jpg -> il_570xN.6550481224_drpi.jpg
    const largeImageUrl = imageUrl.replace(/il_\d+x\d+\./, 'il_570xN.');
    const extraLargeImageUrl = imageUrl.replace(/il_\d+x\d+\./, 'il_1588xN.');
    
    products.push({
      transactionId: transactionId,
      transactionUrl: cleanTrackingParams(transactionUrl),
      imageUrlSmall: imageUrl,
      imageUrl: largeImageUrl,
      imageUrlLarge: extraLargeImageUrl,
    });
  }
  
  return products;
}


/**
 * URL'den tracking parametrelerini temizle
 */
function cleanTrackingParams(url) {
  try {
    const urlObj = new URL(url);
    // Sadece temel URL'i döndür (campaign, utm vs parametreleri kaldır)
    return urlObj.origin + urlObj.pathname;
  } catch (e) {
    return url;
  }
}


/**
 * Ürünleri çıkar (gelişmiş) - BİRDEN FAZLA ÜRÜN DESTEĞİ + GÖRSEL LİNKLERİ
 */
function extractItems(body, htmlBody) {
  const items = [];
  
  // HTML'den görsel bilgilerini al
  const productImages = extractProductImagesFromHtml(htmlBody || '');
  
  // Her ürün bloğu genellikle Transaction ID ile ayrılır
  // veya DIMENSIONS/FRAMED OPTIONS pattern'ı tekrar eder
  
  // Tüm ürün bloklarını bul - Transaction ID ile ayır
  const transactionMatches = body.match(/Transaction ID[:\s]*(\d+)/gi);
  
  if (transactionMatches && transactionMatches.length > 1) {
    // Birden fazla ürün var - her birini ayrı parse et
    const blocks = body.split(/(?=Transaction ID[:\s]*\d+)/i);
    
    for (const block of blocks) {
      if (!block.trim()) continue;
      
      // Bu bloktan ürün bilgilerini çıkar
      const transMatch = block.match(/Transaction ID[:\s]*(\d+)/i);
      if (!transMatch) continue;
      
      const transactionId = transMatch[1];
      
      // Ürün başlığını bul - DIMENSIONS'dan önce gelen metin
      let title = null;
      const titleMatch = block.match(/([^\n]+)\nDIMENSIONS:/i);
      if (titleMatch) {
        title = titleMatch[1].trim().replace(/^Item[:\s]*/i, '').replace(/\s+/g, ' ');
      }
      
      // Boyut
      const dimMatch = block.match(/DIMENSIONS[:\s]*([^\n]+)/i);
      const dimensions = dimMatch ? dimMatch[1].trim().replace(/&quot;/g, '"') : null;
      
      // Çerçeve
      const frameMatch = block.match(/FRAMED?\s*OPTIONS?[:\s]*([^\n]+)/i);
      const frameOption = frameMatch ? frameMatch[1].trim() : null;
      
      // Miktar
      const qtyMatch = block.match(/Quantity[:\s]*(\d+)/i);
      const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;
      
      // Fiyat
      const priceMatch = block.match(/Price[:\s]*\$(\d+(?:\.\d{2})?)/i);
      const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
      
      // Bu transaction için görsel bilgisini bul
      const imageInfo = productImages.find(p => p.transactionId === transactionId);
      
      if (title || dimensions) {
        items.push({
          title: title || 'Canvas Print',
          dimensions: dimensions,
          frameOption: frameOption,
          quantity: quantity,
          price: price,
          transactionId: transactionId,
          transactionUrl: imageInfo ? imageInfo.transactionUrl : null,
          imageUrl: imageInfo ? imageInfo.imageUrl : null,
          imageUrlLarge: imageInfo ? imageInfo.imageUrlLarge : null,
        });
      }
    }
  }
  
  // Eğer Transaction ID bazlı ayırma çalışmadıysa veya tek ürün varsa
  if (items.length === 0) {
    // DIMENSIONS pattern'ı ile birden fazla ürün kontrolü
    const dimensionsMatches = [...body.matchAll(/DIMENSIONS[:\s]*([^\n]+)/gi)];
    
    if (dimensionsMatches.length > 1) {
      // Birden fazla DIMENSIONS var - her biri bir ürün
      for (let i = 0; i < dimensionsMatches.length; i++) {
        const dimMatch = dimensionsMatches[i];
        const dimIndex = dimMatch.index;
        
        // Bu DIMENSIONS'dan önceki metni al (ürün başlığı için)
        const textBefore = body.substring(Math.max(0, dimIndex - 500), dimIndex);
        const lines = textBefore.split('\n').filter(l => l.trim());
        const titleLine = lines[lines.length - 1];
        
        let title = titleLine ? titleLine.trim().replace(/^Item[:\s]*/i, '').replace(/\s+/g, ' ') : null;
        const dimensions = dimMatch[1].trim().replace(/&quot;/g, '"');
        
        // Bu DIMENSIONS'dan sonraki metni al (frame, quantity, price, transactionId için)
        const textAfter = body.substring(dimIndex, dimIndex + 500);
        
        const frameMatch = textAfter.match(/FRAMED?\s*OPTIONS?[:\s]*([^\n]+)/i);
        const frameOption = frameMatch ? frameMatch[1].trim() : null;
        
        const qtyMatch = textAfter.match(/Quantity[:\s]*(\d+)/i);
        const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;
        
        const priceMatch = textAfter.match(/Price[:\s]*\$(\d+(?:\.\d{2})?)/i);
        const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
        
        // Transaction ID'yi bul
        const transMatch = textAfter.match(/Transaction ID[:\s]*(\d+)/i);
        const transactionId = transMatch ? transMatch[1] : null;
        
        // Bu transaction için görsel bilgisini bul
        const imageInfo = transactionId ? productImages.find(p => p.transactionId === transactionId) : (productImages[i] || null);
        
        if (title || dimensions) {
          items.push({
            title: title || 'Canvas Print',
            dimensions: dimensions,
            frameOption: frameOption,
            quantity: quantity,
            price: price,
            transactionId: transactionId,
            transactionUrl: imageInfo ? imageInfo.transactionUrl : null,
            imageUrl: imageInfo ? imageInfo.imageUrl : null,
            imageUrlLarge: imageInfo ? imageInfo.imageUrlLarge : null,
          });
        }
      }
    } else {
      // Tek ürün - mevcut mantık
      let productTitle = extractProductTitle(body);
      const dimensions = extractDimensions(body);
      const frameOption = extractFrameOption(body);
      const quantity = extractQuantity(body);
      const price = extractItemPrice(body);
      const transactionId = extractTransactionId(body);
      
      if (productTitle) {
        productTitle = productTitle.replace(/^Item[:\s]*/i, '').trim().replace(/\s+/g, ' ');
      }
      
      // Bu transaction için görsel bilgisini bul
      const imageInfo = transactionId ? productImages.find(p => p.transactionId === transactionId) : (productImages[0] || null);
      
      if (productTitle || dimensions) {
        items.push({
          title: productTitle || 'Canvas Print',
          dimensions: dimensions,
          frameOption: frameOption,
          quantity: quantity,
          price: price,
          transactionId: transactionId,
          transactionUrl: imageInfo ? imageInfo.transactionUrl : null,
          imageUrl: imageInfo ? imageInfo.imageUrl : null,
          imageUrlLarge: imageInfo ? imageInfo.imageUrlLarge : null,
        });
      }
    }
  }
  
  return items;
}


/**
 * Mağaza emailini belirle
 */
function extractStoreEmail(to) {
  for (const email of CONFIG.STORE_EMAILS) {
    if (to.toLowerCase().includes(email.toLowerCase())) {
      return email;
    }
  }
  return to.split(',')[0].trim();
}


/**
 * Webhook'a gönder
 */
function sendToWebhook(orderData) {
  try {
    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(orderData),
      muteHttpExceptions: true,
    };
    
    const response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();
    
    Logger.log(`Webhook response: ${responseCode} - ${responseBody}`);
    
    if (responseCode >= 200 && responseCode < 300) {
      return { success: true, response: JSON.parse(responseBody) };
    } else {
      return { success: false, error: responseBody };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}


/**
 * Gmail arama için tarih formatla
 */
function formatDateForGmail(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}/${month}/${day}`;
}


/**
 * Test fonksiyonu - Manuel çalıştırma için
 */
function testWebhook() {
  const testData = {
    secret: CONFIG.WEBHOOK_SECRET,
    storeEmail: CONFIG.STORE_EMAILS[0] || 'test@example.com',
    orderNumber: 'TEST' + Date.now(),
    customerName: 'Test Customer',
    shippingAddress: '123 Test Street, Test City, CA 90210, United States',
    shippingCountry: 'United States',
    totalPrice: 49.99,
    currency: 'USD',
    orderDate: new Date().toISOString(),
    dimensions: '40x60cm',
    frameOption: 'Black Frame',
    items: [
      {
        title: 'Test Canvas Print 1',
        dimensions: '40x60cm',
        frameOption: 'Black Frame',
        quantity: 1,
        price: 25.00,
        transactionId: '1234567890',
        transactionUrl: 'https://www.etsy.com/transaction/1234567890',
        imageUrl: 'https://i.etsystatic.com/example/il_570xN.123456789.jpg',
        imageUrlLarge: 'https://i.etsystatic.com/example/il_1588xN.123456789.jpg',
      },
      {
        title: 'Test Canvas Print 2',
        dimensions: '30x40cm',
        frameOption: 'ROLL',
        quantity: 1,
        price: 24.99,
        transactionId: '0987654321',
        transactionUrl: 'https://www.etsy.com/transaction/0987654321',
        imageUrl: 'https://i.etsystatic.com/example/il_570xN.987654321.jpg',
        imageUrlLarge: 'https://i.etsystatic.com/example/il_1588xN.987654321.jpg',
      }
    ],
    productImages: [
      {
        transactionId: '1234567890',
        transactionUrl: 'https://www.etsy.com/transaction/1234567890',
        imageUrl: 'https://i.etsystatic.com/example/il_570xN.123456789.jpg',
      }
    ],
  };
  
  const result = sendToWebhook(testData);
  Logger.log('Test result: ' + JSON.stringify(result));
}


/**
 * Debug fonksiyonu - Son emaili parse et ve göster
 */
function debugLastEmail() {
  const searchQuery = 'from:transaction@etsy.com subject:"You made a sale"';
  const threads = GmailApp.search(searchQuery, 0, 1);
  
  if (threads.length === 0) {
    Logger.log('No emails found');
    return;
  }
  
  const message = threads[0].getMessages()[0];
  const orderData = parseEtsyEmail(message);
  
  Logger.log('=== PARSED ORDER DATA ===');
  Logger.log(JSON.stringify(orderData, null, 2));
  Logger.log('=== ITEMS COUNT: ' + (orderData?.items?.length || 0) + ' ===');
  
  // Görsel bilgilerini ayrıca logla
  if (orderData?.items) {
    Logger.log('=== ITEM IMAGES ===');
    for (const item of orderData.items) {
      Logger.log(`Item: ${item.title}`);
      Logger.log(`  - Dimensions: ${item.dimensions}`);
      Logger.log(`  - Frame: ${item.frameOption}`);
      Logger.log(`  - Transaction URL: ${item.transactionUrl}`);
      Logger.log(`  - Image URL: ${item.imageUrl}`);
    }
  }
}


/**
 * Tüm yıldızları kaldır - Siparişleri tekrar işlemek için
 * ⚠️ DİKKAT: Bu fonksiyon tüm Etsy mail yıldızlarını kaldırır!
 */
function removeAllStars() {
  const searchQuery = 'from:transaction@etsy.com subject:"You made a sale" is:starred';
  const threads = GmailApp.search(searchQuery, 0, 100);
  
  for (const thread of threads) {
    const messages = thread.getMessages();
    for (const message of messages) {
      message.unstar();
    }
  }
  
  Logger.log(`Removed stars from ${threads.length} threads`);
}
