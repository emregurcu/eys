/**
 * Bildirim sesleri - MP3 dosyaları
 * public/sound/ altında money.mp3 (sipariş) ve warning.mp3 (sorun) kullanılır.
 */

const ORDER_SOUND_PATH = '/sound/money.mp3';
const ISSUE_SOUND_PATH = '/sound/warning.mp3';

function playMp3(path: string): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  try {
    const audio = new Audio(path);
    audio.volume = 0.7;
    audio.play().catch((e) => console.warn('Bildirim sesi çalınamadı:', e));
    return audio;
  } catch (e) {
    console.warn('Bildirim sesi çalınamadı:', e);
    return null;
  }
}

/** Sipariş bildirimi sesi (yeni sipariş / durum değişikliği) */
export function playOrderNotificationSound() {
  playMp3(ORDER_SOUND_PATH);
}

/** Sorun bildirimi sesi */
export function playIssueNotificationSound() {
  playMp3(ISSUE_SOUND_PATH);
}
