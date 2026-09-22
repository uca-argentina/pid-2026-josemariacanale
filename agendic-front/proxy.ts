// Next.js/Clerk wiring, not application code: clerkMiddleware() must run here for
// auth()/currentUser() to work at all, so this is unavoidably a second server-side
// import of the Clerk SDK alongside src/infrastructure/services/authentication.service.ts.
import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { SIGN_IN_PATH, SIGNED_IN_HOME_PATH } from '@/app/routes';

// Single place declaring which paths need a Sesión and which are the auth screens.
// Optimistic check only (no session validation); the layouts do the authoritative
// server-side verification (see docs/agents/clean-architecture.md).
const protectedRoutes = [
    '/bookings',
    '/availability',
    '/services',
    '/employees',
    '/branches',
    '/clients',
    '/metrics',
];
const authRoutes = ['/sign-in', '/sign-up'];

export default clerkMiddleware(async (auth, request) => {
    const { pathname } = request.nextUrl;
    const { userId } = await auth();

    if (!userId && protectedRoutes.some((route) => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL(SIGN_IN_PATH, request.url));
    }

    if (userId && authRoutes.includes(pathname)) {
        return NextResponse.redirect(new URL(SIGNED_IN_HOME_PATH, request.url));
    }

    return NextResponse.next();
});

export const config = {
    matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)'],
};
