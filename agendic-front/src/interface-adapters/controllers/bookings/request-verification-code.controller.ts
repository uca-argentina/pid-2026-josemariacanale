import { z } from 'zod';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IRequestVerificationCodeUseCase } from '@/src/application/use-cases/bookings/request-verification-code.use-case';
import { InputParseError } from '@/src/entities/errors/common';

const inputSchema = z.object({ email: z.string().trim().pipe(z.email()) });

export type IRequestVerificationCodeController = ReturnType<typeof requestVerificationCodeController>;

/**
 * Pide un Código de verificación para email, paso previo a Reservar.
 *
 * Público: el Cliente no tiene Sesión (ADR 0005).
 *
 * @throws {InputParseError} el email falta o no es válido
 * @throws {TooManyVerificationCodeRequestsError} ya se pidieron demasiados para ese email
 */
export const requestVerificationCodeController =
    (instrumentationService: IInstrumentationService, requestVerificationCodeUseCase: IRequestVerificationCodeUseCase) =>
    async (input: Partial<z.input<typeof inputSchema>>): Promise<void> =>
        instrumentationService.startSpan({ name: 'requestVerificationCode Controller' }, async () => {
            const { data, error } = inputSchema.safeParse(input);
            if (error) throw new InputParseError('Invalid email', { cause: error });
            await requestVerificationCodeUseCase(data.email);
        });
