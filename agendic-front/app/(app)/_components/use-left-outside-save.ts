'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { LeftOutsideBooking } from '@/src/entities/models/left-outside-booking';

type Preview = { ok: true; bookings: LeftOutsideBooking[] } | { ok: false; message: string };
type Save = { ok: true; cancelledBookings: number } | { ok: false; message: string } | { ok: false; leftOutChanged: true };

/**
 * El flujo de guardar un cambio de horario que puede dejar Turnos afuera, reusable por cualquier formulario:
 * pide la vista previa; sin Turnos guarda directo y con Turnos deja que el Usuario los revise (`review`) y
 * confirme (`confirm`) o vuelva (`back`). Si al guardar la lista cambió (409 de Turnos), avisa con un toast y
 * vuelve a pedir la vista previa.
 *
 * @param preview pide los Turnos que `input` dejaría afuera
 * @param save guarda `input` y cancela los Turnos de `cancelBookingIds`
 * @param onSaved se llama al guardar, con cuántos Turnos se cancelaron
 * @param onError se llama con el mensaje de un fallo de la vista previa o del guardado
 */
export function useLeftOutsideSave<I>({
    preview,
    save,
    onSaved,
    onError,
}: {
    preview: (input: I) => Promise<Preview>;
    save: (input: I, cancelBookingIds: number[]) => Promise<Save>;
    onSaved: (cancelledBookings: number) => void;
    onError: (message: string) => void;
}) {
    const [review, setReview] = useState<{ input: I; bookings: LeftOutsideBooking[] } | null>(null);
    const [isPending, startTransition] = useTransition();

    const check = async (input: I): Promise<void> => {
        const previewed = await preview(input);
        if (!previewed.ok) {
            setReview(null);
            return onError(previewed.message);
        }
        if (previewed.bookings.length === 0) return commit(input, []);
        setReview({ input, bookings: previewed.bookings });
    };

    const commit = async (input: I, bookings: LeftOutsideBooking[]): Promise<void> => {
        const saved = await save(
            input,
            bookings.map((b) => b.id),
        );
        if (saved.ok) {
            setReview(null);
            return onSaved(saved.cancelledBookings);
        }
        if ('leftOutChanged' in saved) {
            toast.info('La lista de Turnos cambió. Revisala de nuevo.');
            return check(input);
        }
        setReview(null);
        onError(saved.message);
    };

    return {
        /** Los Turnos por confirmar, o null si no hay diálogo abierto. */
        review: review?.bookings ?? null,
        /** Hay una vista previa o un guardado en curso. */
        isPending,
        /** Empieza el flujo con lo que cargó el Usuario. */
        run: (input: I) => startTransition(() => check(input)),
        /** El Usuario confirmó los Turnos que se muestran. */
        confirm: () => review && startTransition(() => commit(review.input, review.bookings)),
        /** El Usuario volvió: se cierra el diálogo y el formulario sigue como estaba. */
        back: () => setReview(null),
    };
}
