import type dayjs from 'dayjs';
import { cn } from '@/app/_components/utils';
import type { BorderColor } from '../types/common';

const isRTL = () => {
    let userLanguage = 'en';
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
        userLanguage = new Intl.Locale(navigator.language).language;
    }
    return ['ar', 'he', 'fa', 'ur'].includes(userLanguage);
};

/** Los separadores entre días; en un idioma de derecha a izquierda, los días van al revés. */
export const VerticalLines = ({ days, borderColor }: { days: dayjs.Dayjs[]; borderColor: BorderColor }) => {
    const direction = isRTL() ? 'rtl' : 'ltr';

    return (
        <div
            className={cn(
                'pointer-events-none relative z-60 col-start-1 col-end-2 row-start-1 grid auto-cols-auto grid-rows-1 divide-x',
                borderColor === 'subtle' ? 'divide-border/60' : 'divide-border',
            )}
            dir={direction}
            style={{ direction }}
        >
            {days.map((_, i) => (
                <div
                    key={`Key_vertical_${i}`}
                    className="row-span-full"
                    style={{ gridColumnStart: direction === 'rtl' ? days.length - i : i + 1 }}
                />
            ))}
        </div>
    );
};
