import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const url = request.nextUrl.clone()

  const isAdminDomain = hostname.startsWith('admin.')

  if (isAdminDomain) {
    // On admin.promptex.tech (or admin.localhost), serve '/admin' page directly at root '/'
    if (url.pathname === '/') {
      url.pathname = '/admin'
      return NextResponse.rewrite(url)
    }
  } else {
    // On main domain (www.promptex.tech), block '/admin' and redirect to home '/'
    if (url.pathname.startsWith('/admin')) {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
