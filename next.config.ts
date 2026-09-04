import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
