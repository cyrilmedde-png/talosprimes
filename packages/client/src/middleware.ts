import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Sous-domaines réservés (ne pas vérifier en base)
const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'n8n', 'app', 'admin', 'mail', 'smtp', 'ftp']);

// Pages publiques qui n'ont pas besoin de vérification de sous-domaine
const PUBLIC_PATHS = ['/_next', '/favicon.ico', '/api/', '/invalid-space'];

function extractSubdomain(hostname: string): string | null {
  // demo.talosprimes.com → 'demo'
  // talosprimes.com → null
  // localhost:3000 → null
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const domain = parts.slice(-2).join('.');
    if (domain === 'talosprimes.com') {
      return parts[0];
    }
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Ne pas vérifier les assets statiques et pages système
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const subdomain = extractSubdomain(hostname);

  // Pas de sous-domaine (talosprimes.com, localhost) → laisser passer
  if (!subdomain) {
    return NextResponse.next();
  }

  // Sous-domaine réservé → laisser passer
  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    return NextResponse.next();
  }

  // Vérifier si le sous-domaine correspond à un espace client actif
  try {
    const res = await fetch(`${API_URL}/api/tenant/resolve?slug=${encodeURIComponent(subdomain)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Timeout court pour ne pas bloquer le chargement
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.data?.exists) {
        // Espace client valide → laisser passer
        return NextResponse.next();
      }
    }
  } catch {
    // Si le backend est down, laisser passer (dégradation gracieuse)
    return NextResponse.next();
  }

  // Sous-domaine inconnu → rediriger vers page "espace introuvable"
  const url = request.nextUrl.clone();
  url.pathname = '/invalid-space';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
