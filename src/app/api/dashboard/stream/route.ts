import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getUserStoreIds(userId: string, role: string): Promise<string[] | null> {
  if (role === 'ADMIN') return null; // null = tüm mağazalar
  const managed = await prisma.storeManager.findMany({
    where: { userId },
    select: { storeId: true },
  });
  return managed.map((s) => s.storeId);
}

function buildStoreWhere(storeIds: string[] | null): Record<string, any> {
  if (!storeIds) return {};
  return { storeId: { in: storeIds } };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const storeIds = await getUserStoreIds(session.user.id, session.user.role || 'USER');
  const storeWhere = buildStoreWhere(storeIds);

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const initialData = await getQuickStats(storeWhere);
      send('init', initialData);

      let lastOrderCount = initialData.totalOrders;
      let lastPendingCount = initialData.pendingOrders;

      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        try {
          const current = await getQuickStats(storeWhere);

          if (current.totalOrders > lastOrderCount) {
            const diff = current.totalOrders - lastOrderCount;
            const newOrders = await prisma.order.findMany({
              where: storeWhere,
              select: {
                id: true,
                orderNumber: true,
                customerName: true,
                salePrice: true,
                status: true,
                store: { select: { name: true } },
              },
              orderBy: { createdAt: 'desc' },
              take: diff,
            });
            send('new_orders', { count: diff, orders: newOrders });
          }

          if (current.pendingOrders !== lastPendingCount) {
            send('status_change', {
              pendingOrders: current.pendingOrders,
              prevPending: lastPendingCount,
            });
          }

          send('update', current);

          lastOrderCount = current.totalOrders;
          lastPendingCount = current.pendingOrders;
        } catch {
          // Hata olursa devam et
        }
      }, 10000);

      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat);
          return;
        }
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          closed = true;
          clearInterval(heartbeat);
          clearInterval(interval);
        }
      }, 30000);

      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

async function getQuickStats(storeWhere: Record<string, any>) {
  const [totalOrders, pendingOrders, openIssues] = await Promise.all([
    prisma.order.count({ where: storeWhere }),
    prisma.order.count({
      where: {
        ...storeWhere,
        status: { in: ['NEW', 'PROCESSING', 'PRODUCTION', 'READY'] },
      },
    }),
    prisma.issue.count({
      where: {
        ...storeWhere,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    }),
  ]);

  return { totalOrders, pendingOrders, openIssues };
}
