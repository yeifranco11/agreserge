import { NextResponse } from 'next/server';
export function middleware(req){
  const protectedPath = req.nextUrl.pathname.startsWith('/intranet');
  const session = req.cookies.get('agreserge_session')?.value;
  if(protectedPath && !session){ return NextResponse.redirect(new URL('/', req.url)); }
  return NextResponse.next();
}
export const config = { matcher: ['/intranet/:path*'] };
