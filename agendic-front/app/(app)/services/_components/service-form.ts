import { z } from 'zod';
import {
    SERVICE_CATEGORIES,
    fieldErrorsOf,
    slugify,
    type FieldErrors,
    type ServiceCategoryValue,
} from '@/app/_components/business-schemas';

/** Las Categorías de Servicio como opciones de un `PanelSelect`. */
export const CATEGORY_OPTIONS = SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }));

/** Mismo patrón que IsSlug en el back: el tramo del Servicio en el Enlace de reserva. */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_MAX = 40;

/** El tramo propuesto a partir del nombre: sin tildes ni símbolos, de hasta 40 caracteres. */
export const slugFrom = (value: string) => slugify(value).slice(0, SLUG_MAX).replace(/-+$/, '');

/**
 * Lo que el Dueño escribe en el tramo, mientras lo escribe: minúsculas, sin tildes, y un espacio pasa a guion. No saca
 * el guion final, así se puede seguir escribiendo la próxima palabra; el formato completo lo valida el schema.
 */
export const slugWhileTyping = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, SLUG_MAX);

const COPY_SUFFIX = '-copia';

/** El tramo de la copia de un Servicio: el suyo con "-copia", recortado antes si no entra en 40 caracteres. */
export const copySlug = (slug: string) =>
    `${slug.slice(0, SLUG_MAX - COPY_SUFFIX.length).replace(/-+$/, '')}${COPY_SUFFIX}`;

/** Lo que el diálogo de Nuevo y Duplicar edita, todo como texto de los inputs. */
export interface ServiceForm {
    branchId: string;
    name: string;
    slug: string;
    /** Si el Dueño tocó el tramo: desde ahí deja de seguir al nombre. */
    slugEdited: boolean;
    description: string;
    category: ServiceCategoryValue | '';
    durationMinutes: string;
    price: string;
}

/** Valida el formulario y lo convierte en el cuerpo de `POST /branches/:id/services`, sin los Empleados. */
export const serviceFormSchema = z.object({
    branchId: z.string().min(1, 'Elegí una Sucursal.').transform(Number),
    name: z.string().trim().min(1, 'Ingresá el nombre del Servicio.'),
    slug: z
        .string()
        .min(3, 'El tramo tiene que tener al menos 3 caracteres.')
        .max(SLUG_MAX, `El tramo no puede tener más de ${SLUG_MAX} caracteres.`)
        .regex(SLUG_PATTERN, 'El tramo solo puede tener minúsculas, números y guiones.'),
    description: z
        .string()
        .trim()
        .transform((d) => d || undefined),
    category: z.enum(
        SERVICE_CATEGORIES.map((c) => c.value),
        { message: 'Elegí una Categoría de Servicio.' },
    ),
    durationMinutes: z
        .string()
        .trim()
        .min(1, 'Ingresá la duración en minutos.')
        .transform(Number)
        .pipe(
            z
                .number({ message: 'La duración tiene que ser un número.' })
                .int('La duración va en minutos enteros.')
                .min(1, 'La duración tiene que ser de al menos 1 minuto.'),
        ),
    price: z
        .string()
        .trim()
        .min(1, 'Ingresá el precio.')
        .transform(Number)
        .pipe(z.number({ message: 'El precio tiene que ser un número.' }).min(0, 'El precio no puede ser negativo.')),
});

/** Lo que Guardar del detalle edita, todo como texto de los inputs salvo los toggles. */
export interface ServiceEditForm {
    name: string;
    slug: string;
    description: string;
    category: ServiceCategoryValue;
    durationMinutes: string;
    price: string;
    depositEnabled: boolean;
    /** El porcentaje de la Seña; solo cuenta con `depositEnabled`. */
    depositPercent: string;
    requiresApproval: boolean;
}

/** El Servicio como lo deja editar el detalle. */
export const editFormOf = (service: {
    name: string;
    slug: string;
    description: string | null;
    category: ServiceCategoryValue;
    durationMinutes: number;
    price: number;
    depositPercent: number | null;
    requiresApproval: boolean;
}): ServiceEditForm => ({
    name: service.name,
    slug: service.slug,
    description: service.description ?? '',
    category: service.category,
    durationMinutes: String(service.durationMinutes),
    price: String(service.price),
    depositEnabled: service.depositPercent !== null,
    depositPercent: service.depositPercent === null ? '' : String(service.depositPercent),
    requiresApproval: service.requiresApproval,
});

const DEPOSIT_MESSAGE = 'La Seña va de 1 a 100%, en enteros.';

const serviceEditSchema = serviceFormSchema
    .omit({ branchId: true })
    .extend({ depositEnabled: z.boolean(), depositPercent: z.string(), requiresApproval: z.boolean() })
    .superRefine((form, ctx) => {
        if (!form.depositEnabled) return;
        const percent = form.depositPercent.trim() === '' ? NaN : Number(form.depositPercent);
        if (!Number.isInteger(percent) || percent < 1 || percent > 100)
            ctx.addIssue({ code: 'custom', path: ['depositPercent'], message: DEPOSIT_MESSAGE });
    })
    .transform(({ depositEnabled, depositPercent, ...form }) => ({
        ...form,
        depositPercent: depositEnabled ? Number(depositPercent) : null,
    }));

type ServiceChanges = Partial<z.output<typeof serviceEditSchema>>;

/**
 * Valida el borrador y arma el cuerpo de `PATCH /services/:id` con solo lo que cambió respecto de lo guardado. La
 * Seña apagada viaja como `depositPercent: null`. Una descripción que ya tenía texto no se puede vaciar: el back no
 * acepta una descripción vacía.
 */
export function serviceChanges(
    saved: ServiceEditForm,
    draft: ServiceEditForm,
): { ok: true; changes: ServiceChanges } | { ok: false; errors: FieldErrors } {
    const parsed = serviceEditSchema.safeParse(draft);
    if (!parsed.success) return { ok: false, errors: fieldErrorsOf(parsed.error) };
    const before: ServiceChanges = serviceEditSchema.safeParse(saved).data ?? {};

    const changes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
        if (value !== before[key as keyof ServiceChanges]) changes[key] = value;
    }
    if ('description' in changes && changes.description === undefined)
        return { ok: false, errors: { description: 'La descripción no se puede borrar: escribí una nueva.' } };
    return { ok: true, changes: changes as ServiceChanges };
}
