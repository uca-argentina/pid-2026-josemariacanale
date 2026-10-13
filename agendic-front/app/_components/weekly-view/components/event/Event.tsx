import dayjs from 'dayjs';
import { cva } from 'class-variance-authority';
import type { BookingStatus } from '@/src/entities/models/booking';
import { cn } from '@/app/_components/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/_components/ui/tooltip';
import { useCalendarStore } from '../../state/store';
import type { CalendarEvent } from '../../types/events';
import { formatTime } from '../../utils';

type EventProps = {
    event: CalendarEvent;
    currentlySelectedEventId?: number;
    eventDuration: number;
    onEventClick?: (event: CalendarEvent) => void;
    disabled?: boolean;
    isHovered?: boolean;
};

const eventClasses = cva(
    'group flex h-full w-full overflow-hidden rounded-[6px] border-border px-[6px] text-xs leading-5 font-medium',
    {
        variants: {
            status: {
                BOOKED: 'border border-border bg-muted text-foreground hover:bg-border',
                PENDING: 'border border-dashed border-border bg-muted text-muted-foreground',
                REJECTED: 'border border-dashed bg-muted text-muted-foreground line-through',
                CANCELLED: 'border border-dashed bg-muted text-muted-foreground line-through',
            },
            disabled: {
                true: 'hover:cursor-default',
                false: 'hover:cursor-pointer',
            },
            selected: {
                true: '',
                false: '',
            },
            borderOnly: {
                true: 'border-[1.5px] border-dashed border-border bg-transparent opacity-60',
                false: '',
            },
        },
    },
);

const STATUS_COLOR_MAP: Record<BookingStatus, string> = {
    BOOKED: 'bg-green-500',
    PENDING: 'bg-orange-500',
    REJECTED: 'bg-red-500',
    CANCELLED: 'bg-red-500',
};

const STATUS_LABELS: Record<BookingStatus, string> = {
    BOOKED: 'Aceptado',
    PENDING: 'Pendiente',
    REJECTED: 'Rechazado',
    CANCELLED: 'Cancelado',
};

/**
 * La tarjeta de un evento, con una variante por estado del Turno y un tooltip con el detalle.
 *
 * Según la duración muestra una línea, dos o el detalle completo. Con `onEventClick` es un botón.
 */
export function Event({ event, currentlySelectedEventId, eventDuration, disabled, onEventClick, isHovered = false }: EventProps) {
    const timezone = useCalendarStore((state) => state.timezone);
    const timeFormat = useCalendarStore((state) => state.timeFormat ?? 24);
    const selected = currentlySelectedEventId === event.id;
    const { options } = event;

    const colorClass = !options?.color && options?.status ? STATUS_COLOR_MAP[options.status] : undefined;
    const Component = onEventClick ? 'button' : 'div';

    const dayOfWeek = dayjs(event.start).tz(timezone).day();
    const tooltipSide = dayOfWeek >= 1 && dayOfWeek <= 4 ? 'right' : 'left';
    const range = `${formatTime(event.start, timezone, timeFormat)} - ${formatTime(event.end, timezone, timeFormat)}`;

    const displayType = eventDuration < 40 ? 'single-line' : eventDuration < 45 ? 'multi-line' : 'full';

    return (
        <Tooltip>
            <TooltipTrigger
                render={<Component {...(Component === 'button' ? { type: 'button' as const } : {})} />}
                data-booking-calendar-event="true"
                onClick={() => onEventClick?.(event)}
                {...(options?.bookingUid ? { 'data-booking-uid': options.bookingUid } : {})}
                className={cn(
                    eventClasses({
                        status: options?.status,
                        disabled,
                        selected,
                        borderOnly: options?.borderOnly ?? false,
                    }),
                    options?.className,
                    (isHovered || selected) && 'shadow-lg ring-2 ring-primary ring-offset-0',
                )}
                style={{ transition: 'all 100ms ease-out' }}
            >
                {(options?.color || colorClass) && (
                    <div
                        className={cn('mr-1.5 -ml-1.5 h-full w-[3px] shrink-0', colorClass)}
                        style={options?.color ? { backgroundColor: options.color } : undefined}
                    />
                )}
                <div className={cn('flex w-full', displayType !== 'single-line' && 'flex-col py-1')}>
                    {displayType === 'single-line' && (
                        <div className="flex w-full shrink-0 items-center gap-2 overflow-hidden text-left leading-4 text-ellipsis whitespace-nowrap">
                            <span>{event.title}</span>
                            {!options?.hideTime && (
                                <p className="mt-1 w-full text-left text-[10px] leading-none whitespace-nowrap text-muted-foreground">
                                    {range}
                                </p>
                            )}
                        </div>
                    )}
                    {displayType !== 'single-line' && (
                        <p className="shrink-0 text-left leading-4 whitespace-nowrap">{event.title}</p>
                    )}
                    {displayType !== 'single-line' && !options?.hideTime && (
                        <p className="mt-1 text-left text-[10px] leading-none whitespace-nowrap text-muted-foreground">{range}</p>
                    )}
                    {displayType === 'full' && event.description && (
                        <p className="mt-1 text-left text-[10px] leading-none text-muted-foreground">{event.description}</p>
                    )}
                </div>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} className="max-w-none">
                <div className="flex max-w-[300px] min-w-[200px] flex-col gap-1 py-1">
                    <div className="flex items-start gap-2">
                        {(options?.color || colorClass) && (
                            <div
                                className={cn('mt-1 h-3 w-1 shrink-0 rounded-sm', colorClass)}
                                style={options?.color ? { backgroundColor: options.color } : undefined}
                            />
                        )}
                        <div className="flex-1">
                            <div className="leading-tight font-semibold">{event.title}</div>
                            {!options?.hideTime && <div className="mt-1 text-xs opacity-70">{range}</div>}
                            {event.description && <div className="mt-1 text-xs leading-snug opacity-70">{event.description}</div>}
                            {options?.status && options.status !== 'BOOKED' && (
                                <div className="mt-1 text-xs opacity-70">{STATUS_LABELS[options.status]}</div>
                            )}
                        </div>
                    </div>
                </div>
            </TooltipContent>
        </Tooltip>
    );
}
