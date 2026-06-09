CREATE TABLE "PasswordResetCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "requestedIp" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PasswordResetCode_userId_idx" ON "PasswordResetCode"("userId");
CREATE INDEX "PasswordResetCode_email_idx" ON "PasswordResetCode"("email");
CREATE INDEX "PasswordResetCode_expiresAt_idx" ON "PasswordResetCode"("expiresAt");

ALTER TABLE "PasswordResetCode"
  ADD CONSTRAINT "PasswordResetCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;