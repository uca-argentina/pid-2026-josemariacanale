import Link from 'next/link';
import { CircleAlert } from 'lucide-react';
import { CALENDAR_PATH } from '@/app/routes';

/** Aviso del panel: Google dejó de dar acceso al Calendario conectado del Usuario y lo lleva a volver a conectar. */
export function CalendarDisconnectedBanner() {
    return (
        <div role="alert" className="flex items-center gap-2 bg-destructive/10 px-4 py-2 text-sm sm:px-8">
            <CircleAlert className="size-4 shrink-0 text-destructive" />
            <p className="m-0 font-medium">
                Google dejó de dar acceso a tu calendario.{' '}
                <Link href={CALENDAR_PATH} className="underline">
                    Volvé a conectar
                </Link>
            </p>
        </div>
    );
}
