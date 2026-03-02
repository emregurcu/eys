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
    const customStartDate = searchParams.get('startDate');
    const customEndDate = searchParams.get('endDate');
    const orderStatus = searchParams.get('status');

    // Tarih aralığını hesapla
    const now = new Date();
    let startDate: Date;
    let endDate: Date | null = null;

    if (customStartDate) {
      // Custom tarih aralığı
      startDate = new Date(customStartDate);
      if (customEndDate) {
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
      }
    } else {
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
        case 'all':
          startDate = new Date(2000, 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
    }

    // Filtre oluştur
    const where: any = {
      orderDate: endDate
        ? { gte: startDate, lte: endDate }
        : { gte: startDate },
    };

    if (orderStatus && orderStatus !== 'all') {
      where.status = orderStatus;
    }

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

    // Önceki dönem tarih aralığını hesapla (comparison için)
    const currentDuration = (endDate || now).getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1); // mevcut dönem başlangıcından 1ms önce
    prevEndDate.setHours(23, 59, 59, 999);
    const prevStartDate = new Date(prevEndDate.getTime() - currentDuration);

    const prevWhere: any = {
      orderDate: { gte: prevStartDate, lte: prevEndDate },
    };
    if (orderStatus && orderStatus !== 'all') prevWhere.status = orderStatus;
    if (where.storeId) prevWhere.storeId = where.storeId;

    // Mevcut ve önceki dönem siparişlerini paralel getir
    const [orders, prevOrders] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { store: { select: { id: true, name: true } } },
      }),
      period !== 'all' && !(!customStartDate && period === 'all')
        ? prisma.order.findMany({
            where: prevWhere,
            select: {
              salePrice: true,
              totalCost: true,
              netProfit: true,
              orderDate: true,
            },
          })
        : Promise.resolve([]),
    ]);

    // Toplam hesaplamalar
    const totalRevenue = orders.reduce((sum, o) => sum + o.salePrice, 0);
    const totalProductCost = orders.reduce((sum, o) => sum + o.productCost, 0);
    const totalShippingCost = orders.reduce((sum, o) => sum + o.shippingCost, 0);
    const totalEtsyFees = orders.reduce((sum, o) => sum + o.etsyFees, 0);
    const totalCost = orders.reduce((sum, o) => sum + o.totalCost, 0);
    const totalProfit = orders.reduce((sum, o) => sum + o.netProfit, 0);

    // Önceki dönem hesaplamaları
    const prevRevenue = prevOrders.reduce((sum, o) => sum + o.salePrice, 0);
    const prevCost = prevOrders.reduce((sum, o) => sum + o.totalCost, 0);
    const prevProfit = prevOrders.reduce((sum, o) => sum + o.netProfit, 0);
    const prevOrderCount = prevOrders.length;

    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    const comparison = {
      revenueChange: calcChange(totalRevenue, prevRevenue),
      costChange: calcChange(totalCost, prevCost),
      profitChange: calcChange(totalProfit, prevProfit),
      orderCountChange: calcChange(orders.length, prevOrderCount),
      prevRevenue,
      prevCost,
      prevProfit,
      prevOrderCount,
    };

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
      comparison,
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
