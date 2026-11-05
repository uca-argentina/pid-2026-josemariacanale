-- CreateIndex
CREATE UNIQUE INDEX "Branch_id_businessId_key" ON "Branch"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_id_businessId_key" ON "Employee"("id", "businessId");

-- CreateTable
CREATE TABLE "EmployeeBranch" (
    "employeeId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "businessId" INTEGER NOT NULL,

    CONSTRAINT "EmployeeBranch_pkey" PRIMARY KEY ("employeeId","branchId")
);

-- CreateIndex
CREATE INDEX "EmployeeBranch_branchId_idx" ON "EmployeeBranch"("branchId");

-- AddForeignKey: the shared businessId keeps the Sucursal in the Empleado's own Negocio.
ALTER TABLE "EmployeeBranch" ADD CONSTRAINT "EmployeeBranch_employeeId_businessId_fkey" FOREIGN KEY ("employeeId", "businessId") REFERENCES "Employee"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBranch" ADD CONSTRAINT "EmployeeBranch_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "Branch"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ubica a cada Empleado activo: en las Sucursales de los Servicios no dados de baja que Ofrece; si no Ofrece
-- ninguno, en todas las del Negocio. El Empleado del Dueño, en todas.
INSERT INTO "EmployeeBranch" ("employeeId", "branchId", "businessId")
SELECT DISTINCT e."id", s."branchId", e."businessId"
FROM "Employee" e
JOIN "EmployeeService" es ON es."employeeId" = e."id"
JOIN "Service" s ON s."id" = es."serviceId" AND s."deletedAt" IS NULL
JOIN "Branch" b ON b."id" = s."branchId" AND b."businessId" = e."businessId"
WHERE e."deletedAt" IS NULL
UNION
SELECT e."id", b."id", e."businessId"
FROM "Employee" e
JOIN "Branch" b ON b."businessId" = e."businessId"
WHERE e."deletedAt" IS NULL
  AND (
    EXISTS (SELECT 1 FROM "Business" bu WHERE bu."id" = e."businessId" AND bu."ownerId" = e."userId")
    OR NOT EXISTS (
      SELECT 1
      FROM "EmployeeService" es
      JOIN "Service" s ON s."id" = es."serviceId" AND s."deletedAt" IS NULL
      JOIN "Branch" sb ON sb."id" = s."branchId" AND sb."businessId" = e."businessId"
      WHERE es."employeeId" = e."id"
    )
  );
