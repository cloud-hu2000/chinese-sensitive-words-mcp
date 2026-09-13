CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE platform AS ENUM ('XIAOHONGSHU', 'DOUYIN');
CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE membership_plan AS ENUM ('FREE', 'PRO', 'TEAM');
CREATE TYPE membership_status AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT NOT NULL UNIQUE, display_name TEXT,
  password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan membership_plan NOT NULL DEFAULT 'FREE', status membership_status NOT NULL DEFAULT 'ACTIVE', monthly_quota INTEGER NOT NULL,
  period_ends_at TIMESTAMPTZ, provider TEXT, provider_subscription_id TEXT UNIQUE, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE audit_reports (
  id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, platform platform NOT NULL,
  title TEXT, body TEXT, score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100), overall_risk risk_level NOT NULL,
  recommendation TEXT NOT NULL, engine JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE audit_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), report_id UUID NOT NULL REFERENCES audit_reports(id) ON DELETE CASCADE,
  source TEXT NOT NULL, image_index SMALLINT, category TEXT NOT NULL, severity risk_level NOT NULL, evidence TEXT NOT NULL,
  reason TEXT NOT NULL, suggestion TEXT NOT NULL, bbox JSONB, rule_path JSONB
);
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), report_id UUID NOT NULL REFERENCES audit_reports(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE, original_name TEXT, mime_type TEXT NOT NULL, byte_size INTEGER NOT NULL, sha256 TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_id UUID REFERENCES audit_reports(id) ON DELETE SET NULL, unit_count INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_reports_user_created_idx ON audit_reports(user_id, created_at DESC);
CREATE INDEX usage_events_user_created_idx ON usage_events(user_id, created_at DESC);
