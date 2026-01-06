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
};

module.exports = nextConfig;

