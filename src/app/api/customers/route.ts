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

    // Tüm siparişlerden müşteri verisi aggregate et
    const orders = await prisma.order.findMany({
      select: {
        customerName: true,
        customerEmail: true,
        shippingCountry: true,
        salePrice: true,
        netProfit: true,
        totalCost: true,
        status: true,
        orderDate: true,
        store: { select: { name: true } },
        country: { select: { name: true } },
      },
      orderBy: { orderDate: 'desc' },
    });

    // Müşteri adına göre grupla
    const customerMap: Record<string, {
      name: string;
      email: string | null;
      country: string | null;
      orders: number;
      totalSpent: number;
      totalProfit: number;
      avgOrderValue: number;
      firstOrder: string;
      lastOrder: string;
      stores: Set<string>;
      statuses: Record<string, number>;
    }> = {};

    orders.forEach((order) => {
      const key = order.customerName.trim().toLowerCase();
      if (!customerMap[key]) {
        customerMap[key] = {
          name: order.customerName,
          email: order.customerEmail,
          country: order.country?.name || order.shippingCountry,
          orders: 0,
          totalSpent: 0,
          totalProfit: 0,
          avgOrderValue: 0,
          firstOrder: order.orderDate.toISOString(),
          lastOrder: order.orderDate.toISOString(),
          stores: new Set(),
          statuses: {},
        };
      }

      const c = customerMap[key];
      c.orders++;
      c.totalSpent += order.salePrice;
      c.totalProfit += order.netProfit;
      if (order.customerEmail) c.email = order.customerEmail;
      if (order.country?.name) c.country = order.country.name;
      else if (order.shippingCountry) c.country = order.shippingCountry;
      c.stores.add(order.store.name);
      c.statuses[order.status] = (c.statuses[order.status] || 0) + 1;

      if (new Date(order.orderDate) < new Date(c.firstOrder)) {
        c.firstOrder = order.orderDate.toISOString();
      }
      if (new Date(order.orderDate) > new Date(c.lastOrder)) {
        c.lastOrder = order.orderDate.toISOString();
      }
    });

    const customers = Object.values(customerMap)
      .map((c) => ({
        ...c,
        avgOrderValue: c.orders > 0 ? c.totalSpent / c.orders : 0,
        stores: Array.from(c.stores),
        isRepeat: c.orders > 1,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);

    // Özet istatistikler
    const summary = {
      totalCustomers: customers.length,
      repeatCustomers: customers.filter((c) => c.orders > 1).length,
      avgLifetimeValue: customers.length > 0
        ? customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length
        : 0,
      topCountries: Object.entries(
        customers.reduce((acc, c) => {
          const country = c.country || 'Bilinmiyor';
          acc[country] = (acc[country] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
    };

    return NextResponse.json({ customers, summary });
  } catch (error: any) {
    console.error('Customers error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
