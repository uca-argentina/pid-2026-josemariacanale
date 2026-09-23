import { z } from 'zod';

// La forma exacta que espera POST /businesses del back. El wizard la arma en tres pasos.
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

export const branchSchema = z
    .object({
        name: required('el nombre de la Sucursal'),
        address: required('la dirección'),
        opensAt: required('el horario de apertura'),
        closesAt: required('el horario de cierre'),
    })
    .refine((s) => s.closesAt > s.opensAt, {
        message: 'El cierre tiene que ser posterior a la apertura.',
        path: ['closesAt'],
    });

export const SERVICE_CATEGORIES = [
    { value: 'CLINICA', label: 'Clínica' },
    { value: 'SPA', label: 'Spa' },
    { value: 'GIMNASIO', label: 'Gimnasio' },
    { value: 'ACADEMIA', label: 'Academia' },
    { value: 'OTRO', label: 'Otro' },
] as const;

export type ServiceCategoryValue = (typeof SERVICE_CATEGORIES)[number]['value'];

export const serviceSchema = z.object({
    name: required('el nombre del Servicio'),
    category: z.enum(
        SERVICE_CATEGORIES.map((c) => c.value),
        { message: 'Elegí una Categoría de Servicio.' },
    ),
    // Los inputs numéricos entregan string: se valida el texto y recién ahí se convierte,
    // así el estado del formulario sigue siendo string y el payload sale con números.
    durationMinutes: required('la duración en minutos')
        .transform(Number)
        .pipe(
            z
                .number({ message: 'La duración tiene que ser un número.' })
                .int('La duración va en minutos enteros.')
                .min(1, 'La duración tiene que ser de al menos 1 minuto.'),
        ),
    price: required('el precio')
        .transform(Number)
        .pipe(
            z
                .number({ message: 'El precio tiene que ser un número.' })
                .min(0, 'El precio no puede ser negativo.'),
        ),
    // El back trata la ausencia de descripción como "sin descripción", nunca como texto vacío.
    description: z
        .string()
        .trim()
        .optional()
        .transform((d) => d || undefined),
});

export type BusinessFields = z.input<typeof businessSchema>;
export type BranchFields = z.input<typeof branchSchema>;
export type ServiceFields = z.input<typeof serviceSchema>;

export type CreateBusinessPayload = {
    business: z.output<typeof businessSchema>;
    branch: z.output<typeof branchSchema>;
    service: z.output<typeof serviceSchema>;
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
