import { UnauthenticatedError } from '@/src/entities/errors/auth';
import { ApiRequestError, NotFoundError } from '@/src/entities/errors/common';
import { LeftOutsideBookingsChangedError, OutOfOfficeConflictError, OutOfOfficeRuleError } from '@/src/entities/errors/out-of-office';
import { OutOfOfficeRepository } from '@/src/infrastructure/repositories/out-of-office.repository';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const periodo = { id: 1, startDate: '2026-10-11', endDate: '2026-10-16', reason: 'VACATION', notes: null, showNotePublicly: false };

const repo = (apiUrl: string | undefined = 'http://api') =>
    new OutOfOfficeRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), instrumentation, apiUrl);
const respond = (status: number, body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('OutOfOfficeRepository.listOutOfOffice', () => {
    it('GETs the Usuario’s períodos with the bearer token and parses them', async () => {
        const fetchSpy = respond(200, [periodo]);

        await expect(repo().listOutOfOffice()).resolves.toEqual([periodo]);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/users/me/out-of-office',
            expect.objectContaining({ method: 'GET', headers: { Authorization: 'Bearer tok' } }),
        );
    });

    it('returns an empty list when there are none', async () => {
        respond(200, []);
        await expect(repo().listOutOfOffice()).resolves.toEqual([]);
    });

    it('translates a 401 to UnauthenticatedError', async () => {
        respond(401, { statusCode: 401, message: 'no' });
        await expect(repo().listOutOfOffice()).rejects.toBeInstanceOf(UnauthenticatedError);
    });

    it('translates a 500 to ApiRequestError carrying the status', async () => {
        respond(500, { message: 'boom' });
        await expect(repo().listOutOfOffice()).rejects.toMatchObject({ status: 500 });
    });

    it('translates an unexpected body to ApiRequestError keeping the cause', async () => {
        respond(200, [{ id: 'x' }]);
        const error = await repo().listOutOfOffice().catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.cause).toBeDefined();
    });

    it('translates a network failure to ApiRequestError without status, keeping the cause', async () => {
        const cause = new TypeError('offline');
        jest.spyOn(global, 'fetch').mockRejectedValue(cause);
        const error = await repo().listOutOfOffice().catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBeUndefined();
        expect(error.cause).toBe(cause);
    });

    it('fails without calling the API when API_URL is missing', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch');
        await expect(repo('').listOutOfOffice()).rejects.toBeInstanceOf(ApiRequestError);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

const leftOutside = {
    id: 9,
    startsAt: '2026-10-12T13:00:00.000Z',
    endsAt: '2026-10-12T14:00:00.000Z',
    timeZone: 'America/Argentina/Buenos_Aires',
    serviceName: 'Corte',
    clientName: 'Ana',
    business: { id: 1, name: 'Spa' },
    branch: { id: 2, name: 'Centro' },
    cancellationCause: 'OUT_OF_OFFICE',
    cancellationReason: 'Estoy Fuera de la oficina',
};

describe('OutOfOfficeRepository.previewOutOfOffice', () => {
    const body = { startDate: '2026-10-11', endDate: '2026-10-13', reason: 'VACATION' as const };

    it('POSTs the body to the preview and parses the Turnos', async () => {
        const personal = { ...leftOutside, id: 10, business: null, branch: null };
        const fetchSpy = respond(200, [leftOutside, personal]);
        await expect(repo().previewOutOfOffice(body)).resolves.toEqual([leftOutside, personal]);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/users/me/out-of-office/preview',
            expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }),
        );
    });

    it('returns an empty list when nothing is left outside', async () => {
        respond(200, []);
        await expect(repo().previewOutOfOffice(body)).resolves.toEqual([]);
    });

    it('translates 422 and the duplicate 409', async () => {
        respond(422, { message: 'fin antes que inicio' });
        await expect(repo().previewOutOfOffice(body)).rejects.toBeInstanceOf(OutOfOfficeRuleError);
        jest.restoreAllMocks();
        respond(409, { message: 'Ya hay un período Fuera de la oficina con esas fechas' });
        await expect(repo().previewOutOfOffice(body)).rejects.toBeInstanceOf(OutOfOfficeConflictError);
    });

    it('translates a 401 to UnauthenticatedError', async () => {
        respond(401, { message: 'no' });
        await expect(repo().previewOutOfOffice(body)).rejects.toBeInstanceOf(UnauthenticatedError);
    });

    it('fails with ApiRequestError keeping the cause on an unexpected body', async () => {
        respond(200, [{ id: 'x' }]);
        const error = await repo().previewOutOfOffice(body).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.cause).toBeDefined();
    });
});

