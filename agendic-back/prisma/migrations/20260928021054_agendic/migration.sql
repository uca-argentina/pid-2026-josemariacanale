-- DropForeignKey
ALTER TABLE "AvailabilityOverride" DROP CONSTRAINT "AvailabilityOverride_coveredByEmployeeId_fkey";

-- AddForeignKey
ALTER TABLE "AvailabilityOverride" ADD CONSTRAINT "AvailabilityOverride_coveredByEmployeeId_fkey" FOREIGN KEY ("coveredByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
