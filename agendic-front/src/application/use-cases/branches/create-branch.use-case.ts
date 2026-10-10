import type { IBranchesRepository } from '@/src/application/repositories/branches.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Branch, CreateBranch } from '@/src/entities/models/branch';

export type ICreateBranchUseCase = ReturnType<typeof createBranchUseCase>;
/**
 * Crea una Sucursal en el Negocio. "Solo el Dueño" lo valida el back (403); acá no se revalida.
 *
 * @throws {SlugTakenError} otra Sucursal del Negocio ya usa el tramo
 * @throws {InvalidSlugError} el tramo no tiene un formato válido
 */
export const createBranchUseCase =
    (instrumentationService: IInstrumentationService, branchesRepository: IBranchesRepository) =>
    (input: CreateBranch): Promise<Branch> =>
        instrumentationService.startSpan({ name: 'createBranch Use Case', op: 'function' }, () =>
            branchesRepository.createBranch(input),
        );
