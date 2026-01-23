export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Tüm çerçeve seçeneklerini getir
export async function GET() {
  try {
    const frames = await prisma.frameOption.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(frames);
  } catch (error) {
    return NextResponse.json({ error: 'Veri alınamadı' }, { status: 500 });
  }
}

// POST - Yeni çerçeve ekle (Sadece Admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, isActive, sortOrder } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Ad ve kod zorunludur' }, { status: 400 });
    }

    const frame = await prisma.frameOption.create({
      data: {
        name,
        code: code.toLowerCase(),
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json(frame);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu kod zaten mevcut' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Kayıt oluşturulamadı' }, { status: 500 });
  }
}

