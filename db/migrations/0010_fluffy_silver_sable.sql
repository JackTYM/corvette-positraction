CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY DEFAULT auth.user_id() NOT NULL,
	"share_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "item_documents_select_shared" ON "item_documents" AS PERMISSIVE FOR SELECT TO "anonymous" USING (exists (select 1 from "user_settings" where "user_settings"."user_id" = "item_documents"."user_id" and "user_settings"."share_enabled" = true));--> statement-breakpoint
CREATE POLICY "item_links_select_shared" ON "item_links" AS PERMISSIVE FOR SELECT TO "anonymous" USING (exists (select 1 from "user_settings" where "user_settings"."user_id" = "item_links"."user_id" and "user_settings"."share_enabled" = true));--> statement-breakpoint
CREATE POLICY "items_select_shared" ON "items" AS PERMISSIVE FOR SELECT TO "anonymous" USING (exists (select 1 from "user_settings" where "user_settings"."user_id" = "items"."user_id" and "user_settings"."share_enabled" = true));--> statement-breakpoint
CREATE POLICY "wishlist_items_select_shared" ON "wishlist_items" AS PERMISSIVE FOR SELECT TO "anonymous" USING (exists (select 1 from "user_settings" where "user_settings"."user_id" = "wishlist_items"."user_id" and "user_settings"."share_enabled" = true));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "user_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "user_settings"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "user_settings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "user_settings"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "user_settings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "user_settings"."user_id")) WITH CHECK ((select auth.user_id() = "user_settings"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "user_settings" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "user_settings"."user_id"));