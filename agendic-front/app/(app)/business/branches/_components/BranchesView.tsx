'use client';

import { useState, useTransition } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { PanelButton, PanelCard } from '@/app/(app)/_components/panel-ui';
import { ImageUploader, type UploaderImage } from '@/app/_components/image-uploader/ImageUploader';
import { branchFormSchema, fieldErrorsOf, type BranchFormFields, type FieldErrors } from '@/app/_components/business-schemas';
import {
    deleteBranchImageAction,
    deleteBusinessLogoAction,
    reorderBranchImagesAction,
    updateBranchAction,
    uploadBranchImageAction,
    uploadBusinessLogoAction,
    type BranchActionResult,
} from '../actions';
import { AddBranchDialog } from './AddBranchDialog';
import { BranchFormFields as Fields } from './BranchFormFields';

export type BranchItem = {
    id: number;
    name: string;
    address: string;
    timeZone: string;
    slug: string;
    description: string | null;
    images: { id: number; url: string }[];
};

const oneFile = (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return form;
};

/** Avisa con un toast si la acción falló, con el mensaje del back. */
const toastIfFailed = (result: BranchActionResult<unknown>) => {
    if (!result.ok) toast.error(result.message);
};

/**
 * Un cargador contra el back: muestra las imágenes ya guardadas y, mientras suben, su vista previa local. Subir y
 * borrar van al back enseguida.
 */
function RemoteUploader({
    saved,
    max,
    reorderable,
    upload,
    remove,
    reorder,
}: {
    saved: { id: number | string; url: string }[];
    max: number;
    reorderable?: boolean;
    upload: (file: File) => Promise<BranchActionResult<unknown>>;
    remove: (id: UploaderImage['id']) => Promise<BranchActionResult<unknown>>;
    reorder?: (ids: number[]) => Promise<BranchActionResult<unknown>>;
}) {
    const [uploading, setUploading] = useState<UploaderImage[]>([]);

    async function onUpload(files: File[]) {
        for (const file of files) {
            const preview = { id: `tmp-${crypto.randomUUID()}`, url: URL.createObjectURL(file), uploading: true };
            setUploading((list) => [...list, preview]);
            toastIfFailed(await upload(file));
            setUploading((list) => list.filter((i) => i.id !== preview.id));
            URL.revokeObjectURL(preview.url);
        }
    }

    return (
        <ImageUploader
            images={[...saved, ...uploading]}
            max={max}
            reorderable={reorderable}
            onUpload={onUpload}
            onDelete={async (id) => toastIfFailed(await remove(id))}
            onReorder={
                reorder &&
                (async (ids) => {
                    const result = await reorder(ids.map(Number));
                    if (!result.ok) throw new Error(result.message);
                })
            }
        />
    );
}

function LogoSection({ businessId, logoUrl }: { businessId: number; logoUrl: string | null }) {
    return (
        <PanelCard className="flex flex-col gap-4">
            <div className="flex flex-col gap-0.5">
                <h2 className="m-0 text-[14.5px] font-bold tracking-[-0.02em]">Logo del Negocio</h2>
                <p className="m-0 text-[13px] font-medium text-[#6b7280]">Lo ven tus Clientes en la página de cada Sucursal.</p>
            </div>
            <RemoteUploader
                max={1}
                saved={logoUrl ? [{ id: 'logo', url: logoUrl }] : []}
                upload={(file) => uploadBusinessLogoAction(businessId, oneFile(file))}
                remove={() => deleteBusinessLogoAction(businessId)}
            />
        </PanelCard>
    );
}

function BranchCard({ branch, businessSlug }: { branch: BranchItem; businessSlug: string }) {
    const initial: BranchFormFields = {
        name: branch.name,
        slug: branch.slug,
        description: branch.description ?? '',
        address: branch.address,
        timeZone: branch.timeZone,
    };
    const [values, setValues] = useState(initial);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [isPending, startTransition] = useTransition();
    const dirty = (Object.keys(initial) as (keyof BranchFormFields)[]).some((k) => values[k] !== initial[k]);

    const save = (event: React.FormEvent) => {
        event.preventDefault();
        const parsed = branchFormSchema.safeParse(values);
        if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error));
        setErrors({});
        startTransition(async () => {
            // `null` le saca la descripción propia a la Sucursal.
            const result = await updateBranchAction({ id: branch.id, ...parsed.data, description: parsed.data.description || null });
            if (result.ok) toast.success(`${parsed.data.name}: cambios guardados`);
            else if (result.field) setErrors({ [result.field]: result.message });
            else toast.error(result.message);
        });
    };

    return (
        <PanelCard className="flex flex-col gap-5">
            <h2 className="m-0 text-[14.5px] font-bold tracking-[-0.02em]">{branch.name}</h2>
            <form onSubmit={save} noValidate className="flex flex-col gap-5">
                <Fields
                    idPrefix={`branch-${branch.id}`}
                    businessSlug={businessSlug}
                    value={values}
                    onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
                    errors={errors}
                />
                <div className="flex justify-end">
                    <PanelButton type="submit" disabled={!dirty || isPending} className="min-w-[104px]">
                        {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Guardar'}
                    </PanelButton>
                </div>
            </form>
            <div className="flex flex-col gap-2">
                <span className="text-[13.5px] font-bold tracking-[-0.01em]">Imágenes</span>
                <RemoteUploader
                    max={5}
                    reorderable
                    saved={branch.images}
                    upload={(file) => uploadBranchImageAction(branch.id, oneFile(file))}
                    remove={(id) => deleteBranchImageAction(branch.id, Number(id))}
                    reorder={(ids) => reorderBranchImagesAction(branch.id, ids)}
                />
            </div>
        </PanelCard>
    );
}

/** La página Sucursales del Dueño: el Logo del Negocio y cada Sucursal editable. */
export function BranchesView({
    businessId,
    businessSlug,
    logoUrl,
    branches,
}: {
    businessId: number;
    businessSlug: string;
    logoUrl: string | null;
    branches: BranchItem[];
}) {
    const [adding, setAdding] = useState(false);

    return (
        <div className="flex max-w-[880px] flex-col gap-6">
            <LogoSection businessId={businessId} logoUrl={logoUrl} />
            {branches.map((branch) => (
                <BranchCard key={branch.id} branch={branch} businessSlug={businessSlug} />
            ))}
            <div>
                <PanelButton onClick={() => setAdding(true)}>
                    <Plus className="size-4" />
                    Agregar Sucursal
                </PanelButton>
            </div>
            {adding && <AddBranchDialog businessId={businessId} businessSlug={businessSlug} onClose={() => setAdding(false)} />}
        </div>
    );
}
