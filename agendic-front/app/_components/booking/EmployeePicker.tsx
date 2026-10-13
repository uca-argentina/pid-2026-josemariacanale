'use client';

import { Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/_components/ui/avatar';
import { cn } from '@/app/_components/utils';
import { initials } from './format';
import type { ChosenEmployee } from './types';

/**
 * Elige con quién Reservar (ADR 0029): «Cualquiera» primero y después los Empleados que Ofrecen el Servicio.
 * Son radios nativos, así que el teclado y el lector de pantalla los manejan solos. Si no entran, hace scroll
 * horizontal; el ancho de cada opción sale del contenedor, no de la pantalla.
 */
export function EmployeePicker({
    employees,
    value,
    onChange,
}: {
    employees: readonly ChosenEmployee[];
    /** El Empleado elegido; `null` es Cualquiera. */
    value: ChosenEmployee | null;
    onChange: (employee: ChosenEmployee | null) => void;
}) {
    const option = (active: boolean) =>
        cn(
            'flex w-28 shrink-0 cursor-pointer flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-colors @md:w-36',
            'has-focus-visible:ring-2 has-focus-visible:ring-ring',
            active ? 'border-foreground ring-1 ring-foreground' : 'border-border hover:border-foreground/40',
        );
    const name = 'line-clamp-2 text-[13px] leading-tight font-bold tracking-[-0.01em]';

    return (
        <div className="@container">
            <div
                role="radiogroup"
                aria-label="Con quién reservar"
                className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                <label className={option(value === null)}>
                    <input
                        type="radio"
                        name="employee"
                        checked={value === null}
                        onChange={() => onChange(null)}
                        className="sr-only"
                    />
                    <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Users className="size-5" aria-hidden />
                    </span>
                    <span className={name}>Cualquiera</span>
                </label>

                {employees.map((employee) => (
                    <label key={employee.id} className={option(value?.id === employee.id)}>
                        <input
                            type="radio"
                            name="employee"
                            checked={value?.id === employee.id}
                            onChange={() => onChange(employee)}
                            className="sr-only"
                        />
                        <Avatar className="size-10">
                            {employee.imageUrl && <AvatarImage src={employee.imageUrl} alt="" />}
                            <AvatarFallback className="bg-muted text-[12px] font-extrabold text-foreground">
                                {initials(employee.name)}
                            </AvatarFallback>
                        </Avatar>
                        <span className={name}>{employee.name}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}
