import { User } from '../../domain/users/user';

export const presentUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  slug: user.slug,
  imageUrl: user.imageUrl,
});
