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

export const presentCatalogGroup = ({
  business,
  role,
  employeeId,
  branches,
}: ServiceCatalogGroup) => ({
  business: { id: business.id, name: business.name, slug: business.slug },
  role,
  employeeId,
  branches: branches.map(({ id, name, slug, services }) => ({
    id,
    name,
    slug,
    services: services.map(presentService),
  })),
});
