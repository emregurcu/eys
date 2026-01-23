export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendPushToUser } from '@/lib/push';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const payload = {
      title: body.title || 'Test Bildirimi',
      body: body.body || 'Push bildirimleri aktif.',
      url: body.url || '/dashboard',
    };

    await sendPushToUser(session.user.id, payload);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: `Push test başarısız: ${error.message}` }, { status: 500 });
  }
}

