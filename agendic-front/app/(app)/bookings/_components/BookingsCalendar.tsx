'use client';

import { useRouter } from 'next/navigation';
import { es } from '@daypicker/react/locale';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { Calendar } from '@/app/_components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/_components/ui/popover';
import { Calendar as WeeklyCalendar } from '@/app/_components/weekly-view';
import { toIsoDay, toLocalDay } from '@/app/_components/day-range';
import type { Preferences } from '@/src/entities/models/user';
import { localInstant, TIME_ZONE, type Booking } from './booking-helpers';
import { addDays, bookingsOfWeek, toCalendarEvent, weekStartOf, weekTitle } from './calendar-week';

/**
 * Barra de la semana mostrada: Hoy, semana anterior y siguiente y selector de semana. `week` es el primer día
 * de la semana; `onWeekChange(null)` vuelve a la actual.
 */
export function WeekNav({
    week,
    weekStart,
    onWeekChange,
}: {
    week: string;
    weekStart: Preferences['weekStart'];
    onWeekChange: (week: string | null) => void;
}) {
    const pick = (day: string) => onWeekChange(weekStartOf(day, weekStart));
    return (
        <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onWeekChange(null)}>
                Hoy
            </Button>
            <Button type="button" variant="outline" size="icon" aria-label="Semana anterior" onClick={() => pick(addDays(week, -7))}>
                <ChevronLeft />
            </Button>
            <Button type="button" variant="outline" size="icon" aria-label="Semana siguiente" onClick={() => pick(addDays(week, 7))}>
                <ChevronRight />
            </Button>
            <Popover>
                <PopoverTrigger render={<Button type="button" variant="outline" />}>
                    <CalendarRange />
                    {weekTitle(week)}
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto">
                    <Calendar
                        mode="single"
                        locale={es}
                        weekStartsOn={weekStart}
                        defaultMonth={toLocalDay(week)}
                        selected={toLocalDay(week)}
                        onSelect={(date) => date && pick(toIsoDay(date))}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}

/** Grilla semanal de los Turnos aceptados y pendientes de la semana `week`. */
export function BookingsCalendar({ bookings, week, preferences }: { bookings: Booking[]; week: string; preferences: Preferences }) {
    const router = useRouter();

    return (
        <div className="mt-4">
            <div className="flex h-[calc(100vh-16rem)] flex-col overflow-x-hidden overflow-y-auto rounded-md border">
                <WeeklyCalendar
                    timezone={TIME_ZONE}
                    timeFormat={preferences.timeFormat}
                    sortEvents
                    startHour={0}
                    endHour={23}
                    events={bookingsOfWeek(bookings, week).map(toCalendarEvent)}
                    startDate={localInstant(week, '12:00')}
                    endDate={localInstant(addDays(week, 6), '12:00')}
                    gridCellsPerHour={4}
                    hoverEventDuration={0}
                    showBackgroundPattern={false}
                    showBorder={false}
                    borderColor="subtle"
                    onEventClick={(event) => router.push(`/bookings/${event.id}`)}
                    showTimezone
                    hideHeader
                    updateCurrentTimeOnFocus
                />
            </div>
        </div>
    );
}
