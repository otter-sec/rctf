CREATE TABLE "pending_user_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"name" "citext" NOT NULL,
	"email" text NOT NULL,
	"division" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pending_user_verifications_token_key" UNIQUE("token"),
	CONSTRAINT "pending_user_verifications_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "pending_user_verifications_created_at_index" ON "pending_user_verifications" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "pending_user_verifications_expires_at_index" ON "pending_user_verifications" USING btree ("expires_at" timestamptz_ops);