'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Globe, Plus, X } from 'lucide-react';
import { Card } from '@/app/_components/ui/card';
import { Button } from '@/app/_components/ui/button';
import { Switch } from '@/app/_components/ui/switch';
import { cn } from '@/app/_components/utils';
import type { DaySchedule, Schedule, ScheduleDetail as ScheduleDetailData, ScheduleOverrideKind } from '@/app/(app)/_components/types';

const OVERRIDE_ACCENT: Record<ScheduleOverrideKind, string> = {
    feriado: 'bg-destructive',
    'horario-reducido': 'bg-[#f59e0b]',
    vacaciones: 'bg-[#8b5cf6]',
};

function ScheduleList({ schedules, onOpen }: { schedules: Schedule[]; onOpen: (id: string) => void }) {
    return (
        <div className="flex flex-col gap-3.5">
            <Card className="gap-0 overflow-hidden rounded-2xl py-0 shadow-[0_1px_2px_rgba(15,27,45,0.04)]">
                {schedules.map((s, i) => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => onOpen(s.id)}
                        className={cn(
                            'flex w-full items-center gap-4 px-4.5 py-4 text-left hover:bg-muted/40',
                            i > 0 && 'border-t border-muted',
                        )}
                    >
                        <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <span className="text-[14.5px] font-bold tracking-[-0.02em]">{s.name}</span>
                                {s.isDefault && (
                                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-primary">
                                        Predeterminado
                                    </span>
                                )}
                            </div>
                            <span className="text-[13px] font-medium text-muted-foreground">{s.summary}</span>
                            <span className="text-[12px] font-medium text-muted-foreground">{s.scope}</span>
                        </div>
                        <div className="ml-auto flex items-center gap-2.5">
                            <span className="text-[12px] font-semibold text-muted-foreground">{s.timezone}</span>
                            <ChevronRight className="size-[18px] text-muted-foreground" />
                        </div>
                    </button>
                ))}
            </Card>
            <Button
                variant="outline"
                className="h-auto self-start rounded-[10px] border-dashed px-4 py-3 text-[13px] font-bold text-primary"
            >
                + Nuevo horario
            </Button>
        </div>
    );
}

function DayRow({ day, onToggle }: { day: DaySchedule; onToggle: () => void }) {
    return (
        <div className="flex flex-wrap items-center gap-4 border-b border-muted py-3.5 last:border-b-0">
            <div className="flex w-[190px] shrink-0 items-center gap-3">
                <Switch checked={day.enabled} onCheckedChange={onToggle} aria-label={`Disponibilidad del ${day.label}`} />
                <span className="text-[13.5px] font-bold tracking-[-0.01em]">{day.label}</span>
            </div>
            {day.enabled ? (
                <div className="flex flex-wrap items-center gap-2.5">
                    <span className="rounded-lg border border-input bg-white px-3 py-1.5 text-[13px] font-semibold">{day.from}</span>
                    <span className="text-[13px] font-semibold text-muted-foreground">–</span>
                    <span className="rounded-lg border border-input bg-white px-3 py-1.5 text-[13px] font-semibold">{day.to}</span>
                    <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Agregar rango horario"
                        className="size-7 rounded-md text-muted-foreground hover:text-primary"
                    >
                        <Plus className="size-4" />
                    </Button>
                </div>
            ) : (
                <span className="text-[13px] font-medium text-muted-foreground">Sin disponibilidad</span>
            )}
        </div>
    );
}

function ScheduleDetail({ detail }: { detail: ScheduleDetailData }) {
    const [days, setDays] = useState(detail.days);

    return (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="gap-0 rounded-2xl px-5 py-1 shadow-[0_1px_2px_rgba(15,27,45,0.04)]">
                {days.map((day, i) => (
                    <DayRow
                        key={day.key}
                        day={day}
                        onToggle={() => setDays((prev) => prev.map((d, j) => (j === i ? { ...d, enabled: !d.enabled } : d)))}
                    />
                ))}
            </Card>

            <div className="flex flex-col gap-3.5">
                <Card className="gap-2.5 rounded-2xl p-4.5">
                    <span className="text-[12px] font-extrabold tracking-[0.03em] text-muted-foreground uppercase">Zona horaria</span>
                    <div className="flex items-center gap-2.5 rounded-[10px] border border-input px-3 py-2.5">
                        <Globe className="size-[15px] text-muted-foreground" />
                        <span className="text-[13px] font-semibold">{detail.timezone}</span>
                    </div>
                </Card>

                <Card className="gap-3 rounded-2xl p-4.5">
                    <div className="flex flex-col gap-1">
                        <span className="text-[13.5px] font-extrabold tracking-[-0.02em]">Excepciones y feriados</span>
                        <span className="text-[12.5px] leading-[1.4] font-medium text-muted-foreground">
                            Bloqueos puntuales que pisan el horario semanal.
                        </span>
                    </div>
                    {detail.overrides.map((o) => (
                        <div key={o.date} className="flex items-center gap-2.5 rounded-lg bg-muted px-2.5 py-2.5">
                            <span className={cn('w-[3px] self-stretch rounded-full', OVERRIDE_ACCENT[o.kind])} />
                            <div className="flex min-w-0 flex-col">
                                <span className="text-[12.5px] font-bold">{o.date}</span>
                                <span className="text-[11.5px] font-medium text-muted-foreground">{o.note}</span>
                            </div>
                            <button
                                type="button"
                                aria-label={`Quitar excepción del ${o.date}`}
                                className="ml-auto p-1 text-muted-foreground hover:text-destructive"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    ))}
                    <Button variant="secondary" className="h-auto rounded-[10px] px-3 py-2.5 text-[12.5px] font-bold">
                        + Agregar excepción
                    </Button>
                </Card>

                <Card className="gap-0 rounded-2xl bg-[#0f1b2d] p-4.5 text-white shadow-[0_24px_60px_rgba(15,27,45,0.12)]">
                    <span className="text-[11.5px] font-extrabold tracking-[0.05em] text-[#5b82ff] uppercase">Aplica en</span>
                    <div className="mt-3 flex flex-col gap-2">
                        {detail.branches.map((b) => (
                            <div
                                key={b.name}
                                className="flex items-center gap-2.5 rounded-lg border border-[#2a3650] bg-[#182338] px-3 py-2.5"
                            >
                                <span className="text-[12.5px] font-semibold text-white">{b.name}</span>
                                <span className={cn('ml-auto text-[11px] font-bold', b.active ? 'text-[#5b82ff]' : 'text-[#aab4c8]')}>
                                    {b.active ? 'Activa' : 'Sin usar'}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}

export function DisponibilidadView({ schedules, detail }: { schedules: Schedule[]; detail: ScheduleDetailData }) {
    const [openId, setOpenId] = useState<string | null>(null);
    const open = schedules.find((s) => s.id === openId);

    if (!open) {
        return (
            <div className="max-w-[920px] px-7 py-5.5">
                <ScheduleList schedules={schedules} onOpen={setOpenId} />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 px-7 py-5.5">
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    onClick={() => setOpenId(null)}
                    className="h-auto gap-1 rounded-[10px] px-2 py-1.5 text-[13px] font-semibold text-muted-foreground"
                >
                    <ChevronLeft className="size-4" />
                    Horarios
                </Button>
                <h2 className="m-0 text-[16px] font-extrabold tracking-[-0.02em]">{open.name}</h2>
            </div>
            {/* ponytail: every horario shows the same mock detail; key resets the day toggles per horario. */}
            <ScheduleDetail key={open.id} detail={detail} />
        </div>
    );
}
