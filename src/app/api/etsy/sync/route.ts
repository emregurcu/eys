export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { syncShopOrders, refreshAccessToken } from '@/lib/etsy-api';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const { storeId } = await req.json();

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        etsyShopId: true,
        etsyAccessToken: true,
        etsyRefreshToken: true,
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'Mağaza bulunamadı' }, { status: 404 });
    }

    if (!store.etsyAccessToken || !store.etsyRefreshToken) {
      return NextResponse.json({ error: 'Etsy API bağlantısı yapılmamış' }, { status: 400 });
    }

    let accessToken = store.etsyAccessToken;

    // Token'ı yenile
    try {
      const refreshed = await refreshAccessToken(store.etsyRefreshToken);
      accessToken = refreshed.access_token;

      // Yeni token'ları kaydet
      await prisma.store.update({
        where: { id: storeId },
        data: {
          etsyAccessToken: refreshed.access_token,
          etsyRefreshToken: refreshed.refresh_token,
        },
      });
    } catch (refreshError) {
      console.error('Token refresh failed, trying with current token:', refreshError);
    }

    // Son 30 günün siparişlerini sync et
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const result = await syncShopOrders(prisma, storeId, accessToken, store.etsyShopId, since);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Etsy sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
