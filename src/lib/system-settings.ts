import prisma from './prisma';

const KEY_ORDER_NOTIFICATION_EMAIL = 'order_notification_email';

export async function getOrderNotificationEmail(): Promise<string | null> {
  const row = await prisma.systemSetting.findUnique({
    where: { key: KEY_ORDER_NOTIFICATION_EMAIL },
  });
  const value = row?.value?.trim();
  return value || null;
}

export async function setOrderNotificationEmail(email: string | null): Promise<void> {
  const value = email?.trim() || null;
  await prisma.systemSetting.upsert({
    where: { key: KEY_ORDER_NOTIFICATION_EMAIL },
    create: { key: KEY_ORDER_NOTIFICATION_EMAIL, value },
    update: { value },
  });
}
