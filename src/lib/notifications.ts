import prisma from './prisma';
import { sendEmail, newOrderEmailTemplate, orderStatusEmailTemplate, newIssueEmailTemplate } from './email';
import { sendPushToUser } from './push';

export type NotificationType = 
  | 'NEW_ORDER'
  | 'ORDER_STATUS'
  | 'LOW_STOCK'
  | 'ISSUE_CREATED'
  | 'ISSUE_ASSIGNED'
  | 'ISSUE_RESOLVED'
  | 'PAYMENT_RECEIVED'
  | 'SYSTEM';

interface CreateNotificationParams {
  userId: string;
  storeId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}

// Tek kullanıcıya bildirim gönder
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        storeId: params.storeId || null,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data || null,
      },
    });
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
}

// Mağaza yöneticilerine bildirim gönder (opsiyonel: adminleri dahil etme, hariç tutulacak kullanıcılar)
export async function notifyStoreManagers(
  storeId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: any,
  options?: { excludeUserIds?: string[]; includeAdmins?: boolean }
) {
  try {
    const excludeUserIds = options?.excludeUserIds ?? [];
    const includeAdmins = options?.includeAdmins !== false;

    // Mağaza yöneticilerini bul
    const managers = await prisma.storeManager.findMany({
      where: { storeId },
      select: { userId: true },
    });

    const exclude = new Set(excludeUserIds);
    const userIdSet = new Set<string>();
    managers.forEach(m => { if (!exclude.has(m.userId)) userIdSet.add(m.userId); });

    if (includeAdmins) {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true },
      });
      admins.forEach(a => { if (!exclude.has(a.id)) userIdSet.add(a.id); });
    }

    const userIds = Array.from(userIdSet);

    // Bildirimleri oluştur
    const notifications = await prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        storeId,
        type,
        title,
        message,
        data: data || null,
      })),
    });

    // Push bildirimleri
    const url =
      type === 'NEW_ORDER' || type === 'ORDER_STATUS'
        ? '/dashboard/orders'
        : type.startsWith('ISSUE_')
        ? '/dashboard/issues'
        : '/dashboard/notifications';

    try {
      await Promise.allSettled(
        userIds.map((userId) =>
          sendPushToUser(userId, {
            title,
            body: message,
            url,
          })
        )
      );
    } catch (pushError) {
      console.error('Push gönderimi başarısız:', pushError);
    }

    return notifications;
  } catch (error) {
    console.error('Notify store managers error:', error);
    return null;
  }
}

// Tüm adminlere bildirim gönder (in-app + push)
export async function notifyAdmins(
  type: NotificationType,
  title: string,
  message: string,
  data?: any
) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });

    const notifications = await prisma.notification.createMany({
      data: admins.map(admin => ({
        userId: admin.id,
        type,
        title,
        message,
        data: data || null,
      })),
    });

    const url =
      type === 'NEW_ORDER' || type === 'ORDER_STATUS'
        ? '/dashboard/orders'
        : type.startsWith('ISSUE_')
        ? '/dashboard/issues'
        : '/dashboard/notifications';

    try {
      await Promise.allSettled(
        admins.map((admin) =>
          sendPushToUser(admin.id, { title, body: message, url })
        )
      );
    } catch (pushError) {
      console.error('Push gönderimi başarısız:', pushError);
    }

    return notifications;
  } catch (error) {
    console.error('Notify admins error:', error);
    return null;
  }
}

