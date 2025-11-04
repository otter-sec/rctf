-- rCTF v1 schema:

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" "citext" NOT NULL,
	"email" text,
	"division" text NOT NULL,
	"perms" integer NOT NULL,
	"ctftime_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_name_key" UNIQUE("name"),
	CONSTRAINT "users_email_key" UNIQUE("email"),
	CONSTRAINT "users_ctftime_id_key" UNIQUE("ctftime_id"),
	CONSTRAINT "require_email_or_ctftime_id" CHECK ((email IS NOT NULL) OR (ctftime_id IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "solves" (
	"id" text PRIMARY KEY NOT NULL,
	"challengeid" text NOT NULL,
	"userid" text NOT NULL,
	"createdat" timestamp with time zone NOT NULL,
	CONSTRAINT "uq" UNIQUE("challengeid","userid")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_members" (
	"id" text PRIMARY KEY NOT NULL,
	"userid" text NOT NULL,
	"email" text NOT NULL,
	CONSTRAINT "user_members_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
DROP TABLE IF EXISTS "pgmigrations";
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "solves"
    ADD CONSTRAINT "solves_userid_fkey"
    FOREIGN KEY ("userid") REFERENCES "public"."users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END$$;
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "user_members"
    ADD CONSTRAINT "user_members_userid_fkey"
    FOREIGN KEY ("userid") REFERENCES "public"."users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END$$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "solves_createdat_index" ON "solves" USING btree ("createdat" timestamptz_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "solves_userid_index" ON "solves" USING btree ("userid" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_members_userid_index" ON "user_members" USING btree ("userid" text_ops);
