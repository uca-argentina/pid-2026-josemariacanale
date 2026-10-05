-- AlterTable: Intervalo and Anticipación mínima of the Servicio
ALTER TABLE "Service" ADD COLUMN "slotInterval" INTEGER,
ADD COLUMN "minimumNoticeMinutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: the Sucursal has no opening hours; Horarios reservables come only from the Empleados' Availability (ADR 0020)
ALTER TABLE "Branch" DROP COLUMN "opensAt", DROP COLUMN "closesAt";
