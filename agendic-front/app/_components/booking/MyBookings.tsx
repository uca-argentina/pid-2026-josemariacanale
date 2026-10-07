import type { ReactNode } from 'react';
import { Ban, CalendarCheck, CalendarPlus, CalendarCog, Hourglass, MapPin, type LucideIcon } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { BranchPhoto } from './BranchPhoto';
import { depositFor, endTime, formatDate, formatDuration, formatPrice } from './format';
import type { Booking } from './types';

const ACTIONS = [
    { icon: CalendarPlus, title: 'Agendar recordatorio', detail: 'Sumalo a tu calendario' },
    { icon: MapPin, title: 'Cómo llegar', detail: null },
    { icon: CalendarCog, title: 'Gestionar turno', detail: 'Reagendá o cancelá tu turno' },
];

/**
 * Cómo se ve el Turno según el estado en que lo creó el back. El Turno nace verificado (ADR 0022):
 * un Servicio con Aprobación manual lo crea pendiente, el resto ya aceptado.
 */
const STATUS: Record<Booking['status'], { icon: LucideIcon; badge: string; detail: (b: Booking) => ReactNode }> = {
    PENDING: {
        icon: Hourglass,
        badge: 'Esperando que lo acepten',
        detail: ({ host }) => (
            <>
                {host.name} tiene que aceptar tu turno. Mientras tanto, el horario queda reservado
                para vos.
            </>
        ),
    },
    BOOKED: {
        icon: CalendarCheck,
        badge: 'Turno reservado',
        detail: ({ client, host }) => (
            <>
                Listo, {client.name.split(' ')[0]}: tu turno quedó reservado.
                {host.branch && ` Te esperamos en ${host.branch.address}.`}
            </>
        ),
    },
    REJECTED: {
        icon: Ban,
        badge: 'Turno rechazado',
        detail: ({ host }) => <>{host.name} no aceptó este turno. Podés reservar otro horario.</>,
    },
    CANCELLED: {
        icon: Ban,
        badge: 'Turno cancelado',
        detail: () => <>Este turno está cancelado. Podés reservar otro horario.</>,
    },
};

