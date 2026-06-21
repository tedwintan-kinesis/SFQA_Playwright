import { NextResponse } from 'next/server';

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Exclude auth endpoints, login page, and static resources
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Parse cookies manually
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const parts = c.trim().split('=');
      return [parts[0], decodeURIComponent(parts[1] || '')];
    })
  );

  const session = cookies['sfqa_session'];

  if (session) {
    const parts = session.split('|');
    if (parts.length === 2) {
      const username = parts[0];
      const timestamp = parseInt(parts[1], 10);

      if (!isNaN(timestamp)) {
        const created = new Date(timestamp);
        // Calculate midnight (12:00 AM) of the day following session creation
        const midnightAfterCreated = new Date(
          created.getFullYear(),
          created.getMonth(),
          created.getDate() + 1,
          0,
          0,
          0,
          0
        );

        // Session is valid if current time is before the next midnight
        if (Date.now() < midnightAfterCreated.getTime()) {
          return NextResponse.next();
        }
      }
    }
  }

  // If unauthorized API request, return 401 JSON instead of redirecting
  if (pathname.startsWith('/api/')) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized. Session expired or invalid.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Redirect page requests to login page
  const loginUrl = new URL('/login', req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
