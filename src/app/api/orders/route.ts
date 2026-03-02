export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notifyNewOrder } from '@/lib/notifications';
import { calculateOrderCosts } from '@/lib/order-costs';

// GET - Tüm siparişleri getir
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status');

    const where: any = {};

    if (session.user.role !== 'ADMIN') {
      const userStores = await prisma.storeManager.findMany({
        where: { userId: session.user.id },
        select: { storeId: true },
      });
      where.storeId = { in: userStores.map((s) => s.storeId) };
    }

    if (storeId) where.storeId = storeId;
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        shippingCountry: true,
        shippingAddress: true,
        status: true,
        salePrice: true,
        saleCurrency: true,
        productCost: true,
        shippingCost: true,
        etsyFees: true,
        totalCost: true,
        netProfit: true,
        profitMargin: true,
        orderDate: true,
        createdAt: true,
        countryId: true,
        imageUrl: true,
        trackingNumber: true,
        trackingCompany: true,
        store: { select: { id: true, name: true } },
        country: { select: { name: true, code: true } },
        items: {
          select: {
            id: true,
            title: true,
            quantity: true,
            salePrice: true,
            notes: true,
            canvasSize: { select: { name: true } },
            frameOption: { select: { name: true } },
          },
        },
        _count: { select: { items: true } },
      },
      orderBy: [{ orderDate: 'desc' }, { createdAt: 'desc' }],
      take: 100, // Son 100 sipariş
    });

    return NextResponse.json(orders);
  } catch (error: any) {
    console.error('Orders GET error:', error);
    return NextResponse.json({ error: `Veri alınamadı: ${error.message}` }, { status: 500 });
  }
}

// POST - Yeni sipariş ekle
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await req.json();
    const {
      storeId,
      orderNumber,
      customerName,
      customerEmail,
      countryId,
      shippingAddress,
      salePrice,
      saleCurrency,
      orderDate,
      notes,
      imageUrl,
      items,
    } = body;

    if (!storeId || !orderNumber || !customerName || !salePrice) {
      return NextResponse.json({ error: 'Zorunlu alanları doldurun' }, { status: 400 });
    }

    // Mağaza bilgilerini al
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return NextResponse.json({ error: 'Mağaza bulunamadı' }, { status: 404 });
    }

    // Ülke bilgisini al
    const country = countryId 
      ? await prisma.country.findUnique({ where: { id: countryId } })
      : null;

    const parsedSalePrice = parseFloat(salePrice);

    // Maliyet hesapla (merkezi fonksiyon)
    const costs = await calculateOrderCosts({
      storeId,
      salePrice: parsedSalePrice,
      items: items.map((item: any) => ({
        canvasSizeId: item.canvasSizeId || null,
        frameOptionId: item.frameOptionId || null,
        quantity: item.quantity,
      })),
      countryId: countryId || null,
    });

    // Item'ları hazırla
    const processedItems = [];
    for (const item of items) {
      let itemProductCost = 0;

      if (item.canvasSizeId && item.frameOptionId) {
        const variant = await prisma.canvasSizeVariant.findUnique({
          where: {
            canvasSizeId_frameOptionId: {
              canvasSizeId: item.canvasSizeId,
              frameOptionId: item.frameOptionId,
            },
          },
        });
        if (variant) itemProductCost = variant.totalCost;
      } else if (item.canvasSizeId) {
        const canvasSize = await prisma.canvasSize.findUnique({
          where: { id: item.canvasSizeId },
        });
        if (canvasSize) itemProductCost = canvasSize.baseCost;
      }

      const itemTotalCost = itemProductCost * item.quantity;
      processedItems.push({
        canvasSizeId: item.canvasSizeId || null,
        frameOptionId: item.frameOptionId || null,
        title: item.title,
        quantity: item.quantity,
        salePrice: item.salePrice || 0,
        canvasCost: itemProductCost,
        frameCost: 0,
        totalCost: itemTotalCost,
        customWidth: item.customWidth || null,
        customHeight: item.customHeight || null,
        notes: item.notes || null,
      });
    }

    // Siparişi oluştur
    const order = await prisma.order.create({
      data: {
        storeId,
        countryId: countryId || null,
        orderNumber,
        customerName,
        customerEmail: customerEmail || null,
        shippingCountry: country?.name || null,
        shippingAddress: shippingAddress || null,
        salePrice: parsedSalePrice,
        saleCurrency: saleCurrency || 'USD',
        productCost: costs.productCost,
        shippingCost: costs.shippingCost,
        etsyFees: costs.etsyFees,
        totalCost: costs.totalCost,
        netProfit: costs.netProfit,
        profitMargin: costs.profitMargin,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        notes: notes || null,
        imageUrl: imageUrl || null,
        items: {
          create: processedItems,
        },
      },
      include: {
        items: {
          include: {
            canvasSize: true,
            frameOption: true,
          },
        },
        store: { select: { name: true } },
        country: { select: { name: true, code: true } },
      },
    });

    // Bildirim gönder
    await notifyNewOrder(order);

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Order create error:', error);
    return NextResponse.json({ error: `Kayıt oluşturulamadı: ${error.message}` }, { status: 500 });
  }
}

