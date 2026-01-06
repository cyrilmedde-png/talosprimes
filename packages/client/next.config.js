/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pour production avec nom de domaine
  output: 'standalone',
  
  // Variables d'environnement publiques
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  
  // Images (si vous utilisez next/image)
  images: {
    domains: [],
  },
};

module.exports = nextConfig;

