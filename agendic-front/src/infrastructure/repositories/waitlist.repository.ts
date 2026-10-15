import type { IWaitlistRepository } from '@/src/application/repositories/waitlist.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { InvalidVerificationCodeError } from '@/src/entities/errors/booking';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { WaitlistDateInPastError, WaitlistDayNotFullError } from '@/src/entities/errors/waitlist';
import { waitlistEntrySchema, waitlistEntryViewSchema, type JoinWaitlist, type WaitlistEntry, type WaitlistEntryView } from '@/src/entities/models/waitlist';

/** El mensaje del 400 que pasa a `InvalidVerificationCodeError`; los demás 400 son campos inválidos, un bug del front. */
const INVALID_CODE_MESSAGE = /^Invalid or expired verification code/;

/** Lista de espera contra la API del back: endpoint público, sin Sesión ni token de acceso. */
export class WaitlistRepository implements IWaitlistRepository {
    constructor(
        private readonly instrumentationService: IInstrumentationService,
        private readonly apiUrl = process.env.API_URL,
    ) {}

    /**
     * @throws {InvalidVerificationCodeError} el back respondió 400: el código no es válido para clientEmail, o venció
     * @throws {NotFoundError} el back respondió 404: el Servicio no existe o está dado de baja
     * @throws {WaitlistDayNotFullError} el back respondió 409: el día tiene Horarios reservables
     * @throws {WaitlistDateInPastError} el back respondió 422: la fecha ya pasó
     * @throws {ApiRequestError} cualquier otra respuesta con error, un cuerpo inesperado o una falla de red
     */
    async join({ serviceId, ...body }: JoinWaitlist): Promise<WaitlistEntry> {
        return this.instrumentationService.startSpan({ name: 'WaitlistRepository > join', op: 'http.client' }, async () => {
            const what = 'POST /services/:id/waitlist';
            if (!this.apiUrl) throw new ApiRequestError(`${what} failed: API_URL is not set`);

            let response: Response;
            try {
                response = await fetch(`${this.apiUrl}/services/${serviceId}/waitlist`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
            } catch (cause) {
                throw new ApiRequestError(`${what} failed`, { cause });
            }

            // 201 (Anotación nueva) y 200 (ya estaba anotado) devuelven lo mismo: para el Cliente es la misma confirmación.
            const json = await response.json().catch(() => undefined);
            const message = String(json?.message ?? `${what} responded ${response.status}`);
            if (response.status === 400 && INVALID_CODE_MESSAGE.test(message)) throw new InvalidVerificationCodeError(message);
            if (response.status === 404) throw new NotFoundError(message);
            if (response.status === 409) throw new WaitlistDayNotFullError(message);
            if (response.status === 422) throw new WaitlistDateInPastError(message);
            if (!response.ok) throw new ApiRequestError(message, { status: response.status });

            const parsed = waitlistEntrySchema.safeParse(json);
            if (!parsed.success) throw new ApiRequestError(`${what} responded with an unexpected body`, { cause: parsed.error });
            return parsed.data;
        });
    }

    /**
     * @throws {NotFoundError} el back respondió 404: el enlace no es de ninguna Anotación
     * @throws {ApiRequestError} cualquier otra respuesta con error, un cuerpo inesperado o una falla de red
     */
    async getByLink(link: string): Promise<WaitlistEntryView> {
        return this.instrumentationService.startSpan({ name: 'WaitlistRepository > getByLink', op: 'http.client' }, async () => {
            const what = 'GET /waitlist-links/:secret';
            const response = await this.request(what, `/waitlist-links/${encodeURIComponent(link)}`, { method: 'GET' });
            const parsed = waitlistEntryViewSchema.safeParse(await response.json().catch(() => undefined));
            if (!parsed.success) throw new ApiRequestError(`${what} responded with an unexpected body`, { cause: parsed.error });
            return parsed.data;
        });
    }

    /**
     * @throws {NotFoundError} el back respondió 404: el enlace no es de ninguna Anotación
     * @throws {ApiRequestError} cualquier otra respuesta con error o una falla de red
     */
    async leave(link: string): Promise<void> {
        return this.instrumentationService.startSpan({ name: 'WaitlistRepository > leave', op: 'http.client' }, async () => {
            await this.request('POST /waitlist-links/:secret/leave', `/waitlist-links/${encodeURIComponent(link)}/leave`, { method: 'POST' });
        });
    }

    /** Pide `path` al back sin Sesión; traduce el 404 y los errores, y devuelve la respuesta si salió bien. */
    private async request(what: string, path: string, init: RequestInit): Promise<Response> {
        if (!this.apiUrl) throw new ApiRequestError(`${what} failed: API_URL is not set`);

        let response: Response;
        try {
            response = await fetch(`${this.apiUrl}${path}`, init);
        } catch (cause) {
            throw new ApiRequestError(`${what} failed`, { cause });
        }
        if (response.ok) return response;

        const json = await response.json().catch(() => undefined);
        const message = String(json?.message ?? `${what} responded ${response.status}`);
        if (response.status === 404) throw new NotFoundError(message);
        throw new ApiRequestError(message, { status: response.status });
    }
}
