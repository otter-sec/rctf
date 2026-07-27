ALTER TYPE "public"."submission_log_result" ADD VALUE 'cheated' BEFORE 'incorrect';--> statement-breakpoint
CREATE TABLE "dynamic_flags" (
	"challenge_id" text NOT NULL,
	"user_id" text NOT NULL,
	"base" text NOT NULL,
	"flag" text NOT NULL,
	"allow_duplicate" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dynamic_flags_pkey" PRIMARY KEY("challenge_id","user_id","base")
);
--> statement-breakpoint
ALTER TABLE "dynamic_flags" ADD CONSTRAINT "dynamic_flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "dynamic_flags_challenge_id_flag_key" ON "dynamic_flags" USING btree ("challenge_id","flag") WHERE NOT "dynamic_flags"."allow_duplicate";--> statement-breakpoint
CREATE INDEX "dynamic_flags_challenge_id_flag_index" ON "dynamic_flags" USING btree ("challenge_id","flag");