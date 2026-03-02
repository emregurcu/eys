export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month'; // week, month, quarter, year

    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
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

    const orders = await prisma.order.findMany({
      where: {
        orderDate: { gte: startDate },
      },
      include: {
        store: { select: { id: true, name: true } },
        country: { select: { code: true, name: true } },
        items: {
          include: {
            canvasSize: { select: { name: true, width: true, height: true } },
            frameOption: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { orderDate: 'desc' },
    });

    // ─── Mağaza Karşılaştırma ───
    const storeMap: Record<string, {
      name: string; orders: number; revenue: number; cost: number; profit: number;
      avgOrderValue: number; deliveryRate: number; returnRate: number;
    }> = {};

    orders.forEach((order) => {
      const sid = order.store.id;
      if (!storeMap[sid]) {
        storeMap[sid] = {
          name: order.store.name,
          orders: 0, revenue: 0, cost: 0, profit: 0,
          avgOrderValue: 0, deliveryRate: 0, returnRate: 0,
        };
      }
      const s = storeMap[sid];
      s.orders++;
      s.revenue += order.salePrice;
      s.cost += order.totalCost;
      s.profit += order.netProfit;
    });

    Object.values(storeMap).forEach((s) => {
      s.avgOrderValue = s.orders > 0 ? s.revenue / s.orders : 0;
    });

    const storeComparison = Object.entries(storeMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    // ─── Ülke Bazlı Satış ───
    const countryMap: Record<string, { name: string; orders: number; revenue: number; profit: number }> = {};
    orders.forEach((order) => {
      const countryKey = order.country?.name || order.shippingCountry || 'Bilinmiyor';
      if (!countryMap[countryKey]) {
        countryMap[countryKey] = { name: countryKey, orders: 0, revenue: 0, profit: 0 };
      }
      countryMap[countryKey].orders++;
      countryMap[countryKey].revenue += order.salePrice;
      countryMap[countryKey].profit += order.netProfit;
    });

    const countryAnalysis = Object.values(countryMap)
      .sort((a, b) => b.revenue - a.revenue);

    // ─── En Çok Satan Boyut/Çerçeve ───
    const productMap: Record<string, { name: string; count: number; revenue: number }> = {};
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const key = `${item.canvasSize?.name || 'Belirsiz'} - ${item.frameOption?.name || 'Çerçevesiz'}`;
        if (!productMap[key]) {
          productMap[key] = { name: key, count: 0, revenue: 0 };
        }
        productMap[key].count += item.quantity;
        productMap[key].revenue += item.salePrice * item.quantity;
      });
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ─── Haftalık Performans ───
    const weeklyMap: Record<string, { week: string; orders: number; revenue: number; profit: number }> = {};
    orders.forEach((order) => {
      const d = new Date(order.orderDate);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      if (!weeklyMap[weekKey]) {
        weeklyMap[weekKey] = { week: weekKey, orders: 0, revenue: 0, profit: 0 };
      }
      weeklyMap[weekKey].orders++;
      weeklyMap[weekKey].revenue += order.salePrice;
      weeklyMap[weekKey].profit += order.netProfit;
    });

    const weeklyPerformance = Object.values(weeklyMap).sort((a, b) => a.week.localeCompare(b.week));

    // ─── Durum Dağılımı ───
    const statusMap: Record<string, number> = {};
    orders.forEach((order) => {
      statusMap[order.status] = (statusMap[order.status] || 0) + 1;
    });

    // ─── Özet ───
    const totalRevenue = orders.reduce((sum, o) => sum + o.salePrice, 0);
    const totalCost = orders.reduce((sum, o) => sum + o.totalCost, 0);
    const totalProfit = orders.reduce((sum, o) => sum + o.netProfit, 0);
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
    const avgProfit = orders.length > 0 ? totalProfit / orders.length : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return NextResponse.json({
      period,
      startDate: startDate.toISOString(),
      summary: {
        totalOrders: orders.length,
        totalRevenue,
        totalCost,
        totalProfit,
        avgOrderValue,
        avgProfit,
        profitMargin,
      },
      storeComparison,
      countryAnalysis,
      topProducts,
      weeklyPerformance,
      statusDistribution: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
    });
  } catch (error: any) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
