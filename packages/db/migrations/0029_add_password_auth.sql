ALTER TABLE "users" DROP CONSTRAINT "require_email_or_ctftime_id";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "token_epoch" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "require_email_or_ctftime_id" CHECK ((email IS NOT NULL) OR (ctftime_id IS NOT NULL) OR (password_hash IS NOT NULL));