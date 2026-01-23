export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST - Yorum ekle
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Yorum içeriği gerekli' }, { status: 400 });
    }

    const comment = await prisma.issueComment.create({
      data: {
        issueId: params.id,
        userId: session.user.id,
        content: content.trim(),
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(comment);
  } catch (error: any) {
    console.error('Comment create error:', error);
    return NextResponse.json({ error: `Yorum eklenemedi: ${error.message}` }, { status: 500 });
  }
}
