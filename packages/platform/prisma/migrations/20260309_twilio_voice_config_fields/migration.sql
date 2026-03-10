-- AlterTable: Add voice/prompt configuration fields to twilio_configs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='twilio_configs') THEN
    ALTER TABLE "twilio_configs" ADD COLUMN IF NOT EXISTS "system_prompt" TEXT;
    ALTER TABLE "twilio_configs" ADD COLUMN IF NOT EXISTS "welcome_message" TEXT;
    ALTER TABLE "twilio_configs" ADD COLUMN IF NOT EXISTS "voice_name" TEXT NOT NULL DEFAULT 'Polly.Lea-Neural';
    ALTER TABLE "twilio_configs" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'fr-FR';
    ALTER TABLE "twilio_configs" ADD COLUMN IF NOT EXISTS "max_tokens" INTEGER NOT NULL DEFAULT 150;
    ALTER TABLE "twilio_configs" ADD COLUMN IF NOT EXISTS "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3;
  END IF;
END
$$;
