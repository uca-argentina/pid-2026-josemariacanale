import type { DI_RETURN_TYPES } from '@/di/types';

/** Un Negocio del catálogo del panel, como lo presenta listMyServicesController. */
export type ServiceGroup = Awaited<ReturnType<DI_RETURN_TYPES['IListMyServicesController']>>[number];
/** Una Sucursal del Negocio, con sus Servicios en el orden en que llegan. */
export type ServiceBranch = ServiceGroup['branches'][number];
/** Un Servicio de la lista. `offeredByMe`: lo atiende el Empleado del Usuario en ese Negocio. */
export type ServiceItem = ServiceBranch['services'][number];
/** El detalle de un Servicio, como lo presenta getMyServiceController. */
export type ServiceDetailData = Awaited<ReturnType<DI_RETURN_TYPES['IGetMyServiceController']>>;
/** Los Servicios personales del Usuario, su Enlace de reserva y las Horas laborables para elegir al crear uno. */
export type PersonalSection = Awaited<ReturnType<DI_RETURN_TYPES['IListMyPersonalServicesController']>>;
/** Un Servicio personal de la lista. */
export type PersonalItem = PersonalSection['services'][number];
