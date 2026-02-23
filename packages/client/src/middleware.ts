import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // Détection du sous-domaine démo → redirection automatique vers /demo
  if (hostname.startsWith('demo.') && !request.nextUrl.pathname.startsWith('/demo')) {
    // Laisser passer les assets statiques et _next
    if (
      request.nextUrl.pathname.startsWith('/_next') ||
      request.nextUrl.pathname.startsWith('/api') ||
      request.nextUrl.pathname.includes('.')
    ) {
      return NextResponse.next();
    }

    // Si déjà sur /dashboard ou autre route protégée, laisser passer (l'user est connecté)
    if (request.nextUrl.pathname.startsWith('/dashboard') ||
        request.nextUrl.pathname.startsWith('/factures') ||
        request.nextUrl.pathname.startsWith('/clients') ||
        request.nextUrl.pathname.startsWith('/devis') ||
        request.nextUrl.pathname.startsWith('/comptabilite') ||
        request.nextUrl.pathname.startsWith('/settings') ||
        request.nextUrl.pathname.startsWith('/assistant') ||
        request.nextUrl.pathname.startsWith('/agent-ia') ||
        request.nextUrl.pathname.startsWith('/onboarding') ||
        request.nextUrl.pathname.startsWith('/avoir') ||
        request.nextUrl.pathname.startsWith('/proforma') ||
        request.nextUrl.pathname.startsWith('/bons-commande') ||
        request.nextUrl.pathname.startsWith('/logs') ||
        request.nextUrl.pathname.startsWith('/notifications')) {
      return NextResponse.next();
    }

    // Rediriger vers /demo pour auto-login
    const url = request.nextUrl.clone();
    url.pathname = '/demo';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
