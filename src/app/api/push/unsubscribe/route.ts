export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { removeSubscription } from '@/lib/push';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await req.json();
    const endpoint = body?.endpoint;
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint gerekli' }, { status: 400 });
    }

    await removeSubscription(session.user.id, endpoint);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: `Abonelik silinemedi: ${error.message}` }, { status: 500 });
  }
}

