import Link from 'next/link';
import { CircleAlert } from 'lucide-react';
import { CALENDAR_PATH } from '@/app/routes';
import type { CalendarProvider } from '@/src/entities/models/calendar-connection';
import { calendarDisconnectedNotice } from './calendar-copy';

/** Aviso del panel: el proveedor (Google o Microsoft) dejó de dar acceso al Calendario conectado del Usuario y lo lleva a volver a conectar. */
export function CalendarDisconnectedBanner({ provider }: { provider: CalendarProvider }) {
    return (
        <div role="alert" className="flex items-center gap-2 bg-destructive/10 px-4 py-2 text-sm sm:px-8">
            <CircleAlert className="size-4 shrink-0 text-destructive" />
            <p className="m-0 font-medium">
                {calendarDisconnectedNotice(provider)}{' '}
                <Link href={CALENDAR_PATH} className="underline">
                    Ir a Calendario conectado
                </Link>
            </p>
        </div>
    );
}
