--> statement-breakpoint
ALTER TABLE "users"
ADD COLUMN "perms" integer NOT NULL;

--! statement-breakpoint
ALTER TABLE "users"
DROP COLUMN "perms";

