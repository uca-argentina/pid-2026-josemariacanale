'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { SIGNED_IN_HOME_PATH } from '@/app/routes';
import { Button } from '@/app/_components/ui/button';
import { Card } from '@/app/_components/ui/card';
import { Input } from '@/app/_components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/app/_components/ui/select';
import { Textarea } from '@/app/_components/ui/textarea';
import { SignOutButton } from '@/app/_components/SignOutButton';
import { createBusinessAction } from '../actions';
import { Field } from './Field';
import { StepHeader } from './StepHeader';
import {
    branchSchema,
    businessSchema,
    fieldErrorsOf,
    SERVICE_CATEGORIES,
    serviceSchema,
    slugify,
    type BranchFields,
    type BusinessFields,
    type CreateBusinessPayload,
    type FieldErrors,
    type ServiceCategoryValue,
    type ServiceFields,
} from './schemas';

const TOTAL_STEPS = 4;

const STEP_COPY = [
    {
        title: 'Bienvenido a Agendic',
        subtitle:
            'Necesitamos algunos datos para crear tu Negocio. Vas a poder editarlos después.',
    },
    {
        title: 'Tu primera Sucursal',
        subtitle: 'Es la sede donde vas a atender. Después vas a poder agregar más.',
    },
    {
        title: 'Tu primer Servicio',
        subtitle: 'La prestación que tus Clientes van a poder reservar.',
    },
    {
        title: 'Ya casi',
        subtitle: 'Revisá los datos antes de crear tu Negocio.',
    },
];

const emptyBusiness: BusinessFields = { name: '', description: '', slug: '' };
const emptyBranch: BranchFields = { name: '', address: '', opensAt: '', closesAt: '' };

/** El estado del paso 3 admite category '' hasta que el Dueño elige una; serviceSchema exige el enum real. */
type ServiceStepFields = Omit<ServiceFields, 'category'> & { category: ServiceCategoryValue | '' };

const emptyService: ServiceStepFields = {
    name: '',
    category: '',
    durationMinutes: '',
    price: '',
    description: '',
};

export function CreateBusinessWizard() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [business, setBusiness] = useState(emptyBusiness);
    const [branch, setBranch] = useState(emptyBranch);
    const [service, setService] = useState(emptyService);
    // Una vez que el Dueño edita el Enlace de reserva a mano, deja de seguir al nombre.
    const [slugEdited, setSlugEdited] = useState(false);

    const [submitError, setSubmitError] = useState<string>();
    const [isPending, startTransition] = useTransition();

    const goTo = (next: number) => {
        setErrors({});
        setSubmitError(undefined);
        setStep(next);
    };

    // Cada paso valida su propio esquema; el paso 4 solo confirma lo ya validado.
    const stepSchemas = [businessSchema, branchSchema, serviceSchema] as const;
    const stepValues = [business, branch, service];

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        if (step < TOTAL_STEPS) {
            const result = stepSchemas[step - 1].safeParse(stepValues[step - 1]);
            if (!result.success) {
                setErrors(fieldErrorsOf(result.error));
                return;
            }
            goTo(step + 1);
            return;
        }

        const payload: CreateBusinessPayload = {
            business: businessSchema.parse(business),
            branch: branchSchema.parse(branch),
            service: serviceSchema.parse(service),
        };
        startTransition(async () => {
            const result = await createBusinessAction(payload);
            if (result.ok) router.push(SIGNED_IN_HOME_PATH);
            else setSubmitError(result.message);
        });
    };

    const copy = STEP_COPY[step - 1];

    return (
        <div className="mx-auto flex w-full max-w-[460px] flex-col gap-6 px-4 py-14 sm:py-20">
            <StepHeader
                title={copy.title}
                subtitle={copy.subtitle}
                step={step}
                total={TOTAL_STEPS}
            />

            <form onSubmit={handleSubmit} noValidate>
                <Card className="gap-5 p-6 [--card-spacing:0px]">
                    {step === 1 && (
                        <BusinessStep
                            value={business}
                            onChange={setBusiness}
                            errors={errors}
                            slugEdited={slugEdited}
                            onSlugEdited={setSlugEdited}
                        />
                    )}
                    {step === 2 && (
                        <BranchStep value={branch} onChange={setBranch} errors={errors} />
                    )}
                    {step === 3 && (
                        <ServiceStep value={service} onChange={setService} errors={errors} />
                    )}
                    {step === 4 && (
                        <SummaryStep
                            business={business}
                            branch={branch}
                            service={service}
                            onEdit={goTo}
                        />
                    )}

                    {submitError && (
                        <p role="alert" className="text-sm text-destructive">
                            {submitError}
                        </p>
                    )}

                    <div className="flex items-center gap-2">
                        {step > 1 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={() => goTo(step - 1)}
                            >
                                <ArrowLeft data-icon="inline-start" />
                                Atrás
                            </Button>
                        )}
                        <Button type="submit" size="lg" className="flex-1" disabled={isPending}>
                            {step === TOTAL_STEPS ? 'Crear Negocio' : 'Siguiente'}
                            {step === TOTAL_STEPS ? (
                                <Check data-icon="inline-end" />
                            ) : (
                                <ArrowRight data-icon="inline-end" />
                            )}
                        </Button>
                    </div>
                </Card>
            </form>

            <SignOutButton>
                <button
                    type="button"
                    className="mx-auto text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                    Cerrar sesión
                </button>
            </SignOutButton>
        </div>
    );
}

