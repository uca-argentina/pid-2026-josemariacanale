import { Inject, Injectable } from '@nestjs/common';
import { Business } from '../../domain/businesses/business';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { NotFoundError } from '../../domain/errors';

@Injectable()
export class GetBusinessBySlugUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  async execute(slug: string): Promise<Business> {
    const business = await this.businesses.findBySlug(slug.toLowerCase());
    if (!business) throw new NotFoundError('Business not found');
    return business;
  }
}
