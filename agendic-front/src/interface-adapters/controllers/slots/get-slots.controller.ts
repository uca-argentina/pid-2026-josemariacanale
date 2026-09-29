import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetSlotsUseCase } from '@/src/application/use-cases/slots/get-slots.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { ServiceSlots } from '@/src/entities/models/slot';
import { z } from 'zod';

const inputSchema = z.object({
    serviceId: z.number(),
    employeeId: z.number(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function presenter(slots: ServiceSlots, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getSlots Presenter', op: 'serialize' }, () => ({
        timeZone: slots.timeZone,
        days: slots.days.map((d) => ({
            date: d.date,
            slots: d.slots,
            reason: d.reason,
            coveredByEmployeeId: d.coveredByEmployeeId,
        })),
    }));
}

export type IGetSlotsController = ReturnType<typeof getSlotsController>;

export const getSlotsController =
    (instrumentationService: IInstrumentationService, getSlotsUseCase: IGetSlotsUseCase) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getSlots Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid data', { cause: error });
            return presenter(await getSlotsUseCase(data), instrumentationService);
        });
