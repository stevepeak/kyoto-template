import { type NextRequest, NextResponse } from 'next/server'

type Session = {
  session: { id: string; userId: string } | null
}

const protectedRoutes = ['/dashboard', '/settings', '/profile']
const authRoutes = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if route needs protection
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  )
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))

  // Skip middleware for non-protected routes
  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next()
  }

  // Get session from better-auth using native fetch
  const response = await fetch(
    `${request.nextUrl.origin}/api/auth/get-session`,
    {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    },
  )

  const session: Session = response.ok
    ? await response.json()
    : { session: null }

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !session?.session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Redirect authenticated users from auth routes
  if (isAuthRoute && session?.session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)'],
}