describe('OutOfOfficeRepository writes', () => {
    const body = { startDate: '2026-10-11', endDate: '2026-10-13', reason: 'VACATION' as const, notes: 'Playa', showNotePublicly: true };

    it('POSTs the body', async () => {
        const fetchSpy = respond(201, { cancelledBookings: 2 });
        const confirmed = { ...body, cancelBookingIds: [4, 5] };
        await expect(repo().createOutOfOffice(confirmed)).resolves.toEqual({ cancelledBookings: 2 });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/users/me/out-of-office',
            expect.objectContaining({ method: 'POST', body: JSON.stringify(confirmed) }),
        );
    });

    it('fails with ApiRequestError when the create response has no cancelledBookings', async () => {
        respond(201, periodo);
        const error = await repo().createOutOfOffice(body).catch((e) => e);
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.cause).toBeDefined();
    });

    it('tells the Turnos 409 of create apart from the duplicate 409 by its exact message', async () => {
        respond(409, { message: 'Los Turnos que quedan fuera de tu horario cambiaron' });
        const changed = await repo().createOutOfOffice(body).catch((e) => e);
        expect(changed).toBeInstanceOf(LeftOutsideBookingsChangedError);
        expect(changed).not.toBeInstanceOf(OutOfOfficeConflictError);
        jest.restoreAllMocks();
        respond(409, { message: 'Ya hay un período Fuera de la oficina con esas fechas' });
        const duplicate = await repo().createOutOfOffice(body).catch((e) => e);
        expect(duplicate).toBeInstanceOf(OutOfOfficeConflictError);
        expect(duplicate).not.toBeInstanceOf(LeftOutsideBookingsChangedError);
    });

    it('PUTs the body to the período without the id in it', async () => {
        const fetchSpy = respond(200, periodo);
        await repo().updateOutOfOffice({ outOfOfficeId: 7, ...body });
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/users/me/out-of-office/7',
            expect.objectContaining({ method: 'PUT', body: JSON.stringify(body) }),
        );
    });

    it('DELETEs the período', async () => {
        const fetchSpy = respond(204, undefined);
        await repo().deleteOutOfOffice(7);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/users/me/out-of-office/7', expect.objectContaining({ method: 'DELETE' }));
    });

    it.each([
        ['createOutOfOffice', (r: OutOfOfficeRepository) => r.createOutOfOffice(body)],
        ['updateOutOfOffice', (r: OutOfOfficeRepository) => r.updateOutOfOffice({ outOfOfficeId: 7, ...body })],
    ])('%s translates 422 and 409 keeping the back’s message', async (_name, run) => {
        respond(422, { message: 'La fecha de fin no puede ser anterior a la de inicio' });
        await expect(run(repo())).rejects.toEqual(new OutOfOfficeRuleError('La fecha de fin no puede ser anterior a la de inicio'));
        jest.restoreAllMocks();
        respond(409, { message: 'Ya hay un período Fuera de la oficina con esas fechas' });
        await expect(run(repo())).rejects.toBeInstanceOf(OutOfOfficeConflictError);
    });

    it.each([
        ['updateOutOfOffice', (r: OutOfOfficeRepository) => r.updateOutOfOffice({ outOfOfficeId: 7, ...body })],
        ['deleteOutOfOffice', (r: OutOfOfficeRepository) => r.deleteOutOfOffice(7)],
    ])('%s translates 404 to NotFoundError', async (_name, run) => {
        respond(404, { message: 'Out of office 7 not found' });
        await expect(run(repo())).rejects.toBeInstanceOf(NotFoundError);
    });

    it('translates a 401 to UnauthenticatedError and a 500 to ApiRequestError with its status', async () => {
        respond(401, { message: 'no' });
        await expect(repo().deleteOutOfOffice(7)).rejects.toBeInstanceOf(UnauthenticatedError);
        jest.restoreAllMocks();
        respond(500, { message: 'boom' });
        await expect(repo().createOutOfOffice(body)).rejects.toMatchObject({ status: 500 });
    });
});
