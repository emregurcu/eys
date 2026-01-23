export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyStoreManagers } from '@/lib/notifications';

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
    variation?: string;
  }>;
  totalPrice: number;
  currency?: string;
  orderDate?: string;
  rawSubject?: string;
  rawBody?: string;
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

    // Find store by email
    const store = await prisma.store.findFirst({
      where: {
        OR: [
          { etsyApiKey: data.storeEmail }, // Using etsyApiKey field to store email temporarily
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
            message: `${data.customerName} - ${data.orderNumber} ($${data.totalPrice})`,
            data: {
              source: 'email',
              orderNumber: data.orderNumber,
              customerName: data.customerName,
              totalPrice: data.totalPrice,
              storeEmail: data.storeEmail,
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
        notes: `Mail ile eklendi. ${data.rawSubject || ''}`,
        items: data.items && data.items.length > 0 ? {
          create: data.items.map(item => ({
            title: item.title,
            quantity: item.quantity,
            salePrice: item.price,
          })),
        } : undefined,
      },
      include: {
        store: { select: { name: true } },
      },
    });

    // Send notification
    await notifyStoreManagers(
      store.id,
      'NEW_ORDER',
      'Yeni Etsy Siparişi (Mail)',
      `${data.customerName} - ${data.orderNumber} ($${data.totalPrice})`,
      { orderId: order.id, orderNumber: order.orderNumber, source: 'email' }
    );

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
