CREATE TABLE "stack_container_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stack_id" uuid NOT NULL,
	"container_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stack_container_assignments_stack_id_container_id_unique" UNIQUE("stack_id","container_id")
);
--> statement-breakpoint
ALTER TABLE "stack_registry" ADD COLUMN "type" varchar(20) DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "stack_registry" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "stack_registry" ADD COLUMN "color" varchar(7);--> statement-breakpoint
ALTER TABLE "stack_container_assignments" ADD CONSTRAINT "stack_container_assignments_stack_id_stack_registry_id_fk" FOREIGN KEY ("stack_id") REFERENCES "public"."stack_registry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stack_container_assignments" ADD CONSTRAINT "stack_container_assignments_container_id_container_registry_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."container_registry"("id") ON DELETE cascade ON UPDATE no action;