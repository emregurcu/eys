export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runAllRules } from '@/lib/automation-rules';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const results = await runAllRules();
    const totalAffected = results.reduce((sum, r) => sum + r.affected, 0);

    return NextResponse.json({
      success: true,
      totalAffected,
      results,
    });
  } catch (error: any) {
    console.error('Automation run error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
