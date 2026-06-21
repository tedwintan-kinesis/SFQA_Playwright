import { NextResponse } from 'next/server';

export function middleware(req) {
  const authHeader = req.headers.get('authorization');

  if (authHeader) {
    try {
      const basicAuth = authHeader.split(' ')[1];
      const [username, password] = atob(basicAuth).split(':');

      const expectedUser = process.env.DASHBOARD_USERNAME || 'sfqas@abx.com';
      const expectedPass = process.env.DASHBOARD_PASSWORD || 'SalesforceQA1234';

      if (username === expectedUser && password === expectedPass) {
        return NextResponse.next();
      }
    } catch (e) {
      console.error('Middleware auth parsing failed:', e);
    }
  }

  return new NextResponse('Authentication Required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
