'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PanelButton, PanelDialog, PanelDialogClose } from '@/app/(app)/_components/panel-ui';
import { ImageUploader } from '@/app/_components/image-uploader/ImageUploader';
import { branchFormSchema, fieldErrorsOf, slugify, type BranchFormFields, type FieldErrors } from '@/app/_components/business-schemas';
import { createBranchAction, uploadBranchImageAction } from '../actions';
import { BranchFormFields as Fields } from './BranchFormFields';

type Pending = { id: string; file: File; url: string };

/**
 * Modal de Agregar Sucursal. Las imágenes quedan en memoria y se suben, en orden, después de crear la Sucursal:
 * si alguna falla, un toast la nombra y la Sucursal queda creada igual.
 */
export function AddBranchDialog({
    businessId,
    businessSlug,
    onClose,
}: {
    businessId: number;
    businessSlug: string;
    onClose: () => void;
}) {
    const [values, setValues] = useState<BranchFormFields>({ name: '', slug: '', description: '', address: '', timeZone: '' });
    const [slugEdited, setSlugEdited] = useState(false);
    const [images, setImages] = useState<Pending[]>([]);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [submitError, setSubmitError] = useState<string>();
    const [isPending, startTransition] = useTransition();

    const change = (patch: Partial<BranchFormFields>) => {
        if (patch.slug !== undefined) setSlugEdited(patch.slug !== '');
        setValues((v) => ({ ...v, ...patch, ...(patch.name !== undefined && !slugEdited ? { slug: slugify(patch.name) } : {}) }));
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitError(undefined);
        const parsed = branchFormSchema.safeParse(values);
        if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
        setErrors({});

        startTransition(async () => {
            const { description, ...fields } = parsed.data;
            const created = await createBranchAction({ businessId, ...fields, ...(description && { description }) });
            if (!created.ok) {
                if (created.field) setErrors({ [created.field]: created.message });
                else setSubmitError(created.message);
                return;
            }
            for (const image of images) {
                const form = new FormData();
                form.append('file', image.file);
                const uploaded = await uploadBranchImageAction(created.data.id, form);
                if (!uploaded.ok) toast.error(`No se pudo subir ${image.file.name}: ${uploaded.message}`);
            }
            toast.success(`${parsed.data.name}: Sucursal creada`);
            onClose();
        });
    };

    return (
        <PanelDialog
            open
            onOpenChange={(open) => !open && !isPending && onClose()}
            title="Agregar Sucursal"
            description="Una sede más de tu Negocio."
            footer={
                <>
                    <PanelDialogClose>
                        <PanelButton variant="ghost">Cancelar</PanelButton>
                    </PanelDialogClose>
                    <PanelButton type="submit" form="add-branch" disabled={isPending} className="min-w-[104px]">
                        {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Agregar'}
                    </PanelButton>
                </>
            }
        >
            <form id="add-branch" onSubmit={submit} noValidate className="flex flex-col gap-5">
                <Fields idPrefix="new-branch" businessSlug={businessSlug} value={values} onChange={change} errors={errors} />
                <div className="flex flex-col gap-2">
                    <span className="text-[13.5px] font-bold tracking-[-0.01em]">Imágenes</span>
                    <ImageUploader
                        max={5}
                        reorderable
                        images={images}
                        onUpload={(files) =>
                            setImages((list) => [...list, ...files.map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }))])
                        }
                        onDelete={(id) => setImages((list) => list.filter((i) => i.id !== id))}
                        onReorder={(ids) => setImages((list) => ids.flatMap((id) => list.find((i) => i.id === id) ?? []))}
                    />
                </div>
                {submitError && (
                    <p role="alert" className="m-0 text-[13px] font-semibold text-[#b91c1c]">
                        {submitError}
                    </p>
                )}
            </form>
        </PanelDialog>
    );
}
