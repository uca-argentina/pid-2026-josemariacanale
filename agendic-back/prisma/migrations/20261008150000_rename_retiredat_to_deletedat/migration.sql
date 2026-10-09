-- Rename retiredAt -> deletedAt on Service and Employee (ADR 0023): the four
-- dar de baja flags (Usuario, Negocio, Servicio, Empleado) share one name.
-- Hand-written instead of a Prisma-generated diff so this is a plain column
-- RENAME (no data loss), and so the partial unique indexes below (not
-- expressible in schema.prisma, ADR 0004) are recreated under the new name
-- rather than dropped and left missing.
ALTER TABLE "Service" RENAME COLUMN "retiredAt" TO "deletedAt";
ALTER TABLE "Employee" RENAME COLUMN "retiredAt" TO "deletedAt";

DROP INDEX "Service_branchId_name_ci_key";
CREATE UNIQUE INDEX "Service_branchId_name_ci_key" ON "Service"("branchId", lower("name")) WHERE "deletedAt" IS NULL;

DROP INDEX "Service_branchId_slug_key";
CREATE UNIQUE INDEX "Service_branchId_slug_key" ON "Service"("branchId", "slug") WHERE "deletedAt" IS NULL;

DROP INDEX "Service_userId_name_ci_key";
CREATE UNIQUE INDEX "Service_userId_name_ci_key" ON "Service"("userId", lower("name")) WHERE "deletedAt" IS NULL AND "userId" IS NOT NULL;

DROP INDEX "Service_userId_slug_key";
CREATE UNIQUE INDEX "Service_userId_slug_key" ON "Service"("userId", "slug") WHERE "deletedAt" IS NULL AND "userId" IS NOT NULL;

DROP INDEX "Employee_userId_businessId_key";
CREATE UNIQUE INDEX "Employee_userId_businessId_key" ON "Employee"("userId", "businessId") WHERE "deletedAt" IS NULL;
