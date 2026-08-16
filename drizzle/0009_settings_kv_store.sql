CREATE TABLE "settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"category" varchar(50) DEFAULT 'general' NOT NULL,
	"is_secret" boolean DEFAULT false NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Seed default agent settings
INSERT INTO "settings" ("key", "value", "category", "is_secret") VALUES
  ('llm_api_key', '', 'agent', true),
  ('llm_model', 'gpt-4o', 'agent', false),
  ('llm_base_url', '', 'agent', false),
  ('agent_token_budget', '50000', 'agent', false),
  ('agent_tool_limit', '50', 'agent', false)
ON CONFLICT ("key") DO NOTHING;
