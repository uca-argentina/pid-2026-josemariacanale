// Next.js/Clerk wiring, not application code: clerkMiddleware() must run here for
// auth()/currentUser() to work at all, so this is unavoidably a second server-side
// import of the Clerk SDK alongside src/infrastructure/services/authentication.service.ts.
import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';
import { SIGN_IN_PATH, SIGNED_IN_HOME_PATH } from '@/app/routes';
import { AUTH_OFFLINE, OFFLINE_SESSION_COOKIE } from '@/src/entities/models/offline-session';

// Single place declaring which paths need a Sesión and which are the auth screens.
// Optimistic check only (no session validation); the layouts do the authoritative
// server-side verification (see docs/agents/clean-architecture.md).
const protectedRoutes = [
    '/bookings',
    '/availability',
    '/services',
];
const authRoutes = ['/sign-in', '/sign-up'];

function redirectFor(request: NextRequest, userId: string | null | undefined) {
    const { pathname } = request.nextUrl;

    if (!userId && protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
        return NextResponse.redirect(new URL(SIGN_IN_PATH, request.url));
    }

    if (userId && authRoutes.includes(pathname)) {
        return NextResponse.redirect(new URL(SIGNED_IN_HOME_PATH, request.url));
    }

    return NextResponse.next();
}

// Offline (see src/entities/models/offline-session.ts) the Sesión is a cookie and Clerk is never called.
export default AUTH_OFFLINE
    ? (request: NextRequest) => redirectFor(request, request.cookies.get(OFFLINE_SESSION_COOKIE)?.value)
    : clerkMiddleware(async (auth, request) => redirectFor(request, (await auth()).userId));

export const config = {
    matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)'],
};
