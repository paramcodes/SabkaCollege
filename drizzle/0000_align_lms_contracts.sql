CREATE TYPE "public"."course_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."lesson_video_provider" AS ENUM('youtube', 'vimeo', 'mux', 'cloudflare_stream', 'external');--> statement-breakpoint
CREATE TYPE "public"."completion_method" AS ENUM('automatic', 'manual');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('pending', 'paid', 'refunded', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'admin');--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"short_description" text,
	"description" text NOT NULL,
	"cover_image_url" text,
	"status" "course_status" DEFAULT 'draft' NOT NULL,
	"price_amount" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"clerk_product_id" text,
	"clerk_price_id" text,
	"estimated_duration_minutes" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_price_amount_nonnegative" CHECK ("courses"."price_amount" >= 0),
	CONSTRAINT "courses_estimated_duration_minutes_nonnegative" CHECK ("courses"."estimated_duration_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"position" integer NOT NULL,
	"video_provider" "lesson_video_provider" NOT NULL,
	"video_reference" text,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"is_preview" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_position_nonnegative" CHECK ("lessons"."position" >= 0),
	CONSTRAINT "lessons_duration_seconds_nonnegative" CHECK ("lessons"."duration_seconds" >= 0)
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modules_position_nonnegative" CHECK ("modules"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"lesson_id" uuid NOT NULL,
	"last_position_seconds" integer DEFAULT 0 NOT NULL,
	"max_watched_percentage" real DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"completion_method" "completion_method",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_last_position_seconds_nonnegative" CHECK ("lesson_progress"."last_position_seconds" >= 0),
	CONSTRAINT "lesson_progress_max_watched_percentage_range" CHECK ("lesson_progress"."max_watched_percentage" >= 0 AND "lesson_progress"."max_watched_percentage" <= 1)
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_purchase_id" text NOT NULL,
	"user_id" text NOT NULL,
	"course_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" "purchase_status" DEFAULT 'pending' NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_amount_nonnegative" CHECK ("purchases"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "courses_slug_uidx" ON "courses" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "courses_status_idx" ON "courses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "courses_clerk_price_id_idx" ON "courses" USING btree ("clerk_price_id");--> statement-breakpoint
CREATE INDEX "lessons_module_id_idx" ON "lessons" USING btree ("module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_slug_uidx" ON "lessons" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_module_position_uidx" ON "lessons" USING btree ("module_id","position");--> statement-breakpoint
CREATE INDEX "modules_course_id_idx" ON "modules" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "modules_course_position_uidx" ON "modules" USING btree ("course_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_progress_user_lesson_uidx" ON "lesson_progress" USING btree ("user_id","lesson_id");--> statement-breakpoint
CREATE INDEX "lesson_progress_user_id_idx" ON "lesson_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lesson_progress_lesson_id_idx" ON "lesson_progress" USING btree ("lesson_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_clerk_purchase_id_uidx" ON "purchases" USING btree ("clerk_purchase_id");--> statement-breakpoint
CREATE INDEX "purchases_user_id_idx" ON "purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "purchases_course_id_idx" ON "purchases" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");