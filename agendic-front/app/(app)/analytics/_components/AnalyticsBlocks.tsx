import { Star } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/app/_components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/app/_components/ui/empty';
import { toIsoDay } from '@/app/_components/day-range';
import { formatOutOfOfficeDate } from '@/app/_components/format-day';
import { PanelAvatar } from '@/app/(app)/_components/panel-ui';
import { Skeleton } from '@/app/_components/ui/skeleton';
import type { BusinessAnalyticsData, PersonalAnalyticsData } from '../actions';

/** "Servicios más reservados": el nombre y la cantidad de cada uno. */
export function PopularServices({ services }: { services: PersonalAnalyticsData['popularServices'] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Servicios más reservados</CardTitle>
            </CardHeader>
            {services.length === 0 ? (
                <p className="m-0 px-6 text-sm text-muted-foreground">Sin Turnos en este período.</p>
            ) : (
                <ul className="m-0 flex list-none flex-col divide-y px-6 p-0">
                    {services.map(({ id, name, count }) => (
                        <li key={id} className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0">
                            <span className="truncate">{name}</span>
                            <span className="font-semibold tabular-nums">{count}</span>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

/** "Calificaciones recientes": estrellas, comentario, Cliente, Servicio, Empleado (si lo hay) y fecha; sin Calificaciones, un estado vacío. */
export function RecentRatings({ ratings }: { ratings: PersonalAnalyticsData['recentRatings'] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Calificaciones recientes</CardTitle>
            </CardHeader>
            {ratings.length === 0 ? (
                <Empty className="py-8 md:py-8">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Star />
                        </EmptyMedia>
                        <EmptyTitle>Todavía no hay Calificaciones</EmptyTitle>
                        <EmptyDescription>El Cliente califica su Turno desde el Enlace del Turno, cuando termina.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <ul className="m-0 flex list-none flex-col divide-y px-6 p-0">
                    {ratings.map(({ score, comment, createdAt, clientName, serviceName, employeeName }, index) => (
                        <li key={index} className="flex flex-col gap-1 py-3 text-sm first:pt-0">
                            <span role="img" aria-label={`${score} de 5 estrellas`} className="flex gap-0.5">
                                {Array.from({ length: 5 }, (_, star) => (
                                    <Star key={star} className={star < score ? 'size-4 fill-amber-400 text-amber-400' : 'size-4 text-muted-foreground'} />
                                ))}
                            </span>
                            {comment && <p className="m-0">{comment}</p>}
                            <CardDescription>
                                {clientName} · {serviceName}{employeeName && ` · ${employeeName}`} · {formatOutOfOfficeDate(toIsoDay(new Date(createdAt)))}
                            </CardDescription>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

/** Un ranking de Empleados del Dueño ("Empleados más reservados"…): avatar, nombre y cantidad de cada uno. */
export function EmployeeRanking({ title, employees }: { title: string; employees: NonNullable<BusinessAnalyticsData['rankings']>['mostBooked'] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            {employees.length === 0 ? (
                <p className="m-0 px-6 text-sm text-muted-foreground">Sin Turnos en este período.</p>
            ) : (
                <ul className="m-0 flex list-none flex-col divide-y px-6 p-0">
                    {employees.map(({ id, name, imageUrl, count }) => (
                        <li key={id} className="flex items-center gap-3 py-2 text-sm first:pt-0">
                            <PanelAvatar name={name} imageUrl={imageUrl} className="size-8" />
                            <span className="min-w-0 flex-1 truncate">{name}</span>
                            <span className="font-semibold tabular-nums">{count}</span>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

/** El esqueleto de los bloques de abajo de las tarjetas (gráfico y dos listas) mientras carga. */
export function BlocksSkeleton({ extra = 0 }: { extra?: number }) {
    return (
        <>
            <Skeleton className="mx-4 h-96 rounded-xl lg:mx-6" aria-busy aria-label="Cargando tendencias" />
            <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
                {Array.from({ length: 2 + extra }, (_, index) => (
                    <Skeleton key={index} className="h-64 rounded-xl" aria-busy aria-label="Cargando bloque" />
                ))}
            </div>
        </>
    );
}
