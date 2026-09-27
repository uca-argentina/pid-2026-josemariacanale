-- Cada Servicio que atiende un Empleado usa una de sus Availability. No backfill: la base de desarrollo se recrea entera.
-- DropForeignKey
ALTER TABLE "_EmployeeToService" DROP CONSTRAINT "_EmployeeToService_A_fkey";

-- DropForeignKey
ALTER TABLE "_EmployeeToService" DROP CONSTRAINT "_EmployeeToService_B_fkey";

-- DropTable
DROP TABLE "_EmployeeToService";

-- CreateTable
CREATE TABLE "EmployeeService" (
    "employeeId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "availabilityId" INTEGER NOT NULL,

    CONSTRAINT "EmployeeService_pkey" PRIMARY KEY ("employeeId","serviceId")
);

-- CreateIndex
CREATE INDEX "EmployeeService_serviceId_idx" ON "EmployeeService"("serviceId");

-- CreateIndex
CREATE INDEX "EmployeeService_availabilityId_idx" ON "EmployeeService"("availabilityId");

-- AddForeignKey
ALTER TABLE "EmployeeService" ADD CONSTRAINT "EmployeeService_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeService" ADD CONSTRAINT "EmployeeService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeService" ADD CONSTRAINT "EmployeeService_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "Availability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

