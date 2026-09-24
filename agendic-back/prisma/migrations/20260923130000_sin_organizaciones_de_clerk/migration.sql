-- El Negocio deja de ser una Organization de Clerk y el Empleado deja de ser una identidad de Clerk
-- (docs/adr/0011). Sin backfill: el back no tiene datos reales.

-- DropIndex
DROP INDEX "Business_clerkOrgId_key";
DROP INDEX "Employee_clerkId_key";

-- AlterTable
ALTER TABLE "Business" DROP COLUMN "clerkOrgId";
ALTER TABLE "Employee" DROP COLUMN "clerkId";
