--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS citext;

--> statement-breakpoint
ALTER TABLE "users"
ALTER COLUMN "name" TYPE citext;

--! statement-breakpoint
ALTER TABLE "users"
ALTER COLUMN "name" TYPE text;

--! statement-breakpoint
DROP EXTENSION IF EXISTS citext;

