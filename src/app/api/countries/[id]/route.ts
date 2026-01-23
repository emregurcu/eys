import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// PUT - Ülke güncelle (Sadece Admin)
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
    const { code, name, isActive, sortOrder } = body;

    const country = await prisma.country.update({
      where: { id: params.id },
      data: {
        code: code ? code.toUpperCase() : undefined,
        name,
        isActive,
        sortOrder,
      },
    });

    return NextResponse.json(country);
  } catch (error: any) {
    console.error('Country update error:', error);
    return NextResponse.json({ error: `Güncelleme başarısız: ${error.message}` }, { status: 500 });
  }
}

// DELETE - Ülke sil (Sadece Admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    await prisma.country.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Country delete error:', error);
    return NextResponse.json({ error: 'Silme başarısız' }, { status: 500 });
  }
}
