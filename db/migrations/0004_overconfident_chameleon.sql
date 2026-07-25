CREATE TABLE "diecast_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manufacturer" text NOT NULL,
	"name" text NOT NULL,
	"source_url" text NOT NULL,
	"cover_image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "diecast_models_source_url_unique" UNIQUE("source_url")
);
--> statement-breakpoint
ALTER TABLE "diecast_models" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "diecast_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"caption" text,
	"image_url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diecast_variants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "diecast_variants" ADD CONSTRAINT "diecast_variants_model_id_diecast_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."diecast_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diecast_variants_model_id_idx" ON "diecast_variants" USING btree ("model_id");--> statement-breakpoint
CREATE POLICY "diecast_models_select_authenticated" ON "diecast_models" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "diecast_variants_select_authenticated" ON "diecast_variants" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);