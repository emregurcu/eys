/**
 * Otomatik İş Kuralları Motoru
 * Belirli koşullar gerçekleştiğinde otomatik aksiyonlar tetikler.
 */

import prisma from './prisma';

export interface AutomationResult {
  ruleName: string;
  affected: number;
  details: string[];
}

// Kural 1: X gün bekleyen siparişlere uyarı
async function ruleStaleOrderAlert(daysThreshold = 3): Promise<AutomationResult> {
  const result: AutomationResult = {
    ruleName: `${daysThreshold}+ gündür bekleyen sipariş uyarısı`,
    affected: 0,
    details: [],
  };

  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

  const staleOrders = await prisma.order.findMany({
    where: {
      status: { in: ['NEW', 'PROCESSING'] },
      orderDate: { lt: thresholdDate },
    },
    include: { store: { select: { name: true } } },
  });

  for (const order of staleOrders) {
    // Daha önce aynı sorun oluşturulmuş mu?
    const existing = await prisma.issue.findFirst({
      where: {
        orderId: order.id,
        type: 'OTHER',
        title: { contains: 'bekliyor' },
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    });

    if (!existing) {
      const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true },
      });

      if (admin) {
        const daysSince = Math.floor((Date.now() - new Date(order.orderDate).getTime()) / (1000 * 60 * 60 * 24));
        await prisma.issue.create({
          data: {
            storeId: order.storeId,
            orderId: order.id,
            type: 'OTHER',
            status: 'OPEN',
            title: `Sipariş ${daysSince} gündür bekliyor - ${order.orderNumber}`,
            description: `"${order.customerName}" müşterisinin siparişi ${daysSince} gündür ${order.status === 'NEW' ? 'yeni' : 'işleniyor'} durumunda. Aksiyon gerekiyor.`,
            priority: daysSince >= 7 ? 4 : 3,
            createdBy: admin.id,
          },
        });
        result.affected++;
        result.details.push(`${order.orderNumber} - ${daysSince} gün`);
      }
    }
  }

  return result;
}

// Kural 2: Ülkeye göre otomatik kargo firması atama
async function ruleAutoAssignCarrier(): Promise<AutomationResult> {
  const result: AutomationResult = {
    ruleName: 'Otomatik kargo firması atama',
    affected: 0,
    details: [],
  };

  // Kargo firması atanmamış, durum READY olan siparişler
  const readyOrders = await prisma.order.findMany({
    where: {
      status: 'READY',
      trackingCompany: null,
    },
    include: { country: { select: { code: true, name: true } } },
  });

  const carrierMap: Record<string, string> = {
    US: 'USPS',
    GB: 'Royal Mail',
    DE: 'DHL',
    FR: 'La Poste',
    CA: 'Canada Post',
    AU: 'Australia Post',
    TR: 'PTT',
    NL: 'PostNL',
    IT: 'Poste Italiane',
    ES: 'Correos',
  };

  for (const order of readyOrders) {
    const countryCode = order.country?.code || order.shippingCountry?.toUpperCase();
    const carrier = countryCode ? carrierMap[countryCode] : null;

    if (carrier) {
      await prisma.order.update({
        where: { id: order.id },
        data: { trackingCompany: carrier },
      });
      result.affected++;
      result.details.push(`${order.orderNumber} -> ${carrier} (${countryCode})`);
    }
  }

  return result;
}

// Kural 3: Yüksek tutarlı siparişlere otomatik önceliklendirme
async function ruleHighValuePriority(threshold = 100): Promise<AutomationResult> {
  const result: AutomationResult = {
    ruleName: `$${threshold}+ siparişlere öncelik`,
    affected: 0,
    details: [],
  };

  const highValueOrders = await prisma.order.findMany({
    where: {
      status: 'NEW',
      salePrice: { gte: threshold },
    },
    select: { id: true, orderNumber: true, salePrice: true, notes: true },
  });

  for (const order of highValueOrders) {
    const hasTag = order.notes?.includes('[YÜKSEK-DEĞER]');
    if (!hasTag) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          notes: `[YÜKSEK-DEĞER] ${order.notes || ''}`.trim(),
          status: 'PROCESSING', // Otomatik olarak işleniyor durumuna al
        },
      });
      result.affected++;
      result.details.push(`${order.orderNumber} - $${order.salePrice}`);
    }
  }

  return result;
}

// Kural 4: Kargoya verildikten sonra takip numarası yoksa uyarı
async function ruleNoTrackingAlert(): Promise<AutomationResult> {
  const result: AutomationResult = {
    ruleName: 'Takip numarası eksik uyarısı',
    affected: 0,
    details: [],
  };

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const shippedWithoutTracking = await prisma.order.findMany({
    where: {
      status: 'SHIPPED',
      trackingNumber: null,
      shippedDate: { lt: twoDaysAgo },
    },
    include: { store: { select: { name: true } } },
  });

  for (const order of shippedWithoutTracking) {
    const existing = await prisma.issue.findFirst({
      where: {
        orderId: order.id,
        type: 'SHIPPING',
        title: { contains: 'takip numarası' },
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    });

    if (!existing) {
      const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true },
      });

      if (admin) {
        await prisma.issue.create({
          data: {
            storeId: order.storeId,
            orderId: order.id,
            type: 'SHIPPING',
            status: 'OPEN',
            title: `Eksik takip numarası - ${order.orderNumber}`,
            description: `Sipariş kargoya verildi ancak 2+ gündür takip numarası eklenmemiş.`,
            priority: 3,
            createdBy: admin.id,
          },
        });
        result.affected++;
        result.details.push(`${order.orderNumber} (${order.store.name})`);
      }
    }
  }

  return result;
}

// Ana otomasyon çalıştırıcısı
export async function runAllRules(): Promise<AutomationResult[]> {
  const results: AutomationResult[] = [];

  results.push(await ruleStaleOrderAlert(3));
  results.push(await ruleAutoAssignCarrier());
  results.push(await ruleHighValuePriority(100));
  results.push(await ruleNoTrackingAlert());

  return results;
}
