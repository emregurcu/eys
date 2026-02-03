export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyNewOrder } from '@/lib/notifications';

// Webhook secret key for security
const WEBHOOK_SECRET = process.env.ETSY_MAIL_WEBHOOK_SECRET || 'etsy-webhook-secret-key';

// Boyut eşleştirme fonksiyonu
async function matchCanvasSize(dimensionStr: string | undefined): Promise<string | null> {
  if (!dimensionStr) return null;

  // Tüm aktif boyutları al
  const canvasSizes = await prisma.canvasSize.findMany({
    where: { isActive: true },
  });

  if (canvasSizes.length === 0) return null;

  const dimLower = dimensionStr.toLowerCase().trim();

  // Boyut string'inden sayıları çıkar (örn: "20x30 cm" -> 20, 30)
  // Farklı formatlar: "20x30", "20 x 30", "20×30", "20*30", "20 by 30"
  const numbers = dimLower.match(/(\d+(?:\.\d+)?)\s*[xX×\*]?\s*(?:by\s+)?(\d+(?:\.\d+)?)/);
  
  if (numbers) {
    const num1 = Math.round(parseFloat(numbers[1]));
    const num2 = Math.round(parseFloat(numbers[2]));

    // İnç ise cm'ye çevir (yaklaşık)
    let width = num1;
    let height = num2;
    
    if (dimLower.includes('inch') || dimLower.includes('"') || dimLower.includes("''")) {
      width = Math.round(num1 * 2.54);
      height = Math.round(num2 * 2.54);
    }

    // Hem width x height hem de height x width olarak ara
    for (const size of canvasSizes) {
      if ((size.width === width && size.height === height) ||
          (size.width === height && size.height === width)) {
        return size.id;
      }
    }

    // Yakın boyut ara (±2 cm tolerans)
    for (const size of canvasSizes) {
      const matchW1 = Math.abs(size.width - width) <= 2 && Math.abs(size.height - height) <= 2;
      const matchW2 = Math.abs(size.width - height) <= 2 && Math.abs(size.height - width) <= 2;
      if (matchW1 || matchW2) {
        return size.id;
      }
    }
  }

  // İsim bazlı eşleştirme (örn: "30x40 cm" ismi direkt aranır)
  for (const size of canvasSizes) {
    const sizeName = size.name.toLowerCase();
    if (dimLower.includes(sizeName) || sizeName.includes(dimLower)) {
      return size.id;
    }
    // Sadece rakamları karşılaştır
    const sizeNumbers = sizeName.match(/\d+/g);
    const dimNumbers = dimLower.match(/\d+/g);
    if (sizeNumbers && dimNumbers && sizeNumbers.length >= 2 && dimNumbers.length >= 2) {
      if ((sizeNumbers[0] === dimNumbers[0] && sizeNumbers[1] === dimNumbers[1]) ||
          (sizeNumbers[0] === dimNumbers[1] && sizeNumbers[1] === dimNumbers[0])) {
        return size.id;
      }
    }
  }

  return null;
}

