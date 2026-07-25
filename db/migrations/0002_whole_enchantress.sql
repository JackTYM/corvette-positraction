CREATE TABLE "item_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text DEFAULT auth.user_id() NOT NULL,
	"item_id" uuid NOT NULL,
	"key" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "item_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "item_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text DEFAULT auth.user_id() NOT NULL,
	"item_id" uuid NOT NULL,
	"linked_item_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_links_pair_unique" UNIQUE("item_id","linked_item_id"),
	CONSTRAINT "item_links_no_self_link" CHECK ("item_links"."item_id" <> "item_links"."linked_item_id")
);
--> statement-breakpoint
ALTER TABLE "item_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "value_as_of" date;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "value_source" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "production_date" date;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "rarity" smallint;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "attributes" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "item_documents" ADD CONSTRAINT "item_documents_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_links" ADD CONSTRAINT "item_links_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_links" ADD CONSTRAINT "item_links_linked_item_id_items_id_fk" FOREIGN KEY ("linked_item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_documents_item_id_idx" ON "item_documents" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "item_links_item_id_idx" ON "item_links" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "item_links_linked_item_id_idx" ON "item_links" USING btree ("linked_item_id");--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_rarity_range" CHECK ("items"."rarity" is null or ("items"."rarity" >= 1 and "items"."rarity" <= 3));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "item_documents" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "item_documents"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "item_documents" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "item_documents"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "item_documents" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "item_documents"."user_id")) WITH CHECK ((select auth.user_id() = "item_documents"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "item_documents" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "item_documents"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "item_links" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "item_links"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "item_links" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "item_links"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "item_links" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "item_links"."user_id")) WITH CHECK ((select auth.user_id() = "item_links"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "item_links" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "item_links"."user_id"));