export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';

// POST - İade/İptal İşlemi
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await req.json();
    const { type, reason, refundAmount, notes } = body;

    if (!type || !['RETURN', 'CANCEL'].includes(type)) {
      return NextResponse.json({ error: 'Geçersiz işlem tipi' }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ error: 'Sebep belirtilmeli' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { store: { select: { name: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 });
    }

    const newStatus = type === 'RETURN' ? 'RETURNED' : 'CANCELLED';

    // Sipariş durumunu güncelle
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        notes: [
          order.notes,
          `\n--- ${type === 'RETURN' ? 'İADE' : 'İPTAL'} (${new Date().toLocaleDateString('tr-TR')}) ---`,
          `Sebep: ${reason}`,
          refundAmount ? `İade Tutarı: $${refundAmount}` : null,
          notes ? `Not: ${notes}` : null,
        ].filter(Boolean).join('\n'),
      },
    });

    // Issue oluştur
    await prisma.issue.create({
      data: {
        storeId: order.storeId,
        orderId: order.id,
        type: type === 'RETURN' ? 'RETURN' : 'OTHER',
        status: 'OPEN',
        title: `${type === 'RETURN' ? 'İade' : 'İptal'} - ${order.orderNumber}`,
        description: [
          `Müşteri: ${order.customerName}`,
          `Sebep: ${reason}`,
          refundAmount ? `İade Tutarı: $${refundAmount}` : null,
          notes ? `Notlar: ${notes}` : null,
        ].filter(Boolean).join('\n'),
        priority: type === 'RETURN' ? 3 : 2,
        createdBy: session.user.id,
      },
    });

    // Activity log
    await logActivity({
      userId: session.user.id,
      action: 'status_change',
      entity: 'order',
      entityId: params.id,
      data: {
        type,
        from: order.status,
        to: newStatus,
        reason,
        refundAmount,
        orderNumber: order.orderNumber,
      },
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('Return/cancel error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
