ALTER TABLE "user_members" DROP CONSTRAINT "user_members_email_key";--> statement-breakpoint
ALTER TABLE "user_members" ADD CONSTRAINT "user_members_userid_email_key" UNIQUE("userid","email");