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

    const [sizes, frames, variants, shippingRates, orderItemStats] = await Promise.all([
      prisma.canvasSize.findMany({
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.frameOption.findMany({
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.canvasSizeVariant.findMany(),
      prisma.sizeShippingRate.findMany(),
      // Her boyut+çerçeve kombinasyonu için sipariş sayısı
      prisma.orderItem.groupBy({
        by: ['canvasSizeId', 'frameOptionId'],
        _count: { id: true },
        _sum: { totalCost: true, salePrice: true, quantity: true },
      }),
    ]);

    // Boyut bazlı toplam sipariş sayısı
    const sizeOrderCounts: Record<string, number> = {};
    const sizeRevenue: Record<string, number> = {};
    orderItemStats.forEach((stat) => {
      if (stat.canvasSizeId) {
        sizeOrderCounts[stat.canvasSizeId] = (sizeOrderCounts[stat.canvasSizeId] || 0) + (stat._sum.quantity || 0);
        sizeRevenue[stat.canvasSizeId] = (sizeRevenue[stat.canvasSizeId] || 0) + (stat._sum.salePrice || 0);
      }
    });

    // Her boyut için varyant ve kargo bilgisi birleştir
    const products = sizes.map((size) => {
      const sizeVariants = variants
        .filter((v) => v.canvasSizeId === size.id)
        .map((v) => {
          const frame = frames.find((f) => f.id === v.frameOptionId);
          const itemStat = orderItemStats.find(
            (s) => s.canvasSizeId === size.id && s.frameOptionId === v.frameOptionId
          );
          return {
            id: v.id,
            frameOptionId: v.frameOptionId,
            frameName: frame?.name || '-',
            frameCode: frame?.code || '-',
            totalCost: v.totalCost,
            isActive: v.isActive,
            orderCount: itemStat?._sum.quantity || 0,
          };
        });

      const sizeShipping = shippingRates.filter((r) => r.canvasSizeId === size.id);

      return {
        id: size.id,
        name: size.name,
        width: size.width,
        height: size.height,
        baseCost: size.baseCost,
        isActive: size.isActive,
        variants: sizeVariants,
        shippingRateCount: sizeShipping.length,
        totalOrders: sizeOrderCounts[size.id] || 0,
        totalRevenue: sizeRevenue[size.id] || 0,
      };
    });

    // En çok satan varyantlar
    const topVariants = orderItemStats
      .filter((s) => s.canvasSizeId && s.frameOptionId)
      .sort((a, b) => (b._sum.quantity || 0) - (a._sum.quantity || 0))
      .slice(0, 5)
      .map((s) => {
        const size = sizes.find((sz) => sz.id === s.canvasSizeId);
        const frame = frames.find((f) => f.id === s.frameOptionId);
        return {
          sizeName: size?.name || '-',
          frameName: frame?.name || '-',
          orderCount: s._sum.quantity || 0,
          revenue: s._sum.salePrice || 0,
        };
      });

    return NextResponse.json({
      products,
      frames: frames.filter((f) => f.isActive),
      topVariants,
      summary: {
        totalSizes: sizes.filter((s) => s.isActive).length,
        totalFrames: frames.filter((f) => f.isActive).length,
        totalVariants: variants.filter((v) => v.isActive).length,
        totalOrders: Object.values(sizeOrderCounts).reduce((a, b) => a + b, 0),
      },
    });
  } catch (error: any) {
    console.error('Product catalog error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
