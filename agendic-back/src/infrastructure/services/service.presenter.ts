import { ServiceCatalogGroup } from '../../application/services/list-my-services.use-case';
import { Service } from '../../domain/services/service';

export const presentService = (service: Service) => ({
  id: service.id,
  branchId: service.branchId,
  userId: service.userId,
  availabilityId: service.availabilityId,
  name: service.name,
  description: service.description,
  category: service.category,
  durationMinutes: service.durationMinutes,
  price: service.price,
  depositPercent: service.depositPercent,
  requiresApproval: service.requiresApproval,
  slug: service.slug,
  hidden: service.hidden,
  prepMinutes: service.prepMinutes,
  dailyLimit: service.dailyLimit,
  slotInterval: service.slotInterval,
  minimumNoticeMinutes: service.minimumNoticeMinutes,
  employees: service.employees.map(({ id, name, availabilityId }) => ({
    id,
    name,
    availabilityId,
  })),
});

/**
 * The panel catalog's view of a Servicio: `presentService` plus each Empleado's `imageUrl`.
 * Only the owner/Empleado-authenticated catalog shows it; every public Servicio response
 * (Branch page, Servicio by tramo, Horarios reservables) stays on `presentService`.
 */
export const presentCatalogService = (service: Service) => ({
  ...presentService(service),
  employees: service.employees.map(({ id, name, availabilityId, imageUrl }) => ({
    id,
    name,
    availabilityId,
    imageUrl,
  })),
});

export const presentCatalogGroup = ({
  business,
  role,
  employeeId,
  branches,
}: ServiceCatalogGroup) => ({
  business: {
    id: business.id,
    name: business.name,
    slug: business.slug,
    logoUrl: business.logoUrl,
  },
  role,
  employeeId,
  branches: branches.map(({ id, name, slug, services }) => ({
    id,
    name,
    slug,
    services: services.map(presentCatalogService),
  })),
});
