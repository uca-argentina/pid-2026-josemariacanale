'use client';

import { useRouter } from 'next/navigation';
import { es } from '@daypicker/react/locale';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import { Calendar } from '@/app/_components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/_components/ui/popover';
import { WeeklyView } from '@/app/_components/weekly-view/WeeklyView';
import { toIsoDay, toLocalDay } from '@/app/_components/day-range';
import type { Preferences } from '@/src/entities/models/user';
import { localInstant, TIME_ZONE, type Booking } from './booking-helpers';
import { addDays, bookingsOfWeek, toCalendarEvent, weekStartOf, weekTitle } from './calendar-week';

/**
 * Calendario semanal de los Turnos aceptados y pendientes: barra con Hoy, semana anterior y siguiente y
 * selector de semana, y la grilla. `week` es el primer día de la semana mostrada; `onWeekChange(null)` vuelve a la actual.
 */
export function BookingsCalendar({
    bookings,
    week,
    now,
    preferences,
    onWeekChange,
}: {
    bookings: Booking[];
    week: string;
    now: number;
    preferences: Preferences;
    onWeekChange: (week: string | null) => void;
}) {
    const router = useRouter();
    const pick = (day: string) => onWeekChange(weekStartOf(day, preferences.weekStart));

    return (
        <div className="mt-4">
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
                            weekStartsOn={preferences.weekStart}
                            defaultMonth={toLocalDay(week)}
                            selected={toLocalDay(week)}
                            onSelect={(date) => date && pick(toIsoDay(date))}
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="mt-4 overflow-hidden rounded-md border">
                <WeeklyView
                    weekStart={localInstant(week, '12:00')}
                    events={bookingsOfWeek(bookings, week).map(toCalendarEvent)}
                    timeZone={TIME_ZONE}
                    timeFormat={preferences.timeFormat}
                    now={now}
                    onEventClick={(id) => router.push(`/bookings/${id}`)}
                />
            </div>
        </div>
    );
}
