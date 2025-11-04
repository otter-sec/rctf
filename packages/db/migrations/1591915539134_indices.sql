--> statement-breakpoint
CREATE INDEX "user_members_userid_idx" ON "user_members" ("userid");

--> statement-breakpoint
CREATE INDEX "solves_createdat_idx" ON "solves" ("createdat");

--> statement-breakpoint
CREATE INDEX "solves_userid_idx" ON "solves" ("userid");

--! statement-breakpoint
DROP INDEX "solves_userid_idx";

--! statement-breakpoint
DROP INDEX "solves_createdat_idx";

--! statement-breakpoint
DROP INDEX "user_members_userid_idx";

