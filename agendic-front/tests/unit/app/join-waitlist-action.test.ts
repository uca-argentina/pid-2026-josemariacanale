import { joinWaitlistAction } from '@/app/_components/booking/actions';
import { InvalidVerificationCodeError } from '@/src/entities/errors/booking';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { WaitlistDateInPastError, WaitlistDayNotFullError } from '@/src/entities/errors/waitlist';

const mockJoin = jest.fn();
const mockReport = jest.fn();

jest.mock('@/di/container', () => ({
    getInjection: (key: string) => (key === 'IJoinWaitlistController' ? mockJoin : { report: mockReport }),
}));
jest.mock('next/navigation', () => ({ unstable_rethrow: jest.fn() }));

const payload = { serviceId: 100, date: '2026-10-20', clientName: 'Juana', clientEmail: 'juana@example.com', code: 'ABC234' };

beforeEach(() => jest.clearAllMocks());

describe('joinWaitlistAction', () => {
    it('devuelve la Anotación', async () => {
        const entry = { serviceId: 100, date: '2026-10-20' };
        mockJoin.mockResolvedValue(entry);
        await expect(joinWaitlistAction(payload)).resolves.toEqual({ ok: true, entry });
        expect(mockJoin).toHaveBeenCalledWith(payload);
    });

    it('marca un código inválido para mostrarlo bajo las casillas', async () => {
        mockJoin.mockRejectedValue(new InvalidVerificationCodeError('Invalid or expired verification code for juana@example.com'));
        await expect(joinWaitlistAction(payload)).resolves.toMatchObject({ ok: false, invalidCode: true, dayChanged: false });
    });

    it('en el 409 dice que ya hay horarios y marca que el día cambió', async () => {
        mockJoin.mockRejectedValue(new WaitlistDayNotFullError('Date 2026-10-20 is not fully booked for Service 100'));
        await expect(joinWaitlistAction(payload)).resolves.toEqual({
            ok: false,
            invalidCode: false,
            dayChanged: true,
            message: 'Ya hay horarios este día. Elegí uno para reservar.',
        });
        expect(mockReport).not.toHaveBeenCalled();
    });

    it('en el 422 marca que el día cambió', async () => {
        mockJoin.mockRejectedValue(new WaitlistDateInPastError('Date 2026-10-20 is in the past'));
        await expect(joinWaitlistAction(payload)).resolves.toMatchObject({ ok: false, dayChanged: true });
    });

    it('muestra el 404 como en Reservar', async () => {
        mockJoin.mockRejectedValue(new NotFoundError('Service not found or retired'));
        await expect(joinWaitlistAction(payload)).resolves.toMatchObject({ ok: false, dayChanged: false, invalidCode: false });
    });

    it('pide revisar los datos ante un InputParseError', async () => {
        mockJoin.mockRejectedValue(new InputParseError('Invalid Anotación'));
        await expect(joinWaitlistAction(payload)).resolves.toMatchObject({ ok: false, message: 'Revisá tus datos e intentá de nuevo.' });
    });

    it('reporta un error inesperado', async () => {
        mockJoin.mockRejectedValue(new Error('boom'));
        await expect(joinWaitlistAction(payload)).resolves.toMatchObject({ ok: false, message: 'No pudimos anotarte. Intentá de nuevo.' });
        expect(mockReport).toHaveBeenCalled();
    });
});
