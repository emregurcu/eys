/**
 * Etsy Mail Webhook Eşleştirme Testi
 * 
 * Kullanım:
 *   node scripts/test-webhook-matching.js
 * 
 * Bu script:
 * 1. Sistemdeki boyut ve çerçeve seçeneklerini listeler
 * 2. Test webhook isteği gönderir
 * 3. Eşleştirme sonucunu gösterir
 */

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhook/etsy-mail';
const WEBHOOK_SECRET = process.env.ETSY_MAIL_WEBHOOK_SECRET || 'etsy-webhook-change-this-secret';

// Test verileri - Etsy mail'inden gelebilecek farklı formatlar
const testCases = [
  {
    name: 'Test 1: Standart format',
    data: {
      secret: WEBHOOK_SECRET,
      storeEmail: 'test@example.com',
      orderNumber: 'TEST-' + Date.now(),
      customerName: 'Test Customer',
      totalPrice: 49.99,
      dimensions: '20x30 cm',
      frameOption: 'Black Frame',
      productTitle: 'Custom Canvas Print',
      shippingCountry: 'United States',
    }
  },
  {
    name: 'Test 2: Farklı boyut formatı',
    data: {
      secret: WEBHOOK_SECRET,
      storeEmail: 'test@example.com',
      orderNumber: 'TEST-' + (Date.now() + 1),
      customerName: 'Test Customer 2',
      totalPrice: 59.99,
      dimensions: '30 x 40',
      frameOption: 'White',
      productTitle: 'Wall Art Canvas',
    }
  },
  {
    name: 'Test 3: Çerçevesiz',
    data: {
      secret: WEBHOOK_SECRET,
      storeEmail: 'test@example.com',
      orderNumber: 'TEST-' + (Date.now() + 2),
      customerName: 'Test Customer 3',
      totalPrice: 39.99,
      dimensions: '40x50cm',
      frameOption: 'No Frame',
      productTitle: 'Rolled Canvas Print',
    }
  },
  {
    name: 'Test 4: Türkçe çerçeve',
    data: {
      secret: WEBHOOK_SECRET,
      storeEmail: 'test@example.com',
      orderNumber: 'TEST-' + (Date.now() + 3),
      customerName: 'Test Customer 4',
      totalPrice: 69.99,
      dimensions: '50x70',
      frameOption: 'Siyah Çerçeve',
      productTitle: 'Kanvas Tablo',
    }
  },
];

async function runTests() {
  console.log('='.repeat(60));
  console.log('ETSY WEBHOOK EŞLEŞTİRME TESTİ');
  console.log('='.repeat(60));
  console.log(`\nWebhook URL: ${WEBHOOK_URL}`);
  console.log(`Secret: ${WEBHOOK_SECRET.substring(0, 10)}...`);
  console.log('\n');

  // Dry run - sadece göster, gönderme
  const dryRun = process.argv.includes('--dry-run');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODU - İstekler gönderilmeyecek\n');
    
    for (const test of testCases) {
      console.log('-'.repeat(40));
      console.log(`📋 ${test.name}`);
      console.log(`   Boyut: ${test.data.dimensions}`);
      console.log(`   Çerçeve: ${test.data.frameOption}`);
      console.log(`   Fiyat: $${test.data.totalPrice}`);
      console.log();
    }
    
    console.log('\n💡 Gerçek test için --dry-run parametresini kaldırın:');
    console.log('   node scripts/test-webhook-matching.js\n');
    return;
  }

  // Gerçek test - tek bir istek gönder
  console.log('🚀 Test isteği gönderiliyor...\n');
  
  const test = testCases[0]; // İlk testi gönder
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(test.data),
    });

    const result = await response.json();
    
    console.log('-'.repeat(40));
    console.log(`📋 ${test.name}`);
    console.log(`   Gönderilen:`);
    console.log(`   - Boyut: ${test.data.dimensions}`);
    console.log(`   - Çerçeve: ${test.data.frameOption}`);
    console.log(`   - Sipariş No: ${test.data.orderNumber}`);
    console.log();
    console.log(`   Sonuç:`);
    console.log(`   - Status: ${response.status}`);
    console.log(`   - Response:`, JSON.stringify(result, null, 2));
    console.log();
    
    if (result.success) {
      console.log('✅ Test başarılı! Siparişi dashboard\'da kontrol edin.');
      console.log(`   Order ID: ${result.orderId}`);
    } else {
      console.log('❌ Test başarısız:', result.error || result.message);
    }
  } catch (error) {
    console.error('❌ Bağlantı hatası:', error.message);
    console.log('\n💡 Sunucu çalışıyor mu? npm run dev');
  }
}

// Önce mevcut boyut/çerçeve bilgilerini göster
console.log(`
╔════════════════════════════════════════════════════════════╗
║  TEST ÖNCESİ KONTROL LİSTESİ                               ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  1. Sunucu çalışıyor olmalı:                               ║
║     npm run dev                                            ║
║                                                            ║
║  2. Dashboard'dan kontrol edin:                            ║
║     - Fiyatlandırma > Boyutlar (örn: 20x30, 30x40...)      ║
║     - Fiyatlandırma > Çerçeveler (örn: Siyah, Beyaz...)    ║
║                                                            ║
║  3. En az bir mağaza tanımlı olmalı                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

runTests();
