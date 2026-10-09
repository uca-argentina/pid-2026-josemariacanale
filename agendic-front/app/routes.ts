// Single source for the two redirects the layouts enforce server-side:
// (app) sends a signed-out Usuario here, (public)/(auth) sends a signed-in one to the panel.
export const SIGN_IN_PATH = '/sign-in';
export const SIGNED_IN_HOME_PATH = '/bookings';
export const BUSINESS_PATH = '/business';

/**
 * La ruta del Enlace de reserva (ADR 0014): sin tramo de Sucursal, la página del Negocio; con el tramo de un
 * Servicio (ADR 0018), la de la Sucursal con ese Servicio ya elegido.
 */
export const bookingLinkPath = (businessSlug: string, branchSlug?: string, serviceSlug?: string) =>
    ['/business', businessSlug, branchSlug, branchSlug && serviceSlug].filter(Boolean).join('/');

/** La ruta del Enlace de reserva de un Usuario (ADR 0021): sus Servicios personales, o uno ya elegido. */
export const userLinkPath = (userSlug: string, serviceSlug?: string) => ['/u', userSlug, serviceSlug].filter(Boolean).join('/');

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
 * personal, sin tramo de Servicio para que el Cliente pueda elegir otro. `null` si el Turno no trae ninguno de los dos.
 */
export const bookAgainPath = (booking: {
    business: { slug: string } | null;
    branch: { slug: string } | null;
    user: { slug: string } | null;
}) =>
    booking.user
        ? userLinkPath(booking.user.slug)
        : booking.business && booking.branch
          ? bookingLinkPath(booking.business.slug, booking.branch.slug)
          : null;
