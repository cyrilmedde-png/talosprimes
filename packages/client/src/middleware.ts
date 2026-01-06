import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Vérifier si l'utilisateur est sur une route protégée
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');
  
  if (isDashboardRoute) {
    // Vérifier si le token existe dans les cookies ou headers
    // Pour l'instant, on laisse le client gérer la redirection
    // (car localStorage n'est pas accessible dans middleware)
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};

