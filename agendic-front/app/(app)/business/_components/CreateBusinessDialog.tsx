'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import {
    PanelAvatar,
    PanelBadge,
    PanelButton,
    PanelDialog,
    PanelDialogClose,
    PanelField,
    PanelIconButton,
    PanelInput,
} from '@/app/(app)/_components/panel-ui';
import { bookingLink } from '@/app/(app)/_components/mock-services';
import { TimeZoneCombobox } from '@/app/(app)/_components/TimeZoneCombobox';
import {
    branchSchema,
    businessSchema,
    inviteEmployeeSchema,
    fieldErrorsOf,
    slugify,
    type BranchFields,
    type BusinessFields,
    type CreateBusinessPayload,
    type InviteFields,
    type FieldErrors,
} from '@/app/_components/business-schemas';
import { ImageUploader } from '@/app/_components/image-uploader/ImageUploader';
import { createBusinessAction } from '../actions';
import { BusinessFieldset } from './BusinessFieldset';
import { RoleBadge } from './business-ui';

const STEPS = [
    { title: 'Creá tu Negocio', description: 'Necesitamos algunos datos para crear tu Negocio. Vas a poder editarlos después.' },
    { title: 'Tu primera Sucursal', description: 'Es la sede donde vas a atender. Después vas a poder agregar más.' },
    { title: 'Invitá a tus Empleados', description: 'Mandales una Invitación por email a quienes atienden en tu Negocio. Podés hacerlo después.' },
    { title: 'Ya casi', description: 'Revisá los datos antes de crear tu Negocio.' },
];
const EMPLOYEES_STEP = 3;
const SUMMARY_STEP = STEPS.length;
const LOGO_MAX = 1;
const BRANCH_IMAGES_MAX = 5;