// Çerçeve eşleştirme fonksiyonu
async function matchFrameOption(frameStr: string | undefined): Promise<string | null> {
  if (!frameStr) return null;

  const frameLower = frameStr.toLowerCase().trim();

  // Tüm çerçeve seçeneklerini al
  const frameOptions = await prisma.frameOption.findMany({
    where: { isActive: true },
  });

  if (frameOptions.length === 0) return null;

  // Eşleştirme kuralları - genişletilmiş
  // ÖNEMLİ: Daha spesifik kurallar önce kontrol edilmeli
  const matchRules: { [key: string]: string[] } = {
    // Çerçevesiz varyasyonları - ROLL dahil
    'none': ['no frame', 'unframed', 'frameless', 'çerçevesiz', 'without frame', 'canvas only', 
             'rolled', 'rolled canvas', 'print only', 'poster', 'unstretched', 'tube', 'roll'],
    // Antik Altın çerçeve - ÖNCE kontrol edilmeli (gold'dan önce)
    'antiqgold': ['antique gold', 'antik gold', 'antik altın', 'antique gold frame', 'vintage gold'],
    // Antik Gümüş çerçeve - ÖNCE kontrol edilmeli (silver'dan önce)
    'antiqsilver': ['antique silver', 'antik silver', 'antik gümüş', 'antique silver frame', 'vintage silver'],
    // Eskitme çerçeve - aged pattern
    'aged': ['aged', 'aged patterned', 'eskitme', 'vintage frame', 'distressed', 'rustic'],
    // Siyah çerçeve
    'black': ['black', 'siyah', 'black frame', 'siyah çerçeve', 'black wood', 'black wooden',
              'noir', 'schwarz', 'nero', 'dark frame', 'ebony'],
    // Beyaz çerçeve
    'white': ['white', 'beyaz', 'white frame', 'beyaz çerçeve', 'white wood', 'white wooden',
              'blanc', 'weiss', 'weiß', 'bianco', 'ivory', 'cream'],
    // Ahşap/Natural çerçeve
    'wood': ['wood', 'wooden', 'natural', 'ahşap', 'natural wood', 'doğal', 'oak',
             'pine', 'timber', 'light wood', 'maple', 'birch', 'bamboo'],
    // Altın çerçeve (sadece "gold" - antique gold hariç)
    'gold': ['gold framed', 'gold frame', 'golden frame', 'altın çerçeve', 'brass frame', 'champagne frame'],
    // Gümüş çerçeve (sadece "silver" - antique silver hariç)
    'silver': ['silver framed', 'silver frame', 'gümüş çerçeve', 'chrome frame', 'metallic frame', 'steel frame'],
    // Kahverengi çerçeve
    'brown': ['brown', 'kahverengi', 'dark wood', 'espresso', 'chocolate', 'mocha', 'walnut'],
    // Floating frame
    'float': ['float', 'floating', 'floating frame', 'yüzen'],
  };

  // Öncelikli kurallar - spesifik olanlar önce kontrol edilmeli
  const priorityOrder = ['none', 'antiqgold', 'antiqsilver', 'aged', 'black', 'white', 'wood', 'gold', 'silver', 'brown', 'float'];

  // Önce kural bazlı eşleşme (öncelik sırasına göre)
  for (const priorityCode of priorityOrder) {
    const rules = matchRules[priorityCode];
    if (!rules) continue;

    for (const rule of rules) {
      if (frameLower.includes(rule)) {
        // Bu kuralla eşleşen frame option'ı bul
        const matchedFrame = frameOptions.find(f => f.code.toLowerCase() === priorityCode);
        if (matchedFrame) {
          return matchedFrame.id;
        }
      }
    }
  }

  // Direkt isim/kod eşleşmesi dene
  for (const frame of frameOptions) {
    const code = frame.code.toLowerCase();
    const name = frame.name.toLowerCase();

    // Tam eşleşme
    if (frameLower === code || frameLower === name) {
      return frame.id;
    }

    // İçerme eşleşmesi
    if (frameLower.includes(name) || name.includes(frameLower)) {
      return frame.id;
    }
  }

  // Hiçbir şey bulunamadıysa, frame options'daki kelimeleri tek tek kontrol et
  for (const frame of frameOptions) {
    const nameWords = frame.name.toLowerCase().split(/\s+/);
    for (const word of nameWords) {
      if (word.length > 3 && frameLower.includes(word)) {
        return frame.id;
      }
    }
  }

  // Eşleşme bulunamadıysa ilk "none/çerçevesiz" olanı veya ilk seçeneği dön
  const defaultFrame = frameOptions.find(f => 
    f.code === 'none' || 
    f.name.toLowerCase().includes('çerçevesiz') ||
    f.name.toLowerCase().includes('canvas')
  );

  return defaultFrame?.id || frameOptions[0]?.id || null;
}

