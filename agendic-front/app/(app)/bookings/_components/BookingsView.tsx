'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Tabs } from 'radix-ui';
import { ArrowLeft, ArrowRight, CalendarDays, MapPin } from 'lucide-react';
import { cn } from '@/app/_components/utils';
import { PanelBadge, PanelIconButton, PanelSelect } from '@/app/(app)/_components/panel-ui';
import {
    formatShortDay,
    formatTimeRange,
    groupByDay,
    isClosed,
    listValueOf,
    matches,
    sortForTab,
    tabOf,
    type Booking,
    type BookingFilter,
    type BookingTab,
    type ListField,
} from './booking-helpers';
import { BookingActions } from './BookingActions';
import { BookingFilters } from './BookingFilters';

const TABS: { id: BookingTab; label: string; empty: { title: string; description: string } }[] = [
    {
        id: 'upcoming',
        label: 'Próximos',
        empty: { title: 'No hay turnos próximos', description: 'Cuando tus clientes reserven desde tu Enlace de reserva, sus turnos van a aparecer acá.' },
    },
    {
        id: 'pending',
        label: 'Pendientes',
        empty: { title: 'No hay turnos pendientes', description: 'Los turnos que tenés que aceptar o rechazar van a aparecer acá.' },
    },
    {
        id: 'past',
        label: 'Pasados',
        empty: { title: 'No hay turnos pasados', description: 'Los turnos que ya ocurrieron van a aparecer acá.' },
    },
    {
        id: 'cancelled',
        label: 'Cancelados',
        empty: { title: 'No hay turnos cancelados', description: 'Los turnos cancelados o rechazados van a aparecer acá.' },
    },
];

const PAGE_SIZES = ['10', '25', '50'].map((v) => ({ value: v, label: v }));

const RED = 'bg-[#fdecec] text-[#b91c1c]';
const AMBER = 'bg-[#fff4e5] text-[#b45309]';

function badgesOf(b: Booking): { label: string; className: string }[] {
    return [
        b.status === 'PENDING' && { label: 'Pendiente', className: AMBER },
        b.status === 'BOOKED' && b.noShowAt !== null && { label: 'Ausencia', className: RED },
        b.status === 'REJECTED' && { label: 'Rechazado', className: RED },
        b.status === 'CANCELLED' && { label: 'Cancelado', className: RED },
    ].filter((badge) => !!badge);
}

function BookingRow({ booking, tab, now, onChange }: { booking: Booking; tab: BookingTab; now: number; onChange: (patch: Partial<Booking>) => void }) {
    const badges = badgesOf(booking);
    return (
        <li className="flex flex-wrap items-start gap-4 px-6 py-5 transition-colors hover:bg-[#f9fafb]">
            <Link
                href={`/bookings/${booking.id}`}
                className="flex min-w-0 flex-1 basis-[420px] flex-wrap gap-x-8 gap-y-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#0f1b2d] focus-visible:ring-offset-4"
            >
                <div className="flex w-[140px] shrink-0 flex-col gap-0.5">
                    <span className="text-[14px] font-bold text-[#0f1b2d] first-letter:uppercase">{formatShortDay(booking.startsAt)}</span>
                    <span className={cn('text-[13px] font-medium text-[#6b7280]', isClosed(booking) && 'line-through')}>{formatTimeRange(booking)}</span>
                    <span className="mt-1 flex items-center gap-1 text-[12.5px] font-semibold text-[#6b7280]">
                        <MapPin className="size-3.5" />
                        {booking.businessName} · {booking.branchName}
                    </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[14.5px] font-bold tracking-[-0.02em] text-[#0f1b2d]">
                        {booking.serviceName} con {booking.clientName}
                    </span>
                    <span className="text-[13px] font-medium text-[#374151]">{booking.clientEmail}</span>
                    {badges.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                            {badges.map((badge) => (
                                <PanelBadge key={badge.label} className={badge.className}>
                                    {badge.label}
                                </PanelBadge>
                            ))}
                        </div>
                    )}
                </div>
            </Link>
            <div className="ml-auto flex items-center gap-2">
                <BookingActions booking={booking} tab={tab} now={now} onChange={onChange} />
            </div>
        </li>
    );
}

const unique = (list: string[]) => [...new Set(list)].sort((a, b) => a.localeCompare(b, 'es'));

/**
 * Lista de Turnos del Empleado. Aceptar, Rechazar y demás acciones cambian solo el estado local hasta que
 * sus endpoints estén conectados.
 */
