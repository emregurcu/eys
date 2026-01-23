export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { saveSubscription } from '@/lib/push';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await req.json();
    await saveSubscription(session.user.id, body);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: `Abonelik kaydedilemedi: ${error.message}` }, { status: 500 });
  }
}

