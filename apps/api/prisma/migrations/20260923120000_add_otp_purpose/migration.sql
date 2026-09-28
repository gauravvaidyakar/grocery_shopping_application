CREATE TYPE "VerificationOtpPurpose" AS ENUM ('ACCOUNT_VERIFICATION', 'PASSWORD_RESET');

ALTER TABLE "VerificationOtp"
ADD COLUMN "purpose" "VerificationOtpPurpose" NOT NULL DEFAULT 'ACCOUNT_VERIFICATION';

DROP INDEX IF EXISTS "VerificationOtp_userId_expiresAt_idx";
CREATE INDEX "VerificationOtp_userId_purpose_expiresAt_idx"
ON "VerificationOtp"("userId", "purpose", "expiresAt");
