-- La Sucursal gana zona horaria propia (IANA, nunca un offset): es la única fuente de zona horaria
-- del sistema. No backfill: la base de desarrollo se recrea entera.

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN "timeZone" TEXT NOT NULL;
