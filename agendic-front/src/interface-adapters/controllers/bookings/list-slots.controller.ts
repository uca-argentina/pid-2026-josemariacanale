import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListSlotsUseCase } from '@/src/application/use-cases/bookings/list-slots.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { Slots } from '@/src/entities/models/slot';

// The back counts both ends of the range (ADR 0007).
const MAX_RANGE_DAYS = 31;
const DAY_MS = 24 * 60 * 60 * 1000;

// Each Horario reservable keeps its instant, which is what POST /bookings takes, next to its local
// time in the Sucursal ('HH:mm'), which is what the Cliente sees. h23: midnight is 00:00, not 24:00.
function presenter({ timeZone, days }: Slots, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'listSlots Presenter', op: 'serialize' }, () => {
        const localTime = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
        return {
            days: days.map((day) => ({
                date: day.date,
                slots: day.slots.map((startsAt) => ({ startsAt, time: localTime.format(new Date(startsAt)) })),
                ...(day.reason && { reason: day.reason }),
            })),
        };
    });
}

const inputSchema = z
    .object({
        serviceId: z.number().int().positive(),
        employeeId: z.number().int().positive(),
        from: z.iso.date(),
        to: z.iso.date(),
    })
    .refine(({ from, to }) => {
        const days = (Date.parse(to) - Date.parse(from)) / DAY_MS + 1;
        return days >= 1 && days <= MAX_RANGE_DAYS;
    }, `The range has to be 1 to ${MAX_RANGE_DAYS} days, with to not before from`);

export type IListSlotsController = ReturnType<typeof listSlotsController>;
// Public: the Cliente reserves without a Sesión (ADR 0005).
export const listSlotsController =
    (instrumentationService: IInstrumentationService, listSlotsUseCase: IListSlotsUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'listSlots Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Horarios reservables query', { cause: error });
            return presenter(await listSlotsUseCase(data), instrumentationService);
        });
