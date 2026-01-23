export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// PUT - Bildirimi okundu işaretle
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const notification = await prisma.notification.update({
      where: { 
        id: params.id,
        userId: session.user.id, // Sadece kendi bildirimlerini güncelleyebilir
      },
      data: { isRead: true },
    });

    return NextResponse.json(notification);
  } catch (error: any) {
    console.error('Notification update error:', error);
    return NextResponse.json({ error: 'Güncelleme başarısız' }, { status: 500 });
  }
}

// DELETE - Bildirimi sil
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    await prisma.notification.delete({
      where: { 
        id: params.id,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Notification delete error:', error);
    return NextResponse.json({ error: 'Silme başarısız' }, { status: 500 });
  }
}
