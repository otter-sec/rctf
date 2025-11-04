--> statement-breakpoint
ALTER TABLE "users"
ADD COLUMN "created_at" timestamp NOT NULL DEFAULT NOW();

--! statement-breakpoint
ALTER TABLE "users"
DROP COLUMN "created_at";

