CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text DEFAULT auth.user_id() NOT NULL,
	"title" text NOT NULL,
	"sub" text,
	"category" text,
	"generation" text,
	"year" integer,
	"scale" text,
	"maker" text,
	"acquired" date,
	"price_paid" numeric(12, 2),
	"value" numeric(12, 2),
	"condition" text,
	"location" text,
	"story" text,
	"featured" boolean DEFAULT false NOT NULL,
	"color_name" text,
	"color_hex" text,
	"img_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "walls" (
	"user_id" text PRIMARY KEY DEFAULT auth.user_id() NOT NULL,
	"cases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"item_order" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "walls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "items_user_id_idx" ON "items" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "items" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "items"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "items"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "items"."user_id")) WITH CHECK ((select auth.user_id() = "items"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "items" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "items"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "walls" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "walls"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "walls" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "walls"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "walls" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "walls"."user_id")) WITH CHECK ((select auth.user_id() = "walls"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "walls" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "walls"."user_id"));