// Ülke eşleştirme fonksiyonu - bölge bazlı
async function matchCountry(countryStr: string | undefined): Promise<string | null> {
  if (!countryStr) return null;

  const countryLower = countryStr.toLowerCase().trim();

  // Tüm ülkeleri al
  const countries = await prisma.country.findMany({
    where: { isActive: true },
  });

  if (countries.length === 0) return null;

  // Öncelikli tam eşleşme kuralları (sıra önemli!)
  // Bu kurallar bölge eşleştirmeden ÖNCE kontrol edilir
  const exactMatchRules: { pattern: string[]; countryNames: string[] }[] = [
    // Amerika - EN ÖNCE kontrol et (united states vs united kingdom karışmasın)
    { 
      pattern: ['united states', 'usa', 'u.s.a', 'u.s.', 'amerika', 'abd', 'american'], 
      countryNames: ['america', 'usa', 'amerika', 'abd', 'united states'] 
    },
    // Kanada
    { 
      pattern: ['canada', 'kanada', 'canadian'], 
      countryNames: ['canada', 'kanada'] 
    },
    // Avustralya
    { 
      pattern: ['australia', 'avustralya', 'australian', 'aussie'], 
      countryNames: ['australia', 'avustralya'] 
    },
    // İngiltere/UK - united kingdom ayrı kontrol
    { 
      pattern: ['united kingdom', 'great britain', 'england', 'uk', 'britain', 'ingiltere', 'birleşik krallık'], 
      countryNames: ['europe', 'europa', 'avrupa', 'eu'] 
    },
  ];

  // Öncelikli eşleşmeleri kontrol et
  for (const rule of exactMatchRules) {
    for (const pattern of rule.pattern) {
      if (countryLower.includes(pattern) || pattern.includes(countryLower)) {
        // Bu pattern ile eşleşti, şimdi uygun ülkeyi bul
        for (const countryName of rule.countryNames) {
          const found = countries.find(c => 
            c.name.toLowerCase().includes(countryName) || 
            c.code.toLowerCase() === countryName
          );
          if (found) return found.id;
        }
      }
    }
  }

  // Direkt isim/kod eşleşmesi
  for (const country of countries) {
    const name = country.name.toLowerCase();
    const code = country.code.toLowerCase();

    if (countryLower === name || countryLower === code) {
      return country.id;
    }
  }

  // Bölge bazlı eşleştirme kuralları (Avrupa ülkeleri için)
  const europeCountries = [
    'germany', 'france', 'italy', 'spain', 'netherlands', 'belgium', 'austria', 
    'switzerland', 'sweden', 'norway', 'denmark', 'finland', 'poland', 'czech',
    'portugal', 'ireland', 'greece', 'hungary', 'romania', 'slovakia', 'slovenia',
    'croatia', 'bulgaria', 'estonia', 'latvia', 'lithuania', 'luxembourg', 'malta',
    'cyprus', 'iceland', 'almanya', 'fransa', 'italya', 'ispanya', 'hollanda', 
    'belçika', 'avusturya', 'isviçre', 'isveç', 'norveç', 'danimarka', 'finlandiya', 
    'polonya', 'çekya', 'portekiz', 'irlanda', 'yunanistan', 'macaristan', 'romanya',
    'avrupa', 'europe', 'eu', 'european'
  ];

  // Avrupa ülkesi mi kontrol et
  for (const euroCountry of europeCountries) {
    if (countryLower.includes(euroCountry)) {
      const europeRecord = countries.find(c => 
        c.name.toLowerCase().includes('europ') || 
        c.name.toLowerCase().includes('avrupa') ||
        c.code.toLowerCase() === 'eu'
      );
      if (europeRecord) return europeRecord.id;
    }
  }

  // Varsayılan olarak Avrupa'yı dön (en yaygın)
  const defaultCountry = countries.find(c => 
    c.name.toLowerCase().includes('europ') || 
    c.name.toLowerCase().includes('avrupa') ||
    c.code.toLowerCase() === 'eu'
  );

  return defaultCountry?.id || countries[0]?.id || null;
}

interface EtsyMailData {
  secret: string;
  storeEmail: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  shippingAddress?: string;
  shippingCountry?: string;
  items?: Array<{
    title: string;
    quantity: number;
    price: number;
    dimensions?: string;
    frameOption?: string;
    transactionId?: string;
    transactionUrl?: string;
    imageUrl?: string;
    imageUrlLarge?: string;
  }>;
  productImages?: Array<{
    transactionId?: string;
    transactionUrl?: string;
    imageUrlSmall?: string;
    imageUrl?: string;
    imageUrlLarge?: string;
  }>;
  totalPrice: number;
  itemPrice?: number;
  currency?: string;
  orderDate?: string;
  productTitle?: string;
  dimensions?: string;
  frameOption?: string;
  quantity?: number;
  shopName?: string;
  transactionId?: string;
  discount?: number;
  shippingCost?: number;
  salesTax?: number;
  etsyOrderUrl?: string;
  rawSubject?: string;
}