export function MyBookings({
    booking,
    onBack,
}: {
    booking: Booking;
    onBack: () => void;
}) {
    const { host, service, employeeName, date, time, notes } = booking;
    // Sin Sucursal no hay dirección a la que llegar.
    const actions = ACTIONS.filter((a) => a.detail !== null || host.branch);
    const deposit = depositFor(service);
    const status = STATUS[booking.status];

    return (
        <div className="mx-auto grid w-full max-w-[1400px] flex-1 items-start gap-10 px-4 pt-6 pb-20 sm:px-8 lg:grid-cols-[340px_1fr] lg:px-16">
            <section aria-labelledby="turnos-titulo">
                <h1
                    id="turnos-titulo"
                    className="text-[32px] leading-none font-extrabold tracking-[-0.03em]"
                >
                    Mis turnos
                </h1>

                <h2 className="mt-6 flex items-center gap-2 text-[15px] font-extrabold tracking-[-0.02em]">
                    Próximos
                    <span className="rounded-full bg-foreground px-2 py-px text-[11px] font-bold text-white">
                        1
                    </span>
                </h2>

                <article className="mt-3 flex gap-3 rounded-2xl border border-foreground p-3 ring-1 ring-foreground">
                    <div className="relative size-[86px] shrink-0 overflow-hidden rounded-xl">
                        <BranchPhoto src={booking.coverUrl} sizes="86px" />
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <p className="truncate text-[14.5px] font-bold tracking-[-0.02em]">
                            {host.name}
                        </p>
                        <p className="text-[13px] text-muted-foreground first-letter:uppercase">
                            {formatDate(date)} a las {time}
                        </p>
                        <p className="text-[13px] text-muted-foreground">
                            {formatPrice(service.price)} · 1 servicio
                        </p>
                    </div>
                </article>

                <Button
                    variant="outline"
                    onClick={onBack}
                    className="mt-5 h-auto w-full rounded-xl py-3 text-[14px] font-bold"
                >
                    Volver a {host.name}
                </Button>
            </section>

            <section
                aria-label="Detalle del turno"
                className="overflow-hidden rounded-2xl border border-border"
            >
                <div className="relative h-[240px] sm:h-[320px]">
                    <BranchPhoto
                        src={booking.coverUrl}
                        alt={host.branch ? `Sucursal ${host.branch.name} de ${host.name}` : ''}
                        sizes="(max-width: 1024px) 100vw, 60vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
                    <h2 className="absolute bottom-6 left-6 max-w-[80%] text-[32px] leading-tight font-extrabold tracking-[-0.03em] text-white">
                        {host.name}
                    </h2>
                </div>

                <div className="p-6">
                    <span className="inline-flex items-center gap-2 rounded-full bg-foreground px-3.5 py-1.5 text-[13px] font-bold text-white">
                        <status.icon className="size-4" />
                        {status.badge}
                    </span>

                    <h3 className="mt-4 text-[26px] leading-tight font-extrabold tracking-[-0.03em] first-letter:uppercase sm:text-[32px]">
                        {formatDate(date)} a las {time}
                    </h3>
                    <p className="mt-1 text-[14px] text-muted-foreground">
                        {formatDuration(service.durationMinutes)} de duración, termina{' '}
                        {endTime(time, service.durationMinutes)}
                    </p>

                    <p className="mt-4 max-w-[62ch] rounded-xl bg-muted p-4 text-[13.5px] leading-relaxed">
                        {status.detail(booking)}
                    </p>

                    <ul className="mt-6 flex flex-col">
                        {actions.map(({ icon: Icon, title, detail }) => (
                            <li
                                key={title}
                                className="flex items-center gap-3.5 border-b border-border py-4 last:border-b-0"
                            >
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                                    <Icon className="size-[17px] text-foreground" />
                                </span>
                                <span className="flex min-w-0 flex-col">
                                    <span className="text-[14.5px] font-bold tracking-[-0.02em]">
                                        {title}
                                    </span>
                                    <span className="text-[13px] text-muted-foreground">
                                        {detail ?? host.branch?.address}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ul>

                    <h4 className="mt-7 text-[19px] font-extrabold tracking-[-0.02em]">Resumen</h4>
                    <div className="mt-3 flex items-start justify-between gap-4 text-[14px]">
                        <div>
                            <p className="font-bold tracking-[-0.02em]">{service.name}</p>
                            <p className="mt-0.5 text-[13px] text-muted-foreground">
                                {formatDuration(service.durationMinutes)}
                                {employeeName && ` con ${employeeName}`}
                            </p>
                        </div>
                        <span className="shrink-0 font-bold">{formatPrice(service.price)}</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                        <span className="text-[15px] font-extrabold tracking-[-0.02em]">Total</span>
                        <span className="text-[15px] font-extrabold tracking-[-0.02em]">
                            {formatPrice(service.price)}
                        </span>
                    </div>

                    {/* La Seña es real (Service.depositPercent); cómo se paga sigue siendo de maqueta. */}
                    {deposit && (
                        <dl className="mt-2.5 flex flex-col gap-1.5 text-[13.5px]">
                            <div className="flex items-center justify-between">
                                <dt className="font-bold">
                                    Seña a pagar al confirmar ({deposit.percent}%)
                                </dt>
                                <dd className="font-bold">{formatPrice(deposit.upfront)}</dd>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground">
                                <dt>Resta en el local</dt>
                                <dd>{formatPrice(deposit.rest)}</dd>
                            </div>
                        </dl>
                    )}

                    {notes && (
                        <>
                            <h4 className="mt-7 text-[19px] font-extrabold tracking-[-0.02em]">
                                Tu comentario
                            </h4>
                            <p className="mt-2 max-w-[62ch] rounded-xl bg-muted p-4 text-[13.5px] leading-relaxed">
                                {notes}
                            </p>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
