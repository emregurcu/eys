import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Varyasyonları getir (isteğe bağlı filtre)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const canvasSizeId = searchParams.get('canvasSizeId');
    const include = searchParams.get('include') === 'true';

    const variants = await prisma.canvasSizeVariant.findMany({
      where: canvasSizeId ? { canvasSizeId } : undefined,
      ...(include
        ? {
            include: {
              canvasSize: true,
              frameOption: true,
            },
          }
        : {
            select: {
              id: true,
              canvasSizeId: true,
              frameOptionId: true,
              totalCost: true,
              isActive: true,
            },
          }),
      orderBy: [
        { canvasSize: { sortOrder: 'asc' } },
        { frameOption: { sortOrder: 'asc' } },
      ],
    });

    return NextResponse.json(variants);
  } catch (error) {
    return NextResponse.json({ error: 'Veri alınamadı' }, { status: 500 });
  }
}

// POST - Yeni varyasyon ekle veya güncelle (Sadece Admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const body = await req.json();
    const { canvasSizeId, frameOptionId, totalCost, isActive } = body;

    if (!canvasSizeId || !frameOptionId || totalCost === undefined) {
      return NextResponse.json({ error: 'Boyut, çerçeve ve fiyat zorunludur' }, { status: 400 });
    }

    // Upsert - varsa güncelle, yoksa oluştur
    const variant = await prisma.canvasSizeVariant.upsert({
      where: {
        canvasSizeId_frameOptionId: {
          canvasSizeId,
          frameOptionId,
        },
      },
      update: {
        totalCost: parseFloat(totalCost),
        isActive: isActive !== false,
      },
      create: {
        canvasSizeId,
        frameOptionId,
        totalCost: parseFloat(totalCost),
        isActive: isActive !== false,
      },
      include: {
        canvasSize: true,
        frameOption: true,
      },
    });

    return NextResponse.json(variant);
  } catch (error: any) {
    console.error('Variant create error:', error);
    return NextResponse.json({ error: `Kayıt oluşturulamadı: ${error.message}` }, { status: 500 });
  }
}

// PUT - Toplu varyasyon güncelle
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const body = await req.json();
    const { variants } = body; // Array of { canvasSizeId, frameOptionId, totalCost }

    if (!variants || !Array.isArray(variants)) {
      return NextResponse.json({ error: 'Geçersiz veri formatı' }, { status: 400 });
    }

    // Transaction ile toplu güncelle
    const results = await prisma.$transaction(
      variants.map((v: any) =>
        prisma.canvasSizeVariant.upsert({
          where: {
            canvasSizeId_frameOptionId: {
              canvasSizeId: v.canvasSizeId,
              frameOptionId: v.frameOptionId,
            },
          },
          update: {
            totalCost: parseFloat(v.totalCost),
            isActive: v.isActive !== false,
          },
          create: {
            canvasSizeId: v.canvasSizeId,
            frameOptionId: v.frameOptionId,
            totalCost: parseFloat(v.totalCost),
            isActive: v.isActive !== false,
          },
        })
      )
    );

    return NextResponse.json({ success: true, count: results.length });
  } catch (error: any) {
    console.error('Variants update error:', error);
    return NextResponse.json({ error: `Güncelleme başarısız: ${error.message}` }, { status: 500 });
  }
}
