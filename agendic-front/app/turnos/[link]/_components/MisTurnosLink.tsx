import Link from 'next/link';
import { MIS_TURNOS_PATH } from '@/app/routes';

/** Lleva a Mis turnos, para ver los demás Turnos del mismo email. */
export function MisTurnosLink() {
    return (
        <Link
            href={MIS_TURNOS_PATH}
            className="mt-6 self-start text-[14px] font-bold text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
            Ver todos mis turnos
        </Link>
    );
}