const EMAILS = new Intl.ListFormat('es', { type: 'conjunction' });
const invalid = (errors: FieldErrors, field: string, id: string) =>
    errors[field] ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` } : {};

/** Una imagen elegida, todavía en memoria: se sube recién al tocar "Crear Negocio". */
type PickedImage = { id: string; file: File; url: string };

/** Los archivos elegidos para un cargador, con su vista previa local. Libera las vistas previas al desmontarse. */
function usePickedImages(max: number) {
    const [picked, setPicked] = useState<PickedImage[]>([]);
    const latest = useRef(picked);
    useEffect(() => {
        latest.current = picked;
    });
    useEffect(() => () => latest.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

    return {
        picked,
        add: (files: File[]) =>
            setPicked((list) => [
                ...list,
                ...files.slice(0, max - list.length).map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) })),
            ]),
        remove: (id: string | number) => {
            const gone = picked.find((p) => p.id === id);
            if (gone) URL.revokeObjectURL(gone.url);
            setPicked((list) => list.filter((p) => p.id !== id));
        },
        reorder: (ids: (string | number)[]) =>
            setPicked((list) => ids.map((id) => list.find((p) => p.id === id)).filter((p): p is PickedImage => !!p)),
    };
}

type PickedImages = ReturnType<typeof usePickedImages>;

export type Owner = { name: string; email: string };

/** Crear Negocio en cuatro pasos: Negocio con su Logo, Sucursal con sus imágenes, Empleados y Resumen. Se monta al abrirse: cerrarlo descarta lo cargado. */
export function CreateBusinessDialog({ owner, onClose }: { owner: Owner; onClose: () => void }) {
    const [step, setStep] = useState(1);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [business, setBusiness] = useState<BusinessFields>({ name: '', description: '', slug: '' });
    // Una vez que el Dueño edita el Enlace de reserva a mano, deja de seguir al nombre.
    const [slugEdited, setSlugEdited] = useState(false);
    const [branch, setBranch] = useState<BranchFields>({ name: '', address: '', timeZone: 'America/Argentina/Buenos_Aires' });
    const [employees, setEmployees] = useState<string[]>([]);
    // El mini formulario de Invitar; null mientras está cerrado.
    const [draft, setDraft] = useState<InviteFields | null>(null);
    const logo = usePickedImages(LOGO_MAX);
    const images = usePickedImages(BRANCH_IMAGES_MAX);
    const [submitError, setSubmitError] = useState<string>();
    const [isPending, startTransition] = useTransition();

    const goTo = (next: number) => {
        setErrors({});
        setSubmitError(undefined);
        setStep(next);
    };

    /** Suma el borrador a la lista. Devuelve false si no es válido, dejando los errores a la vista. */
    const addDraft = () => {
        if (!draft) return true;
        const result = inviteEmployeeSchema.safeParse(draft);
        if (!result.success) {
            setErrors(fieldErrorsOf(result.error));
            return false;
        }
        const { email } = result.data;
        if (email.toLowerCase() === owner.email.toLowerCase() || employees.some((e) => e.toLowerCase() === email.toLowerCase())) {
            setErrors({ email: 'Ya está en la lista.' });
            return false;
        }
        setEmployees([...employees, email]);
        setDraft(null);
        setErrors({});
        return true;
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        if (step < SUMMARY_STEP) {
            // Lo que quedó escrito en Invitar se suma antes de avanzar, para no perderlo.
            if (step === EMPLOYEES_STEP) {
                if (draft?.email.trim() && !addDraft()) return;
                setDraft(null);
            } else {
                const result = step === 1 ? businessSchema.safeParse(business) : branchSchema.safeParse(branch);
                if (!result.success) {
                    setErrors(fieldErrorsOf(result.error));
                    return;
                }
            }
            goTo(step + 1);
            return;
        }

        const payload: CreateBusinessPayload = {
            business: businessSchema.parse(business),
            branch: branchSchema.parse(branch),
        };
        const form = new FormData();
        form.set('payload', JSON.stringify(payload));
        form.set('emails', JSON.stringify(employees));
        if (logo.picked[0]) form.set('logo', logo.picked[0].file);
        images.picked.forEach((image) => form.append('images', image.file));
        startTransition(async () => {
            const result = await createBusinessAction(form);
            if (!result.ok) {
                setSubmitError(result.message);
                return;
            }
            toast.success(`${payload.business.name}: negocio creado`);
            if (result.failedEmployees.length)
                toast.error(`No pudimos sumar a ${EMAILS.format(result.failedEmployees)}. Invitalos desde Empleados.`);
            if (result.failedUploads.length)
                toast.error(`No pudimos subir ${EMAILS.format(result.failedUploads)}. Cargala desde Sucursales.`);
            onClose();
        });
    };

    const copy = STEPS[step - 1];

    return (
        <PanelDialog
            open
            onOpenChange={(open) => !open && !isPending && onClose()}
            title={copy.title}
            description={copy.description}
            footer={
                <>
                    {submitError && (
                        <p role="alert" className="m-0 mr-auto self-center text-[13px] font-semibold text-[#b91c1c]">
                            {submitError}
                        </p>
                    )}
                    {step === 1 ? (
                        <PanelDialogClose>
                            <PanelButton variant="ghost">Cerrar</PanelButton>
                        </PanelDialogClose>
                    ) : (
                        <PanelButton variant="ghost" disabled={isPending} onClick={() => goTo(step - 1)}>
                            <ArrowLeft className="size-4" />
                            Atrás
                        </PanelButton>
                    )}
                    <PanelButton type="submit" form="create-business" disabled={isPending} className="min-w-[124px]">
                        {isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : step === SUMMARY_STEP ? (
                            <>
                                Crear Negocio
                                <Check className="size-4" />
                            </>
                        ) : (
                            <>
                                Continuar
                                <ArrowRight className="size-4" />
                            </>
                        )}
                    </PanelButton>
                </>
            }
        >
            <StepProgress step={step} total={STEPS.length} />

            <form id="create-business" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                {step === 1 && (
                    <>
                        <BusinessFieldset
                            value={business}
                            errors={errors}
                            onChange={(patch) => {
                                if (patch.slug !== undefined) setSlugEdited(patch.slug !== '');
                                setBusiness((b) => ({
                                    ...b,
                                    ...patch,
                                    ...(patch.name !== undefined && !slugEdited ? { slug: slugify(patch.name) } : {}),
                                }));
                            }}
                        />
                        <PanelField label="Logo" htmlFor="business-logo" hint="Opcional">
                            <ImageUploader images={logo.picked} max={LOGO_MAX} onUpload={logo.add} onDelete={logo.remove} />
                        </PanelField>
                    </>
                )}
                {step === 2 && <BranchStep value={branch} onChange={setBranch} errors={errors} images={images} />}
                {step === EMPLOYEES_STEP && (
                    <EmployeesStep
                        owner={owner}
                        employees={employees}
                        onRemove={(email) => setEmployees(employees.filter((e) => e !== email))}
                        draft={draft}
                        onDraftChange={setDraft}
                        onAdd={addDraft}
                        errors={errors}
                    />
                )}
                {step === SUMMARY_STEP && (
                    <SummaryStep
                        business={business}
                        branch={branch}
                        employees={employees}
                        logo={logo.picked}
                        images={images.picked}
                        onEdit={goTo}
                    />
                )}
            </form>
        </PanelDialog>
    );
}

function StepProgress({ step, total }: { step: number; total: number }) {
    return (
        <div className="flex flex-col gap-2">
            <p className="m-0 text-[12px] font-semibold text-[#6b7280]">
                Paso {step} de {total}
            </p>
            <ol aria-label={`Paso ${step} de ${total}`} className="m-0 flex list-none gap-1.5 p-0">
                {Array.from({ length: total }, (_, i) => (
                    <li
                        key={i}
                        aria-current={i + 1 === step ? 'step' : undefined}
                        className={`h-1 flex-1 rounded-full ${i < step ? 'bg-[#0f1b2d]' : 'bg-[#e5e7eb]'}`}
                    />
                ))}
            </ol>
        </div>
    );
}

function BranchStep({
    value,
    onChange,
    errors,
    images,
}: {
    value: BranchFields;
    onChange: (value: BranchFields) => void;
    errors: FieldErrors;
    images: PickedImages;
}) {
    return (
        <>
            <PanelField label="Nombre de la Sucursal" htmlFor="branch-name" error={errors.name}>
                <PanelInput
                    id="branch-name"
                    placeholder="Sucursal Centro"
                    value={value.name}
                    onChange={(e) => onChange({ ...value, name: e.target.value })}
                    {...invalid(errors, 'name', 'branch-name')}
                />
            </PanelField>
            <PanelField label="Dirección" htmlFor="branch-address" error={errors.address}>
                <PanelInput
                    id="branch-address"
                    placeholder="Av. Cabildo 1234"
                    value={value.address}
                    onChange={(e) => onChange({ ...value, address: e.target.value })}
                    {...invalid(errors, 'address', 'branch-address')}
                />
            </PanelField>
            <PanelField label="Zona horaria" htmlFor="branch-timezone" error={errors.timeZone}>
                <TimeZoneCombobox
                    id="branch-timezone"
                    value={value.timeZone}
                    onChange={(tz) => onChange({ ...value, timeZone: tz })}
                />
            </PanelField>
            <PanelField label="Imágenes" htmlFor="branch-images" hint="Opcional. Hasta 5; arrastralas para ordenarlas.">
                <ImageUploader
                    images={images.picked}
                    max={BRANCH_IMAGES_MAX}
                    reorderable
                    onUpload={images.add}
                    onDelete={images.remove}
                    onReorder={images.reorder}
                />
            </PanelField>
        </>
    );
}

function PersonRow({ name, email, badges, action }: { name: string; email?: string; badges: React.ReactNode; action?: React.ReactNode }) {
    return (
        <li className="flex items-center gap-3 px-4 py-3">
            <PanelAvatar name={name} />
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[13.5px] font-bold tracking-[-0.01em] text-[#0f1b2d]">{name}</span>
                    {badges}
                </div>
                {email && <span className="truncate text-[12.5px] font-medium text-[#6b7280]">{email}</span>}
            </div>
            {action}
        </li>
    );
}

function EmployeesStep({
    owner,
    employees,
    onRemove,
    draft,
    onDraftChange,
    onAdd,
    errors,
}: {
    owner: Owner;
    employees: string[];
    onRemove: (email: string) => void;
    draft: InviteFields | null;
    onDraftChange: (draft: InviteFields | null) => void;
    onAdd: () => boolean;
    errors: FieldErrors;
}) {
    // Enter en el mini formulario suma el email en vez de avanzar de paso.
    const addOnEnter = (e: React.KeyboardEvent) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        onAdd();
    };

    return (
        <div className="flex flex-col gap-3">
            <ul className="m-0 list-none divide-y divide-[#e5e7eb] overflow-hidden rounded-md border border-[#e5e7eb] p-0">
                <PersonRow
                    name={owner.name}
                    email={owner.email}
                    badges={
                        <>
                            <PanelBadge className="bg-[#e6f6ec] text-[#15803d]">Vos</PanelBadge>
                            <RoleBadge role="owner" />
                        </>
                    }
                />
                {employees.map((email) => (
                    <PersonRow
                        key={email}
                        name={email}
                        badges={<PanelBadge className="bg-[#fef3c7] text-[#92400e]">Invitación</PanelBadge>}
                        action={
                            <PanelIconButton bordered label={`Quitar a ${email}`} onClick={() => onRemove(email)}>
                                <X />
                            </PanelIconButton>
                        }
                    />
                ))}
            </ul>
            <p className="m-0 text-center text-[12.5px] font-medium text-[#9ca3af]">No hay más resultados</p>

            {draft ? (
                <div className="flex flex-col gap-4 rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-4">
                    <PanelField label="Email" htmlFor="employee-email" error={errors.email}>
                        <PanelInput
                            id="employee-email"
                            autoFocus
                            type="email"
                            placeholder="email@ejemplo.com"
                            value={draft.email}
                            onChange={(e) => onDraftChange({ ...draft, email: e.target.value })}
                            onKeyDown={addOnEnter}
                            {...invalid(errors, 'email', 'employee-email')}
                        />
                    </PanelField>
                    <div className="flex justify-end gap-2">
                        <PanelButton variant="ghost" onClick={() => onDraftChange(null)}>
                            Cancelar
                        </PanelButton>
                        <PanelButton variant="secondary" onClick={onAdd}>
                            Invitar
                        </PanelButton>
                    </div>
                </div>
            ) : (
                <PanelButton variant="secondary" className="w-full" onClick={() => onDraftChange({ email: '' })}>
                    <Plus className="size-4" />
                    Invitar empleado
                </PanelButton>
            )}
        </div>
    );
}

function SummaryStep({
    business,
    branch,
    employees,
    logo,
    images,
    onEdit,
}: {
    business: BusinessFields;
    branch: BranchFields;
    employees: string[];
    logo: PickedImage[];
    images: PickedImage[];
    onEdit: (step: number) => void;
}) {
    return (
        <div className="flex flex-col divide-y divide-[#e5e7eb] rounded-md border border-[#e5e7eb]">
            <SummaryBlock title="Negocio" onEdit={() => onEdit(1)}>
                <SummaryItem label="Nombre" value={business.name} />
                <SummaryItem label="Descripción" value={business.description} />
                <SummaryItem label="Enlace de reserva" value={bookingLink(business.slug)} />
                <SummaryThumbs label="Logo" images={logo} />
            </SummaryBlock>
            <SummaryBlock title="Sucursal" onEdit={() => onEdit(2)}>
                <SummaryItem label="Nombre" value={branch.name} />
                <SummaryItem label="Dirección" value={branch.address} />
                <SummaryItem label="Zona horaria" value={branch.timeZone} />
                <SummaryThumbs label="Imágenes" images={images} />
            </SummaryBlock>
            <SummaryBlock title="Invitaciones" onEdit={() => onEdit(EMPLOYEES_STEP)}>
                <SummaryItem label="Invitados" value={employees.join(', ')} />
            </SummaryBlock>
        </div>
    );
}

function SummaryBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
    return (
        <section className="flex flex-col gap-2 px-4 py-4">
            <div className="flex items-center justify-between">
                <h2 className="m-0 text-[13.5px] font-bold tracking-[-0.01em] text-[#0f1b2d]">{title}</h2>
                <button
                    type="button"
                    onClick={onEdit}
                    className="rounded text-[12.5px] font-bold text-[#0f1b2d] underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#0f1b2d]"
                >
                    Editar
                </button>
            </div>
            <dl className="m-0 flex flex-col gap-1">{children}</dl>
        </section>
    );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex gap-2 text-[13px] font-medium">
            <dt className="w-32 shrink-0 text-[#6b7280]">{label}</dt>
            <dd className="m-0 min-w-0 break-words text-[#0f1b2d]">{value || '—'}</dd>
        </div>
    );
}

function SummaryThumbs({ label, images }: { label: string; images: PickedImage[] }) {
    return (
        <div className="flex gap-2 text-[13px] font-medium">
            <dt className="w-32 shrink-0 text-[#6b7280]">{label}</dt>
            <dd className="m-0 flex min-w-0 flex-wrap gap-1.5 text-[#0f1b2d]">
                {images.length === 0
                    ? '—'
                    : images.map((image) => (
                          // eslint-disable-next-line @next/next/no-img-element -- blob: preview, outside the Next image pipeline
                          <img key={image.id} src={image.url} alt="" className="size-12 rounded-md border object-cover" />
                      ))}
            </dd>
        </div>
    );
}
