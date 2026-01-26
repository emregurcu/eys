/**
 * PWA ikonları oluşturur.
 * Çalıştırma: npm run generate-icons
 * 
 * Not: Bu script basit renkli kare ikonlar oluşturur.
 * Gerçek logo için bu dosyaları kendi ikonlarınızla değiştirin.
 */

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// SVG template - basit bir "D" harfi içeren ikon
const createSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#F97316"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-weight="bold" font-size="${size * 0.6}" fill="white">D</text>
</svg>`;

// Icons klasörünü oluştur
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Her boyut için SVG oluştur (PNG yerine SVG kullanıyoruz, tarayıcılar destekler)
sizes.forEach((size) => {
  const svg = createSvg(size);
  const filePath = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filePath, svg);
  console.log(`Created: ${filePath}`);
});

// Ayrıca favicon.svg oluştur
fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'), createSvg(32));
console.log('Created: public/favicon.svg');

console.log('\n✅ İkonlar oluşturuldu! Gerçek logonuzla değiştirmek için public/icons/ klasörüne PNG dosyaları ekleyin.');