function BusinessStep({
    value,
    onChange,
    errors,
    slugEdited,
    onSlugEdited,
}: {
    value: BusinessFields;
    onChange: (value: BusinessFields) => void;
    errors: FieldErrors;
    slugEdited: boolean;
    onSlugEdited: (edited: boolean) => void;
}) {
    return (
        <div className="flex flex-col gap-5">
            <Field id="business-name" label="Nombre del Negocio" error={errors.name}>
                <Input
                    id="business-name"
                    value={value.name}
                    onChange={(e) => {
                        const name = e.target.value;
                        onChange({
                            ...value,
                            name,
                            slug: slugEdited ? value.slug : slugify(name),
                        });
                    }}
                    placeholder="Estudio Belgrano"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'business-name-error' : undefined}
                />
            </Field>

            <Field id="business-description" label="Descripción" error={errors.description}>
                <Textarea
                    id="business-description"
                    value={value.description}
                    onChange={(e) => onChange({ ...value, description: e.target.value })}
                    placeholder="Contales a tus Clientes qué hace tu Negocio."
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={
                        errors.description ? 'business-description-error' : undefined
                    }
                />
            </Field>

            <Field id="business-rubro" label="Rubro" hint="Próximamente">
                <Select disabled>
                    <SelectTrigger id="business-rubro" className="w-full">
                        <SelectValue placeholder="Elegí el Rubro de tu Negocio" />
                    </SelectTrigger>
                    <SelectContent />
                </Select>
            </Field>

            <Field id="business-slug" label="Enlace de reserva" error={errors.slug}>
                <div className="flex">
                    <span className="flex h-8 items-center rounded-l-lg border border-r-0 border-input bg-muted px-2.5 text-sm text-muted-foreground">
                        agendic.com/
                    </span>
                    <Input
                        id="business-slug"
                        value={value.slug}
                        onChange={(e) => {
                            onSlugEdited(e.target.value !== '');
                            onChange({ ...value, slug: e.target.value });
                        }}
                        placeholder="estudio-belgrano"
                        className="rounded-l-none"
                        aria-invalid={Boolean(errors.slug)}
                        aria-describedby={errors.slug ? 'business-slug-error' : undefined}
                    />
                </div>
            </Field>
        </div>
    );
}

function BranchStep({
    value,
    onChange,
    errors,
}: {
    value: BranchFields;
    onChange: (value: BranchFields) => void;
    errors: FieldErrors;
}) {
    return (
        <div className="flex flex-col gap-5">
            <Field id="branch-name" label="Nombre de la Sucursal" error={errors.name}>
                <Input
                    id="branch-name"
                    value={value.name}
                    onChange={(e) => onChange({ ...value, name: e.target.value })}
                    placeholder="Sucursal Centro"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'branch-name-error' : undefined}
                />
            </Field>

            <Field id="branch-address" label="Dirección" error={errors.address}>
                <Input
                    id="branch-address"
                    value={value.address}
                    onChange={(e) => onChange({ ...value, address: e.target.value })}
                    placeholder="Av. Cabildo 1234"
                    aria-invalid={Boolean(errors.address)}
                    aria-describedby={errors.address ? 'branch-address-error' : undefined}
                />
            </Field>

            <div className="grid grid-cols-2 gap-4">
                <Field id="branch-opensAt" label="Abre a las" error={errors.opensAt}>
                    <Input
                        id="branch-opensAt"
                        type="time"
                        value={value.opensAt}
                        onChange={(e) => onChange({ ...value, opensAt: e.target.value })}
                        aria-invalid={Boolean(errors.opensAt)}
                        aria-describedby={errors.opensAt ? 'branch-opensAt-error' : undefined}
                    />
                </Field>

                <Field id="branch-closesAt" label="Cierra a las" error={errors.closesAt}>
                    <Input
                        id="branch-closesAt"
                        type="time"
                        value={value.closesAt}
                        onChange={(e) => onChange({ ...value, closesAt: e.target.value })}
                        aria-invalid={Boolean(errors.closesAt)}
                        aria-describedby={errors.closesAt ? 'branch-closesAt-error' : undefined}
                    />
                </Field>
            </div>
        </div>
    );
}

