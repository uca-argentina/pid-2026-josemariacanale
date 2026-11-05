-- AlterTable
ALTER TABLE "CalendarConnection" ADD COLUMN     "checkedCalendarIds" TEXT[] DEFAULT ARRAY['primary']::TEXT[];
