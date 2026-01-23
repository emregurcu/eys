import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Tek boyut getir
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const size = await prisma.canvasSize.findUnique({
      where: { id: params.id },
    });
    if (!size) {
      return NextResponse.json({ error: 'Boyut bulunamadı' }, { status: 404 });
    }
    return NextResponse.json(size);
  } catch (error) {
    return NextResponse.json({ error: 'Veri alınamadı' }, { status: 500 });
  }
}

// PUT - Boyut güncelle (Sadece Admin)
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
    const { name, width, height, baseCost, isActive, sortOrder } = body;

    const size = await prisma.canvasSize.update({
      where: { id: params.id },
      data: {
        name,
        width: width ? parseInt(width) : undefined,
        height: height ? parseInt(height) : undefined,
        baseCost: baseCost ? parseFloat(baseCost) : undefined,
        isActive,
        sortOrder,
      },
    });

    return NextResponse.json(size);
  } catch (error) {
    return NextResponse.json({ error: 'Güncelleme başarısız' }, { status: 500 });
  }
}

// DELETE - Boyut sil (Sadece Admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    await prisma.canvasSize.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Silme başarısız' }, { status: 500 });
  }
}
