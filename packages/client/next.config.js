/** @type {import('next').NextConfig} */
const nextConfig = {
  // Variables d'environnement publiques
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_N8N_INSCRIPTION_WEBHOOK: process.env.NEXT_PUBLIC_N8N_INSCRIPTION_WEBHOOK || 'https://n8n.talosprimes.com/webhook/inscription',
  },

  // Images (si vous utilisez next/image)
  images: {
    domains: [],
  },

  // ─── Optimisations de performance ───

  // Compression gzip des pages (Nginx fait déjà la compression, mais ça sert en dev et en fallback)
  compress: true,

  // Optimisation du bundle JS : tree-shake les imports lucide-react
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{ kebabCase member }}',
    },
  },

  // Headers HTTP pour les assets statiques
  async headers() {
    return [
      {
        // Fichiers statiques (_next/static) : cache 1 an (ils ont un hash dans le nom)
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Fonts, images, etc.
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
