CREATE TABLE "wishlist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text DEFAULT auth.user_id() NOT NULL,
	"title" text NOT NULL,
	"estimated_price" numeric(12, 2),
	"source_url" text,
	"notes" text,
	"img_key" text,
	"source_variant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wishlist_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "source_variant_id" uuid;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_source_variant_id_diecast_variants_id_fk" FOREIGN KEY ("source_variant_id") REFERENCES "public"."diecast_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wishlist_items_user_id_idx" ON "wishlist_items" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_source_variant_id_diecast_variants_id_fk" FOREIGN KEY ("source_variant_id") REFERENCES "public"."diecast_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "wishlist_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "wishlist_items"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "wishlist_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "wishlist_items"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "wishlist_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "wishlist_items"."user_id")) WITH CHECK ((select auth.user_id() = "wishlist_items"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "wishlist_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "wishlist_items"."user_id"));