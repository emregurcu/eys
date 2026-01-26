export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Tüm mağazaları getir
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    let stores;
    if (session.user.role === 'ADMIN') {
      stores = await prisma.store.findMany({
        include: {
          managers: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          _count: { select: { orders: true } },
        },
        orderBy: { name: 'asc' },
      });
    } else {
      stores = await prisma.store.findMany({
        where: {
          managers: { some: { userId: session.user.id } },
        },
        include: {
          managers: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          _count: { select: { orders: true } },
        },
        orderBy: { name: 'asc' },
      });
    }

    return NextResponse.json(stores);
  } catch (error) {
    return NextResponse.json({ error: 'Veri alınamadı' }, { status: 500 });
  }
}

// POST - Yeni mağaza ekle (Sadece Admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const body = await req.json();
    const { name, etsyShopId, etsyApiKey, etsyApiSecret, etsyTransactionFee, etsyPaymentFee, etsyListingFee, notificationEmail } = body;

    if (!name || !etsyShopId) {
      return NextResponse.json({ error: 'Mağaza adı ve Shop ID zorunludur' }, { status: 400 });
    }

    const store = await prisma.store.create({
      data: {
        name,
        etsyShopId,
        etsyApiKey: etsyApiKey || null,
        etsyApiSecret: etsyApiSecret || null,
        notificationEmail: notificationEmail?.trim() || null,
        currency: 'USD',
        etsyTransactionFee: etsyTransactionFee ? parseFloat(etsyTransactionFee) : 6.5,
        etsyPaymentFee: etsyPaymentFee ? parseFloat(etsyPaymentFee) : 4,
        etsyListingFee: etsyListingFee ? parseFloat(etsyListingFee) : 0.20,
      },
    });

    return NextResponse.json(store);
  } catch (error: any) {
    console.error('Store create error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu mağaza ID zaten mevcut' }, { status: 400 });
    }
    return NextResponse.json({ error: `Kayıt oluşturulamadı: ${error.message}` }, { status: 500 });
  }
}

