'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs } from '@base-ui/react/tabs';
import { CalendarDays, DoorOpen, List, MapPin } from 'lucide-react';
import { useIsMobile } from '@/app/_components/hooks/use-mobile';
import { ToggleGroup, ToggleGroupItem } from '@/app/_components/ui/toggle-group';
import { PaginationControls } from '@/app/_components/PaginationControls';
import { cn } from '@/app/_components/utils';
import { PanelBadge } from '@/app/(app)/_components/panel-ui';
import {
    dayKey,
    formatShortDay,
    formatTimeRange,
    groupByDay,
    badgesOf,
    isClosed,
    listValueOf,
    matches,
    matchesRange,
    neighboursOf,
    sortForTab,
    tabOf,
    placeOf,
    cabinOf,
    type Booking,
    type BookingTab,
    type ListField,
} from './booking-helpers';
import { BookingActions } from './BookingActions';
import { BookingDetailsSheet } from './BookingDetailsSheet';
import { BookingFilters } from './BookingFilters';
import { BookingsCalendar, WeekNav } from './BookingsCalendar';
import { bookingsOfWeek, weekOf } from './calendar-week';
import { parseBookingsUrl, writeBookingsUrl, type BookingsUrlState, type BookingsView as View } from './bookings-url';
import type { Preferences } from '@/src/entities/models/user';

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

const PAGE_SIZES = [10, 25, 50];

function BookingRow({ booking, now, timeFormat, onOpen }: { booking: Booking; now: number; timeFormat: Preferences['timeFormat']; onOpen: (id: number) => void }) {
    const badges = badgesOf(booking);
    const cabin = cabinOf(booking);
    return (
        <li className="flex flex-wrap items-start gap-4 px-6 py-5 transition-colors hover:bg-[#f9fafb]">
            <button
                type="button"
                onClick={() => onOpen(booking.id)}
                className="flex min-w-0 flex-1 basis-[420px] cursor-pointer flex-wrap gap-x-8 gap-y-2 rounded-md bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#0f1b2d] focus-visible:ring-offset-4"
            >
                <div className="flex w-[140px] shrink-0 flex-col gap-0.5">
                    <span className="text-[14px] font-bold text-[#0f1b2d] first-letter:uppercase">{formatShortDay(booking.startsAt)}</span>
                    <span className={cn('text-[13px] font-medium text-[#6b7280]', isClosed(booking) && 'line-through')}>{formatTimeRange(booking, timeFormat)}</span>
                    <span className="mt-1 flex items-center gap-1 text-[12.5px] font-semibold text-[#6b7280]">
                        <MapPin className="size-3.5" />
                        {placeOf(booking)}
                    </span>
                    {cabin && (
                        <span className="flex items-center gap-1 text-[12.5px] font-semibold text-[#6b7280]">
                            <DoorOpen className="size-3.5" />
                            {cabin}
                        </span>
                    )}
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
            </button>
            <div className="ml-auto flex items-center gap-2">
                <BookingActions booking={booking} now={now} />
            </div>
        </li>
    );
}

const unique = (list: string[]) => [...new Set(list)].sort((a, b) => a.localeCompare(b, 'es'));

/**
 * Lista de Turnos del Empleado, tal como la devuelve el back; las acciones de cada Turno refrescan la página.
 * La pestaña, los filtros y el rango de fechas viven en la URL: se leen al montar y se copian con
 * `history.replaceState`, que no le vuelve a pedir la página al server. Las horas siguen las Preferencias.
 */
