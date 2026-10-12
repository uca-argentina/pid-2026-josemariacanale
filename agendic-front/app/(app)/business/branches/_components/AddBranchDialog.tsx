'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PanelButton, PanelDialog, PanelDialogClose } from '@/app/(app)/_components/panel-ui';
import { ImageUploader } from '@/app/_components/image-uploader/ImageUploader';
import { branchFormSchema, fieldErrorsOf, slugify, type BranchFormFields, type FieldErrors } from '@/app/_components/business-schemas';
import { BRANCH_IMAGES } from '@/src/entities/models/branch';
import { createBranchAction } from '../actions';
import { BranchFormFields as Fields } from './BranchFormFields';

type Pending = { id: string; file: File; url: string };

/**
 * Modal de Agregar Sucursal. Exige al menos una imagen: quedan en memoria y viajan, en orden, en el mismo pedido que
 * crea la Sucursal. Un error de un campo va bajo ese campo; el resto, en un toast.
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
    const [isPending, startTransition] = useTransition();

    const change = (patch: Partial<BranchFormFields>) => {
        if (patch.slug !== undefined) setSlugEdited(patch.slug !== '');
        setValues((v) => ({ ...v, ...patch, ...(patch.name !== undefined && !slugEdited ? { slug: slugify(patch.name) } : {}) }));
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const parsed = branchFormSchema.safeParse(values);
        if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
        setErrors({});

        startTransition(async () => {
            const { description, ...fields } = parsed.data;
            const form = new FormData();
            for (const image of images) form.append('images', image.file);
            const created = await createBranchAction({ businessId, ...fields, ...(description && { description }) }, form);
            if (!created.ok) {
                if (created.field) setErrors({ [created.field]: created.message });
                else toast.error(created.message);
                return;
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
                    <PanelButton type="submit" form="add-branch" disabled={isPending || images.length < BRANCH_IMAGES.min} className="min-w-[104px]">
                        {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Agregar'}
                    </PanelButton>
                </>
            }
        >
            <form id="add-branch" onSubmit={submit} noValidate className="flex flex-col gap-5">
                <Fields idPrefix="new-branch" businessSlug={businessSlug} value={values} onChange={change} errors={errors} />
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[13.5px] font-bold tracking-[-0.01em]">Imágenes</span>
                        <span className="text-[12.5px] font-medium text-[#6b7280]">Al menos una, hasta {BRANCH_IMAGES.max}</span>
                    </div>
                    <ImageUploader
                        max={BRANCH_IMAGES.max}
                        reorderable
                        images={images}
                        onUpload={(files) =>
                            setImages((list) => [...list, ...files.map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }))])
                        }
                        onDelete={(id) =>
                            setImages((list) => {
                                list.filter((i) => i.id === id).forEach((i) => URL.revokeObjectURL(i.url));
                                return list.filter((i) => i.id !== id);
                            })
                        }
                        onReorder={(ids) => setImages((list) => ids.flatMap((id) => list.find((i) => i.id === id) ?? []))}
                    />
                </div>
            </form>
        </PanelDialog>
    );
}
