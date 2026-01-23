import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notifyIssueCreated } from '@/lib/notifications';

// GET - Tüm sorunları getir
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const storeId = searchParams.get('storeId');

    const where: any = {};

    // Admin değilse sadece kendi mağazalarının sorunlarını görsün
    if (session.user.role !== 'ADMIN') {
      const userStores = await prisma.storeManager.findMany({
        where: { userId: session.user.id },
        select: { storeId: true },
      });
      where.storeId = { in: userStores.map((s) => s.storeId) };
    }

    if (status && status !== 'all') where.status = status;
    if (type && type !== 'all') where.type = type;
    if (storeId && storeId !== 'all') where.storeId = storeId;

    const issues = await prisma.issue.findMany({
      where,
      include: {
        store: { select: { id: true, name: true } },
        order: { select: { id: true, orderNumber: true } },
        creator: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(issues);
  } catch (error: any) {
    console.error('Issues GET error:', error);
    return NextResponse.json({ error: `Veri alınamadı: ${error.message}` }, { status: 500 });
  }
}

// POST - Yeni sorun oluştur
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await req.json();
    const { storeId, orderId, type, title, description, priority, assigneeId } = body;

    if (!storeId || !type || !title) {
      return NextResponse.json({ error: 'Mağaza, tür ve başlık zorunludur' }, { status: 400 });
    }

    const issue = await prisma.issue.create({
      data: {
        storeId,
        orderId: orderId || null,
        type,
        title,
        description: description || '',
        priority: priority || 2,
        status: 'OPEN',
        creatorId: session.user.id,
        assigneeId: assigneeId || null,
      },
      include: {
        store: { select: { name: true } },
        order: { select: { orderNumber: true } },
        creator: { select: { name: true } },
      },
    });

    // Bildirim gönder
    await notifyIssueCreated(issue);

    return NextResponse.json(issue);
  } catch (error: any) {
    console.error('Issue create error:', error);
    return NextResponse.json({ error: `Kayıt oluşturulamadı: ${error.message}` }, { status: 500 });
  }
}
