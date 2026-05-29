ALTER TABLE "ext_auth_clients" RENAME TO "external_auth_clients";--> statement-breakpoint
ALTER TABLE "external_auth_clients" DROP CONSTRAINT "ext_auth_clients_created_by_fkey";
--> statement-breakpoint
ALTER TABLE "external_auth_clients" ADD CONSTRAINT "external_auth_clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;