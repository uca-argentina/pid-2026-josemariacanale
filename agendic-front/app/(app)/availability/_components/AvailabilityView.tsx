'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { DEFAULT_DAYS, type Availability } from '@/app/(app)/_components/mock-availability';
import { AvailabilityEditor } from './AvailabilityEditor';
import { AvailabilityList } from './AvailabilityList';
import { UpdateServicesDialog, type OfferedService } from './UpdateServicesDialog';

// ponytail: una sola ruta con estado local; nada persiste. Con backend, el detalle pasa a
// /availability/[id] y cada acción llama a su server action.
export function AvailabilityView({
    initialAvailabilities,
    initialServices,
}: {
    initialAvailabilities: Availability[];
    initialServices: OfferedService[];
}) {
    const [availabilities, setAvailabilities] = useState(initialAvailabilities);
    const [services, setServices] = useState(initialServices);
    const [openId, setOpenId] = useState<string | null>(null);
    /** La Availability recién marcada predeterminada, a la que se le ofrece pasar los Servicios. */
    const [newDefaultId, setNewDefaultId] = useState<string | null>(null);
    const byId = (id: string) => availabilities.find((a) => a.id === id)!;
    const servicesUsing = (id: string) => services.filter((s) => s.availabilityId === id).length;
    const open = openId ? byId(openId) : undefined;

    /** Reemplaza una Availability; si pasa a ser la predeterminada, desmarca la anterior y ofrece pasarle los Servicios. */
    const save = (next: Availability) => {
        const becameDefault = next.isDefault && !byId(next.id).isDefault;
        setAvailabilities((prev) =>
            prev.map((a) => (a.id === next.id ? next : next.isDefault ? { ...a, isDefault: false } : a)),
        );
        if (becameDefault && services.length > 0) setNewDefaultId(next.id);
    };

    const remove = (id: string) => {
        const { name } = byId(id);
        setAvailabilities((prev) => prev.filter((a) => a.id !== id));
        setOpenId(null);
        toast.success(`${name}: horas laborables eliminadas`);
    };

    return (
        <>
            {open ? (
                <AvailabilityEditor
                    key={open.id}
                    availability={open}
                    usedBy={servicesUsing(open.id)}
                    onBack={() => setOpenId(null)}
                    onSave={save}
                    onDelete={() => remove(open.id)}
                />
            ) : (
                <AvailabilityList
                    availabilities={availabilities}
                    servicesUsing={servicesUsing}
                    onOpen={setOpenId}
                    onCreate={(name) => {
                        const id = crypto.randomUUID();
                        setAvailabilities((prev) => [
                            ...prev,
                            { id, name, isDefault: prev.length === 0, days: DEFAULT_DAYS, overrides: [] },
                        ]);
                        setOpenId(id);
                    }}
                    onMakeDefault={(id) => {
                        save({ ...byId(id), isDefault: true });
                        toast.success(`${byId(id).name}: ahora son tus horas laborables predeterminadas`);
                    }}
                    onDuplicate={(id) => {
                        const original = byId(id);
                        const copy = { ...original, id: crypto.randomUUID(), name: `${original.name} (copia)`, isDefault: false };
                        setAvailabilities((prev) => prev.flatMap((a) => (a.id === id ? [a, copy] : [a])));
                        toast.success(`${copy.name}: horas laborables creadas`);
                    }}
                    onDelete={remove}
                />
            )}

            {newDefaultId && (
                <UpdateServicesDialog
                    services={services}
                    onClose={() => setNewDefaultId(null)}
                    onUpdate={(serviceIds) => {
                        setServices((prev) =>
                            prev.map((s) => (serviceIds.includes(s.id) ? { ...s, availabilityId: newDefaultId } : s)),
                        );
                        setNewDefaultId(null);
                        toast.success(serviceIds.length === 1 ? '1 servicio actualizado' : `${serviceIds.length} servicios actualizados`);
                    }}
                />
            )}
        </>
    );
}
