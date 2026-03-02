import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;

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

      // İlk bağlantıda mevcut durumu gönder
      const initialData = await getQuickStats(userId);
      send('init', initialData);

      // Her 10 saniyede bir değişiklik kontrolü
      let lastOrderCount = initialData.totalOrders;
      let lastPendingCount = initialData.pendingOrders;

      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        try {
          const current = await getQuickStats(userId);

          // Yeni sipariş geldi mi?
          if (current.totalOrders > lastOrderCount) {
            const diff = current.totalOrders - lastOrderCount;
            // Son eklenen siparişleri getir
            const newOrders = await prisma.order.findMany({
              where: {
                store: { userId },
              },
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

          // Durum değişikliği
          if (current.pendingOrders !== lastPendingCount) {
            send('status_change', {
              pendingOrders: current.pendingOrders,
              prevPending: lastPendingCount,
            });
          }

          // Genel güncelleme (her zaman gönder)
          send('update', current);

          lastOrderCount = current.totalOrders;
          lastPendingCount = current.pendingOrders;
        } catch (error) {
          // Hata olursa devam et
        }
      }, 10000); // 10 saniye

      // Heartbeat - bağlantıyı canlı tut
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

      // Cleanup on abort
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

async function getQuickStats(userId: string) {
  const [totalOrders, pendingOrders, openIssues] = await Promise.all([
    prisma.order.count({
      where: { store: { userId } },
    }),
    prisma.order.count({
      where: {
        store: { userId },
        status: { in: ['NEW', 'PROCESSING', 'PRODUCTION', 'READY'] },
      },
    }),
    prisma.issue.count({
      where: {
        store: { userId },
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    }),
  ]);

  return { totalOrders, pendingOrders, openIssues };
}
