// Simple PNG icon generator using pure Node.js
// Creates orange rounded rect with white "D" letter
const fs = require('fs');
const { execSync } = require('child_process');

// Install sharp temporarily
try {
  require.resolve('sharp');
} catch {
  console.log('Installing sharp temporarily...');
  execSync('npm install sharp --no-save', { stdio: 'inherit' });
}

const sharp = require('sharp');

async function generateIcon(size, filename) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.125)}" fill="#F97316"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-weight="bold" font-size="${Math.round(size * 0.6)}" fill="white">D</text>
</svg>`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(filename);
  
  console.log(`Created ${filename} (${size}x${size})`);
}

async function main() {
  await generateIcon(192, 'public/icons/icon-192x192.png');
  await generateIcon(512, 'public/icons/icon-512x512.png');
  await generateIcon(180, 'public/icons/apple-touch-icon.png');
  await generateIcon(384, 'public/icons/icon-384x384.png');
  await generateIcon(256, 'public/icons/icon-256x256.png');
  await generateIcon(144, 'public/icons/icon-144x144.png');
  await generateIcon(96, 'public/icons/icon-96x96.png');
  await generateIcon(72, 'public/icons/icon-72x72.png');
  await generateIcon(48, 'public/icons/icon-48x48.png');
  console.log('All icons generated!');
}

main().catch(console.error);
