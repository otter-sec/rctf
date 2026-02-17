DROP TABLE "admin_bot_job_logs" CASCADE;--> statement-breakpoint
ALTER TABLE "admin_bot_jobs" ADD COLUMN "logs" text;