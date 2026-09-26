ALTER TABLE "walls" ADD COLUMN "kind" text DEFAULT 'garage' NOT NULL;--> statement-breakpoint
ALTER TABLE "walls" DROP CONSTRAINT "walls_pkey";--> statement-breakpoint
ALTER TABLE "walls" ADD CONSTRAINT "walls_user_id_kind_pk" PRIMARY KEY("user_id","kind");--> statement-breakpoint
ALTER TABLE "walls" ADD CONSTRAINT "walls_kind_valid" CHECK ("walls"."kind" in ('garage', 'showroom'));