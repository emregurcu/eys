export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyNewOrder } from '@/lib/notifications';

// Webhook secret key for security
const WEBHOOK_SECRET = process.env.ETSY_MAIL_WEBHOOK_SECRET || 'etsy-webhook-secret-key';

// Boyut eşleştirme fonksiyonu
async function matchCanvasSize(dimensionStr: string | undefined): Promise<string | null> {
  if (!dimensionStr) return null;

  // Boyut string'inden sayıları çıkar (örn: "20x30 cm" -> 20, 30)
  const numbers = dimensionStr.match(/(\d+)\s*[xX×]\s*(\d+)/);
  if (!numbers) return null;

  const width = parseInt(numbers[1]);
  const height = parseInt(numbers[2]);

  // Hem width x height hem de height x width olarak ara
  const canvasSize = await prisma.canvasSize.findFirst({
    where: {
      isActive: true,
      OR: [
        { width, height },
        { width: height, height: width }, // Ters de olabilir
      ],
    },
  });

  return canvasSize?.id || null;
}

// Çerçeve eşleştirme fonksiyonu
async function matchFrameOption(frameStr: string | undefined): Promise<string | null> {
  if (!frameStr) return null;

  const frameLower = frameStr.toLowerCase().trim();

  // Tüm çerçeve seçeneklerini al
  const frameOptions = await prisma.frameOption.findMany({
    where: { isActive: true },
  });

  // Eşleştirme kuralları
  const matchRules: { [key: string]: string[] } = {
    'none': ['no frame', 'unframed', 'frameless', 'çerçevesiz', 'without frame', 'canvas only', 'rolled', 'rolled canvas'],
    'black': ['black', 'siyah', 'black frame', 'siyah çerçeve', 'black wood', 'black wooden'],
    'white': ['white', 'beyaz', 'white frame', 'beyaz çerçeve', 'white wood', 'white wooden'],
    'wood': ['wood', 'wooden', 'natural', 'ahşap', 'natural wood', 'doğal', 'oak', 'walnut'],
    'gold': ['gold', 'golden', 'altın', 'gold frame'],
    'silver': ['silver', 'gümüş', 'silver frame'],
    'brown': ['brown', 'kahverengi', 'dark wood', 'espresso'],
  };

  for (const frame of frameOptions) {
    const code = frame.code.toLowerCase();
    const name = frame.name.toLowerCase();

    // Direkt eşleşme
    if (frameLower === code || frameLower === name || frameLower.includes(name) || name.includes(frameLower)) {
      return frame.id;
    }

    // Kural bazlı eşleşme
    const rules = matchRules[code];
    if (rules) {
      for (const rule of rules) {
        if (frameLower.includes(rule) || rule.includes(frameLower)) {
          return frame.id;
        }
      }
    }
  }

  // Eşleşme bulunamadıysa "none" veya "çerçevesiz" olanı dön
  const defaultFrame = frameOptions.find(f => 
    f.code === 'none' || f.name.toLowerCase().includes('çerçevesiz')
  );

  return defaultFrame?.id || null;
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

    // Ülke eşleştirme (kargo için)
    let countryId: string | null = null;
    if (data.shippingCountry) {
      const country = await prisma.country.findFirst({
        where: {
          OR: [
            { name: { contains: data.shippingCountry, mode: 'insensitive' } },
            { code: data.shippingCountry.toUpperCase() },
          ],
        },
      });
      countryId = country?.id || null;
    }

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
        imageUrl: data.etsyOrderUrl || null,
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
