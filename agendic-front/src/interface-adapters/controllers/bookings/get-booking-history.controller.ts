import { z } from 'zod';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetBookingHistoryUseCase } from '@/src/application/use-cases/bookings/get-booking-history.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { BookingHistoryActor, BookingHistoryEntry, BookingHistoryType } from '@/src/entities/models/booking-history';

/** Qué pasó, como lo ve el Usuario en Mis turnos. */
const ACTION_LABELS: Record<BookingHistoryType, string> = {
    booked: 'Reservado',
    accepted: 'Aceptado',
    rejected: 'Rechazado',
    cancelled: 'Cancelado',
    rescheduled: 'Reagendado',
    noShow: 'Ausencia del Invitado marcada',
    employeeNoShow: 'Ausencia del Anfitrión marcada',
    depositPaid: 'Seña pagada',
    rated: 'Calificado',
};

/** Quién lo hizo, como sigue a "por": en Mis turnos el Empleado es el propio Usuario. */
const ACTOR_LABELS: Record<BookingHistoryActor, string> = { employee: 'vos', client: 'el Cliente', retirement: 'una baja' };

/** Cómo arma un momento el presenter: en qué zona y con qué formato de hora (las Preferencias del Usuario). */
type MomentFormat = { timeZone: string; timeFormat: 12 | 24 };

/** `12 oct 10:03`, o con el día de la semana, `mar 13 oct 10:00`; la hora, en 24 h o como `10:03 a. m.`. */
function formatMoment(at: string, { timeZone, timeFormat }: MomentFormat, withWeekday: boolean) {
    const date = new Date(at);
    const parts = new Intl.DateTimeFormat('es-AR', {
        timeZone,
        ...(withWeekday && { weekday: 'short' }),
        day: 'numeric',
        month: 'short',
    }).formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value.replace(/\./g, '') ?? '';
    const time = new Intl.DateTimeFormat('es-AR', {
        timeZone,
        hour: timeFormat === 24 ? '2-digit' : 'numeric',
        minute: '2-digit',
        hourCycle: timeFormat === 24 ? 'h23' : 'h12',
    })
        .format(date)
        .replace(/[\u00a0\u202f]/g, ' ');
    const day = `${part('day')} ${part('month')} ${time}`;
    return withWeekday ? `${part('weekday')} ${day}` : day;
}

function presenter(entries: BookingHistoryEntry[], format: MomentFormat, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getBookingHistory Presenter', op: 'serialize' }, () =>
        entries.map((entry) => {
            const by = entry.actor ? ` por ${ACTOR_LABELS[entry.actor]}` : '';
            const from = entry.from ? ` desde ${formatMoment(entry.from.startsAt, format, true)}` : '';
            return { text: `${ACTION_LABELS[entry.type]}${by}${from}`, at: formatMoment(entry.at, format, false), reason: entry.reason };
        }),
    );
}

const inputSchema = z.object({
    bookingId: z.number().int().positive(),
    timeZone: z.string().min(1),
    timeFormat: z.union([z.literal(12), z.literal(24)]),
});

/** Tipo del controller ya compuesto, como lo consume `app/`. */
export type IGetBookingHistoryController = ReturnType<typeof getBookingHistoryController>;

/**
 * El Historial del Turno, listo para mostrar como línea de tiempo: cada entrada dice qué pasó y quién lo hizo ("Cancelado
 * por vos"), desde qué horario se Reagendó, cuándo (en `timeZone`, con la hora en `timeFormat`) y el Motivo de
 * cancelación si hay.
 *
 * @throws {UnauthenticatedError} no hay Sesión válida
 * @throws {InputParseError} `bookingId` no es un id válido, falta `timeZone` o `timeFormat` no es 12 ni 24
 * @throws {BookingNotAllowedError} el Turno no es del Empleado logueado
 * @throws {NotFoundError} el Turno no existe
 */
export const getBookingHistoryController =
    (
        instrumentationService: IInstrumentationService,
        authenticationService: IAuthenticationService,
        getBookingHistoryUseCase: IGetBookingHistoryUseCase,
    ) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getBookingHistory Controller' }, async () => {
            await authenticationService.getCurrentUser();
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await getBookingHistoryUseCase(data.bookingId), data, instrumentationService);
        });
