-- ==============================================================================
-- DEMANDPULSE LIVE ANALYTICS & INCENTIVES
-- Comprehensive Database Schema: Authentication, Roles, Agent & QA Incentives
-- Database: u449458970_demandpulse (MySQL 8.0+ / MariaDB 10.3+)
-- Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. AUTHENTICATION, USERS & ROLE-BASED ACCESS CONTROL (RBAC)
-- ------------------------------------------------------------------------------

-- Master App Users Table (Supports Admin and Operations roles)
CREATE TABLE IF NOT EXISTS `slide_app_users` (
  `id` VARCHAR(80) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `username` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `display_name` VARCHAR(150) NOT NULL,
  `role` ENUM('admin', 'operations') NOT NULL DEFAULT 'operations',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_app_user_email` (`email`),
  UNIQUE KEY `uniq_app_user_username` (`username`),
  KEY `idx_app_user_role_status` (`role`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Role Definition Catalog
CREATE TABLE IF NOT EXISTS `slide_roles` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `role_key` VARCHAR(60) NOT NULL,
  `role_name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uniq_role_key` (`role_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User to Role Mapping
CREATE TABLE IF NOT EXISTS `slide_user_roles` (
  `user_id` VARCHAR(80) NOT NULL,
  `role_id` BIGINT NOT NULL,
  `assigned_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`user_id`, `role_id`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `slide_app_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `slide_roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Active Login Sessions & Token Revocation Table
CREATE TABLE IF NOT EXISTS `slide_user_sessions` (
  `session_id` VARCHAR(128) NOT NULL,
  `user_id` VARCHAR(80) NOT NULL,
  `session_token_hash` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_activity_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`session_id`),
  KEY `idx_sessions_user_id` (`user_id`),
  KEY `idx_sessions_expires_at` (`expires_at`),
  CONSTRAINT `fk_user_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `slide_app_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Security & Administrative Action Audit Logs
CREATE TABLE IF NOT EXISTS `slide_audit_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `actor_id` VARCHAR(80) NULL,
  `action` VARCHAR(100) NOT NULL,
  `resource_type` VARCHAR(80) NOT NULL,
  `resource_id` VARCHAR(100) NULL,
  `details_json` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY `idx_audit_resource` (`resource_type`, `resource_id`),
  KEY `idx_audit_actor` (`actor_id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------------------------
-- 2. AGENT INCENTIVES MODULE (POLICIES, RULES, SLABS & SETTLEMENTS)
-- ------------------------------------------------------------------------------

-- Master Incentive Policies (Versioned policies for agents)
CREATE TABLE IF NOT EXISTS `incentive_policies` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `policy_code` VARCHAR(80) NOT NULL,
  `version` INT NOT NULL DEFAULT 1,
  `policy_name` VARCHAR(150) NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
  `status` ENUM('draft', 'submitted', 'approved', 'active', 'archived') NOT NULL DEFAULT 'draft',
  `valid_from` DATE NOT NULL,
  `valid_to` DATE NULL,
  `created_by` BIGINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uniq_policy_code_version` (`policy_code`, `version`),
  KEY `idx_policy_status_dates` (`status`, `valid_from`, `valid_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Policy Execution Rules (Thresholds, penalties, caps)
CREATE TABLE IF NOT EXISTS `incentive_policy_rules` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `policy_id` BIGINT NOT NULL,
  `minimum_target_pct` DECIMAL(6, 2) NOT NULL DEFAULT 100.00,
  `base_incentive_amount` DECIMAL(12, 2) NOT NULL DEFAULT 500.00,
  `attendance_required` TINYINT(1) NOT NULL DEFAULT 1,
  `qa_escalation_action` VARCHAR(30) NOT NULL DEFAULT 'disqualify',
  `penalty_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `maximum_daily_incentive` DECIMAL(12, 2) NULL DEFAULT 5000.00,
  `rounding_mode` VARCHAR(20) NOT NULL DEFAULT 'floor',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uniq_policy_rules` (`policy_id`),
  CONSTRAINT `fk_policy_rules_policy` FOREIGN KEY (`policy_id`) REFERENCES `incentive_policies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Policy Volume Accelerators / Tier Slabs
CREATE TABLE IF NOT EXISTS `incentive_policy_slabs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `policy_id` BIGINT NOT NULL,
  `slab_order` INT NOT NULL,
  `minimum_completion_pct` DECIMAL(6, 2) NOT NULL,
  `maximum_completion_pct` DECIMAL(6, 2) NULL,
  `amount_per_extra_point` DECIMAL(12, 2) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  KEY `idx_slabs_policy_order` (`policy_id`, `slab_order`),
  CONSTRAINT `fk_policy_slabs_policy` FOREIGN KEY (`policy_id`) REFERENCES `incentive_policies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Policy Target Assignments (Campaign, Team, or Agent scope)
CREATE TABLE IF NOT EXISTS `incentive_policy_assignments` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `policy_id` BIGINT NOT NULL,
  `scope_type` ENUM('global', 'campaign', 'team', 'agent') NOT NULL,
  `scope_crm_id` BIGINT NULL,
  `priority` INT NOT NULL DEFAULT 0,
  `valid_from` DATE NOT NULL,
  `valid_to` DATE NULL,
  `assigned_by` BIGINT NOT NULL DEFAULT 1,
  `assigned_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY `idx_assignments_lookup` (`scope_type`, `scope_crm_id`, `priority`),
  CONSTRAINT `fk_policy_assign_policy` FOREIGN KEY (`policy_id`) REFERENCES `incentive_policies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Policy Audit Approval Workflow Log
CREATE TABLE IF NOT EXISTS `incentive_policy_approvals` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `policy_id` BIGINT NOT NULL,
  `action` ENUM('submitted', 'approved', 'rejected', 'reopened') NOT NULL,
  `reviewed_by` BIGINT NOT NULL,
  `comments` TEXT NULL,
  `reviewed_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY `idx_policy_approvals_history` (`policy_id`, `reviewed_at`),
  CONSTRAINT `fk_policy_approval_policy` FOREIGN KEY (`policy_id`) REFERENCES `incentive_policies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Incentive Daily Snapshots (Reporting cache synchronized with CRM payout engine)
CREATE TABLE IF NOT EXISTS `incentive_daily_snapshots` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `crm_payout_id` BIGINT NULL,
  `crm_agent_id` BIGINT NOT NULL,
  `agent_name_snapshot` VARCHAR(150) NULL,
  `work_date` DATE NOT NULL,
  `target_points` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `achieved_points` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `qualified_leads` INT NOT NULL DEFAULT 0,
  `base_incentive` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `slab_incentive` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total_incentive` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `eligibility_status` VARCHAR(50) NOT NULL DEFAULT 'ineligible',
  `approval_status` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `payment_status` VARCHAR(50) NOT NULL DEFAULT 'unpaid',
  `policy_version_reference` INT NULL,
  `crm_payment_reference` VARCHAR(150) NULL,
  `source_updated_at` DATETIME(6) NULL,
  `synced_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `snapshot_version` INT NOT NULL DEFAULT 1,
  `is_final` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uniq_incentive_agent_date` (`crm_agent_id`, `work_date`),
  KEY `idx_snapshot_date_status` (`work_date`, `eligibility_status`, `payment_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Daily Finalized Incentive Payout Ledger
CREATE TABLE IF NOT EXISTS `daily_incentive_payouts` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `crm_agent_id` BIGINT NOT NULL,
  `agent_name` VARCHAR(150) NOT NULL,
  `payout_date` DATE NOT NULL,
  `target_points` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `achieved_points` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `qualified_leads` INT NOT NULL DEFAULT 0,
  `base_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `slab_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total_payout` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('calculated', 'pending_approval', 'approved', 'paid', 'rejected') NOT NULL DEFAULT 'calculated',
  `approved_by` VARCHAR(100) NULL,
  `approved_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_payout_agent_date` (`crm_agent_id`, `payout_date`),
  KEY `idx_payout_date_status` (`payout_date`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Settlement Batch Runs
CREATE TABLE IF NOT EXISTS `incentive_settlement_runs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `business_date` DATE NOT NULL,
  `status` ENUM('preview', 'submitted', 'manager_approved', 'finance_approved', 'paid', 'cancelled') NOT NULL DEFAULT 'preview',
  `total_eligible_agents` INT NOT NULL DEFAULT 0,
  `total_incentive_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `settled_by` BIGINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  KEY `idx_settlement_date` (`business_date`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------------------------
-- 3. QA INCENTIVES MODULE (PLANS, TIER SLABS & AUDIT SNAPSHOTS)
-- ------------------------------------------------------------------------------

-- Master QA Incentive Plans (Database Plan CRUD for /api/v1/qa-incentives/plans.php)
CREATE TABLE IF NOT EXISTS `qa_incentive_plans` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `plan_name` VARCHAR(150) NOT NULL,
  `qa_agent_id` BIGINT NULL,
  `qa_agent_name` VARCHAR(150) NOT NULL DEFAULT 'All QA Members',
  `client_code` VARCHAR(80) NOT NULL DEFAULT 'ALL',
  `campaign_id` BIGINT NULL,
  `campaign_name` VARCHAR(150) NOT NULL DEFAULT 'All Campaigns',
  `frequency` ENUM('DAILY', 'MONTHLY') NOT NULL DEFAULT 'DAILY',
  `base_target_leads` INT NOT NULL DEFAULT 50,
  `base_incentive_amount` DECIMAL(12, 2) NOT NULL DEFAULT 500.00,
  `tiers_json` JSON NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `notes` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  KEY `idx_qa_plans_active_freq` (`is_active`, `frequency`),
  KEY `idx_qa_plans_scope` (`client_code`, `campaign_id`, `qa_agent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Daily QA Audits & Evaluation Snapshots
CREATE TABLE IF NOT EXISTS `qa_daily_snapshots` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `crm_qa_agent_id` BIGINT NOT NULL,
  `qa_agent_name_snapshot` VARCHAR(150) NULL,
  `work_date` DATE NOT NULL,
  `total_audits` INT NOT NULL DEFAULT 0,
  `unique_leads_audited` INT NOT NULL DEFAULT 0,
  `qualified_leads` INT NOT NULL DEFAULT 0,
  `disqualified_leads` INT NOT NULL DEFAULT 0,
  `qualification_rate_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `base_target` INT NOT NULL DEFAULT 50,
  `base_incentive_earned` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `tier_bonus_earned` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total_incentive_earned` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `is_target_achieved` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uniq_qa_snapshot_agent_date` (`crm_qa_agent_id`, `work_date`),
  KEY `idx_qa_snapshots_date` (`work_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;


-- ==============================================================================
-- 4. SERVER INITIALIZATION & SECURE CREDENTIAL MANAGEMENT
-- NOTE: Passwords use standard deterministic salted SHA-256 matching the application:
--       SHA2(CONCAT('df_salt_2026_pulse:', '<YOUR_NEW_PASSWORD>'), 256)
-- ==============================================================================

-- A. Insert Default System Roles
INSERT INTO `slide_roles` (`id`, `role_key`, `role_name`, `description`)
VALUES 
  (1, 'admin', 'Administrator', 'Full system access, console governance, CRM sync, and user management'),
  (2, 'operations', 'Operations', 'Restricted access: Campaign targets, target history, shift management & display settings')
ON DUPLICATE KEY UPDATE 
  `role_name` = VALUES(`role_name`),
  `description` = VALUES(`description`);

-- B. Default Starter QA Incentive Plan (50 Base + Tier 1 & Tier 2 Accelerators)
INSERT INTO `qa_incentive_plans` (
  `id`, `plan_name`, `qa_agent_id`, `qa_agent_name`, `client_code`, `campaign_id`, 
  `campaign_name`, `frequency`, `base_target_leads`, `base_incentive_amount`, 
  `tiers_json`, `is_active`, `notes`, `created_at`, `updated_at`
) VALUES (
  1,
  'Standard QA Lead Audit Daily Incentive (50 Base + Tier 1 & 2 Accelerators)',
  NULL,
  'All QA Members',
  'ALL',
  NULL,
  'All Campaigns',
  'DAILY',
  50,
  500.00,
  JSON_ARRAY(
    JSON_OBJECT('tier_order', 1, 'tier_name', 'Tier 1 (+10 Leads Beyond Base)', 'extra_leads', 10, 'rate_per_lead', 15.00),
    JSON_OBJECT('tier_order', 2, 'tier_name', 'Tier 2 (+10 Leads Beyond Tier 1)', 'extra_leads', 10, 'rate_per_lead', 20.00)
  ),
  1,
  'Evaluates daily QA audit achievements: 50 base leads = ₹500, +10 leads @ ₹15, +10 leads @ ₹20.',
  NOW(6),
  NOW(6)
)
ON DUPLICATE KEY UPDATE
  `plan_name` = VALUES(`plan_name`),
  `base_target_leads` = VALUES(`base_target_leads`),
  `base_incentive_amount` = VALUES(`base_incentive_amount`),
  `tiers_json` = VALUES(`tiers_json`),
  `is_active` = VALUES(`is_active`);

