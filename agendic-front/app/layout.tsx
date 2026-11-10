import { ClerkProvider } from '@clerk/nextjs';
import { clerkLocalization } from './(public)/(auth)/clerk-localization';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AUTH_OFFLINE } from '@/src/entities/models/offline-session';

const plusJakartaSans = Plus_Jakarta_Sans({
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Agendic — Turnos online para tu negocio',
    description:
        'Organizá tu agenda, reducí las ausencias y dejá de atender turnos por WhatsApp. Agenda online para clínicas, spas, gimnasios y academias.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
    return (
        <html
            lang="es"
            className={`${plusJakartaSans.className} h-full antialiased`}
        >
            <body className="min-h-dvh flex flex-col bg-white text-foreground">
                {/* Offline, ClerkProvider would try to download clerk-js and fail. */}
                {AUTH_OFFLINE ? children : <ClerkProvider localization={clerkLocalization}>{children}</ClerkProvider>}
            </body>
        </html>
    );
}