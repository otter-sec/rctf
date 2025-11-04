--> statement-breakpoint
CREATE TABLE "user_members" (
  "id" uuid PRIMARY KEY,
  "userid" text NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "grade" text NOT NULL
);

--> statement-breakpoint
ALTER TABLE "user_members"
ADD CONSTRAINT "uuid_fkey" FOREIGN KEY ("userid") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

--! statement-breakpoint
ALTER TABLE "user_members"
DROP CONSTRAINT "uuid_fkey";

--! statement-breakpoint
DROP TABLE "user_members";

