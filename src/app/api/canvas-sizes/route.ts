export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Tüm boyutları getir
export async function GET() {
  try {
    const sizes = await prisma.canvasSize.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(sizes);
  } catch (error: any) {
    console.error('Canvas sizes GET error:', error);
    return NextResponse.json({ error: `Veri alınamadı: ${error.message}` }, { status: 500 });
  }
}

// POST - Yeni boyut ekle (Sadece Admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const body = await req.json();
    const { name, width, height, baseCost, isActive, sortOrder } = body;

    if (!width || !height || baseCost === undefined) {
      return NextResponse.json({ error: 'Genişlik, yükseklik ve fiyat zorunludur' }, { status: 400 });
    }

    const size = await prisma.canvasSize.create({
      data: {
        name: name || `${width}x${height} cm`,
        width: parseInt(width),
        height: parseInt(height),
        baseCost: parseFloat(baseCost),
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json(size);
  } catch (error: any) {
    console.error('Canvas size create error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu boyut zaten mevcut' }, { status: 400 });
    }
    return NextResponse.json({ error: `Kayıt oluşturulamadı: ${error.message}` }, { status: 500 });
  }
}

