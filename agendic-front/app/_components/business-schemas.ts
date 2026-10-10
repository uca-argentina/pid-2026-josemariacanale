import { z } from 'zod';

// La forma exacta que espera POST /businesses del back. No lleva Servicio.
// Ver agendic-back/src/infrastructure/businesses/businesses.dto.ts.

const required = (field: string) => z.string().trim().min(1, `Ingresá ${field}.`);

// Mismo patrón que IsSlug en agendic-back/src/infrastructure/businesses/businesses.dto.ts.
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const businessSchema = z.object({
    name: required('el nombre del Negocio'),
    description: required('una descripción'),
    slug: required('el Enlace de reserva')
        .toLowerCase()
        .pipe(
            z
                .string()
                .min(3, 'El Enlace de reserva tiene que tener al menos 3 caracteres.')
                .max(40, 'El Enlace de reserva no puede tener más de 40 caracteres.')
                .regex(
                    SLUG_PATTERN,
                    'El Enlace de reserva solo puede tener minúsculas, números y guiones.',
                ),
        ),
});

/** El tramo de la Sucursal en el Enlace de reserva se deriva del nombre: 3 a 40 caracteres. */
const BRANCH_SLUG_MIN = 3;
const BRANCH_SLUG_MAX = 40;

const branchFields = z.object({
    name: required('el nombre de la Sucursal').refine((n) => slugify(n).length >= BRANCH_SLUG_MIN, {
        message: `El nombre tiene que tener al menos ${BRANCH_SLUG_MIN} letras o números.`,
    }),
    address: required('la dirección'),
    timeZone: required('la zona horaria'),
});

export const branchSchema = branchFields.transform((b) => ({
    ...b,
    slug: slugify(b.name).slice(0, BRANCH_SLUG_MAX).replace(/-+$/, ''),
}));

/** Una Sucursal editable: lo del wizard más su tramo del Enlace de reserva y su descripción propia (opcional). */
export const branchFormSchema = branchFields.extend({
    slug: businessSchema.shape.slug,
    description: z.string().trim(),
});

export const SERVICE_CATEGORIES = [
    { value: 'CLINICA', label: 'Clínica' },
    { value: 'SPA', label: 'Spa' },
    { value: 'GIMNASIO', label: 'Gimnasio' },
    { value: 'ACADEMIA', label: 'Academia' },
    { value: 'OTRO', label: 'Otro' },
] as const;

export type ServiceCategoryValue = (typeof SERVICE_CATEGORIES)[number]['value'];

/** La forma de POST /businesses/:id/employees (una Invitación): solo el email. */
export const inviteEmployeeSchema = z.object({
    email: required('el email').pipe(z.email('Ingresá un email válido.')),
});

export type BusinessFields = z.input<typeof businessSchema>;
export type BranchFields = z.input<typeof branchSchema>;
export type BranchFormFields = z.input<typeof branchFormSchema>;
export type InviteFields = z.input<typeof inviteEmployeeSchema>;

export type CreateBusinessPayload = {
    business: z.output<typeof businessSchema>;
    branch: z.output<typeof branchSchema>;
};

/** Los errores de un paso, indexados por nombre de campo, como los muestra el formulario. */
export type FieldErrors = Record<string, string>;

export function fieldErrorsOf(error: z.ZodError): FieldErrors {
    const errors: FieldErrors = {};
    for (const issue of error.issues) {
        const field = String(issue.path[0] ?? '');
        if (field && !errors[field]) errors[field] = issue.message;
    }
    return errors;
}

/** Minúsculas, sin diacríticos, no-alfanumérico colapsado a un guion. Para prellenar el Enlace de reserva desde el nombre. */
export function slugify(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
