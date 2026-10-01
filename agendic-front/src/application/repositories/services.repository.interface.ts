import type {
    CatalogService,
    CreateService,
    RetiredService,
    ServiceCatalogGroup,
    UpdateService,
} from '@/src/entities/models/service';

/**
 * The panel's Servicios. "Only the Dueño" creates, edits and retires them, and the back enforces it: anyone else gets
 * ApiRequestError (403).
 */
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
    /**
     * Changes the fields sent of a Servicio; `depositPercent: null` drops the Seña.
     *
     * @throws {ServiceSlugTakenError} another Servicio of the Sucursal uses that tramo (409)
     * @throws {ServiceNameTakenError} another Servicio of the Sucursal has that name (409)
     * @throws {NotFoundError} the Servicio does not exist or was retired (404)
     * @throws {ApiRequestError} not the Dueño (403), invalid data (400) or any other failure
     */
    updateService(input: UpdateService): Promise<CatalogService>;
    /**
     * Dar de baja: retires the Servicio and cancels its future Turnos.
     *
     * @throws {NotFoundError} the Servicio does not exist or was already retired (404)
     * @throws {ApiRequestError} not the Dueño (403) or any other failure
     */
    retireService(id: number): Promise<RetiredService>;
}
