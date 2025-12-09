CREATE INDEX "challenges_sortweight_index" ON "challenges" USING btree ((("data" ->> 'sortWeight')::int));--> statement-breakpoint
CREATE INDEX "solves_userid_challengeid_index" ON "solves" USING btree ("userid" text_ops,"challengeid" text_ops);--> statement-breakpoint
CREATE INDEX "users_email_index" ON "users" USING btree ("email" text_ops) WHERE "users"."email" IS NOT NULL;