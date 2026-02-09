CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"rc_app_user_id" text NOT NULL,
	"is_pro" boolean DEFAULT false NOT NULL,
	"entitlement_active" boolean DEFAULT false NOT NULL,
	"expiration_at" timestamp with time zone,
	"product_id" text,
	"store" text,
	"last_synced_at" timestamp with time zone DEFAULT now(),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_pro" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_rc_app_user_idx" ON "subscriptions" USING btree ("rc_app_user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_expiration_idx" ON "subscriptions" USING btree ("expiration_at");