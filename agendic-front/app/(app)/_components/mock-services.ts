// ponytail: todo este archivo es mock. Cuando exista el dominio de Servicios en src/,
// la página pasa a recibir esto por props desde un controller.

export type ServiceRole = 'owner' | 'employee';

export interface ServiceItem {
    id: string;
    slug: string;
    name: string;
    description: string;
    durationMinutes: number;
    price: number;
    /** Solo lo cambia el Dueño: si el Servicio aparece en el Enlace de reserva. */
    visible: boolean;
    /** Si el usuario actual atiende este Servicio como Empleado. */
    offeredByMe: boolean;
    /** Los otros Empleados que ofrecen este Servicio. */
    otherEmployees: string[];
    deposit: { enabled: boolean; percent: number };
    prepMinutes: number;
    dailyLimit: { enabled: boolean; max: number };
    availabilityId: string;
}

export interface ServiceGroup {
    business: { id: number; name: string; slug: string };
    role: ServiceRole;
    services: ServiceItem[];
}

export const groups: ServiceGroup[] = [
    {
        business: { id: 1, name: 'Vitalia Centro de Bienestar', slug: 'vitalia' },
        role: 'owner',
        services: [
            {
                id: 'kinesio-inicial',
                slug: 'kinesio-inicial',
                name: 'Consulta inicial de kinesiología',
                description:
                    'Primera evaluación: revisamos el motivo de consulta, medimos movilidad y armamos el plan de tratamiento.',
                durationMinutes: 45,
                price: 18000,
                visible: true,
                offeredByMe: true,
                otherEmployees: ['Nicolás Rivas'],
                deposit: { enabled: true, percent: 20 },
                prepMinutes: 10,
                dailyLimit: { enabled: true, max: 8 },
                availabilityId: 'laboral',
            },
            {
                id: 'masaje-descontracturante',
                slug: 'masaje-descontracturante',
                name: 'Masaje descontracturante',
                description: '',
                durationMinutes: 60,
                price: 22000,
                visible: true,
                offeredByMe: false,
                otherEmployees: ['Sofía Ledesma', 'Camila Ortega'],
                deposit: { enabled: false, percent: 30 },
                prepMinutes: 15,
                dailyLimit: { enabled: false, max: 6 },
                availabilityId: 'laboral',
            },
            {
                id: 'evaluacion-postural',
                slug: 'evaluacion-postural',
                name: 'Evaluación postural',
                description: 'Solo con derivación médica.',
                durationMinutes: 30,
                price: 12000,
                visible: false,
                offeredByMe: true,
                otherEmployees: [],
                deposit: { enabled: false, percent: 20 },
                prepMinutes: 0,
                dailyLimit: { enabled: false, max: 4 },
                availabilityId: 'laboral',
            },
        ],
    },
    {
        business: { id: 2, name: 'Estudio Norte', slug: 'estudio-norte' },
        role: 'employee',
        services: [
            {
                id: 'pilates-reformer',
                slug: 'pilates-reformer',
                name: 'Clase de pilates reformer',
                description:
                    'Clase individual en reformer. Traé ropa cómoda y medias antideslizantes; el equipo lo ponemos nosotros.',
                durationMinutes: 50,
                price: 15000,
                visible: true,
                offeredByMe: true,
                otherEmployees: [],
                deposit: { enabled: true, percent: 30 },
                prepMinutes: 10,
                dailyLimit: { enabled: true, max: 6 },
                availabilityId: 'tarde',
            },
            {
                id: 'rehabilitacion-deportiva',
                slug: 'rehabilitacion-deportiva',
                name: 'Rehabilitación deportiva',
                description: 'Sesión de recuperación de lesiones con ejercicios guiados.',
                durationMinutes: 60,
                price: 20000,
                visible: true,
                offeredByMe: false,
                otherEmployees: ['Julián Paz'],
                deposit: { enabled: false, percent: 20 },
                prepMinutes: 15,
                dailyLimit: { enabled: false, max: 5 },
                availabilityId: 'laboral',
            },
        ],
    },
];

export function findService(id: string): { group: ServiceGroup; service: ServiceItem } | undefined {
    for (const group of groups) {
        const service = group.services.find((s) => s.id === id);
        if (service) return { group, service };
    }
}

/** El Enlace de reserva del Negocio, sin protocolo: `agendic.app/business/<slug>` (docs/agents/domain.md). */
export const bookingLink = (businessSlug: string) => `agendic.app/business/${businessSlug}`;

export const publicUrl = (businessSlug: string, serviceSlug: string) =>
    `https://${bookingLink(businessSlug)}/${serviceSlug}`;

const THOUSANDS = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

/** Mismo formato que la página pública (app/businessPage/_components/mock-business.ts). */
export const formatPrice = (price: number) => `$${THOUSANDS.format(price)}`;

export const depositAmount = (price: number, percent: number) => Math.round((price * percent) / 100);

/** Un Servicio no puede quedar sin nadie que lo atienda: solo lo dejás si otro Empleado lo sigue ofreciendo. */
export const canStopOffering = (service: Pick<ServiceItem, 'offeredByMe' | 'otherEmployees'>) => service.offeredByMe && service.otherEmployees.length > 0;
