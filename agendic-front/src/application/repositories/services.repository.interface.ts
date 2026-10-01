import type { CatalogService, CreateService, ServiceCatalogGroup } from '@/src/entities/models/service';

/** The panel's Servicios. "Only the Dueño" creates them, and the back enforces it: anyone else gets ApiRequestError (403). */
export interface IServicesRepository {
    /**
     * Lists the Usuario's catalog: one group per Negocio where they are an active Empleado; empty when there is none.
     *
     * @throws {ApiRequestError} the back failed or answered an unexpected body
     */
    listMyCatalog(): Promise<ServiceCatalogGroup[]>;
    /**
     * Creates a Servicio in the Sucursal, attended by the given Empleados.
     *
     * @throws {ServiceSlugTakenError} another Servicio of the Sucursal uses that tramo (409)
     * @throws {ServiceNameTakenError} another Servicio of the Sucursal has that name (409)
     * @throws {ApiRequestError} not the Dueño (403), invalid data (400) or any other failure
     */
    createService(input: CreateService): Promise<CatalogService>;
}
