-- DropForeignKey
ALTER TABLE "EmployeeBranch" DROP CONSTRAINT "EmployeeBranch_branchId_businessId_fkey";

-- DropForeignKey
ALTER TABLE "EmployeeBranch" DROP CONSTRAINT "EmployeeBranch_employeeId_businessId_fkey";

-- AddForeignKey
ALTER TABLE "EmployeeBranch" ADD CONSTRAINT "EmployeeBranch_employeeId_businessId_fkey" FOREIGN KEY ("employeeId", "businessId") REFERENCES "Employee"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBranch" ADD CONSTRAINT "EmployeeBranch_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "Branch"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;
