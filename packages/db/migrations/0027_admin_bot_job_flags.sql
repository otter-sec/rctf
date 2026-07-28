ALTER TABLE "admin_bot_jobs" ADD COLUMN "flags" jsonb;--> statement-breakpoint
UPDATE "admin_bot_jobs" SET "flags" = CASE
  WHEN COALESCE("flag", '') = '' THEN '[]'::jsonb
  ELSE jsonb_build_array(jsonb_build_object('provider', 'flags/static', 'flag', "flag"))
END;--> statement-breakpoint
ALTER TABLE "admin_bot_jobs" ALTER COLUMN "flags" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_bot_jobs" DROP COLUMN "flag";
