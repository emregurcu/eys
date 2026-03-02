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
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const [orders, issues, stores] = await Promise.all([
      // Sipariş araması
      prisma.order.findMany({
        where: {
          OR: [
            { orderNumber: { contains: q, mode: 'insensitive' } },
            { customerName: { contains: q, mode: 'insensitive' } },
            { customerEmail: { contains: q, mode: 'insensitive' } },
            { trackingNumber: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          status: true,
          salePrice: true,
          store: { select: { name: true } },
        },
        take: 5,
        orderBy: { orderDate: 'desc' },
      }),

      // Sorun araması
      prisma.issue.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          status: true,
          type: true,
          store: { select: { name: true } },
        },
        take: 3,
        orderBy: { createdAt: 'desc' },
      }),

      // Mağaza araması
      prisma.store.findMany({
        where: {
          name: { contains: q, mode: 'insensitive' },
        },
        select: {
          id: true,
          name: true,
          isActive: true,
        },
        take: 3,
      }),
    ]);

    const results = [
      ...orders.map((o) => ({
        type: 'order' as const,
        id: o.id,
        title: `#${o.orderNumber}`,
        subtitle: `${o.customerName} · ${o.store.name}`,
        href: `/dashboard/orders`,
        status: o.status,
      })),
      ...issues.map((i) => ({
        type: 'issue' as const,
        id: i.id,
        title: i.title,
        subtitle: `${i.type} · ${i.store.name}`,
        href: `/dashboard/issues`,
        status: i.status,
      })),
      ...stores.map((s) => ({
        type: 'store' as const,
        id: s.id,
        title: s.name,
        subtitle: s.isActive ? 'Aktif' : 'Pasif',
        href: `/dashboard/stores`,
        status: s.isActive ? 'ACTIVE' : 'INACTIVE',
      })),
    ];

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
