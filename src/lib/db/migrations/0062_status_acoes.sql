CREATE TABLE IF NOT EXISTS "status_acoes" (
  "id" serial PRIMARY KEY NOT NULL,
  "status_id" integer NOT NULL REFERENCES "status"("id") ON DELETE cascade,
  "acao" varchar(50) NOT NULL,
  "parametros" jsonb DEFAULT '{}'::jsonb,
  "ativo" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_status_acoes_status_id" ON "status_acoes" ("status_id");
