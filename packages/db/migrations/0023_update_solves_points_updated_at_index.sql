DROP INDEX "solves_points_updated_at_index";--> statement-breakpoint
CREATE INDEX "solves_points_updated_at_index" ON "solves" USING btree ("points_updated_at" timestamptz_ops,"id" text_ops);