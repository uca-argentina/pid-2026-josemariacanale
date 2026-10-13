import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/app/_components/ui/button';
import { useCalendarStore } from '../../state/store';

/** El rango de la semana ("12 – 18 oct, 2026") y las flechas a la semana anterior y la siguiente. */
export function SchedulerHeading() {
    const { startDate, endDate, handleDateChange } = useCalendarStore(
        useShallow((state) => ({ startDate: state.startDate, endDate: state.endDate, handleDateChange: state.handleDateChange })),
    );
    const start = dayjs(startDate).locale('es');
    const end = dayjs(endDate).locale('es');

    return (
        <header className="flex flex-none flex-col justify-between py-4 sm:flex-row sm:items-center">
            <h1 className="text-xl font-semibold text-foreground">
                {start.format('D')} – {end.format('D MMM')}
                <span className="text-muted-foreground">, {end.format('YYYY')}</span>
            </h1>
            <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" aria-label="Semana anterior" onClick={() => handleDateChange('DECREMENT')}>
                    <ChevronLeft />
                </Button>
                <Button type="button" variant="outline" size="icon" aria-label="Semana siguiente" onClick={() => handleDateChange('INCREMENT')}>
                    <ChevronRight />
                </Button>
            </div>
        </header>
    );
}
