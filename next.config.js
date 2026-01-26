const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  swSrc: 'src/sw.js',
  // Dev ortamında PWA kapalı
  disable:
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_PWA_ENABLED !== 'true',
  // Next.js 14 ile uyumsuz dosyaları hariç tut
  buildExcludes: [
    /app-build-manifest\.json$/,
    /build-manifest\.json$/,
    /_buildManifest\.js$/,
    /_ssgManifest\.js$/,
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['i.etsystatic.com'],
  },
};

module.exports = withPWA(nextConfig);
