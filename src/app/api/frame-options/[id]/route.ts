import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Tek çerçeve getir
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const frame = await prisma.frameOption.findUnique({
      where: { id: params.id },
    });
    if (!frame) {
      return NextResponse.json({ error: 'Çerçeve bulunamadı' }, { status: 404 });
    }
    return NextResponse.json(frame);
  } catch (error) {
    return NextResponse.json({ error: 'Veri alınamadı' }, { status: 500 });
  }
}

// PUT - Çerçeve güncelle (Sadece Admin)
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
    const { name, code, isActive, sortOrder } = body;

    const frame = await prisma.frameOption.update({
      where: { id: params.id },
      data: {
        name,
        code: code ? code.toLowerCase() : undefined,
        isActive,
        sortOrder,
      },
    });

    return NextResponse.json(frame);
  } catch (error) {
    return NextResponse.json({ error: 'Güncelleme başarısız' }, { status: 500 });
  }
}

// DELETE - Çerçeve sil (Sadece Admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    await prisma.frameOption.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Silme başarısız' }, { status: 500 });
  }
}
