import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Kullanıcının bildirimlerini getir
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = { userId: session.user.id };
    if (unreadOnly) {
      where.isRead = false;
    }

    // Paralel sorgular
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          isRead: true,
          createdAt: true,
          store: { select: { name: true } },
        },
      }),
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ error: `Veri alınamadı: ${error.message}` }, { status: 500 });
  }
}

// POST - Yeni bildirim oluştur (sistem içi kullanım)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await req.json();
    const { userId, storeId, type, title, message, data } = body;

    // Admin veya sistem bildirimi oluşturabilir
    if (session.user.role !== 'ADMIN' && userId !== session.user.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const notification = await prisma.notification.create({
      data: {
        userId: userId || session.user.id,
        storeId: storeId || null,
        type,
        title,
        message,
        data: data || null,
      },
    });

    return NextResponse.json(notification);
  } catch (error: any) {
    console.error('Notification create error:', error);
    return NextResponse.json({ error: `Kayıt oluşturulamadı: ${error.message}` }, { status: 500 });
  }
}

// PUT - Tüm bildirimleri okundu işaretle
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Notifications update error:', error);
    return NextResponse.json({ error: `Güncelleme başarısız: ${error.message}` }, { status: 500 });
  }
}
