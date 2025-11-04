--> statement-breakpoint
ALTER TABLE "solves"
ADD COLUMN "createdat" timestamp NOT NULL;

--! statement-breakpoint
ALTER TABLE "solves"
DROP COLUMN "createdat";

