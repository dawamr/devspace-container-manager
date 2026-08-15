ALTER TABLE "container_registry" ADD COLUMN "status" varchar(255);--> statement-breakpoint
ALTER TABLE "container_registry" ADD COLUMN "health" varchar(20) DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "container_registry" ADD COLUMN "ports" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "container_registry" ADD COLUMN "docker_created_at" timestamp with time zone;