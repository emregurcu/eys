/**
 * Kargo Takip Servisi
 * Farklı kargo firmalarının API'lerinden takip bilgisi çeker.
 * Cron job veya API endpoint ile çağrılarak sipariş durumlarını otomatik günceller.
 */

export interface TrackingEvent {
  date: string;
  status: string;
  location?: string;
  description: string;
}

export interface TrackingResult {
  carrier: string;
  trackingNumber: string;
  status: 'in_transit' | 'delivered' | 'exception' | 'unknown';
  estimatedDelivery?: string;
  events: TrackingEvent[];
  lastUpdate?: string;
}

// Kargo firması URL'leri (kullanıcının takip için tıklayabileceği)
export function getTrackingUrl(carrier: string, trackingNumber: string): string | null {
  const c = carrier.toLowerCase().trim();
  const tn = trackingNumber.trim();

  if (c.includes('dhl')) return `https://www.dhl.com/tr-en/home/tracking/tracking-express.html?submit=1&tracking-id=${tn}`;
  if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${tn}`;
  if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${tn}`;
  if (c.includes('usps')) return `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${tn}`;
  if (c.includes('royal mail')) return `https://www.royalmail.com/track-your-item#/tracking-results/${tn}`;
  if (c.includes('ptt') || c.includes('posta')) return `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${tn}`;
  if (c.includes('yurtici') || c.includes('yurtiçi')) return `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${tn}`;
  if (c.includes('aras')) return `https://www.araskargo.com.tr/tanimlar/gonderi_takip.aspx?q=${tn}`;
  if (c.includes('mng')) return `https://www.mngkargo.com.tr/gonderi-takip/?q=${tn}`;
  if (c.includes('sürat') || c.includes('surat')) return `https://www.suratkargo.com.tr/gonderi-takip?q=${tn}`;
  if (c.includes('tnt')) return `https://www.tnt.com/express/en_gc/site/shipping-tools/tracking.html?searchType=con&cons=${tn}`;
  if (c.includes('dpd')) return `https://tracking.dpd.de/status/en_US/parcel/${tn}`;
  if (c.includes('gls')) return `https://gls-group.eu/EU/en/parcel-tracking?match=${tn}`;
  if (c.includes('hermes')) return `https://www.myhermes.co.uk/tracking/${tn}`;

  // 17track universal
  return `https://t.17track.net/en#nums=${tn}`;
}

// Tahmini teslimat süresi (gün) - basit tahmin
export function estimateDeliveryDays(carrier: string, country?: string): { min: number; max: number } {
  const c = carrier.toLowerCase().trim();
  const isTurkey = country?.toLowerCase().includes('turkey') || country?.toLowerCase().includes('türkiye') || country?.toUpperCase() === 'TR';

  if (isTurkey) {
    if (c.includes('ptt')) return { min: 2, max: 5 };
    if (c.includes('yurtici') || c.includes('yurtiçi')) return { min: 1, max: 3 };
    if (c.includes('aras')) return { min: 1, max: 3 };
    if (c.includes('mng')) return { min: 1, max: 3 };
    if (c.includes('sürat') || c.includes('surat')) return { min: 1, max: 3 };
    return { min: 2, max: 5 };
  }

  // Uluslararası
  if (c.includes('dhl')) return { min: 3, max: 7 };
  if (c.includes('ups')) return { min: 3, max: 7 };
  if (c.includes('fedex')) return { min: 3, max: 7 };
  if (c.includes('usps')) return { min: 7, max: 21 };
  if (c.includes('royal mail')) return { min: 7, max: 14 };
  if (c.includes('ptt')) return { min: 10, max: 30 };

  return { min: 7, max: 21 };
}

// Kargo durumunu kontrol et ve güncelle (batch)
export async function checkAndUpdateShippingStatus(prisma: any): Promise<{
  checked: number;
  updated: number;
  errors: number;
}> {
  const result = { checked: 0, updated: 0, errors: 0 };

  try {
    // SHIPPED durumunda olan ve takip numarası olan siparişleri al
    const shippedOrders = await prisma.order.findMany({
      where: {
        status: 'SHIPPED',
        trackingNumber: { not: null },
        shippedDate: { not: null },
      },
      select: {
        id: true,
        trackingNumber: true,
        trackingCompany: true,
        shippedDate: true,
        shippingCountry: true,
        country: { select: { name: true, code: true } },
      },
    });

    for (const order of shippedOrders) {
      result.checked++;
      try {
        if (!order.trackingCompany || !order.shippedDate) continue;

        // Basit süre bazlı kontrol (API entegrasyonu olmadan)
        const country = order.country?.name || order.shippingCountry || '';
        const estimate = estimateDeliveryDays(order.trackingCompany, country);
        const shippedDate = new Date(order.shippedDate);
        const daysSinceShipped = Math.floor(
          (Date.now() - shippedDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Tahmini teslimat süresinin max'ını geçtiyse uyarı oluştur
        if (daysSinceShipped > estimate.max) {
          // Daha önce uyarı oluşturulmuş mu kontrol et
          const existingIssue = await prisma.issue.findFirst({
            where: {
              orderId: order.id,
              type: 'SHIPPING',
              status: { in: ['OPEN', 'IN_PROGRESS'] },
              title: { contains: 'gecikme' },
            },
          });

          if (!existingIssue) {
            const orderData = await prisma.order.findUnique({
              where: { id: order.id },
              select: { storeId: true, orderNumber: true },
            });

            if (orderData) {
              // Admin kullanıcısını bul
              const admin = await prisma.user.findFirst({
                where: { role: 'ADMIN', isActive: true },
                select: { id: true },
              });

              if (admin) {
                await prisma.issue.create({
                  data: {
                    storeId: orderData.storeId,
                    orderId: order.id,
                    type: 'SHIPPING',
                    status: 'OPEN',
                    title: `Kargo gecikme uyarısı - ${orderData.orderNumber}`,
                    description: `Sipariş ${daysSinceShipped} gündür kargoda. Tahmini teslimat süresi ${estimate.min}-${estimate.max} gündü.`,
                    priority: 3,
                    createdBy: admin.id,
                  },
                });
                result.updated++;
              }
            }
          }
        }
      } catch (err) {
        result.errors++;
        console.error(`Tracking check error for order ${order.id}:`, err);
      }
    }
  } catch (error) {
    console.error('Batch tracking check error:', error);
    result.errors++;
  }

  return result;
}
