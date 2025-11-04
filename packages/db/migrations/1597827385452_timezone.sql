--> statement-breakpoint
ALTER TABLE "users"
ALTER COLUMN "created_at" TYPE timestamptz;

--> statement-breakpoint
ALTER TABLE "solves"
ALTER COLUMN "createdat" TYPE timestamptz;

--! statement-breakpoint
ALTER TABLE "solves"
ALTER COLUMN "createdat" TYPE timestamp;

--! statement-breakpoint
ALTER TABLE "users"
ALTER COLUMN "created_at" TYPE timestamp;

