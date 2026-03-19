import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';

const PUBLIC_PATHS = ['/', '/login', '/signup', '/verification', '/reset-password'];
const AUTH_ONLY_PATHS = ['/dashboard'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '?'));
  const isAuthOnly = AUTH_ONLY_PATHS.some(p => pathname.startsWith(p));
  const isApiAuth = pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/v1/users/signup') &&
    !pathname.startsWith('/api/v1/users/login') &&
    !pathname.startsWith('/api/v1/users/verify') &&
    !pathname.startsWith('/api/v1/users/send-email') &&
    !pathname.startsWith('/api/v1/users/forgot-password') &&
    !pathname.startsWith('/api/v1/users/reset-password');

  if (isAuthOnly || isApiAuth) {
    const session = await getSessionFromRequest(req);
    if (!session) {
      if (isApiAuth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  if (isPublic && pathname !== '/' && pathname !== '/verification' && pathname !== '/reset-password') {
    const session = await getSessionFromRequest(req);
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
