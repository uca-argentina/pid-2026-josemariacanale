'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
    DEFAULT_DAYS,
    toIntervals,
    type AvailabilityInterval,
} from '@/app/(app)/_components/availability-week';
import type { AvailabilityInterval as ApiInterval } from '@/src/entities/models/availability';
import {
    createAvailabilityAction,
    deleteAvailabilityAction,
    makeAvailabilityDefaultAction,
    removeOverrideAction,
    saveAvailabilityAction,
    setOverridesAction,
    type AvailabilityActionResult,
} from '../actions';
import { AvailabilityEditor } from './AvailabilityEditor';
import { AvailabilityList } from './AvailabilityList';
import { OverridesSection, type OverrideItem } from './OverridesSection';

/** Horas laborables tal como las presenta el controller. */
export interface AvailabilityItem {
    id: number;
    name: string;
    isDefault: boolean;
    intervals: ApiInterval[];
}

/** Un Empleado del Staff para el selector; `isOwner` marca al Dueño. */
export interface StaffMember {
    id: number;
    name: string;
    isOwner: boolean;
}

/** Lo que el editor guarda: nombre, semana (lunes primero) y si pasan a ser las predeterminadas. */
export interface AvailabilityDraft {
    name: string;
    days: AvailabilityInterval[][];
    isDefault: boolean;
}

/**
 * Horas laborables de un Empleado del Staff: la lista y, al abrir una, su editor. Todo sale de las
 * props que trae el server; cada acción las refresca.
 */
export function AvailabilityView({
    employees,
    employeeId,
    availabilities,
    overrides,
}: {
    employees: StaffMember[];
    employeeId: number;
    availabilities: AvailabilityItem[];
    overrides: OverrideItem[];
}) {
    const [openId, setOpenId] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const open = availabilities.find((a) => a.id === openId);

    /** Corre una acción sin dejar que se dispare otra a la vez; muestra el mensaje del back si falla. */
    const run = async (action: () => Promise<AvailabilityActionResult>, success: string) => {
        setBusy(true);
        const result = await action();
        setBusy(false);
        if (result.ok) toast.success(success);
        else toast.error(result.message);
        return result.ok;
    };

    const remove = async (item: AvailabilityItem) => {
        if (await run(() => deleteAvailabilityAction(item.id), `${item.name}: horas laborables eliminadas`)) setOpenId(null);
    };

    return open ? (
        <AvailabilityEditor
            key={open.id}
            availability={open}
            busy={busy}
            onBack={() => setOpenId(null)}
            onSave={(draft) =>
                run(
                    () =>
                        saveAvailabilityAction({
                            availabilityId: open.id,
                            name: draft.name,
                            intervals: toIntervals(draft.days),
                            makeDefault: draft.isDefault && !open.isDefault,
                        }),
                    `${draft.name}: horas laborables actualizadas`,
                )
            }
            onDelete={() => remove(open)}
        />
    ) : (
        <AvailabilityList
            employees={employees}
            employeeId={employeeId}
            availabilities={availabilities}
            busy={busy}
            onOpen={setOpenId}
            onCreate={(name) =>
                run(() => createAvailabilityAction(employeeId, name, toIntervals(DEFAULT_DAYS)), `${name}: horas laborables creadas`)
            }
            onMakeDefault={(item) =>
                run(() => makeAvailabilityDefaultAction(item.id), `${item.name}: ahora son las horas laborables predeterminadas`)
            }
            onDuplicate={(item) => {
                const name = `${item.name} (copia)`;
                return run(() => createAvailabilityAction(employeeId, name, item.intervals), `${name}: horas laborables creadas`);
            }}
            onDelete={remove}
        >
            <OverridesSection
                overrides={overrides}
                colleagues={employees.filter((e) => e.id !== employeeId)}
                busy={busy}
                onSave={(draft) =>
                    run(
                        () => setOverridesAction({ employeeId, ...draft }),
                        draft.dates.length === 1 ? 'Anulación guardada' : `${draft.dates.length} anulaciones guardadas`,
                    )
                }
                onRemove={(override) => run(() => removeOverrideAction(employeeId, override.date), 'Anulación quitada')}
            />
        </AvailabilityList>
    );
}
