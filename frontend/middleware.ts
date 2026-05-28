import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // The backend sets 'access_token' in development and '__Host-access_token' in production
  const hasAuthCookie = 
    request.cookies.has('access_token') || 
    request.cookies.has('__Host-access_token');

  const { pathname } = request.nextUrl;

  // Protect all internal dashboards
  const isProtectedRoute = 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/platform') || 
    pathname.startsWith('/inbox') ||
    pathname.startsWith('/chatbots') ||
    pathname.startsWith('/knowledge') ||
    pathname.startsWith('/settings');

  if (isProtectedRoute && !hasAuthCookie) {
    // Instant server-side redirect to login (0 flashes, 0 loading screens)
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Prevent authenticated users from visiting the login page
  if (pathname === '/login' && hasAuthCookie) {
    // Role-based routing is handled accurately on the client, 
    // but we can safely redirect to the base URL which will handle the rest
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

// Optimize middleware performance by restricting the paths it runs on
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/platform/:path*',
    '/inbox/:path*',
    '/chatbots/:path*',
    '/knowledge/:path*',
    '/settings/:path*',
    '/login'
  ],
};
