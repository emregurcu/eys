import webpush from 'web-push';
import prisma from './prisma';

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

let configured = false;

function ensureConfig() {
  if (configured) return;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('VAPID anahtarları eksik');
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY || '';
}

export async function saveSubscription(userId: string, sub: any) {
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    throw new Error('Geçersiz subscription');
  }

  return prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: {
      userId,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    create: {
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
  });
}

export async function removeSubscription(userId: string, endpoint: string) {
  return prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  });
}

export async function sendPushToUser(userId: string, payload: any) {
  ensureConfig();

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { endpoint: true, p256dh: true, auth: true },
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        } as any,
        JSON.stringify(payload)
      )
    )
  );

  return results;
}
