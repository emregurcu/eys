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
  WEBHOOK_URL: 'https://YOUR-VERCEL-URL.vercel.app/api/webhook/etsy-mail',
  
  // Webhook güvenlik anahtarı (.env dosyasındaki ETSY_MAIL_WEBHOOK_SECRET ile aynı olmalı)
  WEBHOOK_SECRET: 'etsy-webhook-change-this-secret',
  
  // Mağaza email adresleri (hangi maillerden sipariş geleceği)
  STORE_EMAILS: [
    'magazaadi1@gmail.com',
    'magazaadi2@gmail.com',
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
  const body = message.getPlainBody();
  const htmlBody = message.getBody();
  const to = message.getTo();
  
  // "You made a sale" kontrolü
  if (!subject.includes('You made a sale') && !subject.includes('sold')) {
    return null;
  }
  
  // Temel bilgileri çıkar
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
    items: extractItems(body),
    productTitle: extractProductTitle(body),
    dimensions: extractDimensions(body),
    frameOption: extractFrameOption(body),
    quantity: extractQuantity(body),
    shopName: extractShopName(body),
    transactionId: extractTransactionId(body),
    discount: extractDiscount(body),
    shippingCost: extractShippingCost(body),
    salesTax: extractSalesTax(body),
    etsyOrderUrl: extractEtsyOrderUrl(body, htmlBody),
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
  // "Shipping address" altındaki isim
  const patterns = [
    /Shipping address\s*\n([A-Za-z\s\-\.]+)\n/i,
    /Ship to[:\s]*\n?([A-Za-z\s\-\.]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      const name = match[1].trim();
      // Eğer adres gibi görünüyorsa atla
      if (!name.match(/^\d/) && name.length > 2) {
        return name;
      }
    }
  }
  
  return 'Unknown Customer';
}


/**
 * Teslimat adresini çıkar - Tam adres bloğu
 */
function extractShippingAddress(body) {
  // Shipping address bloğunu bul
  const match = body.match(/Shipping address\s*\n([\s\S]*?)(?=\n\n|USPS|Learn more|Shipping internationally)/i);
  
  if (match) {
    const addressLines = match[1].trim().split('\n').filter(line => line.trim());
    return addressLines.join(', ');
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
  // "Order details" veya "Sell with confidence" öncesindeki ürün adı
  // Örnek: "Colorful Cactus Canvas Print | Modern Southwestern Landscape Art"
  const patterns = [
    /Sell with confidence[\s\S]*?Learn about[\s\S]*?\.\s*\n([^\n]+Canvas[^\n]+)/i,
    /Order details\s*\n[\s\S]*?\n([^\n]*(?:Canvas|Print|Art|Poster|Wall)[^\n]*)/i,
  ];
  
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Alternatif: DIMENSIONS'dan önce gelen satır
  const dimMatch = body.match(/([^\n]+)\nDIMENSIONS:/i);
  if (dimMatch) {
    return dimMatch[1].trim();
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
    return match[1].trim();
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
  const match = body.match(/Shop[:\s]*([^\n]+)/i);
  if (match) {
    return match[1].trim();
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
 * Ürünleri çıkar (gelişmiş)
 */
function extractItems(body) {
  const items = [];
  
  const productTitle = extractProductTitle(body);
  const dimensions = extractDimensions(body);
  const frameOption = extractFrameOption(body);
  const quantity = extractQuantity(body);
  const price = extractItemPrice(body);
  
  if (productTitle || dimensions) {
    items.push({
      title: productTitle || 'Canvas Print',
      dimensions: dimensions,
      frameOption: frameOption,
      quantity: quantity,
      price: price,
    });
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
    storeEmail: 'test@gmail.com',
    orderNumber: 'TEST' + Date.now(),
    customerName: 'Test Customer',
    totalPrice: 49.99,
    currency: 'USD',
    orderDate: new Date().toISOString(),
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
}
