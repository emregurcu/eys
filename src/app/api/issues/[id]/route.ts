import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Tek sorun getir
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const issue = await prisma.issue.findUnique({
      where: { id: params.id },
      include: {
        store: { select: { id: true, name: true } },
        order: { select: { id: true, orderNumber: true } },
        creator: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        comments: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!issue) {
      return NextResponse.json({ error: 'Sorun bulunamadı' }, { status: 404 });
    }
    return NextResponse.json(issue);
  } catch (error) {
    return NextResponse.json({ error: 'Veri alınamadı' }, { status: 500 });
  }
}

// PUT - Sorun güncelle
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await req.json();
    const { status, priority, assigneeId, description } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assigneeId !== undefined) updateData.assignedTo = assigneeId || null;
    if (description !== undefined) updateData.description = description;

    if (status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }

    const issue = await prisma.issue.update({
      where: { id: params.id },
      data: updateData,
      include: {
        store: { select: { name: true } },
        assignee: { select: { name: true } },
      },
    });

    return NextResponse.json(issue);
  } catch (error) {
    return NextResponse.json({ error: 'Güncelleme başarısız' }, { status: 500 });
  }
}

// DELETE - Sorun sil
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    await prisma.issue.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Silme başarısız' }, { status: 500 });
  }
}
