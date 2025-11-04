--> statement-breakpoint
ALTER TABLE "users"
ADD COLUMN "ctftime_id" text UNIQUE;

--> statement-breakpoint
ALTER TABLE "users"
ALTER COLUMN "email" DROP NOT NULL;

--> statement-breakpoint
ALTER TABLE "users"
ADD CONSTRAINT "require_email_or_ctftime_id"
  CHECK (("email" IS NOT NULL) OR ("ctftime_id" IS NOT NULL));

--! statement-breakpoint
ALTER TABLE "users"
DROP CONSTRAINT "require_email_or_ctftime_id";

--! statement-breakpoint
ALTER TABLE "users"
ALTER COLUMN "email" SET NOT NULL;

--! statement-breakpoint
ALTER TABLE "users"
DROP COLUMN "ctftime_id";

