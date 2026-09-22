import { ClerkProvider } from '@clerk/nextjs';
import { clerkLocalization } from './(public)/(auth)/clerk-localization';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

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
                <ClerkProvider localization={clerkLocalization}>{children}</ClerkProvider>
            </body>
        </html>
    );
}