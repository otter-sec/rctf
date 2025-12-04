ALTER TABLE "users" DROP CONSTRAINT "require_email_or_ctftime_id";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "discord_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "require_email_ctftime_id_or_discord_id" CHECK ((email IS NOT NULL) OR (ctftime_id IS NOT NULL) OR (discord_id IS NOT NULL));