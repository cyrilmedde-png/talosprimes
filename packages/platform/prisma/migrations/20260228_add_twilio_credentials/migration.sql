-- AlterTable
ALTER TABLE "twilio_configs" ADD COLUMN IF NOT EXISTS "account_sid" TEXT;
ALTER TABLE "twilio_configs" ADD COLUMN IF NOT EXISTS "auth_token" TEXT;
