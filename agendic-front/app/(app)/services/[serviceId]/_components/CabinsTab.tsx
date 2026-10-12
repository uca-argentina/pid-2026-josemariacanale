'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PanelButton, PanelCard, PanelCheckbox } from '@/app/(app)/_components/panel-ui';
import { BRANCHES_PATH } from '@/app/routes';
import type { ServiceCabin } from '@/src/entities/models/service';
import { updateServiceAction } from '../../actions';

const EXPLANATION =
    'Cada Turno ocupa una de las Cabinas marcadas. Sin Cabinas, el Servicio depende solo de sus Empleados.';

const idsKey = (cabins: ServiceCabin[]) => cabins.map((c) => c.id).join();

/**
 * Las Cabinas que admite un Servicio del Negocio. El Dueño marca cuáles de las de la Sucursal (`branchCabins`) y
 * guarda aparte del resto del detalle; sin ninguna marcada el Servicio no usa Cabinas. Un Empleado ve solo los
 * nombres de las que admite (`admitted`). Si el guardado falla, el aviso sale al pie y la página vuelve a pedir la
 * lista de la Sucursal.
 */
export function CabinsTab({
    serviceId,
    admitted,
    branchCabins,
}: {
    serviceId: number;
    admitted: ServiceCabin[];
    /** Las Cabinas activas de la Sucursal; `null` para quien no es Dueño. */
    branchCabins: ServiceCabin[] | null;
}) {
    const [selected, setSelected] = useState(() => new Set(admitted.map((c) => c.id)));
    const [savedKey, setSavedKey] = useState(() => idsKey(admitted));
    const [error, setError] = useState<string>();
    const [saving, startSaving] = useTransition();

    // Si el servidor devuelve otro conjunto guardado (por ejemplo tras un 422), reemplaza lo marcado.
    if (idsKey(admitted) !== savedKey) {
        setSavedKey(idsKey(admitted));
        setSelected(new Set(admitted.map((c) => c.id)));
    }

    if (!branchCabins) {
        return (
            <PanelCard className="flex flex-col gap-3">
                <p className="m-0 text-[13px] font-medium text-[#6b7280]">{EXPLANATION}</p>
                {admitted.length === 0 ? (
                    <p className="m-0 text-[13.5px] font-semibold">Este Servicio no usa Cabinas.</p>
                ) : (
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                        {admitted.map((cabin) => (
                            <li key={cabin.id} className="rounded-md border border-[#e5e7eb] px-4 py-2 text-[13.5px] font-semibold">
                                {cabin.name}
                            </li>
                        ))}
                    </ul>
                )}
            </PanelCard>
        );
    }

    if (branchCabins.length === 0) {
        return (
            <PanelCard className="flex flex-col gap-3">
                <p className="m-0 text-[13px] font-medium text-[#6b7280]">{EXPLANATION}</p>
                <p className="m-0 text-[13.5px] font-semibold">
                    Esta Sucursal todavía no tiene Cabinas.{' '}
                    <Link href={BRANCHES_PATH} className="underline underline-offset-2">
                        Agregalas en Sucursales
                    </Link>
                    .
                </p>
            </PanelCard>
        );
    }

    // Una Cabina dada de baja en otra pestaña ya no está en la lista: no cuenta como marcada.
    const checked = branchCabins.filter((c) => selected.has(c.id));
    const dirty = checked.length !== admitted.length || admitted.some((c) => !selected.has(c.id));

    const toggle = (id: number, checked: boolean) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
        setError(undefined);
    };

    const save = () =>
        startSaving(async () => {
            const result = await updateServiceAction({
                id: serviceId,
                cabinIds: checked.map((c) => c.id),
            });
            if (result.ok) toast.success('Cabinas actualizadas');
            else setError(result.message);
        });

    return (
        <PanelCard className="flex flex-col gap-4">
            <p className="m-0 text-[13px] font-medium text-[#6b7280]">{EXPLANATION}</p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {branchCabins.map((cabin) => {
                    const id = `service-cabin-${cabin.id}`;
                    return (
                        <li key={cabin.id}>
                            <label
                                htmlFor={id}
                                className="flex cursor-pointer items-center gap-2.5 rounded-md border border-[#e5e7eb] px-4 py-2 text-[13.5px] font-semibold"
                            >
                                <PanelCheckbox
                                    id={id}
                                    checked={selected.has(cabin.id)}
                                    disabled={saving}
                                    onCheckedChange={(checked) => toggle(cabin.id, checked === true)}
                                />
                                {cabin.name}
                            </label>
                        </li>
                    );
                })}
            </ul>
            {error && (
                <p role="alert" className="m-0 text-[12.5px] font-medium text-[#b91c1c]">
                    {error}
                </p>
            )}
            <div>
                <PanelButton disabled={!dirty || saving} onClick={save} className="min-w-[88px]">
                    {saving ? <Loader2 className="size-4 animate-spin" /> : 'Guardar'}
                </PanelButton>
            </div>
        </PanelCard>
    );
}
