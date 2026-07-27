-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE', 'APPLE');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PermissionStatus" AS ENUM ('UNKNOWN', 'GRANTED', 'DENIED', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SubscriptionProvider" AS ENUM ('STRIPE', 'APPLE_IAP', 'GOOGLE_PLAY');

-- CreateEnum
CREATE TYPE "ChargeType" AS ENUM ('SUBSCRIPTION', 'CHALLENGE_SKIP');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "AlarmStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DELETED');

-- CreateEnum
CREATE TYPE "ChallengeDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "ValidationType" AS ENUM ('ON_DEVICE', 'CLOUD_VISION', 'CUSTOM_MODEL');

-- CreateEnum
CREATE TYPE "ItemSource" AS ENUM ('CATALOG', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'FORCE_CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TERMS_OF_USE', 'PRIVACY_POLICY', 'CAMERA', 'LOCATION', 'WEATHER', 'MARKETING');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "auth_provider" "AuthProvider" NOT NULL DEFAULT 'EMAIL',
    "password_hash" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en-US',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "country" TEXT,
    "city" TEXT,
    "state" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "enable_location_share" BOOLEAN NOT NULL DEFAULT false,
    "enable_weather_share" BOOLEAN NOT NULL DEFAULT false,
    "enable_time_share" BOOLEAN NOT NULL DEFAULT true,
    "enable_watermark" BOOLEAN NOT NULL DEFAULT true,
    "default_language" TEXT NOT NULL DEFAULT 'en-US',
    "theme" "Theme" NOT NULL DEFAULT 'SYSTEM',
    "alarm_volume" INTEGER NOT NULL DEFAULT 80,
    "vibration_enabled" BOOLEAN NOT NULL DEFAULT true,
    "camera_permission_status" "PermissionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "notification_permission_status" "PermissionStatus" NOT NULL DEFAULT 'UNKNOWN',

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_code" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "price_monthly" DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "trial_start_at" TIMESTAMP(3),
    "trial_end_at" TIMESTAMP(3),
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "provider" "SubscriptionProvider" NOT NULL,
    "provider_subscription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "exp_month" INTEGER NOT NULL,
    "exp_year" INTEGER NOT NULL,
    "token_ref" TEXT NOT NULL,
    "billing_country" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "charge_type" "ChargeType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "ChargeStatus" NOT NULL DEFAULT 'PENDING',
    "provider_payment_id" TEXT,
    "due_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alarms" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "repeat_pattern" TEXT,
    "timezone" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "status" "AlarmStatus" NOT NULL DEFAULT 'ACTIVE',
    "sound_id" TEXT NOT NULL,
    "snooze_enabled" BOOLEAN NOT NULL DEFAULT true,
    "snooze_minutes" INTEGER NOT NULL DEFAULT 5,
    "challenge_mode" BOOLEAN NOT NULL DEFAULT true,
    "challenge_difficulty" "ChallengeDifficulty" NOT NULL DEFAULT 'EASY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alarms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alarm_challenges" (
    "id" TEXT NOT NULL,
    "alarm_id" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "item_label" TEXT NOT NULL,
    "item_source" "ItemSource" NOT NULL DEFAULT 'CATALOG',
    "validation_type" "ValidationType" NOT NULL DEFAULT 'ON_DEVICE',
    "skip_price" DECIMAL(10,2) NOT NULL DEFAULT 0.99,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "validation_timeout_seconds" INTEGER NOT NULL DEFAULT 60,
    "confidence_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alarm_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_attempts" (
    "id" TEXT NOT NULL,
    "alarm_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "skipped_at" TIMESTAMP(3),
    "force_closed_at" TIMESTAMP(3),
    "device_reboot_flag" BOOLEAN NOT NULL DEFAULT false,
    "validation_score" DOUBLE PRECISION,
    "metadata_json" JSONB,

    CONSTRAINT "challenge_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "xp_total" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "consecutive_completions" INTEGER NOT NULL DEFAULT 0,
    "total_completions" INTEGER NOT NULL DEFAULT 0,
    "total_skips" INTEGER NOT NULL DEFAULT 0,
    "free_skip_balance" INTEGER NOT NULL DEFAULT 0,
    "free_skip_expires_at" TIMESTAMP(3),
    "best_streak" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rankings" (
    "id" TEXT NOT NULL,
    "period_type" "PeriodType" NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "xp_score" INTEGER NOT NULL,
    "rank_position" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rankings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_share_posts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "alarm_id" TEXT,
    "template_code" TEXT NOT NULL,
    "include_weather" BOOLEAN NOT NULL DEFAULT false,
    "include_location" BOOLEAN NOT NULL DEFAULT false,
    "include_time" BOOLEAN NOT NULL DEFAULT true,
    "watermark_text" TEXT,
    "image_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_share_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "event_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "ip_address" TEXT,
    "device_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload_json" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "consent_type" "ConsentType" NOT NULL,
    "version" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "source" TEXT,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "payment_methods_user_id_idx" ON "payment_methods"("user_id");

-- CreateIndex
CREATE INDEX "charges_user_id_idx" ON "charges"("user_id");

-- CreateIndex
CREATE INDEX "alarms_user_id_idx" ON "alarms"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "alarm_challenges_alarm_id_key" ON "alarm_challenges"("alarm_id");

-- CreateIndex
CREATE INDEX "challenge_attempts_user_id_idx" ON "challenge_attempts"("user_id");

-- CreateIndex
CREATE INDEX "challenge_attempts_alarm_id_idx" ON "challenge_attempts"("alarm_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_progress_user_id_key" ON "user_progress"("user_id");

-- CreateIndex
CREATE INDEX "rankings_period_type_period_start_idx" ON "rankings"("period_type", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "rankings_period_type_period_start_user_id_key" ON "rankings"("period_type", "period_start", "user_id");

-- CreateIndex
CREATE INDEX "social_share_posts_user_id_idx" ON "social_share_posts"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "consents_user_id_idx" ON "consents"("user_id");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarms" ADD CONSTRAINT "alarms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarm_challenges" ADD CONSTRAINT "alarm_challenges_alarm_id_fkey" FOREIGN KEY ("alarm_id") REFERENCES "alarms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_attempts" ADD CONSTRAINT "challenge_attempts_alarm_id_fkey" FOREIGN KEY ("alarm_id") REFERENCES "alarms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_attempts" ADD CONSTRAINT "challenge_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_share_posts" ADD CONSTRAINT "social_share_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_share_posts" ADD CONSTRAINT "social_share_posts_alarm_id_fkey" FOREIGN KEY ("alarm_id") REFERENCES "alarms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
