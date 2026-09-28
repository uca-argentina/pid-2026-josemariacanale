import { PrismaClient } from './src/generated/prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = [
    { name: 'Juan Perez', email: 'juan@example.com', clerkId: 'test_clerk_1' },
    { name: 'Maria Gomez', email: 'maria@example.com', clerkId: 'test_clerk_2' },
    { name: 'Carlos Lopez', email: 'carlos@example.com', clerkId: 'test_clerk_3' },
  ];
  for (const user of users) {
    await prisma.user.upsert({
      where: { clerkId: user.clerkId },
      update: {},
      create: user,
    });
  }
  console.log('Se han creado usuarios de prueba con los siguientes emails:');
  console.log(users.map(u => u.email).join(', '));
}
main().catch(console.error).finally(() => prisma.$disconnect());
