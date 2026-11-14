import { getSessionCookie } from 'better-auth/cookies'
import { type NextRequest, NextResponse } from 'next/server'

// TODO: list the routes that require a signed-in user.
const protectedRoutes = ['/emails', '/settings', '/workflows']
const authRoutes = ['/login']

/**
 * Cookie-presence check only — no D1 read on every navigation. The real
 * session check happens server-side (tRPC `protectedProcedure`, route
 * handlers); this just routes people to the right page.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = Boolean(getSessionCookie(request))

  const isProtectedRoute = protectedRoutes.some((route) => {
    return pathname.startsWith(route)
  })
  if (isProtectedRoute && !hasSession) {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))
  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)'],
}
