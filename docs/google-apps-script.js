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
    customerEmail: extractCustomerEmail(body),
    shippingAddress: extractShippingAddress(body),
    shippingCountry: extractCountry(body),
    totalPrice: extractPrice(body, subject),
    currency: 'USD',
    orderDate: message.getDate().toISOString(),
    items: extractItems(body),
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
  // Etsy sipariş numarası genellikle #1234567890 formatında
  const patterns = [
    /Order\s*#?\s*(\d{9,12})/i,
    /Receipt\s*#?\s*(\d{9,12})/i,
    /#(\d{9,12})/,
    /(\d{10,12})/,
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
 * Müşteri adını çıkar
 */
function extractCustomerName(body) {
  const patterns = [
    /Ship to[:\s]+([A-Za-z\s]+?)(?:\n|,)/i,
    /Buyer[:\s]+([A-Za-z\s]+?)(?:\n|,)/i,
    /sold to[:\s]+([A-Za-z\s]+?)(?:\n|,)/i,
  ];
  
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return 'Unknown Customer';
}


/**
 * Müşteri emailini çıkar
 */
function extractCustomerEmail(body) {
  const emailPattern = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
  const match = body.match(emailPattern);
  return match ? match[1] : null;
}


/**
 * Teslimat adresini çıkar
 */
function extractShippingAddress(body) {
  const patterns = [
    /Ship to[:\s]+([\s\S]*?)(?=\n\n|\nItem|$)/i,
    /Shipping address[:\s]+([\s\S]*?)(?=\n\n|\nItem|$)/i,
  ];
  
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      return match[1].trim().replace(/\n+/g, ', ');
    }
  }
  
  return null;
}


/**
 * Ülkeyi çıkar
 */
function extractCountry(body) {
  const countries = ['United States', 'USA', 'UK', 'United Kingdom', 'Canada', 'Australia', 
                     'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Japan'];
  
  for (const country of countries) {
    if (body.includes(country)) {
      return country;
    }
  }
  
  return null;
}


/**
 * Fiyatı çıkar
 */
function extractPrice(body, subject) {
  const patterns = [
    /\$\s*(\d+(?:\.\d{2})?)/,
    /USD\s*(\d+(?:\.\d{2})?)/,
    /Total[:\s]+\$?(\d+(?:\.\d{2})?)/i,
  ];
  
  const text = body + ' ' + subject;
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  
  return 0;
}


/**
 * Ürünleri çıkar
 */
function extractItems(body) {
  const items = [];
  
  // Basit item pattern
  const itemPattern = /(\d+)\s*x\s*(.+?)(?:\n|$)/gi;
  let match;
  
  while ((match = itemPattern.exec(body)) !== null) {
    items.push({
      quantity: parseInt(match[1]),
      title: match[2].trim(),
      price: 0,
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
