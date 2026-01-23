export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notifyOrderStatusChange } from '@/lib/notifications';

// GET - Tek sipariş getir
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        store: true,
        country: true,
        items: {
          include: {
            canvasSize: true,
            frameOption: true,
          },
        },
        issues: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: 'Veri alınamadı' }, { status: 500 });
  }
}

// PUT - Sipariş güncelle
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await req.json();
    const {
      status,
      trackingNumber,
      trackingCompany,
      notes,
      shippedDate,
      deliveredDate,
      // Yeni alanlar
      customerName,
      customerEmail,
      shippingAddress,
      shippingCountry,
      countryId,
      salePrice,
      saleCurrency,
      orderDate,
      imageUrl,
      items,
    } = body;

    // Mevcut siparişi al (durum değişikliği kontrolü için)
    const existingOrder = await prisma.order.findUnique({
      where: { id: params.id },
      select: { status: true },
    });

    // Items güncellemesi varsa önce mevcut items'ları sil
    if (items && Array.isArray(items)) {
      await prisma.orderItem.deleteMany({
        where: { orderId: params.id },
      });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (trackingCompany !== undefined) updateData.trackingCompany = trackingCompany;
    if (notes !== undefined) updateData.notes = notes;
    if (shippedDate !== undefined) updateData.shippedDate = shippedDate ? new Date(shippedDate) : null;
    if (deliveredDate !== undefined) updateData.deliveredDate = deliveredDate ? new Date(deliveredDate) : null;
    if (customerName !== undefined) updateData.customerName = customerName;
    if (customerEmail !== undefined) updateData.customerEmail = customerEmail;
    if (shippingAddress !== undefined) updateData.shippingAddress = shippingAddress;
    if (shippingCountry !== undefined) updateData.shippingCountry = shippingCountry;
    if (countryId !== undefined) updateData.countryId = countryId || null;
    if (salePrice !== undefined) updateData.salePrice = parseFloat(salePrice);
    if (saleCurrency !== undefined) updateData.saleCurrency = saleCurrency;
    if (orderDate !== undefined) updateData.orderDate = orderDate ? new Date(orderDate) : new Date();
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    // Items güncellemesi
    if (items && Array.isArray(items)) {
      updateData.items = {
        create: items.map((item: any) => ({
          title: item.title || 'Canvas Print',
          quantity: parseInt(item.quantity) || 1,
          salePrice: parseFloat(item.salePrice) || 0,
          canvasSizeId: item.canvasSizeId || null,
          frameOptionId: item.frameOptionId || null,
          notes: item.notes || null,
        })),
      };
    }

    const order = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
      include: {
        items: {
          include: {
            canvasSize: true,
            frameOption: true,
          },
        },
        store: { select: { name: true } },
        country: true,
      },
    });

    // Durum değiştiyse bildirim gönder
    if (status && existingOrder && existingOrder.status !== status) {
      await notifyOrderStatusChange(order, status);
    }

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Order update error:', error);
    return NextResponse.json({ error: `Güncelleme başarısız: ${error.message}` }, { status: 500 });
  }
}

// DELETE - Sipariş sil
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    await prisma.order.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Silme başarısız' }, { status: 500 });
  }
}
