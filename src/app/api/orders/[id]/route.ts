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
    } = body;

    // Mevcut siparişi al (durum değişikliği kontrolü için)
    const existingOrder = await prisma.order.findUnique({
      where: { id: params.id },
      select: { status: true },
    });

    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        status,
        trackingNumber,
        trackingCompany,
        notes,
        shippedDate: shippedDate ? new Date(shippedDate) : undefined,
        deliveredDate: deliveredDate ? new Date(deliveredDate) : undefined,
      },
      include: {
        items: true,
        store: { select: { name: true } },
      },
    });

    // Durum değiştiyse bildirim gönder
    if (status && existingOrder && existingOrder.status !== status) {
      await notifyOrderStatusChange(order, status);
    }

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: 'Güncelleme başarısız' }, { status: 500 });
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
