-- El Empleado deja de guardar nombre y email propios: pasa a ser el vínculo entre un Usuario y un
-- Negocio (docs/adr/0013). No backfill: la base de desarrollo se recrea entera.

-- DropIndex
DROP INDEX "Employee_businessId_email_ci_key";

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "name",
DROP COLUMN "email",
ADD COLUMN "userId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Solo entre los Empleados no dados de baja: una persona activa a la vez por Negocio, y recontratar crea una fila nueva.
CREATE UNIQUE INDEX "Employee_userId_businessId_key" ON "Employee"("userId", "businessId") WHERE "retiredAt" IS NULL;
