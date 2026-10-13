/** @type {import('next').NextConfig} */
const API_BASE = process.env.CERTIWATCH_API_PROXY_TARGET || 'http://localhost:8000';

const nextConfig = {
  reactStrictMode: true,
  // In dev, this proxies /api/* to the Django backend so the session
  // cookie set by Django is treated as same-origin by the browser. In
  // production this app is expected to sit behind the client's reverse
  // proxy (e.g. Nginx) doing the equivalent same-origin routing, so this
  // rewrite is dev-only convenience.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_BASE}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
