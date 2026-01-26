/**
 * VAPID anahtarlarını üretir. Çıktıyı .env dosyana kopyala (Vercel'de Environment Variables).
 * Çalıştırma: npm run generate-vapid
 */
const webpush = require('web-push');

const keys = webpush.generateVAPIDKeys();

console.log('\n=== .env dosyana ekle (ve Vercel Environment Variables) ===\n');
console.log('VAPID_PUBLIC_KEY="' + keys.publicKey + '"');
console.log('VAPID_PRIVATE_KEY="' + keys.privateKey + '"');
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY="' + keys.publicKey + '"');
console.log('VAPID_SUBJECT="mailto:admin@example.com"');
console.log('\n=== Sonrasında sunucuyu yeniden başlat ===\n');
