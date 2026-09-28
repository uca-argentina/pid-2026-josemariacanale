'use client';

import { useState, useTransition, useRef } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { DEFAULT_DAYS, type Availability } from '@/src/entities/models/availability';
import { AvailabilityEditor } from './AvailabilityEditor';
import { AvailabilityList } from './AvailabilityList';
import { UpdateServicesDialog, type OfferedService } from './UpdateServicesDialog';
import { createAvailabilityAction, updateAvailabilityAction, deleteAvailabilityAction, setDefaultAvailabilityAction, putEmployeeOverrideAction, deleteEmployeeOverrideAction } from '../_actions';
import { Employee } from '@/src/entities/models/employee';
import { type EmployeeOverride } from '@/src/entities/models/employee-override';
import { OverridesSection } from './OverridesSection';

export function AvailabilityView({
    initialAvailabilities,
    initialServices,
    initialOverrides,
    employees,
    selectedEmployeeId,
}: {
    initialAvailabilities: Availability[];
    initialServices: OfferedService[];
    initialOverrides: EmployeeOverride[];
    employees: Employee[];
    selectedEmployeeId: number;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [services, setServices] = useState(initialServices);
    const [openId, setOpenId] = useState<string | null>(null);
    const [draftAvailability, setDraftAvailability] = useState<Availability | null>(null);
    const [newDefaultId, setNewDefaultId] = useState<string | null>(null);

    const [overrides, setOverrides] = useState<EmployeeOverride[]>(initialOverrides);
    const overridesRef = useRef<HTMLDivElement>(null);

    const byId = (id: string) => initialAvailabilities.find((a) => a.id === id);
    const servicesUsing = (id: string) => services.filter((s) => s.availabilityId === id).length;
    const open = draftAvailability || (openId ? byId(openId) : undefined);

    const handleActionError = (error: unknown) => {
        toast.error(error instanceof Error ? error.message : 'Error inesperado');
    };

    const save = (next: Availability) => {
        startTransition(async () => {
            try {
                if (initialAvailabilities.some(a => a.id === next.id)) {
                    await updateAvailabilityAction(next.id, next);
                    if (next.isDefault && !byId(next.id)?.isDefault && services.length > 0) {
                        setNewDefaultId(next.id);
                    }
                } else {
                    await createAvailabilityAction(selectedEmployeeId, next);
                }
                setOpenId(null);
                setDraftAvailability(null);
                toast.success('Horario guardado');
            } catch (err: unknown) {
                handleActionError(err);
            }
        });
    };

    const handleOverridesChange = (newOverrides: EmployeeOverride[]) => {
        setOverrides(newOverrides);
        
        // Find deleted overrides
        const deleted = overrides.filter(o => !newOverrides.find(n => n.date === o.date));
        for (const d of deleted) {
            startTransition(async () => {
                try {
                    await deleteEmployeeOverrideAction(selectedEmployeeId, d.date);
                } catch (err: unknown) {
                    handleActionError(err);
                }
            });
        }

        // Find added or modified overrides
        const upserted = newOverrides.filter(n => {
            const old = overrides.find(o => o.date === n.date);
            return !old || JSON.stringify(old) !== JSON.stringify(n);
        });

        for (const u of upserted) {
            startTransition(async () => {
                try {
                    await putEmployeeOverrideAction(selectedEmployeeId, u.date, { intervals: u.intervals, coveredByEmployeeId: u.coveredByEmployeeId });
                } catch (err: unknown) {
                    handleActionError(err);
                }
            });
        }
    };

    const remove = (id: string) => {
        startTransition(async () => {
            try {
                const name = byId(id)?.name || 'Horario';
                await deleteAvailabilityAction(id);
                setOpenId(null);
                toast.success(`${name}: horas laborables eliminadas`);
            } catch (err: unknown) {
                handleActionError(err);
            }
        });
    };

    const handleEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        router.push(`/availability?employee=${id}`);
    };

    return (
        <div className="flex flex-col gap-4 p-4">
            {employees.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                    <label className="font-semibold text-sm">Empleado:</label>
                    <select 
                        value={selectedEmployeeId} 
                        onChange={handleEmployeeChange}
                        className="border rounded px-2 py-1 text-sm"
                        disabled={isPending}
                    >
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                    </select>
                </div>
            )}
            {isPending && <div className="text-sm text-gray-500">Actualizando...</div>}

            {open ? (
                <AvailabilityEditor
                    key={open.id}
                    availability={open}
                    usedBy={servicesUsing(open.id)}
                    onBack={() => { setOpenId(null); setDraftAvailability(null); }}
                    onSave={save}
                    onDelete={() => remove(open.id)}
                />
            ) : (
                <AvailabilityList
                    availabilities={initialAvailabilities}
                    servicesUsing={servicesUsing}
                    onOpen={setOpenId}
                    onCreate={(name) => {
                        setDraftAvailability({
                            id: crypto.randomUUID(),
                            name,
                            isDefault: initialAvailabilities.length === 0,
                            days: DEFAULT_DAYS,
                            overrides: []
                        });
                    }}
                    onMakeDefault={(id) => {
                        startTransition(async () => {
                            try {
                                await setDefaultAvailabilityAction(id);
                                toast.success(`${byId(id)?.name}: ahora son tus horas laborables predeterminadas`);
                            } catch (err: unknown) {
                handleActionError(err);
            }
                        });
                    }}
                    onDuplicate={(id) => {
                        startTransition(async () => {
                            try {
                                const original = byId(id);
                                if (!original) return;
                                await createAvailabilityAction(selectedEmployeeId, {
                                    name: `${original.name} (copia)`,
                                    days: original.days,
                                    overrides: original.overrides,
                                });
                                toast.success('Copia creada');
                            } catch (err: unknown) {
                handleActionError(err);
            }
                        });
                    }}
                    onDelete={remove}
                    onOpenOverrides={() => overridesRef.current?.scrollIntoView({ behavior: 'smooth' })}
                />
            )}

            {!open && (
                <div className="mt-8" ref={overridesRef}>
                    <OverridesSection
                        overrides={overrides}
                        employees={employees}
                        onChange={handleOverridesChange}
                    />
                </div>
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
        </div>
    );
}
