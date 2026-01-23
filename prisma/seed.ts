import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Admin kullanıcı oluştur
  const adminPassword = await hash('admin123', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin Kullanıcı',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('Admin kullanıcı oluşturuldu:', admin.email);

  // Demo mağaza
  const store = await prisma.store.upsert({
    where: { etsyShopId: 'canvasart' },
    update: {},
    create: {
      name: 'Canvas Art Store',
      etsyShopId: 'canvasart',
      isActive: true,
      currency: 'USD',
      etsyTransactionFee: 6.5,
      etsyPaymentFee: 4,
      etsyListingFee: 0.20,
    },
  });

  console.log('Mağaza oluşturuldu:', store.name);

  // Kanvas Boyutları
  const sizes = [
    { name: '20x30 cm', width: 20, height: 30, baseCost: 5.00, sortOrder: 1 },
    { name: '30x40 cm', width: 30, height: 40, baseCost: 7.50, sortOrder: 2 },
    { name: '40x60 cm', width: 40, height: 60, baseCost: 12.00, sortOrder: 3 },
    { name: '50x70 cm', width: 50, height: 70, baseCost: 18.00, sortOrder: 4 },
    { name: '60x90 cm', width: 60, height: 90, baseCost: 25.00, sortOrder: 5 },
    { name: '80x120 cm', width: 80, height: 120, baseCost: 40.00, sortOrder: 6 },
  ];

  for (const size of sizes) {
    await prisma.canvasSize.upsert({
      where: { width_height: { width: size.width, height: size.height } },
      update: size,
      create: size,
    });
  }
  console.log('Kanvas boyutları oluşturuldu');

  // Çerçeve Seçenekleri
  const frames = [
    { name: 'Çerçevesiz', code: 'none', sortOrder: 1 },
    { name: 'Siyah Çerçeve', code: 'black', sortOrder: 2 },
    { name: 'Beyaz Çerçeve', code: 'white', sortOrder: 3 },
    { name: 'Ahşap Çerçeve', code: 'wood', sortOrder: 4 },
    { name: 'Altın Çerçeve', code: 'gold', sortOrder: 5 },
  ];

  for (const frame of frames) {
    await prisma.frameOption.upsert({
      where: { code: frame.code },
      update: frame,
      create: frame,
    });
  }
  console.log('Çerçeve seçenekleri oluşturuldu');

  // Ülkeler
  const countriesData = [
    { code: 'US', name: 'Amerika', sortOrder: 1 },
    { code: 'GB', name: 'İngiltere', sortOrder: 2 },
    { code: 'DE', name: 'Almanya', sortOrder: 3 },
    { code: 'FR', name: 'Fransa', sortOrder: 4 },
    { code: 'CA', name: 'Kanada', sortOrder: 5 },
    { code: 'AU', name: 'Avustralya', sortOrder: 6 },
    { code: 'IT', name: 'İtalya', sortOrder: 7 },
    { code: 'ES', name: 'İspanya', sortOrder: 8 },
    { code: 'NL', name: 'Hollanda', sortOrder: 9 },
    { code: 'TR', name: 'Türkiye', sortOrder: 10 },
  ];

  for (const country of countriesData) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: country,
      create: country,
    });
  }
  console.log('Ülkeler oluşturuldu');

  // Varyasyon fiyatları (her boyut için her çerçeve)
  const allSizes = await prisma.canvasSize.findMany();
  const allFrames = await prisma.frameOption.findMany();
  const allCountries = await prisma.country.findMany();

  for (const size of allSizes) {
    for (const frame of allFrames) {
      // Varsayılan fiyat hesapla: baseCost + (çerçeve için ek maliyet)
      let additionalCost = 0;
      if (frame.code === 'black' || frame.code === 'white') {
        additionalCost = (size.width + size.height) * 2 * 0.15; // çevre * 0.15
      } else if (frame.code === 'wood') {
        additionalCost = (size.width + size.height) * 2 * 0.25;
      } else if (frame.code === 'gold') {
        additionalCost = (size.width + size.height) * 2 * 0.35;
      }
      
      const totalCost = size.baseCost + additionalCost;

      await prisma.canvasSizeVariant.upsert({
        where: {
          canvasSizeId_frameOptionId: {
            canvasSizeId: size.id,
            frameOptionId: frame.id,
          },
        },
        update: { totalCost },
        create: {
          canvasSizeId: size.id,
          frameOptionId: frame.id,
          totalCost,
        },
      });
    }

    // Boyut bazlı kargo fiyatları
    for (const country of allCountries) {
      // Boyuta göre kargo maliyeti hesapla
      const area = size.width * size.height;
      let baseShipping = 10; // Minimum kargo

      if (area <= 1200) baseShipping = 12; // 20x30, 30x40
      else if (area <= 3000) baseShipping = 15; // 40x60
      else if (area <= 5000) baseShipping = 20; // 50x70
      else if (area <= 7000) baseShipping = 28; // 60x90
      else baseShipping = 38; // 80x120+

      // Ülkeye göre çarpan
      let multiplier = 1;
      if (country.code === 'AU') multiplier = 1.5;
      else if (country.code === 'CA') multiplier = 1.2;
      else if (country.code === 'TR') multiplier = 0.4;

      const shippingCost = Math.round(baseShipping * multiplier * 100) / 100;

      await prisma.sizeShippingRate.upsert({
        where: {
          canvasSizeId_countryId: {
            canvasSizeId: size.id,
            countryId: country.id,
          },
        },
        update: { shippingCost },
        create: {
          canvasSizeId: size.id,
          countryId: country.id,
          shippingCost,
        },
      });
    }
  }
  console.log('Varyasyon ve kargo fiyatları oluşturuldu');

  console.log('\n✅ Seed tamamlandı!');
  console.log('\nGiriş bilgileri:');
  console.log('Email: admin@example.com');
  console.log('Şifre: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
