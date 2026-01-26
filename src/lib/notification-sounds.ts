/**
 * Bildirim sesleri - Web Audio API ile kısa tonlar
 * Sipariş ve sorun bildirimleri için farklı sesler
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (typeof window === 'undefined') throw new Error('Window undefined');
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.15
) {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Bildirim sesi çalınamadı:', e);
  }
}

/** Sipariş bildirimi sesi (yeni sipariş / durum değişikliği) */
export function playOrderNotificationSound() {
  try {
    playTone(523.25, 0.12, 'sine', 0.12); // C5
    setTimeout(() => playTone(659.25, 0.15, 'sine', 0.12), 100); // E5
  } catch (e) {
    console.warn('Sipariş sesi çalınamadı:', e);
  }
}

/** Sorun bildirimi sesi */
export function playIssueNotificationSound() {
  try {
    playTone(392, 0.15, 'square', 0.08); // G4
    setTimeout(() => playTone(349.23, 0.2, 'square', 0.08), 120); // F4
  } catch (e) {
    console.warn('Sorun sesi çalınamadı:', e);
  }
}
