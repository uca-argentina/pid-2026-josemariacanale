'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, CalendarX2, EllipsisVertical } from 'lucide-react';
import { Card } from '@/app/_components/ui/card';
import { Input } from '@/app/_components/ui/input';
import { Button } from '@/app/_components/ui/button';
import { Avatar, AvatarFallback } from '@/app/_components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/app/_components/ui/tabs';
import { cn } from '@/app/_components/utils';
import type { TabId, TurnoEstado, TurnoItem, TurnosByTab } from '@/app/(app)/_components/types';

const TABS: { id: TabId; label: string }[] = [
    { id: 'proximos', label: 'Próximos' },
    { id: 'pendientes', label: 'Pendientes' },
    { id: 'pasados', label: 'Pasados' },
    { id: 'cancelados', label: 'Cancelados' },
];

const ESTADO: Record<TurnoEstado, { label: string; badge: string; accent: string }> = {
    aceptado: { label: 'Aceptado', badge: 'bg-[#e6f6ec] text-[#15803d]', accent: 'bg-[#16a34a]' },
    pendiente: { label: 'Pendiente', badge: 'bg-[#fff4e5] text-[#b45309]', accent: 'bg-[#f59e0b]' },
    sena: { label: 'Seña pendiente', badge: 'bg-[#f3e8ff] text-[#7c3aed]', accent: 'bg-[#8b5cf6]' },
    completado: { label: 'Completado', badge: 'bg-muted text-muted-foreground', accent: 'bg-border' },
    ausencia: { label: 'Ausencia', badge: 'bg-[#fdecec] text-[#b91c1c]', accent: 'bg-destructive' },
    cancelado: { label: 'Cancelado', badge: 'bg-[#fdecec] text-[#b91c1c]', accent: 'bg-destructive' },
};

const ACTION = 'h-auto rounded-[10px] px-3 py-2 text-[12.5px]';

function initials(name: string) {
    return name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function TurnoRow({ turno }: { turno: TurnoItem }) {
    const estado = ESTADO[turno.estado];
    const isPendiente = turno.estado === 'pendiente';
    const canReagendar = turno.estado === 'aceptado' || turno.estado === 'sena';

    return (
        <article className="flex flex-wrap items-center gap-4 border-b border-muted px-4.5 py-3.5 last:border-b-0 hover:bg-muted/40">
            <span className={cn('min-h-9 w-[3px] shrink-0 self-stretch rounded-full', estado.accent)} />

            <div className="flex w-[100px] shrink-0 flex-col gap-0.5">
                <span className="text-[15px] font-extrabold tracking-[-0.025em]">{turno.start}</span>
                <span className="text-[12px] font-medium text-muted-foreground">
                    {turno.start} – {turno.end}
                </span>
            </div>

            <div className="flex min-w-[220px] flex-1 basis-[260px] flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14.5px] font-bold tracking-[-0.02em]">{turno.service}</span>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[11.5px] font-bold', estado.badge)}>
                        {estado.label}
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-3.5 text-[12.5px] font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <Avatar size="sm">
                            <AvatarFallback className="bg-secondary text-[9.5px] font-extrabold text-primary">
                                {initials(turno.client)}
                            </AvatarFallback>
                        </Avatar>
                        {turno.client}
                    </span>
                    <span>{turno.profesional}</span>
                    <span>{turno.branch}</span>
                </div>
            </div>

            <div className="flex shrink-0 flex-col gap-0.5 text-right">
                <span className="text-[14px] font-extrabold tracking-[-0.025em]">{turno.price}</span>
                <span className="text-[11.5px] font-semibold text-muted-foreground">{turno.payment}</span>
            </div>

            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                {isPendiente && (
                    <>
                        <Button size="sm" className={cn(ACTION, 'px-3.5 font-bold')}>
                            Aceptar turno
                        </Button>
                        <Button size="sm" variant="outline" className={cn(ACTION, 'font-semibold text-destructive')}>
                            Rechazar turno
                        </Button>
                    </>
                )}
                {canReagendar && (
                    <>
                        <Button size="sm" variant="outline" className={cn(ACTION, 'font-semibold')}>
                            Reagendar
                        </Button>
                        <Button size="sm" variant="outline" className={cn(ACTION, 'font-semibold text-muted-foreground')}>
                            Cancelar
                        </Button>
                    </>
                )}
                <Button size="icon" variant="ghost" aria-label="Más acciones" className="size-7 rounded-md text-muted-foreground">
                    <EllipsisVertical className="size-[17px]" />
                </Button>
            </div>
        </article>
    );
}

export function TurnosView({ turnosByTab, pendingCount }: { turnosByTab: TurnosByTab; pendingCount: number }) {
    const [tab, setTab] = useState<TabId>('proximos');
    const groups = turnosByTab[tab];

    return (
        <div className="flex flex-col gap-4.5 px-7 py-5.5">
            <div className="flex flex-wrap items-center gap-3">
                <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
                    <TabsList className="h-auto gap-1 rounded-[10px] border border-border bg-muted p-1">
                        {TABS.map((t) => (
                            <TabsTrigger
                                key={t.id}
                                value={t.id}
                                className="h-auto gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-bold tracking-[-0.01em]"
                            >
                                {t.label}
                                {t.id === 'pendientes' && pendingCount > 0 && (
                                    <span className="rounded-full bg-secondary px-2 py-px text-[11px] font-bold text-primary">
                                        {pendingCount}
                                    </span>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <div className="ml-auto flex items-center gap-2">
                    <div className="flex w-[230px] items-center gap-2 rounded-[10px] border border-input bg-white px-2.5 py-0.5">
                        <Search className="size-[15px] shrink-0 text-muted-foreground" />
                        <Input
                            aria-label="Buscar turnos"
                            placeholder="Buscar cliente o servicio"
                            className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
                        />
                    </div>
                    <Button
                        variant="outline"
                        className="h-auto gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-semibold text-muted-foreground"
                    >
                        <SlidersHorizontal className="size-[15px]" />
                        Filtros
                    </Button>
                </div>
            </div>

            {groups.length > 0 ? (
                <Card className="gap-0 overflow-hidden rounded-2xl py-0 shadow-[0_1px_2px_rgba(15,27,45,0.04)]">
                    {groups.map((group, i) => (
                        <section key={group.label} className={cn(i > 0 && 'border-t border-border')}>
                            <div className="flex flex-wrap items-baseline gap-2.5 border-b border-border bg-muted px-4.5 py-2.5">
                                <h2 className="m-0 text-[12px] font-extrabold tracking-[0.02em] uppercase">{group.label}</h2>
                                <span className="text-[12px] font-medium text-muted-foreground">{group.summary}</span>
                            </div>
                            {group.items.map((turno) => (
                                <TurnoRow key={turno.id} turno={turno} />
                            ))}
                        </section>
                    ))}
                </Card>
            ) : (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-input px-5 py-14 text-center">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
                        <CalendarX2 className="size-5 text-muted-foreground" />
                    </div>
                    <div className="text-[15px] font-bold tracking-[-0.02em]">No hay turnos acá</div>
                    <div className="max-w-[360px] text-[13px] font-medium text-muted-foreground">
                        Cuando tus clientes reserven desde tu link público, vas a ver sus turnos en esta lista.
                    </div>
                </div>
            )}
        </div>
    );
}
