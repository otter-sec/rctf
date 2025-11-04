--> statement-breakpoint
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY,
  "name" text NOT NULL UNIQUE,
  "email" text NOT NULL UNIQUE,
  "password" text NOT NULL,
  "division" text NOT NULL
);

--! statement-breakpoint
DROP TABLE "users";