function ServiceStep({
    value,
    onChange,
    errors,
}: {
    value: ServiceStepFields;
    onChange: (value: ServiceStepFields) => void;
    errors: FieldErrors;
}) {
    return (
        <div className="flex flex-col gap-5">
            <Field id="service-name" label="Nombre del Servicio" error={errors.name}>
                <Input
                    id="service-name"
                    value={value.name}
                    onChange={(e) => onChange({ ...value, name: e.target.value })}
                    placeholder="Consulta inicial"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'service-name-error' : undefined}
                />
            </Field>

            <Field id="service-category" label="Categoría del Servicio" error={errors.category}>
                <Select
                    value={value.category}
                    onValueChange={(category: ServiceCategoryValue) =>
                        onChange({ ...value, category })
                    }
                >
                    <SelectTrigger
                        id="service-category"
                        className="w-full"
                        aria-invalid={Boolean(errors.category)}
                        aria-describedby={errors.category ? 'service-category-error' : undefined}
                    >
                        <SelectValue placeholder="Elegí una Categoría de Servicio" />
                    </SelectTrigger>
                    <SelectContent>
                        {SERVICE_CATEGORIES.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                                {category.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
                <Field
                    id="service-durationMinutes"
                    label="Duración"
                    hint="minutos"
                    error={errors.durationMinutes}
                >
                    <Input
                        id="service-durationMinutes"
                        type="number"
                        min={1}
                        step={1}
                        value={value.durationMinutes}
                        onChange={(e) =>
                            onChange({ ...value, durationMinutes: e.target.value })
                        }
                        placeholder="30"
                        aria-invalid={Boolean(errors.durationMinutes)}
                        aria-describedby={
                            errors.durationMinutes ? 'service-durationMinutes-error' : undefined
                        }
                    />
                </Field>

                <Field id="service-price" label="Precio" hint="$" error={errors.price}>
                    <Input
                        id="service-price"
                        type="number"
                        min={0}
                        step="0.01"
                        value={value.price}
                        onChange={(e) => onChange({ ...value, price: e.target.value })}
                        placeholder="15000"
                        aria-invalid={Boolean(errors.price)}
                        aria-describedby={errors.price ? 'service-price-error' : undefined}
                    />
                </Field>
            </div>

            <Field
                id="service-description"
                label="Descripción"
                hint="opcional"
                error={errors.description}
            >
                <Textarea
                    id="service-description"
                    value={value.description ?? ''}
                    onChange={(e) => onChange({ ...value, description: e.target.value })}
                    placeholder="Qué incluye el Servicio."
                />
            </Field>
        </div>
    );
}

function SummaryStep({
    business,
    branch,
    service,
    onEdit,
}: {
    business: BusinessFields;
    branch: BranchFields;
    service: ServiceStepFields;
    onEdit: (step: number) => void;
}) {
    const category = SERVICE_CATEGORIES.find((c) => c.value === service.category)?.label;

    return (
        <div className="flex flex-col gap-5">
            <SummaryBlock title="Negocio" onEdit={() => onEdit(1)}>
                <SummaryItem label="Nombre" value={business.name} />
                <SummaryItem label="Descripción" value={business.description} />
                <SummaryItem label="Enlace de reserva" value={`agendic.com/${business.slug}`} />
            </SummaryBlock>

            <SummaryBlock title="Sucursal" onEdit={() => onEdit(2)}>
                <SummaryItem label="Nombre" value={branch.name} />
                <SummaryItem label="Dirección" value={branch.address} />
                <SummaryItem label="Horario" value={`${branch.opensAt} a ${branch.closesAt}`} />
            </SummaryBlock>

            <SummaryBlock title="Servicio" onEdit={() => onEdit(3)}>
                <SummaryItem label="Nombre" value={service.name} />
                <SummaryItem label="Categoría" value={category ?? ''} />
                <SummaryItem label="Duración" value={`${service.durationMinutes} min`} />
                <SummaryItem label="Precio" value={`$${service.price}`} />
            </SummaryBlock>
        </div>
    );
}

function SummaryBlock({
    title,
    onEdit,
    children,
}: {
    title: string;
    onEdit: () => void;
    children: React.ReactNode;
}) {
    return (
        <section className="flex flex-col gap-2 border-b border-border pb-5 last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                <Button type="button" variant="link" size="xs" onClick={onEdit}>
                    Editar
                </Button>
            </div>
            <dl className="flex flex-col gap-1">{children}</dl>
        </section>
    );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex gap-2 text-sm">
            <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words text-foreground">{value || '—'}</dd>
        </div>
    );
}
