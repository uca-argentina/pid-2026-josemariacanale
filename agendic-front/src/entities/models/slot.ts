import { z } from 'zod';

export const slotReasonSchema = z.enum(['NOT_WORKING', 'FULLY_BOOKED', 'COVERED']);
export type SlotReason = z.infer<typeof slotReasonSchema>;

export const slotDaySchema = z.object({
    date: z.string(),
    slots: z.array(z.string()),
    reason: slotReasonSchema.optional(),
    coveredByEmployeeId: z.number().optional(),
});
export type SlotDay = z.infer<typeof slotDaySchema>;

export const serviceSlotsSchema = z.object({
    timeZone: z.string(),
    days: z.array(slotDaySchema),
});
export type ServiceSlots = z.infer<typeof serviceSlotsSchema>;
