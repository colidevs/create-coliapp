ALTER TABLE "products" ALTER COLUMN "is_active" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_published" boolean DEFAULT false NOT NULL;