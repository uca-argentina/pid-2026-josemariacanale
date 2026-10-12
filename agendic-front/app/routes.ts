// Single source for the two redirects the layouts enforce server-side:
// (app) sends a signed-out Usuario here, (public)/(auth) sends a signed-in one to the panel.
export const SIGN_IN_PATH = '/sign-in';
export const SIGNED_IN_HOME_PATH = '/bookings';
export const BUSINESS_PATH = '/business';
export const BRANCHES_PATH = '/business/branches';
export const SERVICES_PATH = '/services';

/**
 * La ruta del Enlace de reserva, sin prefijo (ADR 0026): sin tramo de Sucursal, la página del Negocio (ADR 0014); con
 * el tramo de un Servicio (ADR 0018), la de la Sucursal con ese Servicio ya elegido, y con el de un Empleado que lo
 * Ofrece, esa reserva con el Empleado elegido. Un tramo sin el anterior se descarta.
 */
export const bookingLinkPath = (businessSlug: string, branchSlug?: string, serviceSlug?: string, employeeSlug?: string) =>
    `/${[businessSlug, branchSlug, branchSlug && serviceSlug, branchSlug && serviceSlug && employeeSlug].filter(Boolean).join('/')}`;

/** La ruta del Enlace de reserva de un Usuario (ADR 0021, 0026): sus Servicios personales, o uno ya elegido. */
export const userLinkPath = (userSlug: string, serviceSlug?: string) => `/${[userSlug, serviceSlug].filter(Boolean).join('/')}`;

/**
 * La sección del panel en la que está `pathname`: la que tiene esa ruta o un prefijo de ella por tramos, así una
 * subpantalla (`/services/12`) sigue en su sección. `null` si no está en ninguna.
 */
export const sectionOf = <T extends { href: string }>(pathname: string, sections: T[]) =>
    sections.find(({ href }) => pathname === href || pathname.startsWith(`${href}/`)) ?? null;

/** La ruta del Enlace del Turno (ADR 0022): ese Turno solo, sin Código de verificación. */
export const bookingPath = (link: string) => `/turnos/${link}`;

/**
 * "Reservar de nuevo" desde un Turno: la Sucursal del Servicio del Negocio, o la página del Usuario en un Servicio
 * personal, sin tramo de Servicio para que el Cliente pueda elegir otro. `null` si el Turno no trae ninguno de los dos, o
 * si el Usuario ya no tiene Enlace de reserva.
 */
export const bookAgainPath = (booking: {
    business: { slug: string } | null;
    branch: { slug: string } | null;
    user: { slug: string | null } | null;
}) =>
    booking.user
        ? booking.user.slug
            ? userLinkPath(booking.user.slug)
            : null
        : booking.business && booking.branch
          ? bookingLinkPath(booking.business.slug, booking.branch.slug)
          : null;

/** La pantalla Fuera de la oficina; con `nuevo`, abre el modal de período nuevo. */
export const OUT_OF_OFFICE_PATH = '/availability/out-of-office';
/** La pestaña Días festivos de Fuera de la oficina. */
export const OUT_OF_OFFICE_HOLIDAYS_PATH = `${OUT_OF_OFFICE_PATH}?type=holidays`;
export const newOutOfOfficePath = `${OUT_OF_OFFICE_PATH}?nuevo`;

/** Servicios con el modal de alta abierto, apuntado al Negocio `businessId` (la tarjeta "Crear servicio" de Mi Negocio). */
export const newServicePath = (businessId: number) => `${SERVICES_PATH}?nuevo=${businessId}`;