export async function POST(req: NextRequest) {
  try {
    const data: EtsyMailData = await req.json();

    // Security check
    if (data.secret !== WEBHOOK_SECRET) {
      console.log('Webhook: Invalid secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Webhook received:', {
      storeEmail: data.storeEmail,
      orderNumber: data.orderNumber,
      customerName: data.customerName,
    });

    // Find store by email (notificationEmail, etsyApiKey veya name ile eşleşme)
    const store = await prisma.store.findFirst({
      where: {
        OR: [
          { notificationEmail: data.storeEmail },
          { etsyApiKey: data.storeEmail },
          { name: { contains: data.storeEmail.split('@')[0] } },
        ],
      },
    });

    if (!store) {
      // If store not found, notify all admins
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true },
      });

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'NEW_ORDER',
            title: 'Yeni Etsy Siparişi (Mail)',
            message: `${data.customerName} - ${data.orderNumber} ($${data.totalPrice})${data.dimensions ? ` - ${data.dimensions}` : ''}`,
            data: {
              source: 'email',
              orderNumber: data.orderNumber,
              customerName: data.customerName,
              totalPrice: data.totalPrice,
              storeEmail: data.storeEmail,
              productTitle: data.productTitle,
              dimensions: data.dimensions,
              frameOption: data.frameOption,
              shippingAddress: data.shippingAddress,
            },
          },
        });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Notification sent to admins (store not found)',
        orderNumber: data.orderNumber,
      });
    }

    // Check if order already exists
    const existingOrder = await prisma.order.findFirst({
      where: {
        storeId: store.id,
        orderNumber: data.orderNumber,
      },
    });

    if (existingOrder) {
      return NextResponse.json({ 
        success: true, 
        message: 'Order already exists',
        orderId: existingOrder.id,
      });
    }

    // Boyut ve çerçeve eşleştirme
    const matchedCanvasSizeId = await matchCanvasSize(data.dimensions);
    const matchedFrameOptionId = await matchFrameOption(data.frameOption);

    console.log('Webhook matching:', {
      dimensions: data.dimensions,
      frameOption: data.frameOption,
      matchedCanvasSizeId,
      matchedFrameOptionId,
    });

    // Ülke eşleştirme (kargo için) - akıllı bölge eşleştirme
    const countryId = await matchCountry(data.shippingCountry);

    // Maliyet hesaplama
    let productCost = 0;
    let shippingCost = 0;
    const quantity = data.quantity || 1;

    if (matchedCanvasSizeId && matchedFrameOptionId) {
      // Varyasyon maliyetini bul
      const variant = await prisma.canvasSizeVariant.findUnique({
        where: {
          canvasSizeId_frameOptionId: {
            canvasSizeId: matchedCanvasSizeId,
            frameOptionId: matchedFrameOptionId,
          },
        },
      });
      if (variant) {
        productCost = variant.totalCost * quantity;
      }

      // Kargo maliyeti
      if (countryId) {
        const shippingRate = await prisma.sizeShippingRate.findUnique({
          where: {
            canvasSizeId_countryId: {
              canvasSizeId: matchedCanvasSizeId,
              countryId: countryId,
            },
          },
        });
        if (shippingRate) {
          shippingCost = shippingRate.shippingCost * quantity;
        }
      }
    } else if (matchedCanvasSizeId) {
      // Sadece boyut varsa base cost kullan
      const canvasSize = await prisma.canvasSize.findUnique({
        where: { id: matchedCanvasSizeId },
      });
      if (canvasSize) {
        productCost = canvasSize.baseCost * quantity;
      }
    }

    // Etsy kesintileri
    const salePrice = data.totalPrice;
    const etsyTransactionFee = (salePrice * store.etsyTransactionFee) / 100;
    const etsyPaymentFee = (salePrice * store.etsyPaymentFee) / 100;
    const etsyListingFee = store.etsyListingFee;
    const etsyFees = etsyTransactionFee + etsyPaymentFee + etsyListingFee;

    const totalCost = productCost + shippingCost + etsyFees;
    const netProfit = salePrice - totalCost;
    const profitMargin = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;

    // Build notes with all available info
    const noteParts = ['Mail ile eklendi.'];
    if (data.productTitle) noteParts.push(`Ürün: ${data.productTitle}`);
    if (data.dimensions) noteParts.push(`Boyut: ${data.dimensions}${matchedCanvasSizeId ? ' ✓' : ' (eşleşmedi)'}`);
    if (data.frameOption) noteParts.push(`Çerçeve: ${data.frameOption}${matchedFrameOptionId ? ' ✓' : ' (eşleşmedi)'}`);
    if (data.shopName) noteParts.push(`Mağaza: ${data.shopName}`);
    if (data.transactionId) noteParts.push(`Transaction: ${data.transactionId}`);
    if (data.itemPrice && data.discount) noteParts.push(`Liste Fiyatı: $${data.itemPrice}, İndirim: $${data.discount}`);
    if (data.shippingCost) noteParts.push(`Kargo: $${data.shippingCost}`);
    if (data.salesTax) noteParts.push(`Vergi: $${data.salesTax}`);
    if (data.etsyOrderUrl) noteParts.push(`Etsy: ${data.etsyOrderUrl}`);

    // Build item notes with dimensions and frame (orijinal değerler)
    const itemNotes: string[] = [];
    if (data.dimensions) itemNotes.push(`Boyut: ${data.dimensions}`);
    if (data.frameOption) itemNotes.push(`Çerçeve: ${data.frameOption}`);
    const itemNotesStr = itemNotes.length > 0 ? itemNotes.join(' | ') : null;

    // Create new order with matched values and calculated costs
    const order = await prisma.order.create({
      data: {
        storeId: store.id,
        countryId: countryId,
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        customerEmail: data.customerEmail || null,
        shippingAddress: data.shippingAddress || null,
        shippingCountry: data.shippingCountry || null,
        salePrice: salePrice,
        saleCurrency: data.currency || 'USD',
        productCost: productCost,
        shippingCost: shippingCost,
        etsyFees: etsyFees,
        totalCost: totalCost,
        netProfit: netProfit,
        profitMargin: profitMargin,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        notes: noteParts.join('\n'),
        // Görsel URL'sini al: önce items[0].imageUrl, yoksa productImages[0].imageUrl, yoksa etsyOrderUrl
        imageUrl: (data.items?.[0]?.imageUrl) || (data.productImages?.[0]?.imageUrl) || data.etsyOrderUrl || null,
        items: data.items && data.items.length > 0 ? {
          create: await Promise.all(data.items.map(async (item) => {
            // Her item için ayrı eşleştirme
            const itemCanvasSizeId = await matchCanvasSize(item.dimensions || data.dimensions);
            const itemFrameOptionId = await matchFrameOption(item.frameOption || data.frameOption);
            
            let itemCost = 0;
            if (itemCanvasSizeId && itemFrameOptionId) {
              const variant = await prisma.canvasSizeVariant.findUnique({
                where: {
                  canvasSizeId_frameOptionId: {
                    canvasSizeId: itemCanvasSizeId,
                    frameOptionId: itemFrameOptionId,
                  },
                },
              });
              itemCost = variant?.totalCost || 0;
            }

            return {
              canvasSizeId: itemCanvasSizeId,
              frameOptionId: itemFrameOptionId,
              title: item.title || data.productTitle || 'Canvas Print',
              quantity: item.quantity || data.quantity || 1,
              salePrice: item.price || data.itemPrice || data.totalPrice,
              canvasCost: itemCost,
              totalCost: itemCost * (item.quantity || 1),
              notes: `${item.dimensions || data.dimensions || ''} | ${item.frameOption || data.frameOption || ''}`.trim() || null,
            };
          })),
        } : {
          create: [{
            canvasSizeId: matchedCanvasSizeId,
            frameOptionId: matchedFrameOptionId,
            title: data.productTitle || 'Canvas Print',
            quantity: data.quantity || 1,
            salePrice: data.itemPrice || data.totalPrice,
            canvasCost: productCost / quantity,
            totalCost: productCost,
            notes: itemNotesStr,
          }],
        },
      },
      include: {
        store: { select: { name: true } },
        items: {
          include: {
            canvasSize: true,
            frameOption: true,
          },
        },
      },
    });

    await notifyNewOrder(order);

    return NextResponse.json({ 
      success: true, 
      message: 'Order created',
      orderId: order.id,
      orderNumber: order.orderNumber,
    });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Etsy mail webhook is active',
    usage: 'POST with { secret, storeEmail, orderNumber, customerName, totalPrice, ... }',
  });
}
