import 'dotenv/config';
import { PrismaService } from '../infrastructure/prisma.service';
import { geocodeAddress, geocodeBranches } from './geocode-branches';

/**
 * Corre una sola vez, a mano (#385): completa el punto de las Sucursales que no lo
 * tienen. Ver el README del back.
 */
async function main() {
  const key = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!key) throw new Error('Falta GOOGLE_GEOCODING_API_KEY');

  const prisma = new PrismaService();
  try {
    const branches = await prisma.branch.findMany({
      where: { latitude: null },
      select: { id: true, name: true, address: true },
      orderBy: { id: 'asc' },
    });
    console.log(`Sucursales sin punto: ${branches.length}`);

    const report = await geocodeBranches(
      branches,
      (address) => geocodeAddress(key, address),
      // El `latitude: null` evita pisar un punto que el Dueño cargó mientras corría.
      async (id, latitude, longitude) => {
        const { count } = await prisma.branch.updateMany({
          where: { id, latitude: null },
          data: { latitude, longitude },
        });
        return count > 0;
      },
    );

    console.log(`Completadas: ${report.completed}`);
    if (report.failed.length) {
      console.log(`Quedaron sin punto (${report.failed.length}):`);
      for (const f of report.failed) {
        console.log(`  #${f.id} ${f.name} — ${f.address} (${f.reason})`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
