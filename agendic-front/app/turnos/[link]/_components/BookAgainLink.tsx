import Link from 'next/link';
import type { ClientBooking } from '@/app/_components/client-booking/types';
import { bookAgainPath } from '@/app/routes';

/**
 * Lleva a reservar otro Turno donde se reservó este: la Sucursal, o la página del Usuario en un Servicio personal.
 * Va en cualquier estado del Turno, porque desde uno cancelado o rechazado es justo lo que se quiere hacer.
 */
export function BookAgainLink({ booking }: { booking: ClientBooking }) {
    const path = bookAgainPath(booking);
    if (!path) return null;

    return (
        <Link
            href={path}
            className="mt-6 self-start text-[14px] font-bold text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
            Reservar de nuevo
        </Link>
    );
}
