import { User } from './user';

export const USERS_REPOSITORY = Symbol('UsersRepository');

export interface UsersRepository {
  /** Generates the id and createdAt, and the Usuario's default Availability in the same transaction. Called once per Clerk identity, on its first request. */
  create(
    data: Pick<User, 'clerkId' | 'name' | 'email' | 'imageUrl'>,
  ): Promise<User>;
  findById(id: number): Promise<User | null>;
  findByClerkId(clerkId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  /** The Usuario whose Enlace de reserva is that slug, already lowercase. Null if there is none. */
  findBySlug(slug: string): Promise<User | null>;
  /** Leaves undefined fields unchanged. Throws ConflictError when the slug is taken. */
  update(
    id: number,
    data: Partial<Pick<User, 'name' | 'email'>> & { slug?: string },
  ): Promise<User>;
}
