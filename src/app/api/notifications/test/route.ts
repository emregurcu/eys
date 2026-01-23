import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST - Test bildirimi oluştur (sadece Admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    // Test bildirimleri oluştur
    const testNotifications = [
      {
        userId: session.user.id,
        type: 'NEW_ORDER',
        title: 'Yeni Sipariş Geldi',
        message: 'John Doe - ETY-2024-001 ($49.99)',
      },
      {
        userId: session.user.id,
        type: 'ORDER_STATUS',
        title: 'Sipariş Durumu Değişti',
        message: 'ETY-2024-002 → Kargoda',
      },
      {
        userId: session.user.id,
        type: 'ISSUE_CREATED',
        title: 'Yeni Sorun Kaydı',
        message: 'Kargo hasarlı geldi - Müşteri şikayeti',
      },
      {
        userId: session.user.id,
        type: 'SYSTEM',
        title: 'Sistem Bildirimi',
        message: 'Yeni güncelleme mevcut',
      },
    ];

    const notifications = await prisma.notification.createMany({
      data: testNotifications,
    });

    return NextResponse.json({ 
      success: true, 
      message: `${notifications.count} test bildirimi oluşturuldu` 
    });
  } catch (error: any) {
    console.error('Test notification error:', error);
    return NextResponse.json({ error: `Hata: ${error.message}` }, { status: 500 });
  }
}
