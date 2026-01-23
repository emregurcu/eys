import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Boyut bazlı kargo fiyatlarını getir (isteğe bağlı filtre)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const canvasSizeId = searchParams.get('canvasSizeId');
    const include = searchParams.get('include') === 'true';

    const rates = include
      ? await prisma.sizeShippingRate.findMany({
          where: canvasSizeId ? { canvasSizeId } : undefined,
          include: {
            canvasSize: true,
            country: true,
          },
          orderBy: [
            { canvasSize: { sortOrder: 'asc' } },
            { country: { sortOrder: 'asc' } },
          ],
        })
      : await prisma.sizeShippingRate.findMany({
          where: canvasSizeId ? { canvasSizeId } : undefined,
          select: {
            id: true,
            canvasSizeId: true,
            countryId: true,
            shippingCost: true,
            estimatedDays: true,
            isActive: true,
          },
          orderBy: [
            { canvasSize: { sortOrder: 'asc' } },
            { country: { sortOrder: 'asc' } },
          ],
        });

    return NextResponse.json(rates);
  } catch (error: any) {
    console.error('Size shipping rates GET error:', error);
    return NextResponse.json({ error: `Veri alınamadı: ${error.message}` }, { status: 500 });
  }
}

// POST - Yeni kargo fiyatı ekle veya güncelle (Sadece Admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const body = await req.json();
    const { canvasSizeId, countryId, shippingCost, estimatedDays, isActive } = body;

    if (!canvasSizeId || !countryId || shippingCost === undefined) {
      return NextResponse.json({ error: 'Boyut, ülke ve fiyat zorunludur' }, { status: 400 });
    }

    // Upsert - varsa güncelle, yoksa oluştur
    const rate = await prisma.sizeShippingRate.upsert({
      where: {
        canvasSizeId_countryId: {
          canvasSizeId,
          countryId,
        },
      },
      update: {
        shippingCost: parseFloat(shippingCost),
        estimatedDays: estimatedDays || null,
        isActive: isActive !== false,
      },
      create: {
        canvasSizeId,
        countryId,
        shippingCost: parseFloat(shippingCost),
        estimatedDays: estimatedDays || null,
        isActive: isActive !== false,
      },
      include: {
        canvasSize: true,
        country: true,
      },
    });

    return NextResponse.json(rate);
  } catch (error: any) {
    console.error('Size shipping rate create error:', error);
    return NextResponse.json({ error: `Kayıt oluşturulamadı: ${error.message}` }, { status: 500 });
  }
}

// PUT - Toplu kargo fiyatı güncelle
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const body = await req.json();
    const { rates } = body; // Array of { canvasSizeId, countryId, shippingCost }

    if (!rates || !Array.isArray(rates)) {
      return NextResponse.json({ error: 'Geçersiz veri formatı' }, { status: 400 });
    }

    // Transaction ile toplu güncelle
    const results = await prisma.$transaction(
      rates.map((r: any) =>
        prisma.sizeShippingRate.upsert({
          where: {
            canvasSizeId_countryId: {
              canvasSizeId: r.canvasSizeId,
              countryId: r.countryId,
            },
          },
          update: {
            shippingCost: parseFloat(r.shippingCost),
            estimatedDays: r.estimatedDays || null,
            isActive: r.isActive !== false,
          },
          create: {
            canvasSizeId: r.canvasSizeId,
            countryId: r.countryId,
            shippingCost: parseFloat(r.shippingCost),
            estimatedDays: r.estimatedDays || null,
            isActive: r.isActive !== false,
          },
        })
      )
    );

    return NextResponse.json({ success: true, count: results.length });
  } catch (error: any) {
    console.error('Size shipping rates update error:', error);
    return NextResponse.json({ error: `Güncelleme başarısız: ${error.message}` }, { status: 500 });
  }
}
