-- AlterTable: no backfill, the development database is recreated
ALTER TABLE "Service" ADD COLUMN "slug" TEXT NOT NULL,
ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: the Servicio's tramo of the Enlace de reserva, unique per Sucursal among Servicios not dados de baja
CREATE UNIQUE INDEX "Service_branchId_slug_key" ON "Service"("branchId", "slug") WHERE "retiredAt" IS NULL;