// Sipariş bildirimleri — mağaza yöneticileri + admin anlık bildirim
export async function notifyNewOrder(order: any) {
  // In-app: mağaza yöneticileri (adminleri ayrıca notifyAdmins ile gönderiyoruz)
  const notification = await notifyStoreManagers(
    order.storeId,
    'NEW_ORDER',
    'Yeni Sipariş',
    `${order.customerName} - ${order.orderNumber} (${order.salePrice} ${order.saleCurrency})`,
    { orderId: order.id, orderNumber: order.orderNumber },
    { includeAdmins: false }
  );

  // Adminlere anlık bildirim
  await notifyAdmins(
    'NEW_ORDER',
    'Yeni Sipariş',
    `${order.customerName} - ${order.orderNumber} (${order.salePrice} ${order.saleCurrency})`,
    { orderId: order.id, orderNumber: order.orderNumber }
  );

  // Email bildirim - Admin'lere gönder
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true, email: { not: '' } },
      select: { email: true },
    });
    
    const emails = admins.map(a => a.email).filter(Boolean) as string[];
    if (emails.length > 0) {
      const template = newOrderEmailTemplate(order);
      await sendEmail({ to: emails, ...template });
    }
  } catch (error) {
    console.error('Email gönderme hatası:', error);
  }

  return notification;
}

// Sipariş durumu değişince: mağaza + mağaza yöneticisine bildirim (değişikliği yapan hariç)
export async function notifyOrderStatusChange(
  order: any,
  newStatus: string,
  excludeUserId?: string
) {
  const statusLabels: Record<string, string> = {
    NEW: 'Yeni',
    PROCESSING: 'İşleniyor',
    PRODUCTION: 'Üretimde',
    READY: 'Hazır',
    SHIPPED: 'Kargoda',
    DELIVERED: 'Teslim Edildi',
    PROBLEM: 'Problem',
  };

  // In-app: mağaza yöneticileri + adminler (değişikliği yapan hariç)
  const notification = await notifyStoreManagers(
    order.storeId,
    'ORDER_STATUS',
    'Sipariş Durumu Değişti',
    `${order.orderNumber} → ${statusLabels[newStatus] || newStatus}`,
    { orderId: order.id, orderNumber: order.orderNumber, status: newStatus },
    { excludeUserIds: excludeUserId ? [excludeUserId] : [], includeAdmins: true }
  );

  // Email bildirim - Sadece önemli durumlar için (SHIPPED, DELIVERED, PROBLEM)
  if (['SHIPPED', 'DELIVERED', 'PROBLEM'].includes(newStatus)) {
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true, email: { not: '' } },
        select: { email: true },
      });
      
      const emails = admins.map(a => a.email).filter(Boolean) as string[];
      if (emails.length > 0) {
        const template = orderStatusEmailTemplate(order, newStatus);
        await sendEmail({ to: emails, ...template });
      }
    } catch (error) {
      console.error('Email gönderme hatası:', error);
    }
  }

  return notification;
}

// Sorun bildirimleri — admin + mağaza yöneticileri anlık bildirim
export async function notifyIssueCreated(issue: any) {
  // In-app: mağaza yöneticileri (adminleri ayrıca notifyAdmins ile)
  const notification = await notifyStoreManagers(
    issue.storeId,
    'ISSUE_CREATED',
    'Yeni Sorun Kaydı',
    issue.title,
    { issueId: issue.id },
    { includeAdmins: false }
  );

  // Adminlere her zaman bildirim
  await notifyAdmins(
    'ISSUE_CREATED',
    'Yeni Sorun Kaydı',
    issue.title,
    { issueId: issue.id }
  );

  // Email bildirim - Yüksek öncelikli sorunlar için (3 ve 4)
  if (issue.priority >= 3) {
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true, email: { not: '' } },
        select: { email: true },
      });
      
      const emails = admins.map(a => a.email).filter(Boolean) as string[];
      if (emails.length > 0) {
        const template = newIssueEmailTemplate(issue);
        await sendEmail({ to: emails, ...template });
      }
    } catch (error) {
      console.error('Email gönderme hatası:', error);
    }
  }

  return notification;
}

export async function notifyIssueAssigned(issue: any, assignedUserId: string) {
  return createNotification({
    userId: assignedUserId,
    storeId: issue.storeId,
    type: 'ISSUE_ASSIGNED',
    title: 'Size Sorun Atandı',
    message: issue.title,
    data: { issueId: issue.id },
  });
}
