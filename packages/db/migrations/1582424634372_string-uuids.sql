--> statement-breakpoint
ALTER TABLE "users"
ALTER COLUMN "id" TYPE text USING "id"::text;

--> statement-breakpoint
ALTER TABLE "solves"
ALTER COLUMN "id" TYPE text USING "id"::text;

--> statement-breakpoint
ALTER TABLE "solves"
ALTER COLUMN "userid" TYPE text USING "userid"::text;

--! statement-breakpoint
ALTER TABLE "users"
ALTER COLUMN "id" TYPE uuid USING "id"::uuid;

--! statement-breakpoint
ALTER TABLE "solves"
ALTER COLUMN "id" TYPE uuid USING "id"::uuid;

--! statement-breakpoint
ALTER TABLE "solves"
ALTER COLUMN "userid" TYPE uuid USING "id"::uuid;