export function BookingsView({ bookings, now, preferences }: { bookings: Booking[]; now: number; preferences: Preferences }) {
    const searchParams = useSearchParams();
    const [{ tab, filters, range, view: chosenView, week, turno }, setUrlState] = useState(() => parseBookingsUrl(searchParams));
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(0);

    const update = (patch: Partial<BookingsUrlState>) => {
        const next = { tab, filters, range, view: chosenView, week, turno, ...patch };
        setUrlState(next);
        if (!('turno' in patch)) setPage(0);
        const params = writeBookingsUrl(next, new URLSearchParams(window.location.search));
        window.history.replaceState(null, '', params.size ? `${window.location.pathname}?${params}` : window.location.pathname);
    };

    const isMobile = useIsMobile();
    const view: View = isMobile ? 'list' : chosenView;
    const currentWeek = weekOf(week, dayKey(now), preferences.weekStart);
    const options: Record<ListField, string[]> = {
        service: unique(bookings.map((b) => listValueOf('service', b))),
        branch: unique(bookings.map((b) => listValueOf('branch', b))),
    };

    const pendingCount = bookings.filter((b) => tabOf(b, now) === 'pending').length;
    const inTab = sortForTab(tab, bookings.filter((b) => tabOf(b, now) === tab && matches(b, filters) && matchesRange(b, range)));
    const pageCount = Math.max(1, Math.ceil(inTab.length / pageSize));
    const current = Math.min(page, pageCount - 1);
    const from = current * pageSize;
    const pageItems = inTab.slice(from, from + pageSize);
    const filtered = filters.length > 0 || range !== null;
    const empty = TABS.find((t) => t.id === tab)!.empty;
    const matching = bookings.filter((b) => matches(b, filters) && matchesRange(b, range));

    // Un ?turno= que no está en la lista se ignora; uno que sí está se abre aunque la pestaña o los filtros lo oculten, sin vecinos.
    const open = bookings.find((b) => b.id === turno) ?? null;
    const visible = view === 'calendar' ? sortForTab('upcoming', bookingsOfWeek(matching, currentWeek)) : inTab;
    const { previous, next } = open ? neighboursOf(visible, open.id) : { previous: null, next: null };
    const openBooking = (id: number) => update({ turno: id });

    return (
        <div className="flex-1 bg-white px-4 py-8 text-[#0f1b2d] sm:px-8">
            <header className="flex min-w-0 flex-col gap-1">
                <h1 className="m-0 text-[21px] font-extrabold tracking-[-0.035em]">Turnos</h1>
                <p className="m-0 text-[13px] font-medium text-[#6b7280]">
                    Mirá los turnos que te reservaron en todas tus sucursales.
                </p>
            </header>

            <BookingFilters
                filters={filters}
                options={options}
                onChange={(next) => update({ filters: next })}
                range={range}
                onRangeChange={(next) => update({ range: next })}
                today={dayKey(now)}
                weekStart={preferences.weekStart}
                leading={
                    view === 'calendar' ? (
                        <WeekNav week={currentWeek} weekStart={preferences.weekStart} onWeekChange={(next) => update({ week: next })} />
                    ) : (
                        <Tabs.Root value={tab} onValueChange={(v) => update({ tab: v as BookingTab })}>
                            <Tabs.List aria-label="Turnos" className="flex flex-wrap gap-1">
                                {TABS.map((t) => (
                                    <Tabs.Tab
                                        key={t.id}
                                        value={t.id}
                                        className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13.5px] font-bold text-[#6b7280] transition-colors outline-none hover:text-[#0f1b2d] focus-visible:ring-2 focus-visible:ring-[#0f1b2d] data-[active]:bg-[#f3f4f6] data-[active]:text-[#0f1b2d]"
                                    >
                                        {t.label}
                                        {t.id === 'pending' && pendingCount > 0 && (
                                            <span className="rounded-full bg-[#0f1b2d] px-1.5 text-[11px] leading-[18px] font-bold text-white">{pendingCount}</span>
                                        )}
                                    </Tabs.Tab>
                                ))}
                            </Tabs.List>
                        </Tabs.Root>
                    )
                }
                trailing={
                    <>
                        {!isMobile && (
                            <ToggleGroup
                                variant="outline"
                                spacing={0}
                                value={[view]}
                                onValueChange={([next]) => next && update({ view: next as View })}
                            >
                                <ToggleGroupItem value="list" aria-label="Lista">
                                    <List />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="calendar" aria-label="Calendario">
                                    <CalendarDays />
                                </ToggleGroupItem>
                            </ToggleGroup>
                        )}
                    </>
                }
            />

            {view === 'calendar' ? (
                <BookingsCalendar
                    bookings={matching}
                    week={currentWeek}
                    preferences={preferences}
                    onOpen={openBooking}
                />
            ) : inTab.length > 0 ? (
                <>
                    <div className="mt-4 divide-y divide-[#e5e7eb] overflow-hidden rounded-md border border-[#e5e7eb]">
                        {groupByDay(pageItems, now).map((group) => (
                            <section key={group.label}>
                                <h2 className="m-0 border-b border-[#e5e7eb] bg-[#f9fafb] px-6 py-2.5 text-[12px] font-bold tracking-[0.04em] text-[#6b7280] uppercase">
                                    {group.label}
                                </h2>
                                <ul className="m-0 list-none divide-y divide-[#e5e7eb] p-0">
                                    {group.items.map((b) => (
                                        <BookingRow key={b.id} booking={b} now={now} timeFormat={preferences.timeFormat} onOpen={openBooking} />
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>

                    <PaginationControls
                        page={current}
                        pageCount={pageCount}
                        pageSize={pageSize}
                        pageSizes={PAGE_SIZES}
                        summary={`${from + 1}–${from + pageItems.length} de ${inTab.length}`}
                        onPageChange={setPage}
                        onPageSizeChange={(size) => {
                            setPageSize(size);
                            setPage(0);
                        }}
                    />
                </>
            ) : (
                <div className="mt-4 flex flex-col items-center gap-2 rounded-md border border-dashed border-[#d1d5db] px-5 py-16 text-center">
                    <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-[#f3f4f6]">
                        <CalendarDays className="size-6 text-[#0f1b2d]" />
                    </div>
                    <p className="m-0 text-[17px] font-extrabold tracking-[-0.03em]">
                        {filtered ? 'No hay turnos que coincidan' : empty.title}
                    </p>
                    <p className="m-0 max-w-[380px] text-[13px] font-medium leading-relaxed text-[#6b7280]">
                        {filtered ? 'Probá sacando algún filtro.' : empty.description}
                    </p>
                </div>
            )}

            <BookingDetailsSheet
                booking={open}
                previous={previous}
                next={next}
                now={now}
                preferences={preferences}
                onSelect={openBooking}
                onClose={() => update({ turno: null })}
            />
        </div>
    );
}
