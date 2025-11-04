--> statement-breakpoint
CREATE TABLE "solves" (
  "id" uuid PRIMARY KEY,
  "challengeid" text NOT NULL,
  "userid" uuid NOT NULL
);

--! statement-breakpoint
DROP TABLE "solves";

