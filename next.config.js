/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // 実験的機能の設定
  },
  // Node.jsのバージョン要件を緩和
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  eslint: {
    // ビルド時のESLintチェックを無効化
    ignoreDuringBuilds: true,
  },
  /* config options here */
};

module.exports = nextConfig;
