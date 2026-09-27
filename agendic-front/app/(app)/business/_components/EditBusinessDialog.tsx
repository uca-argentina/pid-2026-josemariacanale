'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PanelButton, PanelDialog, PanelDialogClose } from '@/app/(app)/_components/panel-ui';
import { businessSchema, fieldErrorsOf, type BusinessFields, type FieldErrors } from '@/app/_components/business-schemas';
import { updateBusinessAction } from '../actions';
import { BusinessFieldset } from './BusinessFieldset';

export type EditableBusiness = BusinessFields & { id: number };

/** Se monta al abrirse. Al guardar, la server action refresca la página con los datos nuevos. */
export function EditBusinessDialog({ business, onClose }: { business: EditableBusiness; onClose: () => void }) {
    const [values, setValues] = useState<BusinessFields>({
        name: business.name,
        description: business.description,
        slug: business.slug,
    });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [submitError, setSubmitError] = useState<string>();
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitError(undefined);

        const result = businessSchema.safeParse(values);
        if (!result.success) {
            setErrors(fieldErrorsOf(result.error));
            return;
        }
        setErrors({});

        startTransition(async () => {
            const response = await updateBusinessAction({ id: business.id, ...result.data });
            if (response.ok) {
                toast.success(`${response.business.name}: cambios guardados`);
                onClose();
            } else if (response.field === 'slug') setErrors({ slug: response.message });
            else setSubmitError(response.message);
        });
    };

    return (
        <PanelDialog
            open
            onOpenChange={(open) => !open && !isPending && onClose()}
            title="Editar negocio"
            description="Los datos que ven tus Clientes."
            footer={
                <>
                    <PanelDialogClose>
                        <PanelButton variant="ghost">Cancelar</PanelButton>
                    </PanelDialogClose>
                    <PanelButton type="submit" form="edit-business" disabled={isPending} className="min-w-[104px]">
                        {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Guardar'}
                    </PanelButton>
                </>
            }
        >
            <form id="edit-business" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                <BusinessFieldset
                    value={values}
                    errors={errors}
                    onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
                    slugHint={
                        values.slug !== business.slug
                            ? 'Al cambiar el Enlace de reserva, los enlaces que ya compartiste dejan de funcionar.'
                            : undefined
                    }
                />
                {submitError && (
                    <p role="alert" className="m-0 text-[13px] font-semibold text-[#b91c1c]">
                        {submitError}
                    </p>
                )}
            </form>
        </PanelDialog>
    );
}
