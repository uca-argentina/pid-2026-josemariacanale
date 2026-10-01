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
