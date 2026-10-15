'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Availability, AvailabilityDetail, AvailabilityOverride, TimeRange } from '@/src/entities/models/availability';
import type { Preferences } from '@/src/entities/models/user';
import {
    createAvailabilityAction,
    deleteAvailabilityAction,
    makeAvailabilityDefaultAction,
    previewAvailabilityAction,
    saveAvailabilityAction,
    type AvailabilityActionResult,
} from '../actions';
import { savedToast } from '@/app/(app)/_components/left-outside-bookings';
import { AvailabilityEditor } from './AvailabilityEditor';
import { AvailabilityList } from './AvailabilityList';

/** Lo que el editor guarda: todo el contenido de la Availability y si pasa a ser la predeterminada. */
export interface AvailabilityDraft {
    name: string;
    timeZone: string;
    schedule: TimeRange[][];
    overrides: AvailabilityOverride[];
    isDefault: boolean;
}

/** El contenido que se manda al back, sin si pasan a ser las predeterminadas (eso es otra llamada). */
const contentOf = (availabilityId: number, draft: AvailabilityDraft) => ({
    availabilityId,
    name: draft.name,
    timeZone: draft.timeZone,
    schedule: draft.schedule,
    overrides: draft.overrides,
});

/**
 * Horas laborables del Usuario: la lista y, con `open`, el editor de una. Todo sale de las props que trae
 * el server; cada acción las refresca. `preferences` son las del Usuario: la lista las usa para el resumen de Franjas.
 */
export function AvailabilityView({
    availabilities,
    open,
    preferences,
}: {
    availabilities: Availability[];
    open: AvailabilityDetail | null;
    preferences: Preferences;
}) {
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
            preferences={preferences}
            busy={busy}
            onBack={() => router.push('/availability')}
            onPreview={(draft) => previewAvailabilityAction(contentOf(open.id, draft))}
            onSave={(draft, cancelBookingIds) =>
                saveAvailabilityAction({ ...contentOf(open.id, draft), makeDefault: draft.isDefault && !open.isDefault }, cancelBookingIds)
            }
            onSaved={(name, cancelledBookings) => toast.success(savedToast(`${name}: horas laborables actualizadas`, cancelledBookings))}
            onError={(message) => toast.error(message)}
            onDelete={() => remove(open)}
        />
    ) : (
        <AvailabilityList
            availabilities={availabilities}
            preferences={preferences}
            busy={busy}
            onCreate={(name, timeZone) => run(() => createAvailabilityAction(name, timeZone), `${name}: horas laborables creadas`)}
            onMakeDefault={(item) =>
                run(() => makeAvailabilityDefaultAction(item.id), `${item.name}: ahora son las horas laborables predeterminadas`)
            }
            onDelete={remove}
        />
    );
}
