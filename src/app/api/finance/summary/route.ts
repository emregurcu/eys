import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month';
    const storeId = searchParams.get('storeId');

    // Tarih aralığını hesapla
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Filtre oluştur
    const where: any = {
      orderDate: { gte: startDate },
    };

    if (storeId && storeId !== 'all') {
      where.storeId = storeId;
    }

    if (session.user.role !== 'ADMIN') {
      const userStores = await prisma.storeManager.findMany({
        where: { userId: session.user.id },
        select: { storeId: true },
      });
      where.storeId = { in: userStores.map((s) => s.storeId) };
    }

    // Siparişleri getir
    const orders = await prisma.order.findMany({
      where,
      include: {
        store: { select: { id: true, name: true } },
      },
    });

    // Toplam hesaplamalar
    const totalRevenue = orders.reduce((sum, o) => sum + o.salePrice, 0);
    const totalProductCost = orders.reduce((sum, o) => sum + o.productCost, 0);
    const totalShippingCost = orders.reduce((sum, o) => sum + o.shippingCost, 0);
    const totalEtsyFees = orders.reduce((sum, o) => sum + o.etsyFees, 0);
    const totalCost = orders.reduce((sum, o) => sum + o.totalCost, 0);
    const totalProfit = orders.reduce((sum, o) => sum + o.netProfit, 0);

    // Mağaza bazlı özet
    const storeStats: Record<string, any> = {};
    for (const order of orders) {
      if (!storeStats[order.storeId]) {
        storeStats[order.storeId] = {
          id: order.storeId,
          name: order.store.name,
          revenue: 0,
          cost: 0,
          profit: 0,
          orderCount: 0,
        };
      }
      storeStats[order.storeId].revenue += order.salePrice;
      storeStats[order.storeId].cost += order.totalCost;
      storeStats[order.storeId].profit += order.netProfit;
      storeStats[order.storeId].orderCount += 1;
    }

    // Günlük kar verisi (grafik için)
    const dailyData: Record<string, { date: string; revenue: number; cost: number; profit: number }> = {};
    for (const order of orders) {
      const dateKey = order.orderDate.toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, revenue: 0, cost: 0, profit: 0 };
      }
      dailyData[dateKey].revenue += order.salePrice;
      dailyData[dateKey].cost += order.totalCost;
      dailyData[dateKey].profit += order.netProfit;
    }

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalProductCost,
        totalShippingCost,
        totalEtsyFees,
        totalCost,
        totalProfit,
        profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        orderCount: orders.length,
      },
      storeStats: Object.values(storeStats),
      dailyData: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        orderDate: o.orderDate,
        salePrice: o.salePrice,
        totalCost: o.totalCost,
        netProfit: o.netProfit,
        profitMargin: o.profitMargin,
        store: o.store,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Veri alınamadı' }, { status: 500 });
  }
}
