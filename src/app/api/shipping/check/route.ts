export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkAndUpdateShippingStatus } from '@/lib/shipping-tracker';

// Kargo durumu kontrolünü başlatan endpoint
// Cron job veya manuel olarak çağrılabilir
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const result = await checkAndUpdateShippingStatus(prisma);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Shipping check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
