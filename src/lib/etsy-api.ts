/**
 * Etsy API v3 Entegrasyonu
 * OAuth2 bağlantısı ve sipariş senkronizasyonu.
 */

const ETSY_API_BASE = 'https://api.etsy.com/v3';
const ETSY_OAUTH_BASE = 'https://www.etsy.com/oauth';

// ─── OAuth2 ─────────────────────────────────────────────

export function getEtsyAuthUrl(storeId: string): string {
  const clientId = process.env.ETSY_CLIENT_ID;
  if (!clientId) throw new Error('ETSY_CLIENT_ID env değişkeni tanımlı değil');

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/etsy/callback`;
  const scopes = [
    'transactions_r',
    'transactions_w',
    'listings_r',
    'shops_r',
    'profile_r',
    'email_r',
  ].join('%20');

  const state = Buffer.from(JSON.stringify({ storeId })).toString('base64url');

  // PKCE code verifier - basit implementation
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = codeVerifier; // Etsy plain method kabul ediyor

  return `${ETSY_OAUTH_BASE}/connect?response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&client_id=${clientId}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
}

function generateCodeVerifier(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  for (let i = 0; i < 128; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}> {
  const clientId = process.env.ETSY_CLIENT_ID;
  if (!clientId) throw new Error('ETSY_CLIENT_ID not set');

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/etsy/callback`;

  const res = await fetch(`${ETSY_API_BASE}/public/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const clientId = process.env.ETSY_CLIENT_ID;
  if (!clientId) throw new Error('ETSY_CLIENT_ID not set');

  const res = await fetch(`${ETSY_API_BASE}/public/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error('Token refresh failed');
  }

  return res.json();
}

// ─── API Calls ──────────────────────────────────────────

async function etsyFetch(endpoint: string, accessToken: string, options: RequestInit = {}) {
  const clientId = process.env.ETSY_CLIENT_ID;
  const res = await fetch(`${ETSY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-api-key': clientId || '',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Etsy API error ${res.status}: ${errorText}`);
  }

  return res.json();
}

// Shop bilgisi
export async function getShop(accessToken: string, shopId: string) {
  return etsyFetch(`/application/shops/${shopId}`, accessToken);
}

// Shop siparişleri
export async function getShopReceipts(
  accessToken: string,
  shopId: string,
  options: { limit?: number; offset?: number; minCreated?: number; maxCreated?: number } = {}
) {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());
  if (options.minCreated) params.set('min_created', options.minCreated.toString());
  if (options.maxCreated) params.set('max_created', options.maxCreated.toString());
  params.set('was_paid', 'true');

  const query = params.toString();
  return etsyFetch(`/application/shops/${shopId}/receipts${query ? `?${query}` : ''}`, accessToken);
}

// Tek sipariş detayı
export async function getReceipt(accessToken: string, shopId: string, receiptId: string) {
  return etsyFetch(`/application/shops/${shopId}/receipts/${receiptId}`, accessToken);
}

// Kargo takip bilgisi güncelle
export async function updateReceiptShipping(
  accessToken: string,
  shopId: string,
  receiptId: string,
  trackingCode: string,
  carrierName: string
) {
  return etsyFetch(
    `/application/shops/${shopId}/receipts/${receiptId}/tracking`,
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tracking_code: trackingCode,
        carrier_name: carrierName,
      }),
    }
  );
}

// Receipt'i parse edip Order formatına çevir
export function parseEtsyReceipt(receipt: any) {
  const transactions = receipt.transactions || [];
  const firstTransaction = transactions[0] || {};

  return {
    etsyReceiptId: receipt.receipt_id?.toString(),
    orderNumber: receipt.receipt_id?.toString(),
    customerName: receipt.name || `${receipt.first_line || ''} ${receipt.second_line || ''}`.trim(),
    customerEmail: receipt.buyer_email || null,
    shippingAddress: [
      receipt.first_line,
      receipt.second_line,
      receipt.city,
      receipt.state,
      receipt.zip,
      receipt.country_iso,
    ].filter(Boolean).join(', '),
    shippingCountry: receipt.country_iso || null,
    salePrice: (receipt.grandtotal?.amount || 0) / (receipt.grandtotal?.divisor || 100),
    saleCurrency: receipt.grandtotal?.currency_code || 'USD',
    orderDate: receipt.create_timestamp ? new Date(receipt.create_timestamp * 1000) : new Date(),
    items: transactions.map((t: any) => ({
      title: t.title || 'Etsy Product',
      quantity: t.quantity || 1,
      salePrice: (t.price?.amount || 0) / (t.price?.divisor || 100),
      variations: t.variations || [],
    })),
    isPaid: receipt.was_paid || false,
    isShipped: receipt.was_shipped || false,
  };
}

// Toplu sipariş senkronizasyonu
export async function syncShopOrders(
  prisma: any,
  storeId: string,
  accessToken: string,
  shopId: string,
  since?: Date
) {
  const results = { synced: 0, skipped: 0, errors: 0 };

  try {
    const options: any = { limit: 25 };
    if (since) {
      options.minCreated = Math.floor(since.getTime() / 1000);
    }

    const response = await getShopReceipts(accessToken, shopId, options);
    const receipts = response.results || [];

    for (const receipt of receipts) {
      try {
        const parsed = parseEtsyReceipt(receipt);

        // Daha önce eklenmiş mi kontrol et
        const existing = await prisma.order.findFirst({
          where: {
            storeId,
            OR: [
              { etsyReceiptId: parsed.etsyReceiptId },
              { orderNumber: parsed.orderNumber },
            ],
          },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        // Yeni sipariş oluştur
        await prisma.order.create({
          data: {
            storeId,
            etsyReceiptId: parsed.etsyReceiptId,
            orderNumber: parsed.orderNumber,
            customerName: parsed.customerName,
            customerEmail: parsed.customerEmail,
            shippingAddress: parsed.shippingAddress,
            shippingCountry: parsed.shippingCountry,
            salePrice: parsed.salePrice,
            saleCurrency: parsed.saleCurrency,
            orderDate: parsed.orderDate,
            status: parsed.isShipped ? 'SHIPPED' : 'NEW',
            items: {
              create: parsed.items.map((item: any) => ({
                title: item.title,
                quantity: item.quantity,
                salePrice: item.salePrice,
              })),
            },
          },
        });

        results.synced++;
      } catch (err) {
        results.errors++;
        console.error(`Receipt sync error:`, err);
      }
    }
  } catch (error) {
    console.error('Shop sync error:', error);
    results.errors++;
  }

  return results;
}
