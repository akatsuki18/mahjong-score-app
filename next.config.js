/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // 実験的機能の設定
  },
  // Node.jsのバージョン要件を緩和
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  /* config options here */
};

module.exports = nextConfig;
