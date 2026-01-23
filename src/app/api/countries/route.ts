import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Tüm ülkeleri getir
export async function GET() {
  try {
    const countries = await prisma.country.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(countries);
  } catch (error: any) {
    console.error('Countries GET error:', error);
    return NextResponse.json({ error: `Veri alınamadı: ${error.message}` }, { status: 500 });
  }
}

// POST - Yeni ülke ekle (Sadece Admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const body = await req.json();
    const { code, name, sortOrder } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'Ülke kodu ve adı zorunludur' }, { status: 400 });
    }

    const country = await prisma.country.create({
      data: {
        code: code.toUpperCase(),
        name,
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json(country);
  } catch (error: any) {
    console.error('Country create error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu ülke kodu zaten mevcut' }, { status: 400 });
    }
    return NextResponse.json({ error: `Kayıt oluşturulamadı: ${error.message}` }, { status: 500 });
  }
}
