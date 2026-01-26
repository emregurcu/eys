export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyNewOrder } from '@/lib/notifications';

// Webhook secret key for security
const WEBHOOK_SECRET = process.env.ETSY_MAIL_WEBHOOK_SECRET || 'etsy-webhook-secret-key';

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

    // Build notes with all available info
    const noteParts = ['Mail ile eklendi.'];
    if (data.productTitle) noteParts.push(`Ürün: ${data.productTitle}`);
    if (data.dimensions) noteParts.push(`Boyut: ${data.dimensions}`);
    if (data.frameOption) noteParts.push(`Çerçeve: ${data.frameOption}`);
    if (data.shopName) noteParts.push(`Mağaza: ${data.shopName}`);
    if (data.transactionId) noteParts.push(`Transaction: ${data.transactionId}`);
    if (data.itemPrice && data.discount) noteParts.push(`Liste Fiyatı: $${data.itemPrice}, İndirim: $${data.discount}`);
    if (data.shippingCost) noteParts.push(`Kargo: $${data.shippingCost}`);
    if (data.salesTax) noteParts.push(`Vergi: $${data.salesTax}`);
    if (data.etsyOrderUrl) noteParts.push(`Etsy: ${data.etsyOrderUrl}`);

    // Build item notes with dimensions and frame
    const itemNotes: string[] = [];
    if (data.dimensions) itemNotes.push(`Boyut: ${data.dimensions}`);
    if (data.frameOption) itemNotes.push(`Çerçeve: ${data.frameOption}`);
    const itemNotesStr = itemNotes.length > 0 ? itemNotes.join(' | ') : null;

    // Create new order
    const order = await prisma.order.create({
      data: {
        storeId: store.id,
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        customerEmail: data.customerEmail || null,
        shippingAddress: data.shippingAddress || null,
        shippingCountry: data.shippingCountry || null,
        salePrice: data.totalPrice,
        saleCurrency: data.currency || 'USD',
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        notes: noteParts.join('\n'),
        imageUrl: data.etsyOrderUrl || null,
        items: data.items && data.items.length > 0 ? {
          create: data.items.map(item => ({
            title: item.title || data.productTitle || 'Canvas Print',
            quantity: item.quantity || data.quantity || 1,
            salePrice: item.price || data.itemPrice || data.totalPrice,
            notes: itemNotesStr,
          })),
        } : {
          create: [{
            title: data.productTitle || 'Canvas Print',
            quantity: data.quantity || 1,
            salePrice: data.itemPrice || data.totalPrice,
            notes: itemNotesStr,
          }],
        },
      },
      include: {
        store: { select: { name: true } },
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
