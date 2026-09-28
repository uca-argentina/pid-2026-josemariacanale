import { z } from 'zod';

export const employeeOverrideIntervalSchema = z.object({
    startTime: z.string(),
    endTime: z.string(),
});
export type EmployeeOverrideInterval = z.infer<typeof employeeOverrideIntervalSchema>;

export const employeeOverrideSchema = z.object({
    date: z.string(), // YYYY-MM-DD
    intervals: z.array(employeeOverrideIntervalSchema),
    coveredByEmployeeId: z.number().optional(),
});
export type EmployeeOverride = z.infer<typeof employeeOverrideSchema>;

export const putEmployeeOverrideSchema = z.object({
    intervals: z.array(employeeOverrideIntervalSchema),
    coveredByEmployeeId: z.number().optional(),
});
export type PutEmployeeOverride = z.infer<typeof putEmployeeOverrideSchema>;
