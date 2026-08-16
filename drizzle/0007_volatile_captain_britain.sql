CREATE TABLE "container_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"container_registry_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'operator' NOT NULL,
	"assigned_by" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "container_assignments_container_registry_id_user_id_unique" UNIQUE("container_registry_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "container_assignments" ADD CONSTRAINT "container_assignments_container_registry_id_container_registry_id_fk" FOREIGN KEY ("container_registry_id") REFERENCES "public"."container_registry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "container_assignments" ADD CONSTRAINT "container_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "container_assignments" ADD CONSTRAINT "container_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;