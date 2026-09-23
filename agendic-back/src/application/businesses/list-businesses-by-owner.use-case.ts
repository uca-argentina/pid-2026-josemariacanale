import { Inject, Injectable } from '@nestjs/common';
import { Business } from '../../domain/businesses/business';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';

@Injectable()
export class ListBusinessesByOwnerUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  execute(ownerId: number): Promise<Business[]> {
    return this.businesses.listByOwner(ownerId);
  }
}
