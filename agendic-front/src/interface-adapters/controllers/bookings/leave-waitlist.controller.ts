import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ILeaveWaitlistUseCase } from '@/src/application/use-cases/bookings/leave-waitlist.use-case';
import { InputParseError } from '@/src/entities/errors/common';

const inputSchema = z.object({ link: z.string().trim().min(1) });

export type ILeaveWaitlistController = ReturnType<typeof leaveWaitlistController>;

/** Salir de la Lista de espera. Es público: el enlace es la credencial, sin Sesión (ADR 0034). */
export const leaveWaitlistController =
    (instrumentationService: IInstrumentationService, leaveWaitlistUseCase: ILeaveWaitlistUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<void> =>
        instrumentationService.startSpan({ name: 'leaveWaitlist Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid Anotación link', { cause: error });
            await leaveWaitlistUseCase(data);
        });
