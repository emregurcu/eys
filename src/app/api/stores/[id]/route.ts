import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Tek mağaza getir
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { id: params.id },
      include: {
        managers: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!store) {
      return NextResponse.json({ error: 'Mağaza bulunamadı' }, { status: 404 });
    }
    return NextResponse.json(store);
  } catch (error) {
    return NextResponse.json({ error: 'Veri alınamadı' }, { status: 500 });
  }
}

// PUT - Mağaza güncelle (Sadece Admin)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const body = await req.json();
    const { name, etsyShopId, etsyApiKey, etsyApiSecret, currency, isActive, etsyTransactionFee, etsyPaymentFee, etsyListingFee } = body;

    const store = await prisma.store.update({
      where: { id: params.id },
      data: {
        name,
        etsyShopId,
        etsyApiKey,
        etsyApiSecret,
        currency,
        isActive,
        etsyTransactionFee,
        etsyPaymentFee,
        etsyListingFee,
      },
    });

    return NextResponse.json(store);
  } catch (error) {
    return NextResponse.json({ error: 'Güncelleme başarısız' }, { status: 500 });
  }
}

// DELETE - Mağaza sil (Sadece Admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    await prisma.store.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Silme başarısız' }, { status: 500 });
  }
}
