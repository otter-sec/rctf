CREATE TABLE "admin_bot_job_logs" (
	"challenge_id" text NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"logs" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_bot_job_logs_challenge_id_user_id_pk" PRIMARY KEY("challenge_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "admin_bot_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"challenge_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"config_revision" text NOT NULL,
	"flag" text NOT NULL,
	"inputs" jsonb NOT NULL,
	"instancer_instances" jsonb NOT NULL,
	"timeout_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_bot_job_logs" ADD CONSTRAINT "admin_bot_job_logs_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "admin_bot_job_logs" ADD CONSTRAINT "admin_bot_job_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "admin_bot_job_logs" ADD CONSTRAINT "admin_bot_job_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."admin_bot_jobs"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "admin_bot_jobs" ADD CONSTRAINT "admin_bot_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "admin_bot_jobs" ADD CONSTRAINT "admin_bot_jobs_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "admin_bot_jobs_user_id_index" ON "admin_bot_jobs" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "admin_bot_jobs_challenge_id_index" ON "admin_bot_jobs" USING btree ("challenge_id" text_ops);