import type { CalendarProvider } from '@/src/entities/models/calendar-connection';

/** El ícono del proveedor del Calendario conectado: la "G" de Google o los cuatro cuadrados de Microsoft. */
export function ProviderIcon({ provider, className }: { provider: CalendarProvider; className?: string }) {
    if (provider === 'MICROSOFT') {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
                <rect x="2" y="2" width="9.5" height="9.5" fill="#f25022" />
                <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7fba00" />
                <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00a4ef" />
                <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#ffb900" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
            <path fill="#4285f4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8.1z" />
            <path fill="#34a853" d="M12 23c3 0 5.5-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z" />
            <path fill="#fbbc05" d="M5.8 14.2a6.600 6.600 0 0 1 0-4.300V7.100H2.200a11 11 0 0 0 0 9.900z" />
            <path fill="#ea4335" d="M12 5.4c1.6 0 3.100.6 4.200 1.700l3.100-3.100A11 11 0 0 0 2.200 7.100l3.600 2.800C6.700 7.300 9.100 5.400 12 5.400z" />
        </svg>
    );
}
