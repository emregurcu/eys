export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';

interface ImportRow {
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  shippingAddress?: string;
  shippingCountry?: string;
  salePrice: number;
  saleCurrency?: string;
  orderDate?: string;
  status?: string;
  notes?: string;
  trackingNumber?: string;
  trackingCompany?: string;
  storeId: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const { rows, storeId } = await req.json() as { rows: ImportRow[]; storeId: string };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Veri bulunamadı' }, { status: 400 });
    }

    if (!storeId) {
      return NextResponse.json({ error: 'Mağaza seçilmeli' }, { status: 400 });
    }

    // Mağaza var mı kontrol et
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return NextResponse.json({ error: 'Mağaza bulunamadı' }, { status: 404 });
    }

    const results = { created: 0, skipped: 0, errors: 0, errorDetails: [] as string[] };

    for (const row of rows) {
      try {
        if (!row.orderNumber || !row.customerName || !row.salePrice) {
          results.errorDetails.push(`Satır atlandı: Eksik alan (${row.orderNumber || 'no#'})`);
          results.errors++;
          continue;
        }

        // Duplikat kontrolü
        const existing = await prisma.order.findFirst({
          where: {
            storeId,
            orderNumber: row.orderNumber.toString().trim(),
          },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        const validStatuses = ['NEW', 'PROCESSING', 'PRODUCTION', 'READY', 'SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELLED', 'PROBLEM'];
        const status = row.status && validStatuses.includes(row.status.toUpperCase())
          ? row.status.toUpperCase()
          : 'NEW';

        await prisma.order.create({
          data: {
            storeId,
            orderNumber: row.orderNumber.toString().trim(),
            customerName: row.customerName.trim(),
            customerEmail: row.customerEmail?.trim() || null,
            shippingAddress: row.shippingAddress?.trim() || null,
            shippingCountry: row.shippingCountry?.trim() || null,
            salePrice: parseFloat(row.salePrice.toString()) || 0,
            saleCurrency: row.saleCurrency || 'USD',
            orderDate: row.orderDate ? new Date(row.orderDate) : new Date(),
            status: status as any,
            notes: row.notes?.trim() || null,
            trackingNumber: row.trackingNumber?.trim() || null,
            trackingCompany: row.trackingCompany?.trim() || null,
          },
        });

        results.created++;
      } catch (err: any) {
        results.errors++;
        results.errorDetails.push(`Hata (${row.orderNumber}): ${err.message}`);
      }
    }

    await logActivity({
      userId: session.user.id,
      action: 'create',
      entity: 'order',
      entityId: storeId,
      data: {
        type: 'bulk_import',
        created: results.created,
        skipped: results.skipped,
        errors: results.errors,
      },
    });

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
