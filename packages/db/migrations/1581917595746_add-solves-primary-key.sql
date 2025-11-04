--> statement-breakpoint
ALTER TABLE "solves"
ADD CONSTRAINT "uq" UNIQUE ("challengeid", "userid");

--! statement-breakpoint
ALTER TABLE "solves"
DROP CONSTRAINT "uq";

