import prisma from './prisma';

interface CalculateCostsParams {
  storeId: string;
  salePrice: number;
  items: Array<{
    canvasSizeId?: string | null;
    frameOptionId?: string | null;
    quantity: number;
  }>;
  countryId?: string | null;
}

interface CostResult {
  productCost: number;
  shippingCost: number;
  etsyFees: number;
  totalCost: number;
  netProfit: number;
  profitMargin: number;
}

/**
 * Sipariş maliyetlerini hesapla
 */
export async function calculateOrderCosts(params: CalculateCostsParams): Promise<CostResult> {
  const { storeId, salePrice, items, countryId } = params;

  // Mağaza bilgilerini al
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    throw new Error('Mağaza bulunamadı');
  }

  let totalProductCost = 0;
  let totalShippingCost = 0;

  // Her item için maliyet hesapla
  for (const item of items) {
    let itemProductCost = 0;

    if (item.canvasSizeId && item.frameOptionId) {
      // Varyasyon fiyatını bul
      const variant = await prisma.canvasSizeVariant.findUnique({
        where: {
          canvasSizeId_frameOptionId: {
            canvasSizeId: item.canvasSizeId,
            frameOptionId: item.frameOptionId,
          },
        },
      });

      if (variant) {
        itemProductCost = variant.totalCost;
      }

      // Boyut bazlı kargo maliyetini bul
      if (countryId) {
        const shippingRate = await prisma.sizeShippingRate.findUnique({
          where: {
            canvasSizeId_countryId: {
              canvasSizeId: item.canvasSizeId,
              countryId: countryId,
            },
          },
        });

        if (shippingRate) {
          totalShippingCost += shippingRate.shippingCost * item.quantity;
        }
      }
    } else if (item.canvasSizeId) {
      // Sadece boyut seçili, çerçevesiz
      const canvasSize = await prisma.canvasSize.findUnique({
        where: { id: item.canvasSizeId },
      });
      if (canvasSize) {
        itemProductCost = canvasSize.baseCost;
      }
    }

    totalProductCost += itemProductCost * item.quantity;
  }

  // Etsy kesintileri
  const etsyTransactionFee = (salePrice * store.etsyTransactionFee) / 100;
  const etsyPaymentFee = (salePrice * store.etsyPaymentFee) / 100;
  const etsyListingFee = store.etsyListingFee * items.length;
  const etsyFees = etsyTransactionFee + etsyPaymentFee + etsyListingFee;

  const totalCost = totalProductCost + totalShippingCost + etsyFees;
  const netProfit = salePrice - totalCost;
  const profitMargin = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;

  return {
    productCost: totalProductCost,
    shippingCost: totalShippingCost,
    etsyFees,
    totalCost,
    netProfit,
    profitMargin,
  };
}
