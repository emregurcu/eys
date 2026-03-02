export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // Kullanıcı rolüne göre mağaza filtresi
    let storeFilter: any = undefined;
    if (session.user.role !== 'ADMIN') {
      const userStores = await prisma.storeManager.findMany({
        where: { userId: session.user.id },
        select: { storeId: true },
      });
      storeFilter = { in: userStores.map((s) => s.storeId) };
    }

    const storeWhere = storeFilter ? { storeId: storeFilter } : {};

    // Tarih hesaplamaları
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Tüm sorguları paralel çalıştır
    const [
      totalOrderCount,
      pendingOrderCount,
      todayOrders,
      monthOrders,
      prevMonthOrders,
      recentOrders,
      openIssues,
      statusCounts,
      storeStats,
      noTrackingOrders,
      stuckOrders,
      last7DaysOrders,
      activities,
    ] = await Promise.all([
      // Toplam sipariş
      prisma.order.count({ where: storeWhere }),

      // Bekleyen siparişler
      prisma.order.count({
        where: {
          ...storeWhere,
          status: { in: ['NEW', 'PROCESSING', 'PRODUCTION', 'READY'] },
        },
      }),

      // Bugünkü siparişler
      prisma.order.findMany({
        where: {
          ...storeWhere,
          orderDate: { gte: todayStart },
        },
        select: { salePrice: true, netProfit: true, totalCost: true },
      }),

      // Bu ay siparişler
      prisma.order.findMany({
        where: {
          ...storeWhere,
          orderDate: { gte: monthStart },
        },
        select: { salePrice: true, netProfit: true, totalCost: true, etsyFees: true },
      }),

      // Geçen ay siparişler (comparison)
      prisma.order.findMany({
        where: {
          ...storeWhere,
          orderDate: { gte: prevMonthStart, lte: prevMonthEnd },
        },
        select: { salePrice: true, netProfit: true, totalCost: true },
      }),

      // Son 5 sipariş
      prisma.order.findMany({
        where: storeWhere,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          status: true,
          salePrice: true,
          netProfit: true,
          orderDate: true,
          store: { select: { name: true } },
        },
        orderBy: [{ orderDate: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),

      // Açık sorunlar (son 5)
      prisma.issue.findMany({
        where: {
          ...storeWhere,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          priority: true,
          createdAt: true,
          store: { select: { name: true } },
          order: { select: { orderNumber: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),

      // Sipariş durumu dağılımı
      prisma.order.groupBy({
        by: ['status'],
        where: storeWhere,
        _count: { status: true },
      }),

      // Mağaza bazlı bu ay özeti
      prisma.order.groupBy({
        by: ['storeId'],
        where: {
          ...storeWhere,
          orderDate: { gte: monthStart },
        },
        _sum: { salePrice: true, netProfit: true, totalCost: true },
        _count: { id: true },
      }),

      // Tracking eklenmemiş kargodaki siparişler
      prisma.order.findMany({
        where: {
          ...storeWhere,
          status: { in: ['READY', 'SHIPPED'] },
          trackingNumber: null,
        },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          status: true,
          orderDate: true,
          store: { select: { name: true } },
        },
        orderBy: { orderDate: 'asc' },
        take: 10,
      }),

      // 3+ gündür bekleyen siparişler (NEW/PROCESSING)
      prisma.order.findMany({
        where: {
          ...storeWhere,
          status: { in: ['NEW', 'PROCESSING'] },
          orderDate: { lte: threeDaysAgo },
        },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          status: true,
          orderDate: true,
          store: { select: { name: true } },
        },
        orderBy: { orderDate: 'asc' },
        take: 10,
      }),

      // Son 7 gün günlük veri (sparkline)
      prisma.order.findMany({
        where: {
          ...storeWhere,
          orderDate: { gte: sevenDaysAgo },
        },
        select: { orderDate: true, salePrice: true, netProfit: true },
        orderBy: { orderDate: 'asc' },
      }),

      // Son aktiviteler
      prisma.activity.findMany({
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          data: true,
          createdAt: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Mağaza isimlerini al
    const storeIds = storeStats.map((s) => s.storeId);
    const storesData = await prisma.store.findMany({
      where: { id: { in: storeIds } },
      select: { id: true, name: true },
    });
    const storeNameMap: Record<string, string> = {};
    storesData.forEach((s) => { storeNameMap[s.id] = s.name; });

    // Bu ay hesaplamalar
    const monthRevenue = monthOrders.reduce((sum, o) => sum + o.salePrice, 0);
    const monthProfit = monthOrders.reduce((sum, o) => sum + o.netProfit, 0);
    const monthCost = monthOrders.reduce((sum, o) => sum + o.totalCost, 0);

    // Geçen ay hesaplamalar
    const prevRevenue = prevMonthOrders.reduce((sum, o) => sum + o.salePrice, 0);
    const prevProfit = prevMonthOrders.reduce((sum, o) => sum + o.netProfit, 0);
    const prevCost = prevMonthOrders.reduce((sum, o) => sum + o.totalCost, 0);

    const calcChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / Math.abs(prev)) * 100;
    };

    // Bugün hesaplamalar
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.salePrice, 0);
    const todayProfit = todayOrders.reduce((sum, o) => sum + o.netProfit, 0);
    const todayCount = todayOrders.length;

    // Günlük sparkline verisi (son 7 gün)
    const dailyMap: Record<string, { date: string; revenue: number; profit: number; count: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { date: key, revenue: 0, profit: 0, count: 0 };
    }
    for (const order of last7DaysOrders) {
      const key = order.orderDate.toISOString().split('T')[0];
      if (dailyMap[key]) {
        dailyMap[key].revenue += order.salePrice;
        dailyMap[key].profit += order.netProfit;
        dailyMap[key].count += 1;
      }
    }

    // Status dağılımı
    const statusDistribution = statusCounts.map((s) => ({
      status: s.status,
      count: s._count.status,
    }));

    // Mağaza özeti
    const storesSummary = storeStats.map((s) => ({
      id: s.storeId,
      name: storeNameMap[s.storeId] || 'Bilinmiyor',
      orderCount: s._count.id,
      revenue: s._sum.salePrice || 0,
      profit: s._sum.netProfit || 0,
      cost: s._sum.totalCost || 0,
    }));

    return NextResponse.json({
      stats: {
        totalOrders: totalOrderCount,
        pendingOrders: pendingOrderCount,
        openIssues: openIssues.length,
        monthRevenue: monthRevenue,
        monthProfit: monthProfit,
        monthCost: monthCost,
        monthOrderCount: monthOrders.length,
      },
      comparison: {
        revenueChange: calcChange(monthRevenue, prevRevenue),
        profitChange: calcChange(monthProfit, prevProfit),
        orderCountChange: calcChange(monthOrders.length, prevMonthOrders.length),
        prevRevenue,
        prevProfit,
        prevOrderCount: prevMonthOrders.length,
      },
      today: {
        revenue: todayRevenue,
        profit: todayProfit,
        orderCount: todayCount,
      },
      sparkline: Object.values(dailyMap),
      statusDistribution,
      storesSummary,
      recentOrders,
      openIssuesList: openIssues,
      pendingActions: {
        noTracking: noTrackingOrders,
        stuckOrders: stuckOrders,
      },
      activities,
    });
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: `Veri alınamadı: ${error.message}` }, { status: 500 });
  }
}
