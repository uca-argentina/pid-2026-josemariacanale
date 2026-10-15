import { bookSlotAction, listSeriesSlotsAction } from '@/app/_components/booking/actions';
import {
    InvalidVerificationCodeError,
    SeriesDatesUnavailableError,
    SeriesTooShortError,
    SlotTakenError,
    SlotUnavailableError,
} from '@/src/entities/errors/booking';
import { NotFoundError } from '@/src/entities/errors/common';

const mockControllers: Record<string, jest.Mock> = {
    IBookSlotController: jest.fn(),
    IListSeriesSlotsController: jest.fn(),
};
const mockReport = jest.fn();

jest.mock('@/di/container', () => ({
    getInjection: (key: string) => mockControllers[key] ?? { report: mockReport },
}));
jest.mock('next/navigation', () => ({ unstable_rethrow: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

const payload = {
    serviceId: 100,
    startsAt: '2026-09-28T12:00:00.000Z',
    clientName: 'Juana',
    clientEmail: 'juana@example.com',
    code: 'ABC123',
};

describe('bookSlotAction', () => {
    it('books a Serie and returns the first Turno with its Serie', async () => {
        const booking = { id: 7, link: 'l1nk-1', series: { id: 's', bookings: [] } };
        mockControllers.IBookSlotController.mockResolvedValue(booking);

        await expect(bookSlotAction({ ...payload, repeat: { count: 4, skipDates: ['2026-10-12'] } })).resolves.toEqual({ ok: true, booking });
        expect(mockControllers.IBookSlotController).toHaveBeenCalledWith({ ...payload, repeat: { count: 4, skipDates: ['2026-10-12'] } });
    });

    it('returns the dates of the 409 of a Serie, without reporting it, so the Cliente can retry with the same code', async () => {
        mockControllers.IBookSlotController.mockRejectedValue(
            new SeriesDatesUnavailableError('Series dates not available: 2026-10-05,2026-10-19', { dates: ['2026-10-05', '2026-10-19'] }),
        );

        await expect(bookSlotAction({ ...payload, repeat: { count: 4 } })).resolves.toEqual({
            ok: false,
            slotTaken: false,
            invalidCode: false,
            seriesConflict: ['2026-10-05', '2026-10-19'],
            message: 'Algunas fechas de la Serie ya no están disponibles.',
        });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('explains a Serie left with less than 2 Turnos, without reporting it', async () => {
        mockControllers.IBookSlotController.mockRejectedValue(new SeriesTooShortError('A Serie needs at least 2 Turnos'));

        await expect(bookSlotAction({ ...payload, repeat: { count: 2, skipDates: ['2026-10-05'] } })).resolves.toEqual({
            ok: false,
            slotTaken: true,
            invalidCode: false,
            message: 'Una Serie necesita al menos 2 Turnos. Elegí otro horario.',
        });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it.each([
        [new SlotTakenError('taken'), { slotTaken: true, invalidCode: false }],
        [new InvalidVerificationCodeError('bad code'), { slotTaken: false, invalidCode: true }],
    ])('keeps the errors of a single Turno as before: %p', async (error, flags) => {
        mockControllers.IBookSlotController.mockRejectedValue(error);
        await expect(bookSlotAction(payload)).resolves.toMatchObject({ ok: false, ...flags });
    });
});

describe('listSeriesSlotsAction', () => {
    const query = { serviceId: 100, startsAt: '2026-09-28T12:00:00.000Z', count: 3 };

    it('returns the dates of the Serie', async () => {
        const seriesSlots = { employeeId: 1, dates: [{ date: '2026-09-28', startsAt: '2026-09-28T12:00:00.000Z', available: true }] };
        mockControllers.IListSeriesSlotsController.mockResolvedValue(seriesSlots);

        await expect(listSeriesSlotsAction(query)).resolves.toEqual({ ok: true, ...seriesSlots });
        expect(mockControllers.IListSeriesSlotsController).toHaveBeenCalledWith(query);
    });

    it('sends the Cliente back to Horario when the first horario is no longer reservable', async () => {
        mockControllers.IListSeriesSlotsController.mockRejectedValue(new SlotUnavailableError('Slot x is not available for Service 100'));

        await expect(listSeriesSlotsAction(query)).resolves.toEqual({
            ok: false,
            slotTaken: true,
            message: 'Ese horario ya no está disponible. Elegí otro.',
        });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('says the Servicio is gone on a 404', async () => {
        mockControllers.IListSeriesSlotsController.mockRejectedValue(new NotFoundError('Service not found'));
        await expect(listSeriesSlotsAction(query)).resolves.toMatchObject({ ok: false, slotTaken: false });
    });

    it('reports an unexpected error', async () => {
        const boom = new Error('boom');
        mockControllers.IListSeriesSlotsController.mockRejectedValue(boom);

        await expect(listSeriesSlotsAction(query)).resolves.toEqual({
            ok: false,
            slotTaken: false,
            message: 'No pudimos cargar las fechas de la Serie. Intentá de nuevo.',
        });
        expect(mockReport).toHaveBeenCalledWith(boom);
    });
});
