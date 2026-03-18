ALTER TABLE "challenges" ADD COLUMN "score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "solve_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "global_rank" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "division_rank" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_solve_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_tiebreak_solve_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "users_global_leaderboard_idx" ON "users" USING btree (global_rank ASC) WHERE global_rank IS NOT NULL;--> statement-breakpoint
CREATE INDEX "users_division_leaderboard_idx" ON "users" USING btree (division, global_rank ASC) WHERE global_rank IS NOT NULL;
