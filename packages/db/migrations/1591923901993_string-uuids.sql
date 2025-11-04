--> statement-breakpoint
ALTER TABLE "user_members"
ALTER COLUMN "id" TYPE text USING "id"::text;

--! statement-breakpoint
ALTER TABLE "user_members"
ALTER COLUMN "id" TYPE uuid USING "id"::uuid;

