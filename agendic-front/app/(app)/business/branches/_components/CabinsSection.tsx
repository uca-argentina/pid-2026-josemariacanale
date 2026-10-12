'use client';

import { useState, useTransition } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PanelButton, PanelConfirm, PanelField, PanelIconButton, PanelIconGroup, PanelInput } from '@/app/(app)/_components/panel-ui';
import { cabinFormSchema, fieldErrorsOf } from '@/app/_components/business-schemas';
import { createCabinAction, renameCabinAction, retireCabinAction } from '../actions';

/** Una Cabina de la Sucursal, como la lista la página. */
export type CabinItem = { id: number; name: string };

/** Valida el nombre en el cliente; devuelve el nombre recortado o el mensaje que va bajo el campo. */
const checkName = (name: string): { name: string } | { error: string } => {
    const parsed = cabinFormSchema.safeParse({ name });
    return parsed.success ? { name: parsed.data.name } : { error: fieldErrorsOf(parsed.error).name ?? 'Revisá el nombre.' };
};

function CabinRow({ cabin }: { cabin: CabinItem }) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(cabin.name);
    const [error, setError] = useState<string>();
    const [confirming, setConfirming] = useState(false);
    const [isPending, startTransition] = useTransition();

    const rename = (event: React.FormEvent) => {
        event.preventDefault();
        const checked = checkName(name);
        if ('error' in checked) return setError(checked.error);
        setError(undefined);
        startTransition(async () => {
            const result = await renameCabinAction(cabin.id, checked.name);
            if (result.ok) setEditing(false);
            else if (result.field) setError(result.message);
            else toast.error(result.message);
        });
    };

    const retire = () =>
        startTransition(async () => {
            const result = await retireCabinAction(cabin.id);
            if (!result.ok) toast.error(result.message);
        });

    if (editing) {
        const id = `cabin-${cabin.id}`;
        return (
            <li>
                <form onSubmit={rename} noValidate className="flex items-start gap-2">
                    <div className="flex-1">
                        <PanelField label="Nombre de la Cabina" htmlFor={id} error={error}>
                            <PanelInput
                                id={id}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                {...(error && { 'aria-invalid': true, 'aria-describedby': `${id}-error` })}
                            />
                        </PanelField>
                    </div>
                    <div className="flex gap-2 pt-[30px]">
                        <PanelButton type="submit" disabled={isPending} className="min-w-[88px]">
                            {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Guardar'}
                        </PanelButton>
                        <PanelButton
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => {
                                setEditing(false);
                                setName(cabin.name);
                                setError(undefined);
                            }}
                        >
                            Cancelar
                        </PanelButton>
                    </div>
                </form>
            </li>
        );
    }

    return (
        <li className="flex items-center justify-between gap-3 rounded-md border border-[#e5e7eb] px-4 py-2">
            <span className="text-[13.5px] font-semibold">{cabin.name}</span>
            <PanelIconGroup>
                <PanelIconButton label={`Renombrar ${cabin.name}`} disabled={isPending} onClick={() => setEditing(true)}>
                    <Pencil />
                </PanelIconButton>
                <PanelIconButton label={`Dar de baja ${cabin.name}`} destructive disabled={isPending} onClick={() => setConfirming(true)}>
                    <Trash2 />
                </PanelIconButton>
            </PanelIconGroup>
            <PanelConfirm
                open={confirming}
                onOpenChange={setConfirming}
                title={`¿Dar de baja ${cabin.name}?`}
                description="Deja de usarse en los Turnos nuevos. Si tiene Turnos futuros, primero hay que Reagendarlos o Cancelarlos."
                confirmLabel="Dar de baja"
                destructive
                onConfirm={retire}
            />
        </li>
    );
}

/** Las Cabinas de una Sucursal: el Dueño las ve, agrega, renombra y da de baja. */
export function CabinsSection({ branchId, cabins }: { branchId: number; cabins: CabinItem[] }) {
    const [name, setName] = useState('');
    const [error, setError] = useState<string>();
    const [isPending, startTransition] = useTransition();
    const id = `new-cabin-${branchId}`;

    const add = (event: React.FormEvent) => {
        event.preventDefault();
        const checked = checkName(name);
        if ('error' in checked) return setError(checked.error);
        setError(undefined);
        startTransition(async () => {
            const result = await createCabinAction(branchId, checked.name);
            if (result.ok) setName('');
            else if (result.field) setError(result.message);
            else toast.error(result.message);
        });
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
                <span className="text-[13.5px] font-bold tracking-[-0.01em]">Cabinas</span>
                <p className="m-0 text-[13px] font-medium text-[#6b7280]">
                    Espacios o equipos de la Sucursal que un Turno ocupa mientras dura. Tus Clientes no las ven.
                </p>
            </div>
            {cabins.length === 0 ? (
                <p className="m-0 text-[13px] font-medium text-[#6b7280]">Esta Sucursal todavía no tiene Cabinas.</p>
            ) : (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {cabins.map((cabin) => (
                        <CabinRow key={cabin.id} cabin={cabin} />
                    ))}
                </ul>
            )}
            <form onSubmit={add} noValidate className="flex items-start gap-2">
                <div className="flex-1">
                    <PanelField label="Nueva Cabina" htmlFor={id} error={error}>
                        <PanelInput
                            id={id}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            {...(error && { 'aria-invalid': true, 'aria-describedby': `${id}-error` })}
                        />
                    </PanelField>
                </div>
                <PanelButton type="submit" disabled={isPending} className="mt-[30px] min-w-[104px]">
                    {isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <>
                            <Plus className="size-4" />
                            Agregar
                        </>
                    )}
                </PanelButton>
            </form>
        </div>
    );
}
