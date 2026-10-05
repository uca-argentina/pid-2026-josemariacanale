'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { toRanges, toSchedule, type AvailabilityInterval } from '@/app/(app)/_components/availability-week';
import type { Availability, AvailabilityDetail } from '@/src/entities/models/availability';
import {
    createAvailabilityAction,
    deleteAvailabilityAction,
    makeAvailabilityDefaultAction,
    saveAvailabilityAction,
    type AvailabilityActionResult,
} from '../actions';
import { AvailabilityEditor } from './AvailabilityEditor';
import { AvailabilityList } from './AvailabilityList';

/** Una Anulación en el editor: la fecha y las Franjas de ese día (`[]` = día libre). */
export interface OverrideDraft {
    date: string;
    intervals: AvailabilityInterval[];
}

/** Lo que el editor guarda: todo el contenido de la Availability y si pasa a ser la predeterminada. */
export interface AvailabilityDraft {
    name: string;
    timeZone: string;
    days: AvailabilityInterval[][];
    overrides: OverrideDraft[];
    isDefault: boolean;
}

/**
 * Horas laborables del Usuario: la lista y, con `open`, el editor de una. Todo sale de las props que trae
 * el server; cada acción las refresca.
 */
export function AvailabilityView({ availabilities, open }: { availabilities: Availability[]; open: AvailabilityDetail | null }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    /** Corre una acción sin dejar que se dispare otra a la vez; muestra el mensaje del back si falla. */
    const run = async (action: () => Promise<AvailabilityActionResult>, success: string) => {
        setBusy(true);
        const result = await action();
        setBusy(false);
        if (result.ok) toast.success(success);
        else toast.error(result.message);
        return result.ok;
    };

    const remove = async (item: Availability) => {
        if (await run(() => deleteAvailabilityAction(item.id), `${item.name}: horas laborables eliminadas`)) router.push('/availability');
    };

    return open ? (
        <AvailabilityEditor
            key={open.id}
            availability={open}
            busy={busy}
            onBack={() => router.push('/availability')}
            onSave={(draft) =>
                run(
                    () =>
                        saveAvailabilityAction({
                            availabilityId: open.id,
                            name: draft.name,
                            timeZone: draft.timeZone,
                            schedule: toSchedule(draft.days),
                            overrides: draft.overrides.map((o) => ({ date: o.date, ranges: toRanges(o.intervals) })),
                            makeDefault: draft.isDefault && !open.isDefault,
                        }),
                    `${draft.name}: horas laborables actualizadas`,
                )
            }
            onDelete={() => remove(open)}
        />
    ) : (
        <AvailabilityList
            availabilities={availabilities}
            busy={busy}
            onOpen={(id) => router.push(`/availability?id=${id}`)}
            onCreate={(name, timeZone) => run(() => createAvailabilityAction(name, timeZone), `${name}: horas laborables creadas`)}
            onMakeDefault={(item) =>
                run(() => makeAvailabilityDefaultAction(item.id), `${item.name}: ahora son las horas laborables predeterminadas`)
            }
            onDelete={remove}
        />
    );
}
