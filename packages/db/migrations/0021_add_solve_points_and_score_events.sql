CREATE TABLE "score_events" (
	"id" text PRIMARY KEY NOT NULL,
	"challengeid" text NOT NULL,
	"userid" text NOT NULL,
	"points_delta" integer NOT NULL,
	"event_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "solves" ADD COLUMN "points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "solves" ADD COLUMN "points_updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "solves" ADD COLUMN "source" text DEFAULT 'flag' NOT NULL;--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_challengeid_fkey" FOREIGN KEY ("challengeid") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "score_events_event_at_index" ON "score_events" USING btree ("event_at" timestamptz_ops,"id" text_ops);--> statement-breakpoint
CREATE INDEX "score_events_userid_event_at_index" ON "score_events" USING btree ("userid" text_ops,"event_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "score_events_challengeid_index" ON "score_events" USING btree ("challengeid" text_ops);--> statement-breakpoint
CREATE INDEX "solves_points_updated_at_index" ON "solves" USING btree ("points_updated_at" timestamptz_ops) WHERE points > 0;