export function BookingsView({ bookings: initialBookings, now }: { bookings: Booking[]; now: number }) {
    const [bookings, setBookings] = useState(initialBookings);
    const [tab, setTab] = useState<BookingTab>('upcoming');
    const [filters, setFilters] = useState<BookingFilter[]>([]);
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(0);

    const options: Record<ListField, string[]> = {
        service: unique(initialBookings.map((b) => listValueOf('service', b))),
        branch: unique(initialBookings.map((b) => listValueOf('branch', b))),
    };

    const pendingCount = bookings.filter((b) => tabOf(b, now) === 'pending').length;
    const inTab = sortForTab(tab, bookings.filter((b) => tabOf(b, now) === tab && matches(b, filters)));
    const pageCount = Math.max(1, Math.ceil(inTab.length / pageSize));
    const current = Math.min(page, pageCount - 1);
    const from = current * pageSize;
    const pageItems = inTab.slice(from, from + pageSize);
    const empty = TABS.find((t) => t.id === tab)!.empty;

    const update = (id: number) => (patch: Partial<Booking>) =>
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));

    return (
        <div className="flex-1 bg-white px-4 py-8 text-[#0f1b2d] sm:px-8">
            <header className="flex min-w-0 flex-col gap-1">
                <h1 className="m-0 text-[21px] font-extrabold tracking-[-0.035em]">Turnos</h1>
                <p className="m-0 text-[13px] font-medium text-[#6b7280]">
                    Mirá los turnos que te reservaron en todas tus sucursales.
                </p>
            </header>

            <Tabs.Root
                value={tab}
                onValueChange={(v) => {
                    setTab(v as BookingTab);
                    setPage(0);
                }}
            >
                <Tabs.List aria-label="Turnos" className="mt-8 flex flex-wrap gap-1">
                    {TABS.map((t) => (
                        <Tabs.Trigger
                            key={t.id}
                            value={t.id}
                            className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13.5px] font-bold text-[#6b7280] transition-colors outline-none hover:text-[#0f1b2d] focus-visible:ring-2 focus-visible:ring-[#0f1b2d] data-[state=active]:bg-[#f3f4f6] data-[state=active]:text-[#0f1b2d]"
                        >
                            {t.label}
                            {t.id === 'pending' && pendingCount > 0 && (
                                <span className="rounded-full bg-[#0f1b2d] px-1.5 text-[11px] leading-[18px] font-bold text-white">{pendingCount}</span>
                            )}
                        </Tabs.Trigger>
                    ))}
                </Tabs.List>
            </Tabs.Root>

            <div className="mt-5 flex flex-wrap items-center gap-2">
                <BookingFilters
                    filters={filters}
                    options={options}
                    onChange={(next) => {
                        setFilters(next);
                        setPage(0);
                    }}
                />
            </div>

            {inTab.length > 0 ? (
                <>
                    <div className="mt-4 divide-y divide-[#e5e7eb] overflow-hidden rounded-md border border-[#e5e7eb]">
                        {groupByDay(pageItems, now).map((group) => (
                            <section key={group.label}>
                                <h2 className="m-0 border-b border-[#e5e7eb] bg-[#f9fafb] px-6 py-2.5 text-[12px] font-bold tracking-[0.04em] text-[#6b7280] uppercase">
                                    {group.label}
                                </h2>
                                <ul className="m-0 list-none divide-y divide-[#e5e7eb] p-0">
                                    {group.items.map((b) => (
                                        <BookingRow key={b.id} booking={b} tab={tab} now={now} onChange={update(b.id)} />
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>

                    <footer className="mt-4 flex flex-wrap items-center gap-3 text-[13px] font-medium text-[#374151]">
                        <PanelSelect
                            aria-label="Filas por página"
                            className="w-[76px]"
                            value={String(pageSize)}
                            onValueChange={(v) => {
                                setPageSize(Number(v));
                                setPage(0);
                            }}
                            options={PAGE_SIZES}
                        />
                        filas por página
                        <span className="ml-auto">
                            {from + 1}–{from + pageItems.length} de {inTab.length}
                        </span>
                        <div className="flex gap-1">
                            <PanelIconButton bordered label="Página anterior" disabled={current === 0} onClick={() => setPage(current - 1)}>
                                <ArrowLeft />
                            </PanelIconButton>
                            <PanelIconButton bordered label="Página siguiente" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)}>
                                <ArrowRight />
                            </PanelIconButton>
                        </div>
                    </footer>
                </>
            ) : (
                <div className="mt-4 flex flex-col items-center gap-2 rounded-md border border-dashed border-[#d1d5db] px-5 py-16 text-center">
                    <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-[#f3f4f6]">
                        <CalendarDays className="size-6 text-[#0f1b2d]" />
                    </div>
                    <p className="m-0 text-[17px] font-extrabold tracking-[-0.03em]">
                        {filters.length > 0 ? 'No hay turnos que coincidan' : empty.title}
                    </p>
                    <p className="m-0 max-w-[380px] text-[13px] font-medium leading-relaxed text-[#6b7280]">
                        {filters.length > 0 ? 'Probá sacando algún filtro.' : empty.description}
                    </p>
                </div>
            )}
        </div>
    );
}
