import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone is only needed for self-hosting; Vercel's build adapter provides its own output.
  output: process.env.VERCEL === '1' ? undefined : 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none';" },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/descobrir', destination: '/filmes-series/descobrir', permanent: true },
      { source: '/minha-lista', destination: '/filmes-series/minha-lista', permanent: true },
      { source: '/titulo/:id', destination: '/filmes-series/titulo/:id', permanent: true },
      {
        source: '/filmes/melhores-avaliados',
        destination: '/filmes-series/filmes/melhores-avaliados',
        permanent: true,
      },
      {
        source: '/series/melhores-avaliadas',
        destination: '/filmes-series/series/melhores-avaliadas',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
