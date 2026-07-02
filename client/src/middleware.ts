import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/signup(.*)',
  '/api/health',
])

export default clerkMiddleware((auth, request) => {
  // All routes are public unless protected explicitly
  // Route protection is handled client-side via AuthContext
}, {
  secretKey: process.env.CLERK_SECRET_KEY || 'sk_test_y7A2jp6d9b4PwozIC9zJwZwDQLBJS2UhsK35Gwh0iV',
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_c2VsZWN0LWdyb3VzZS02My5jbGVyay5hY2NvdW50cy5kZXYk'
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
}
