CREATE DATABASE IF NOT EXISTS note_guard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE note_guard;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(320) NOT NULL UNIQUE,
  display_name VARCHAR(40) NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS memberships (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  plan ENUM('FREE', 'PRO', 'TEAM') NOT NULL DEFAULT 'FREE',
  status ENUM('ACTIVE', 'PAST_DUE', 'CANCELED') NOT NULL DEFAULT 'ACTIVE',
  monthly_quota INT NOT NULL,
  period_ends_at DATETIME(3) NULL,
  provider VARCHAR(32) NULL,
  provider_subscription_id VARCHAR(191) NULL UNIQUE,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT memberships_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_reports (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  platform ENUM('XIAOHONGSHU', 'DOUYIN') NOT NULL,
  title VARCHAR(120) NULL,
  body LONGTEXT NULL,
  score TINYINT UNSIGNED NOT NULL,
  overall_risk ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
  recommendation VARCHAR(80) NOT NULL,
  engine JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT audit_reports_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX audit_reports_user_created_idx (user_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_issues (
  id CHAR(36) PRIMARY KEY,
  report_id CHAR(36) NOT NULL,
  source VARCHAR(16) NOT NULL,
  image_index SMALLINT UNSIGNED NULL,
  category VARCHAR(100) NOT NULL,
  severity ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
  evidence VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  bbox JSON NULL,
  rule_path JSON NULL,
  CONSTRAINT audit_issues_report_fk FOREIGN KEY (report_id) REFERENCES audit_reports(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS assets (
  id CHAR(36) PRIMARY KEY,
  report_id CHAR(36) NOT NULL,
  storage_key VARCHAR(255) NOT NULL UNIQUE,
  original_name VARCHAR(255) NULL,
  mime_type VARCHAR(100) NOT NULL,
  byte_size INT UNSIGNED NOT NULL,
  sha256 CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT assets_report_fk FOREIGN KEY (report_id) REFERENCES audit_reports(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usage_events (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  report_id CHAR(36) NULL,
  unit_count INT NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT usage_events_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT usage_events_report_fk FOREIGN KEY (report_id) REFERENCES audit_reports(id) ON DELETE SET NULL,
  INDEX usage_events_user_created_idx (user_id, created_at)
) ENGINE=InnoDB;
