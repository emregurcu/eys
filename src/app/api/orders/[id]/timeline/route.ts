export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getEntityActivities } from '@/lib/activity-logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const activities = await getEntityActivities('order', params.id, 100);

    return NextResponse.json(activities);
  } catch (error: any) {
    console.error('Order timeline error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
