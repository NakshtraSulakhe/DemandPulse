-- =========================================================================
-- DemandFlow Slides - Additive Historical Analytics & Metric Tables Migration
-- Database: demandflow_slides
-- Index & constraint names strictly <= 64 characters (MySQL identifier limit)
-- =========================================================================

-- 1. Campaign Daily Snapshots
CREATE TABLE IF NOT EXISTS `campaign_daily_snapshots` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `crm_campaign_id` BIGINT NOT NULL,
  `crm_campaign_code` VARCHAR(50) DEFAULT NULL,
  `campaign_name_snapshot` VARCHAR(150) NOT NULL,
  `client_code_snapshot` VARCHAR(50) DEFAULT NULL,
  `campaign_type_snapshot` VARCHAR(50) DEFAULT 'General',
  `work_date` DATE NOT NULL,
  `monthly_allocation_snapshot` INT DEFAULT 0,
  `daily_target_leads` INT NOT NULL DEFAULT 0,
  `campaign_point_factor` DECIMAL(8, 3) NOT NULL DEFAULT 1.000,
  `daily_target_points` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
  `generated_leads` INT NOT NULL DEFAULT 0,
  `qualified_leads` INT NOT NULL DEFAULT 0,
  `disqualified_leads` INT NOT NULL DEFAULT 0,
  `pending_qa_leads` INT NOT NULL DEFAULT 0,
  `remaining_target_leads` INT NOT NULL DEFAULT 0,
  `completion_percentage` DECIMAL(8, 3) NOT NULL DEFAULT 0.000,
  `target_achieved` TINYINT(1) NOT NULL DEFAULT 0,
  `source_updated_at` DATETIME(6) DEFAULT NULL,
  `synced_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `snapshot_version` INT NOT NULL DEFAULT 1,
  `is_final` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_camp_snap_unique` (`crm_campaign_id`, `work_date`, `snapshot_version`),
  KEY `idx_camp_snap_date_target` (`work_date`, `target_achieved`),
  KEY `idx_camp_snap_client_date` (`client_code_snapshot`, `work_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Agent Daily Productivity Snapshots
CREATE TABLE IF NOT EXISTS `agent_daily_snapshots` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `crm_agent_id` BIGINT NOT NULL,
  `agent_name_snapshot` VARCHAR(150) NOT NULL,
  `work_date` DATE NOT NULL,
  `daily_target_points` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
  `achieved_points` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
  `qualified_leads` INT NOT NULL DEFAULT 0,
  `disqualified_leads` INT NOT NULL DEFAULT 0,
  `generated_leads` INT NOT NULL DEFAULT 0,
  `pending_qa_leads` INT NOT NULL DEFAULT 0,
  `remaining_target_points` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
  `target_completion_pct` DECIMAL(8, 3) NOT NULL DEFAULT 0.000,
  `attendance_status_snapshot` VARCHAR(50) NOT NULL DEFAULT 'Present',
  `effective_work_minutes` INT NOT NULL DEFAULT 465,
  `elapsed_work_minutes` INT NOT NULL DEFAULT 0,
  `expected_points_at_snapshot` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
  `productivity_pace_pct` DECIMAL(8, 3) DEFAULT NULL,
  `pace_status` VARCHAR(30) DEFAULT NULL,
  `source_updated_at` DATETIME(6) DEFAULT NULL,
  `synced_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `snapshot_version` INT NOT NULL DEFAULT 1,
  `is_final` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_agent_snap_unique` (`crm_agent_id`, `work_date`, `snapshot_version`),
  KEY `idx_agent_snap_date_comp` (`work_date`, `target_completion_pct`),
  KEY `idx_agent_snap_agent_date` (`crm_agent_id`, `work_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Floor Daily Snapshots
CREATE TABLE IF NOT EXISTS `floor_daily_snapshots` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `work_date` DATE NOT NULL,
  `total_agents` INT NOT NULL DEFAULT 0,
  `present_agents` INT NOT NULL DEFAULT 0,
  `absent_agents` INT NOT NULL DEFAULT 0,
  `late_agents` INT NOT NULL DEFAULT 0,
  `campaign_target_points` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
  `floor_capacity_points` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
  `capacity_gap_points` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
  `total_achieved_points` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
  `synced_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `snapshot_version` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_floor_snap_unique` (`work_date`, `snapshot_version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. QA Daily Snapshots
CREATE TABLE IF NOT EXISTS `qa_daily_snapshots` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `crm_qa_agent_id` BIGINT NOT NULL,
  `qa_agent_name_snapshot` VARCHAR(150) DEFAULT NULL,
  `work_date` DATE NOT NULL,
  `total_audits` INT NOT NULL DEFAULT 0,
  `unique_leads_audited` INT NOT NULL DEFAULT 0,
  `qualified_leads` INT NOT NULL DEFAULT 0,
  `disqualified_leads` INT NOT NULL DEFAULT 0,
  `rework_leads` INT NOT NULL DEFAULT 0,
  `other_qa_status_counts_json` JSON DEFAULT NULL,
  `synced_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `snapshot_version` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_qa_snap_unique` (`crm_qa_agent_id`, `work_date`, `snapshot_version`),
  KEY `idx_qa_snap_date` (`work_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. QA Interval Metrics (10-minute intervals across shift)
CREATE TABLE IF NOT EXISTS `qa_interval_metrics` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `crm_qa_agent_id` BIGINT NOT NULL,
  `qa_agent_name_snapshot` VARCHAR(150) DEFAULT NULL,
  `work_date` DATE NOT NULL,
  `interval_start_at` DATETIME(6) NOT NULL,
  `interval_end_at` DATETIME(6) NOT NULL,
  `audited_events` INT NOT NULL DEFAULT 0,
  `qualified_events` INT NOT NULL DEFAULT 0,
  `disqualified_events` INT NOT NULL DEFAULT 0,
  `unique_leads_qualified` INT NOT NULL DEFAULT 0,
  `synced_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_qa_interval_unique` (`crm_qa_agent_id`, `interval_start_at`),
  KEY `idx_qa_interval_date_start` (`work_date`, `interval_start_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Agent Interval Metrics (10-minute intervals across shift)
CREATE TABLE IF NOT EXISTS `agent_interval_metrics` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `crm_agent_id` BIGINT NOT NULL,
  `agent_name_snapshot` VARCHAR(150) DEFAULT NULL,
  `work_date` DATE NOT NULL,
  `interval_start_at` DATETIME(6) NOT NULL,
  `interval_end_at` DATETIME(6) NOT NULL,
  `generated_leads` INT NOT NULL DEFAULT 0,
  `synced_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_agent_interval_unique` (`crm_agent_id`, `interval_start_at`),
  KEY `idx_agent_interval_date_start` (`work_date`, `interval_start_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Attendance Daily Snapshots
CREATE TABLE IF NOT EXISTS `attendance_daily_snapshots` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `work_date` DATE NOT NULL,
  `total_agents` INT NOT NULL DEFAULT 0,
  `present_count` INT NOT NULL DEFAULT 0,
  `absent_count` INT NOT NULL DEFAULT 0,
  `late_count` INT NOT NULL DEFAULT 0,
  `leave_count` INT NOT NULL DEFAULT 0,
  `other_status_counts_json` JSON DEFAULT NULL,
  `synced_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `snapshot_version` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_att_snap_unique` (`work_date`, `snapshot_version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Agent Attendance Snapshots
CREATE TABLE IF NOT EXISTS `agent_attendance_snapshots` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `crm_agent_id` BIGINT NOT NULL,
  `agent_name_snapshot` VARCHAR(150) DEFAULT NULL,
  `work_date` DATE NOT NULL,
  `attendance_status` VARCHAR(50) NOT NULL,
  `punch_in_at` DATETIME(6) DEFAULT NULL,
  `punch_out_at` DATETIME(6) DEFAULT NULL,
  `late_minutes` INT NOT NULL DEFAULT 0,
  `effective_work_minutes` INT NOT NULL DEFAULT 465,
  `synced_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `snapshot_version` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_agent_att_unique` (`crm_agent_id`, `work_date`, `snapshot_version`),
  KEY `idx_agent_att_date_status` (`work_date`, `attendance_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Incentive Daily Snapshots
CREATE TABLE IF NOT EXISTS `incentive_daily_snapshots` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `crm_payout_id` BIGINT DEFAULT NULL,
  `crm_agent_id` BIGINT NOT NULL,
  `agent_name_snapshot` VARCHAR(150) DEFAULT NULL,
  `work_date` DATE NOT NULL,
  `target_points` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
  `achieved_points` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
  `qualified_leads` INT NOT NULL DEFAULT 0,
  `base_incentive` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `slab_incentive` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total_incentive` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `eligibility_status` VARCHAR(30) NOT NULL DEFAULT 'ineligible',
  `approval_status` VARCHAR(30) NOT NULL DEFAULT 'pending_approval',
  `payment_status` VARCHAR(30) NOT NULL DEFAULT 'unpaid',
  `policy_version_reference` INT DEFAULT NULL,
  `crm_payment_reference` VARCHAR(150) DEFAULT NULL,
  `source_updated_at` DATETIME(6) DEFAULT NULL,
  `synced_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `snapshot_version` INT NOT NULL DEFAULT 1,
  `is_final` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_inc_snap_unique` (`crm_agent_id`, `work_date`, `snapshot_version`),
  KEY `idx_inc_snap_date_status` (`work_date`, `payment_status`),
  KEY `idx_inc_snap_crm_payout` (`crm_payout_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Analytics Sync Runs
CREATE TABLE IF NOT EXISTS `analytics_sync_runs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `job_name` VARCHAR(100) NOT NULL,
  `work_date` DATE NOT NULL,
  `started_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `finished_at` DATETIME(6) DEFAULT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'running',
  `source_record_count` INT NOT NULL DEFAULT 0,
  `processed_record_count` INT NOT NULL DEFAULT 0,
  `failed_record_count` INT NOT NULL DEFAULT 0,
  `error_summary` TEXT DEFAULT NULL,
  `source_watermark` VARCHAR(150) DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_sync_runs_job_date` (`job_name`, `work_date`),
  KEY `idx_sync_runs_started` (`started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Analytics Daily Finalizations
CREATE TABLE IF NOT EXISTS `analytics_daily_finalizations` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `work_date` DATE NOT NULL,
  `finalization_status` VARCHAR(40) NOT NULL DEFAULT 'provisional',
  `finalized_at` DATETIME(6) DEFAULT NULL,
  `finalized_by` BIGINT DEFAULT NULL,
  `source_watermark` VARCHAR(150) DEFAULT NULL,
  `revision_number` INT NOT NULL DEFAULT 1,
  `last_reconciled_at` DATETIME(6) DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_finalizations_date_unique` (`work_date`),
  KEY `idx_finalizations_status_date` (`finalization_status`, `work_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Analytics Metric Definitions
CREATE TABLE IF NOT EXISTS `analytics_metric_definitions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `metric_key` VARCHAR(100) NOT NULL,
  `metric_version` INT NOT NULL DEFAULT 1,
  `display_name` VARCHAR(150) NOT NULL,
  `source_system` VARCHAR(80) NOT NULL DEFAULT 'crm',
  `source_field_mapping` VARCHAR(255) DEFAULT NULL,
  `aggregation_description` TEXT DEFAULT NULL,
  `eligibility_description` TEXT DEFAULT NULL,
  `effective_from` DATE NOT NULL,
  `effective_to` DATE DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_metric_defs_key_unique` (`metric_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
