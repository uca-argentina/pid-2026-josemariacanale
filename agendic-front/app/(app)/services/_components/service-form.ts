import { z } from 'zod';
import { SERVICE_CATEGORIES, slugify, type ServiceCategoryValue } from '@/app/_components/business-schemas';

/** Mismo patrón que IsSlug en el back: el tramo del Servicio en el Enlace de reserva. */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_MAX = 40;

/** El tramo propuesto a partir de un texto: el del nombre, o el de una copia. */
export const slugFrom = (value: string) => slugify(value).slice(0, SLUG_MAX).replace(/-+$/, '');

/** Lo que el diálogo de Nuevo y Duplicar edita, todo como texto de los inputs. */
export interface ServiceForm {
    branchId: string;
    name: string;
    slug: string;
    /** Si el Dueño tocó el tramo: desde ahí deja de seguir al nombre. */
    slugEdited: boolean;
    description: string;
    category: ServiceCategoryValue | '';
    duration: string;
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

/** El formulario con los nombres de campo del schema. */
export const formInput = (form: ServiceForm) => ({
    branchId: form.branchId,
    name: form.name,
    slug: form.slug,
    description: form.description,
    category: form.category,
    durationMinutes: form.duration,
    price: form.price,
});
