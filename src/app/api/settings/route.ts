export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOrderNotificationEmail, setOrderNotificationEmail } from '@/lib/system-settings';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const orderNotificationEmail = await getOrderNotificationEmail();
    return NextResponse.json({ orderNotificationEmail });
  } catch (error) {
    return NextResponse.json({ error: 'Ayarlar alınamadı' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const body = await req.json();
    const { orderNotificationEmail } = body;

    if (orderNotificationEmail !== undefined) {
      await setOrderNotificationEmail(
        typeof orderNotificationEmail === 'string' ? orderNotificationEmail : null
      );
    }

    const email = await getOrderNotificationEmail();
    return NextResponse.json({ orderNotificationEmail: email });
  } catch (error) {
    return NextResponse.json({ error: 'Ayar kaydedilemedi' }, { status: 500 });
  }
}
