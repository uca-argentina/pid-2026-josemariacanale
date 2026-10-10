import type { IBranchesRepository } from '@/src/application/repositories/branches.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Branch, UpdateBranch } from '@/src/entities/models/branch';

export type IUpdateBranchUseCase = ReturnType<typeof updateBranchUseCase>;
/**
 * Edita una Sucursal. "Solo el Dueño" lo valida el back (403); acá no se revalida.
 *
 * @throws {SlugTakenError} otra Sucursal del Negocio ya usa el tramo
 * @throws {InvalidSlugError} el tramo no tiene un formato válido
 */
export const updateBranchUseCase =
    (instrumentationService: IInstrumentationService, branchesRepository: IBranchesRepository) =>
    (input: UpdateBranch): Promise<Branch> =>
        instrumentationService.startSpan({ name: 'updateBranch Use Case', op: 'function' }, () =>
            branchesRepository.updateBranch(input),
        );
