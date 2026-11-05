'use client';

import { useSyncExternalStore } from 'react';
import { formatOutOfOfficeDate } from '@/app/_components/format-day';
import { dayInZone } from './achievements';

const subscribe = () => () => {};

/**
 * El día en que se ganó un Nivel, en la zona del navegador del Usuario. El server solo conoce el instante, así que
 * renderiza el día UTC y el navegador lo corrige al hidratar; si no, un Nivel ganado de noche en Argentina mostraría el día siguiente.
 */
export function EarnedDate({ earnedAt }: { earnedAt: string }) {
    const day = useSyncExternalStore(
        subscribe,
        () => dayInZone(earnedAt),
        () => dayInZone(earnedAt, 'UTC'),
    );

    return <time dateTime={earnedAt}>{formatOutOfOfficeDate(day)}</time>;
}
