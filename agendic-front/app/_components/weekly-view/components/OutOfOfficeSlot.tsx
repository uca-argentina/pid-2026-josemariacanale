import { cn } from '@/app/_components/utils';
import { OUT_OF_OFFICE_REASONS } from '@/app/_components/out-of-office-reasons';
import type { OutOfOfficeRenderProps } from '../types/state';

/**
 * La tarjeta de un día Fuera de la oficina: emoji y etiqueta del Motivo, y la nota si el Usuario la hizo pública.
 * Un Día festivo dice que ese día no hay Horarios reservables.
 */
export function OutOfOfficeSlot({ reason = 'UNSPECIFIED', borderDashed = true, className, notes, showNotePublicly }: OutOfOfficeRenderProps) {
    const { emoji, label } = OUT_OF_OFFICE_REASONS[reason];
    const isHoliday = reason === 'PUBLIC_HOLIDAY';

    return (
        <div className={cn('relative h-full pb-5', className)}>
            <div
                className={cn(
                    'flex h-full flex-col items-center justify-start rounded-md border bg-background px-4 py-4 font-normal',
                    borderDashed && 'border-dashed',
                )}
            >
                <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-muted">
                    <span className="m-auto text-center text-lg">{emoji}</span>
                </div>
                <div className="max-h-[300px] w-full space-y-2 overflow-y-auto text-center">
                    {isHoliday ? (
                        <>
                            <p className="mt-2 text-base font-bold">{label}</p>
                            <p className="text-center text-sm text-muted-foreground">Sin Horarios reservables</p>
                        </>
                    ) : (
                        <>
                            <p className="mt-2 text-base font-bold">Fuera de la oficina</p>
                            <p className="text-center text-sm text-muted-foreground">{label}</p>
                            {notes && showNotePublicly && (
                                <p className="mt-2 max-h-[120px] overflow-y-auto px-2 text-center text-sm break-words text-muted-foreground italic">
                                    {notes}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
