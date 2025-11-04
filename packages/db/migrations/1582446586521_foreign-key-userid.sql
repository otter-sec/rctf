--> statement-breakpoint
ALTER TABLE "solves"
ADD CONSTRAINT "uuid_fkey" FOREIGN KEY ("userid") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

--! statement-breakpoint
ALTER TABLE "solves"
DROP CONSTRAINT "uuid_fkey";

