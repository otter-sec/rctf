CREATE TYPE "public"."submission_log_kind" AS ENUM('flag', 'admin_bot');--> statement-breakpoint
CREATE TYPE "public"."submission_log_result" AS ENUM('correct', 'incorrect', 'already_solved', 'queued', 'active_job', 'invalid_input', 'bad_instancer_state');--> statement-breakpoint
CREATE TABLE "submission_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "submission_log_kind" NOT NULL,
	"challenge_id" text NOT NULL,
	"user_id" text NOT NULL,
	"ip" text NOT NULL,
	"result" "submission_log_result" NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"related_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "submission_logs_created_at_index" ON "submission_logs" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "submission_logs_challenge_created_at_index" ON "submission_logs" USING btree ("challenge_id" text_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "submission_logs_user_created_at_index" ON "submission_logs" USING btree ("user_id" text_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "submission_logs_ip_index" ON "submission_logs" USING btree ("ip" text_ops);--> statement-breakpoint
CREATE INDEX "submission_logs_kind_result_index" ON "submission_logs" USING btree ("kind","result");