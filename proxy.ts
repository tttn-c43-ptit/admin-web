import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Base64url-decode a JWT payload (no signature check — UI hint only). */
function decodeJwtRole(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const payload = JSON.parse(json);
    return typeof payload.role === 'string' ? payload.role.toUpperCase() : null;
  } catch {
    return null;
  }
}

/** Routes that only OWNER can access. STAFF hitting these → redirect /tasks. */
const OWNER_ONLY_PREFIXES = [
  '/dashboard',
  '/gardens',
  '/plants',
  '/inventory',
  '/harvests',
  '/reports',
  '/staff',
];

function isOwnerOnly(pathname: string): boolean {
  return OWNER_ONLY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const { pathname } = request.nextUrl;

  // Public / static assets — always pass through
  const isPublicAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico');
  if (isPublicAsset) return NextResponse.next();

  // API routes — pass through (backend handles auth)
  if (pathname.startsWith('/api')) return NextResponse.next();

  // Auth routes: /login and /register are public when NOT logged in
  const isAuthRoute = pathname === '/login' || pathname === '/register';

  // ── Not logged in ──
  if (!token) {
    if (isAuthRoute) return NextResponse.next();
    // Any protected route → login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ── Logged in ──
  const role = decodeJwtRole(token);
  const defaultHome = role === 'STAFF' ? '/tasks' : '/dashboard';

  // Already logged in visiting auth pages → redirect to home
  if (isAuthRoute) {
    return NextResponse.redirect(new URL(defaultHome, request.url));
  }

  // Root → home
  if (pathname === '/') {
    return NextResponse.redirect(new URL(defaultHome, request.url));
  }

  // STAFF trying to access OWNER-only routes → redirect to /tasks
  if (role === 'STAFF' && isOwnerOnly(pathname)) {
    return NextResponse.redirect(new URL('/tasks', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
