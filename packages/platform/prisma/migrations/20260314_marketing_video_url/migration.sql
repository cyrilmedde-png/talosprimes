-- Add video URL column to marketing_posts
ALTER TABLE "marketing_posts" ADD COLUMN IF NOT EXISTS "contenu_video_url" TEXT;
