import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TalosPrimes - Gestion d\'entreprise automatisée',
  description: 'Plateforme SaaS de gestion d\'entreprise orchestrée par n8n',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

