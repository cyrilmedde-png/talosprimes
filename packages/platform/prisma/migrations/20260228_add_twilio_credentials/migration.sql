-- AlterTable
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='twilio_configs') THEN
    ALTER TABLE "twilio_configs" ADD COLUMN IF NOT EXISTS "account_sid" TEXT;
    ALTER TABLE "twilio_configs" ADD COLUMN IF NOT EXISTS "auth_token" TEXT;
  END IF;
END
$$;
