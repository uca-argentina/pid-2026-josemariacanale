import type { BookingStreak, Prize } from '@/src/entities/models/booking-streak';
import type { StreakReward } from '@/src/entities/models/streak-program';

const number = (value: number) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value);

/** Lo que dice un Premio o una Recompensa: el tipo, y el campo que ese tipo usa. */
type Promised = Pick<Prize, 'type' | 'value' | 'description' | 'serviceName'>;

/** Cómo se lee un Premio: `PERCENT_DISCOUNT` "<value>% de descuento", `AMOUNT_DISCOUNT` "$<value> de descuento", `GIFT` su texto, `FREE_SERVICE` "<Servicio> gratis". */
export function prizeText({ type, value, description, serviceName }: Promised): string {
    switch (type) {
        case 'PERCENT_DISCOUNT':
            return `${number(value ?? 0)}% de descuento`;
        case 'AMOUNT_DISCOUNT':
            return `$${number(value ?? 0)} de descuento`;
        case 'GIFT':
            return description ?? '';
        case 'FREE_SERVICE':
            return `${serviceName ?? 'Servicio'} gratis`;
    }
}

const rewardText = ({ type, value, description, service }: StreakReward) => prizeText({ type, value, description, serviceName: service?.name ?? null });

const turnos = (count: number) => (count === 1 ? '1 Turno' : `${count} Turnos`);

/** `13 oct`, en la zona del panel. */
function day(iso: string, timeZone: string) {
    const parts = new Intl.DateTimeFormat('es-AR', { timeZone, day: 'numeric', month: 'short' }).formatToParts(new Date(iso));
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value.replace(/\./g, '') ?? '';
    return `${part('day')} ${part('month')}`;
}

/**
 * El bloque Racha del detalle de un Turno, listo para mostrar; `null` si no hay nada que mostrar: ni Racha en curso ni
 * Premios disponibles. Con el programa apagado hay Racha nula, pero los Premios ya ganados se muestran igual.
 */
export function presentBookingStreak({ streak, nextReward, prizes }: BookingStreak, timeZone: string) {
    if ((!streak || streak.count === 0) && prizes.length === 0) return null;
    return {
        streak: streak && {
            title: streak.count === 0 ? 'Sin Racha en curso' : `Racha de ${turnos(streak.count)}`,
            until: streak.burnsAt ? `Dura hasta el ${day(streak.burnsAt, timeZone)}` : null,
        },
        nextReward: streak && nextReward ? `Faltan ${turnos(nextReward.remaining)} para ${rewardText(nextReward.reward)}` : null,
        prizes: prizes.map((prize) => ({
            id: prize.id,
            text: prizeText(prize),
            expires: prize.expiresAt ? `Vence el ${day(prize.expiresAt, timeZone)}` : null,
        })),
    };
}
