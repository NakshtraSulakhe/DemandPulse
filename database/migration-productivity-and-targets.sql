-- ==============================================================================
-- DEMANDPULSE PRODUCTIVITY, TARGET MANAGEMENT & INCENTIVE ENHANCEMENT
-- Backward-compatible, additive database migration
-- Target Database: MySQL 8.0+ / MariaDB 10.3+
-- Zero destructive operations (NO DROPs, NO TRUNCATEs, NO column deletions)
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. CAMPAIGN & ACTIVITY PRODUCTIVITY POINT CONFIGURATION TABLES
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `productivity_point_configs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `activity_type` VARCHAR(100) NOT NULL,
  `display_name` VARCHAR(150) NOT NULL,
  `department` VARCHAR(20) NOT NULL DEFAULT 'ALL',
  `points_factor` DECIMAL(8, 3) NOT NULL DEFAULT 1.000,
  `description` VARCHAR(255) NULL,
  `effective_from` DATE NOT NULL,
  `effective_to` DATE NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `version` INT NOT NULL DEFAULT 1,
  `updated_by` VARCHAR(150) NOT NULL DEFAULT 'System Initialization',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uniq_activity_dept_version` (`activity_type`, `department`, `version`),
  KEY `idx_activity_active_dates` (`department`, `is_active`, `effective_from`, `effective_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Authoritative Reference Points (DemandFlow Bridge defaults)
INSERT INTO `productivity_point_configs` 
  (`activity_type`, `display_name`, `department`, `points_factor`, `description`, `effective_from`, `is_active`, `version`, `updated_by`)
VALUES
  ('email_marketing', 'Email Marketing', 'ALL', 0.250, 'Standard email marketing lead qualification: 0.25 points per lead', '2026-01-01', 1, 1, 'System Seed'),
  ('mql', 'MQL', 'ALL', 1.000, 'Marketing Qualified Lead: 1.0 point per lead', '2026-01-01', 1, 1, 'System Seed'),
  ('hql_callback', 'HQL / Callback', 'ALL', 2.000, 'High Quality Lead / Verified Callback: 2.0 points per lead', '2026-01-01', 1, 1, 'System Seed'),
  ('bant', 'BANT', 'ALL', 3.000, 'Budget, Authority, Need, Timeline Qualified Lead: 3.0 points per lead', '2026-01-01', 1, 1, 'System Seed'),
  ('appointment_generation', 'Appointment Generation', 'ALL', 5.000, 'Confirmed Client Appointment Generated: 5.0 points per lead', '2026-01-01', 1, 1, 'System Seed')
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `description` = VALUES(`description`);

-- Audit Log for Productivity Points Changes
CREATE TABLE IF NOT EXISTS `productivity_point_audit` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `config_id` BIGINT NULL,
  `activity_type` VARCHAR(100) NOT NULL,
  `department` VARCHAR(20) NOT NULL DEFAULT 'ALL',
  `previous_points` DECIMAL(8, 3) NULL,
  `new_points` DECIMAL(8, 3) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `performed_by` VARCHAR(150) NOT NULL,
  `remarks` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY `idx_ppa_activity` (`activity_type`, `department`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------------------------
-- 2. EMPLOYEE TARGET ASSIGNMENT TABLES (AGENT & QA)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `employee_target_assignments` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` BIGINT NOT NULL,
  `employee_name` VARCHAR(150) NOT NULL,
  `employee_role` ENUM('Agent', 'QA') NOT NULL,
  `target_month` INT NOT NULL,
  `target_year` INT NOT NULL,
  `working_days` INT NOT NULL DEFAULT 22,
  `daily_target` DECIMAL(10, 2) NOT NULL,
  `calculated_monthly_target` DECIMAL(12, 2) NOT NULL,
  `adjusted_monthly_target` DECIMAL(12, 2) NULL,
  `adjustment_reason` TEXT NULL,
  `is_manually_adjusted` TINYINT(1) NOT NULL DEFAULT 0,
  `quality_threshold_pct` DECIMAL(5, 2) NULL DEFAULT 95.00,
  `effective_date` DATE NOT NULL,
  `status` ENUM('active', 'inactive', 'archived') NOT NULL DEFAULT 'active',
  `remarks` TEXT NULL,
  `assigned_by` VARCHAR(150) NOT NULL DEFAULT 'Admin',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uniq_emp_role_month_year` (`employee_id`, `employee_role`, `target_month`, `target_year`),
  KEY `idx_target_lookup` (`employee_role`, `target_year`, `target_month`, `status`),
  KEY `idx_target_emp_date` (`employee_id`, `effective_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Target Assignment Change & Override Audit Trail
CREATE TABLE IF NOT EXISTS `employee_target_audit` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `assignment_id` BIGINT NULL,
  `employee_id` BIGINT NOT NULL,
  `employee_name` VARCHAR(150) NOT NULL,
  `employee_role` VARCHAR(20) NOT NULL,
  `target_month` INT NOT NULL,
  `target_year` INT NOT NULL,
  `previous_daily_target` DECIMAL(10, 2) NULL,
  `new_daily_target` DECIMAL(10, 2) NOT NULL,
  `previous_monthly_target` DECIMAL(12, 2) NULL,
  `new_monthly_target` DECIMAL(12, 2) NOT NULL,
  `working_days` INT NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `adjustment_reason` TEXT NULL,
  `performed_by` VARCHAR(150) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY `idx_target_audit_emp` (`employee_id`, `target_year`, `target_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------------------------
-- 3. AGENT MONTHLY INCENTIVE PLANS & SETTLEMENTS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `agent_monthly_incentive_plans` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `plan_name` VARCHAR(150) NOT NULL,
  `slabs_json` JSON NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `effective_from` DATE NOT NULL,
  `effective_to` DATE NULL,
  `version` INT NOT NULL DEFAULT 1,
  `created_by` VARCHAR(150) NOT NULL DEFAULT 'Admin',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  KEY `idx_monthly_plan_active` (`is_active`, `effective_from`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Authoritative Reference Monthly Incentive Plan
INSERT INTO `agent_monthly_incentive_plans` 
  (`id`, `plan_name`, `slabs_json`, `currency`, `is_active`, `effective_from`, `version`, `created_by`)
VALUES
  (1, 'Standard Monthly Agent Productivity Incentive Plan',
   JSON_ARRAY(
     JSON_OBJECT('minPct', 90, 'amount', 3000, 'label', '90% Target Achieved (₹3,000)'),
     JSON_OBJECT('minPct', 95, 'amount', 5000, 'label', '95% Target Achieved (₹5,000)'),
     JSON_OBJECT('minPct', 100, 'amount', 15000, 'label', '100% Target Base (₹15,000)'),
     JSON_OBJECT('minPct', 125, 'amount', 20000, 'label', '125% Accelerator (₹20,000)'),
     JSON_OBJECT('minPct', 150, 'amount', 30000, 'label', '150% Accelerator (₹30,000)'),
     JSON_OBJECT('minPct', 175, 'amount', 40000, 'label', '175% Accelerator (₹40,000)'),
     JSON_OBJECT('minPct', 200, 'amount', 50000, 'label', '200% Accelerator (₹50,000)'),
     JSON_OBJECT('minPct', 225, 'amount', 60000, 'label', '225% Accelerator (₹60,000)'),
     JSON_OBJECT('minPct', 250, 'amount', 70000, 'label', '250% Accelerator (₹70,000)'),
     JSON_OBJECT('minPct', 275, 'amount', 80000, 'label', '275% Accelerator (₹80,000)'),
     JSON_OBJECT('minPct', 300, 'amount', 100000, 'label', '300% Super-Achiever (₹1,00,000)')
   ),
   'INR', 1, '2026-01-01', 1, 'System Seed'
  )
ON DUPLICATE KEY UPDATE
  `plan_name` = VALUES(`plan_name`),
  `slabs_json` = VALUES(`slabs_json`);

-- Monthly Finalized Settlement Ledger for Agents
CREATE TABLE IF NOT EXISTS `agent_monthly_settlements` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` BIGINT NOT NULL,
  `employee_name` VARCHAR(150) NOT NULL,
  `settlement_month` INT NOT NULL,
  `settlement_year` INT NOT NULL,
  `assigned_monthly_target` DECIMAL(12, 2) NOT NULL,
  `achieved_monthly_points` DECIMAL(12, 2) NOT NULL,
  `achievement_pct` DECIMAL(8, 3) NOT NULL,
  `qualifying_threshold_pct` DECIMAL(8, 3) NULL,
  `incentive_earned` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `working_days_present` INT NOT NULL DEFAULT 0,
  `working_days_assigned` INT NOT NULL DEFAULT 22,
  `eligibility_status` VARCHAR(30) NOT NULL DEFAULT 'eligible',
  `eligibility_reason` VARCHAR(255) NULL,
  `approval_status` ENUM('provisional', 'pending_approval', 'approved', 'rejected') NOT NULL DEFAULT 'provisional',
  `payment_status` ENUM('unpaid', 'processing', 'paid', 'failed') NOT NULL DEFAULT 'unpaid',
  `approved_by` VARCHAR(150) NULL,
  `approved_at` DATETIME(6) NULL,
  `remarks` TEXT NULL,
  `plan_version_reference` INT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uniq_monthly_settlement_emp` (`employee_id`, `settlement_month`, `settlement_year`),
  KEY `idx_monthly_settle_period` (`settlement_year`, `settlement_month`, `approval_status`, `payment_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

