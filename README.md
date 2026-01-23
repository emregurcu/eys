# Etsy Mağaza Yönetim Sistemi

Birden fazla Etsy mağazasını tek panelden yöneten PWA uygulama.

## Özellikler

- 🏪 **Çoklu Mağaza Yönetimi** - Tüm Etsy mağazalarınızı tek yerden yönetin
- 👥 **Kullanıcı Yönetimi** - Admin, Yönetici, Üretici, Görüntüleyici rolleri
- 📦 **Sipariş Takibi** - Sipariş durumlarını takip edin ve güncelleyin
- 🚚 **Kargo Yönetimi** - Kargo takip numaralarını ekleyin
- ⚠️ **Sorun Takibi** - Kargo, iade ve ürün sorunlarını yönetin
- 💰 **Finans Takibi** - Gelir, gider ve karlılık analizi
- 🔔 **Bildirimler** - Yeni sipariş ve sorun bildirimleri
- 📱 **PWA Desteği** - Telefondan yönetim için mobil uygulama

## Teknoloji Stack

- **Frontend:** Next.js 14 (App Router) + React 18
- **UI:** Tailwind CSS + shadcn/ui
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js
- **PWA:** next-pwa

## Kurulum

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Environment Ayarları

`.env.example` dosyasını `.env` olarak kopyalayın ve düzenleyin:

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://user:password@localhost:5432/etsy_manager"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
```

### 3. Veritabanını Hazırla

```bash
# Prisma client oluştur
npm run db:generate

# Database tablolarını oluştur
npm run db:push

# Demo verilerle seed et
npm run db:seed
```

### 4. Uygulamayı Başlat

```bash
# Development
npm run dev

# Production
npm run build
npm run start
```

## Demo Giriş

```
Email: admin@example.com
Şifre: admin123
```

## Kullanıcı Rolleri

| Rol | Yetkiler |
|-----|----------|
| **Admin** | Tüm mağazalara ve ayarlara tam erişim |
| **Manager** | Atanan mağazaları yönetme |
| **Producer** | Sipariş görüntüleme ve durum güncelleme |
| **Viewer** | Sadece görüntüleme |

## Sunucuya Kurulum

### Docker ile (Önerilen)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Manuel Kurulum

1. PostgreSQL kurun
2. Node.js 20+ kurun
3. Yukarıdaki kurulum adımlarını takip edin
4. PM2 veya systemd ile servisi yönetin

```bash
npm install -g pm2
pm2 start npm --name "etsy-manager" -- start
```

## PWA Kurulum

Uygulama PWA desteklidir. Tarayıcınızdan "Ana ekrana ekle" seçeneğini kullanarak telefonunuza kurabilirsiniz.

## Etsy API Entegrasyonu

Mağaza ayarlarından Etsy API anahtarlarınızı ekleyerek otomatik sipariş çekme özelliğini aktif edebilirsiniz.

1. [Etsy Developers](https://www.etsy.com/developers) sayfasından uygulama oluşturun
2. API Key ve Secret'ı mağaza ayarlarına girin
3. OAuth yetkilendirmesini tamamlayın

## Lisans

MIT
