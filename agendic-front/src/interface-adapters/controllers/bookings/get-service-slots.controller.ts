import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IGetServiceSlotsUseCase } from '@/src/application/use-cases/bookings/get-service-slots.use-case';
import { InputParseError } from '@/src/entities/errors/common';
import type { ServiceSlots } from '@/src/entities/models/slot';

function presenter(slots: ServiceSlots, instrumentationService: IInstrumentationService) {
    return instrumentationService.startSpan({ name: 'getServiceSlots Presenter', op: 'serialize' }, () => ({
        timeZone: slots.timeZone,
        days: slots.days.map((d) => ({
            date: d.date,
            slots: d.slots,
            reason: d.reason,
            coveredByEmployeeId: d.coveredByEmployeeId,
        })),
    }));
}

const inputSchema = z.object({
    serviceId: z.number().int().positive(),
    employeeId: z.number().int().positive(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (esperado YYYY-MM-DD)'),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (esperado YYYY-MM-DD)'),
});

export type IGetServiceSlotsController = ReturnType<typeof getServiceSlotsController>;
export const getServiceSlotsController =
    (instrumentationService: IInstrumentationService, getServiceSlotsUseCase: IGetServiceSlotsUseCase) =>
    async (input: unknown): Promise<ReturnType<typeof presenter>> =>
        instrumentationService.startSpan({ name: 'getServiceSlots Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid slot query parameters', { cause: error });
            const slots = await getServiceSlotsUseCase(data);
            return presenter(slots, instrumentationService);
        });
