import { CancellationCause } from './booking';
import { cancellationReasonFor } from './cancellation-reason';

const CLOSING = ' Podés reservar otro horario.';

describe('cancellationReasonFor', () => {
  describe('Fuera de la oficina', () => {
    const outOfOffice = (notes: string | null, showNotePublicly: boolean) =>
      cancellationReasonFor({
        cause: CancellationCause.OUT_OF_OFFICE,
        userName: 'Ana',
        notes,
        showNotePublicly,
      });

    it('uses the public note, trimmed', () => {
      expect(outOfOffice('  Estoy de viaje.  ', true)).toBe(
        `Estoy de viaje.${CLOSING}`,
      );
    });

    it('adds a period to a note that does not end in punctuation', () => {
      expect(outOfOffice('Estoy de viaje', true)).toBe(
        `Estoy de viaje.${CLOSING}`,
      );
    });

    it.each(['¿Nos vemos pronto?', '¡Vuelvo el lunes!', 'Vuelvo…', 'Fin.'])(
      'keeps the punctuation of %s',
      (note) => {
        expect(outOfOffice(note, true)).toBe(`${note}${CLOSING}`);
      },
    );

    it('ignores a private note', () => {
      expect(outOfOffice('Operación de rodilla', false)).toBe(
        `Ana no va a estar disponible en ese horario.${CLOSING}`,
      );
    });

    it.each([null, '', '   '])('falls back to the name with note %p', (note) => {
      expect(outOfOffice(note, true)).toBe(
        `Ana no va a estar disponible en ese horario.${CLOSING}`,
      );
    });
  });

  it('names the Día festivo', () => {
    expect(
      cancellationReasonFor({
        cause: CancellationCause.PUBLIC_HOLIDAY,
        userName: 'Ana',
        holidayName: 'Día de la Independencia',
      }),
    ).toBe(`Ana no atiende por Día de la Independencia.${CLOSING}`);
  });

  it('says the Cambio de horario', () => {
    expect(
      cancellationReasonFor({
        cause: CancellationCause.SCHEDULE_CHANGE,
        userName: 'Ana',
      }),
    ).toBe(`Ana cambió sus horarios y ya no atiende en ese horario.${CLOSING}`);
  });
});
