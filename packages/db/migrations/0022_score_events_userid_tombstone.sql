ALTER TABLE "score_events" DROP CONSTRAINT "score_events_userid_fkey";
--> statement-breakpoint
ALTER TABLE "score_events" ALTER COLUMN "userid" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;