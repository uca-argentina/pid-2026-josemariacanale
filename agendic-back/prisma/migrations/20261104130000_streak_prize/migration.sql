-- CreateTable
CREATE TABLE "StreakPrize" (
    "id" SERIAL NOT NULL,
    "rewardId" INTEGER NOT NULL,
    "businessId" INTEGER,
    "userId" INTEGER,
    "clientEmail" TEXT NOT NULL,
    "streakStartedAt" TIMESTAMPTZ(3) NOT NULL,
    "reachedCount" INTEGER NOT NULL,
    "type" "StreakRewardType" NOT NULL,
    "value" DECIMAL(10,2),
    "description" TEXT,
    "serviceName" TEXT,
    "grantedAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3),
    "redeemedAt" TIMESTAMPTZ(3),
    "redeemedBookingId" INTEGER,
    "redeemedByUserId" INTEGER,

    CONSTRAINT "StreakPrize_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StreakPrize_businessId_clientEmail_idx" ON "StreakPrize"("businessId", "clientEmail");

-- CreateIndex
CREATE INDEX "StreakPrize_userId_clientEmail_idx" ON "StreakPrize"("userId", "clientEmail");

-- CreateIndex
CREATE UNIQUE INDEX "StreakPrize_rewardId_clientEmail_streakStartedAt_reachedCou_key" ON "StreakPrize"("rewardId", "clientEmail", "streakStartedAt", "reachedCount");

-- AddForeignKey
ALTER TABLE "StreakPrize" ADD CONSTRAINT "StreakPrize_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "StreakReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreakPrize" ADD CONSTRAINT "StreakPrize_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreakPrize" ADD CONSTRAINT "StreakPrize_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreakPrize" ADD CONSTRAINT "StreakPrize_redeemedBookingId_fkey" FOREIGN KEY ("redeemedBookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreakPrize" ADD CONSTRAINT "StreakPrize_redeemedByUserId_fkey" FOREIGN KEY ("redeemedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ADR 0004: a Premio is of the Ficha of a Negocio or of a Usuario, exactly one, with the email already lowercase.
ALTER TABLE "StreakPrize" ADD CONSTRAINT "StreakPrize_exactly_one_owner" CHECK (("businessId" IS NULL) <> ("userId" IS NULL));
ALTER TABLE "StreakPrize" ADD CONSTRAINT "StreakPrize_clientEmail_lowercase" CHECK ("clientEmail" = lower("clientEmail"));
ALTER TABLE "StreakPrize" ADD CONSTRAINT "StreakPrize_reachedCount_positive" CHECK ("reachedCount" > 0);
