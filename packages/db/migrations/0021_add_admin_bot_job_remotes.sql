ALTER TABLE "admin_bot_jobs" ADD COLUMN "remotes" jsonb DEFAULT '[]'::jsonb NOT NULL;
