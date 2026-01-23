import nodemailer from 'nodemailer';

// Email transporter oluştur
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  // SMTP ayarları yoksa gönderme
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('Email gönderilemedi: SMTP ayarları eksik');
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // HTML'den text oluştur
    });

    console.log('Email gönderildi:', info.messageId);
    return true;
  } catch (error) {
    console.error('Email gönderme hatası:', error);
    return false;
  }
}

// Yeni sipariş email şablonu
export function newOrderEmailTemplate(order: any) {
  return {
    subject: `Yeni Sipariş: ${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Yeni Sipariş Alındı</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
          <p><strong>Sipariş No:</strong> ${order.orderNumber}</p>
          <p><strong>Müşteri:</strong> ${order.customerName}</p>
          <p><strong>Ülke:</strong> ${order.shippingCountry || '-'}</p>
          <p><strong>Satış Fiyatı:</strong> $${order.salePrice.toFixed(2)}</p>
          <p><strong>Mağaza:</strong> ${order.store?.name || '-'}</p>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Bu email otomatik olarak gönderilmiştir.
        </p>
      </div>
    `,
  };
}

// Sipariş durum değişikliği email şablonu
export function orderStatusEmailTemplate(order: any, newStatus: string) {
  const statusLabels: Record<string, string> = {
    NEW: 'Yeni',
    PROCESSING: 'İşleniyor',
    PRODUCTION: 'Üretimde',
    READY: 'Hazır',
    SHIPPED: 'Kargoda',
    DELIVERED: 'Teslim Edildi',
    PROBLEM: 'Problem',
  };

  return {
    subject: `Sipariş Durumu Değişti: ${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Sipariş Durumu Güncellendi</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
          <p><strong>Sipariş No:</strong> ${order.orderNumber}</p>
          <p><strong>Yeni Durum:</strong> <span style="color: #0066cc; font-weight: bold;">${statusLabels[newStatus] || newStatus}</span></p>
          <p><strong>Müşteri:</strong> ${order.customerName}</p>
          ${order.trackingNumber ? `<p><strong>Takip No:</strong> ${order.trackingNumber}</p>` : ''}
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Bu email otomatik olarak gönderilmiştir.
        </p>
      </div>
    `,
  };
}

// Yeni sorun email şablonu
export function newIssueEmailTemplate(issue: any) {
  const typeLabels: Record<string, string> = {
    SHIPPING: 'Kargo',
    RETURN: 'İade',
    PRODUCT: 'Ürün',
    CUSTOMER: 'Müşteri',
    OTHER: 'Diğer',
  };

  const priorityLabels: Record<number, string> = {
    1: 'Düşük',
    2: 'Normal',
    3: 'Yüksek',
    4: 'Acil',
  };

  return {
    subject: `Yeni Sorun: ${issue.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">Yeni Sorun Bildirildi</h2>
        <div style="background: #fff3f3; padding: 20px; border-radius: 8px; border-left: 4px solid #d32f2f;">
          <p><strong>Başlık:</strong> ${issue.title}</p>
          <p><strong>Tür:</strong> ${typeLabels[issue.type] || issue.type}</p>
          <p><strong>Öncelik:</strong> ${priorityLabels[issue.priority] || 'Normal'}</p>
          <p><strong>Mağaza:</strong> ${issue.store?.name || '-'}</p>
          ${issue.order ? `<p><strong>Sipariş:</strong> ${issue.order.orderNumber}</p>` : ''}
          ${issue.description ? `<p><strong>Açıklama:</strong> ${issue.description}</p>` : ''}
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Bu email otomatik olarak gönderilmiştir.
        </p>
      </div>
    `,
  };
}

// Günlük özet email şablonu
export function dailySummaryEmailTemplate(stats: {
  totalOrders: number;
  totalRevenue: number;
  totalProfit: number;
  openIssues: number;
}) {
  return {
    subject: `Günlük Özet - ${new Date().toLocaleDateString('tr-TR')}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Günlük Özet</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div style="background: white; padding: 16px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #666; font-size: 12px;">Toplam Sipariş</p>
              <p style="margin: 8px 0 0; font-size: 24px; font-weight: bold; color: #333;">${stats.totalOrders}</p>
            </div>
            <div style="background: white; padding: 16px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #666; font-size: 12px;">Toplam Gelir</p>
              <p style="margin: 8px 0 0; font-size: 24px; font-weight: bold; color: #0066cc;">$${stats.totalRevenue.toFixed(2)}</p>
            </div>
            <div style="background: white; padding: 16px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #666; font-size: 12px;">Net Kar</p>
              <p style="margin: 8px 0 0; font-size: 24px; font-weight: bold; color: ${stats.totalProfit >= 0 ? '#4caf50' : '#d32f2f'};">$${stats.totalProfit.toFixed(2)}</p>
            </div>
            <div style="background: white; padding: 16px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #666; font-size: 12px;">Açık Sorunlar</p>
              <p style="margin: 8px 0 0; font-size: 24px; font-weight: bold; color: ${stats.openIssues > 0 ? '#ff9800' : '#4caf50'};">${stats.openIssues}</p>
            </div>
          </div>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Bu email otomatik olarak gönderilmiştir.
        </p>
      </div>
    `,
  };
}
