-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: demandflow_slides
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `incentive_payout_action_log`
--

DROP TABLE IF EXISTS `incentive_payout_action_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `incentive_payout_action_log` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `crm_payout_id` bigint(20) NOT NULL,
  `action_type` varchar(50) NOT NULL,
  `actor_id` bigint(20) NOT NULL,
  `request_id` varchar(150) NOT NULL,
  `result_status` varchar(30) NOT NULL,
  `crm_reference` varchar(150) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `incentive_payout_action_log_crm_payout_id_action_type_idx` (`crm_payout_id`,`action_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `incentive_policies`
--

DROP TABLE IF EXISTS `incentive_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `incentive_policies` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `policy_code` varchar(80) NOT NULL,
  `policy_name` varchar(150) NOT NULL,
  `version` int(11) NOT NULL DEFAULT 1,
  `status` varchar(30) NOT NULL DEFAULT 'draft',
  `currency` char(3) NOT NULL DEFAULT 'INR',
  `valid_from` date NOT NULL,
  `valid_to` date DEFAULT NULL,
  `created_by` bigint(20) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `incentive_policies_policy_code_version_key` (`policy_code`,`version`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `incentive_policy_approvals`
--

DROP TABLE IF EXISTS `incentive_policy_approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `incentive_policy_approvals` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `policy_id` bigint(20) NOT NULL,
  `action` varchar(30) NOT NULL,
  `reviewed_by` bigint(20) NOT NULL,
  `remarks` text DEFAULT NULL,
  `reviewed_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `incentive_policy_approvals_policy_id_idx` (`policy_id`),
  CONSTRAINT `incentive_policy_approvals_policy_id_fkey` FOREIGN KEY (`policy_id`) REFERENCES `incentive_policies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `incentive_policy_assignments`
--

DROP TABLE IF EXISTS `incentive_policy_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `incentive_policy_assignments` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `policy_id` bigint(20) NOT NULL,
  `scope_type` varchar(30) NOT NULL,
  `scope_crm_id` bigint(20) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `valid_from` date NOT NULL,
  `valid_to` date DEFAULT NULL,
  `created_by` bigint(20) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `incentive_policy_assignments_scope_type_scope_crm_id_valid_f_idx` (`scope_type`,`scope_crm_id`,`valid_from`),
  KEY `incentive_policy_assignments_policy_id_fkey` (`policy_id`),
  CONSTRAINT `incentive_policy_assignments_policy_id_fkey` FOREIGN KEY (`policy_id`) REFERENCES `incentive_policies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `incentive_policy_rules`
--

DROP TABLE IF EXISTS `incentive_policy_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `incentive_policy_rules` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `policy_id` bigint(20) NOT NULL,
  `minimum_target_pct` decimal(8,3) NOT NULL DEFAULT 100.000,
  `base_incentive_amount` decimal(12,2) NOT NULL DEFAULT 500.00,
  `attendance_required` tinyint(1) NOT NULL DEFAULT 1,
  `qa_escalation_action` varchar(30) NOT NULL DEFAULT 'zero_out',
  `penalty_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `maximum_daily_incentive` decimal(12,2) DEFAULT NULL,
  `rounding_mode` varchar(30) NOT NULL DEFAULT 'standard',
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `incentive_policy_rules_policy_id_key` (`policy_id`),
  CONSTRAINT `incentive_policy_rules_policy_id_fkey` FOREIGN KEY (`policy_id`) REFERENCES `incentive_policies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `incentive_policy_slabs`
--

DROP TABLE IF EXISTS `incentive_policy_slabs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `incentive_policy_slabs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `policy_id` bigint(20) NOT NULL,
  `slab_order` int(11) NOT NULL,
  `minimum_completion_pct` decimal(8,3) NOT NULL,
  `maximum_completion_pct` decimal(8,3) DEFAULT NULL,
  `amount_per_extra_point` decimal(12,2) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `incentive_policy_slabs_policy_id_slab_order_idx` (`policy_id`,`slab_order`),
  CONSTRAINT `incentive_policy_slabs_policy_id_fkey` FOREIGN KEY (`policy_id`) REFERENCES `incentive_policies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `incentive_reconciliation_checks`
--

DROP TABLE IF EXISTS `incentive_reconciliation_checks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `incentive_reconciliation_checks` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `crm_payout_id` bigint(20) NOT NULL,
  `work_date` date NOT NULL,
  `check_type` varchar(50) NOT NULL,
  `expected_status` varchar(30) NOT NULL,
  `observed_status` varchar(30) NOT NULL,
  `result` varchar(30) NOT NULL,
  `checked_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `resolved_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `incentive_reconciliation_checks_crm_payout_id_work_date_idx` (`crm_payout_id`,`work_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `incentive_settlement_runs`
--

DROP TABLE IF EXISTS `incentive_settlement_runs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `incentive_settlement_runs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `crm_run_reference` varchar(150) DEFAULT NULL,
  `work_date` date NOT NULL,
  `run_mode` varchar(30) NOT NULL,
  `trigger_source` varchar(30) NOT NULL,
  `run_status` varchar(30) NOT NULL,
  `agents_processed` int(11) DEFAULT NULL,
  `total_amount` decimal(14,2) DEFAULT NULL,
  `started_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `finished_at` datetime(6) DEFAULT NULL,
  `error_summary` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `incentive_settlement_runs_work_date_run_status_idx` (`work_date`,`run_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `slide_app_users`
--

DROP TABLE IF EXISTS `slide_app_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slide_app_users` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `crm_user_id` bigint(20) DEFAULT NULL,
  `email` varchar(191) NOT NULL,
  `display_name` varchar(150) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slide_app_users_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `slide_audit_logs`
--

DROP TABLE IF EXISTS `slide_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slide_audit_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `actor_id` bigint(20) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `resource_type` varchar(80) NOT NULL,
  `resource_id` varchar(100) DEFAULT NULL,
  `details_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details_json`)),
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `slide_audit_logs_resource_type_resource_id_idx` (`resource_type`,`resource_id`),
  KEY `slide_audit_logs_actor_id_created_at_idx` (`actor_id`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `slide_business_calendars`
--

DROP TABLE IF EXISTS `slide_business_calendars`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slide_business_calendars` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `calendar_name` varchar(100) NOT NULL,
  `business_timezone` varchar(64) NOT NULL DEFAULT 'America/New_York',
  `display_timezone` varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
  `shift_start_local` varchar(16) NOT NULL DEFAULT '17:30:00',
  `shift_end_local` varchar(16) NOT NULL DEFAULT '02:30:00',
  `shift_timezone` varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
  `qa_cutoff_minutes` int(11) NOT NULL DEFAULT 30,
  `settlement_delay_minutes` int(11) NOT NULL DEFAULT 5,
  `schedule_mode` varchar(30) NOT NULL DEFAULT 'cross_midnight',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  `grace_period_minutes` int(11) NOT NULL DEFAULT 0,
  `shift_code` varchar(50) NOT NULL DEFAULT 'US_SHIFT',
  `version` int(11) NOT NULL DEFAULT 1,
  `working_days_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`working_days_json`)),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `slide_campaign_target_audit`
--

DROP TABLE IF EXISTS `slide_campaign_target_audit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slide_campaign_target_audit` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `plan_id` bigint(20) DEFAULT NULL,
  `crm_campaign_id` bigint(20) NOT NULL,
  `target_work_date` date NOT NULL,
  `previous_target` int(11) DEFAULT NULL,
  `new_target` int(11) NOT NULL,
  `crm_response_reference` varchar(150) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `performed_by` bigint(20) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `campaign_name` varchar(150) DEFAULT NULL,
  `client_code` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `slide_campaign_target_audit_crm_campaign_id_target_work_date_idx` (`crm_campaign_id`,`target_work_date`),
  KEY `slide_campaign_target_audit_plan_id_fkey` (`plan_id`),
  CONSTRAINT `slide_campaign_target_audit_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `slide_campaign_target_plans` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `slide_campaign_target_plans`
--

DROP TABLE IF EXISTS `slide_campaign_target_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slide_campaign_target_plans` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `crm_campaign_id` bigint(20) NOT NULL,
  `target_work_date` date NOT NULL,
  `proposed_target` int(11) NOT NULL,
  `plan_status` varchar(30) NOT NULL DEFAULT 'draft',
  `created_by` bigint(20) NOT NULL DEFAULT 1,
  `submitted_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  `campaign_name` varchar(150) DEFAULT NULL,
  `client_code` varchar(50) DEFAULT NULL,
  `monthly_allocation` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `slide_campaign_target_plans_crm_campaign_id_target_work_date_idx` (`crm_campaign_id`,`target_work_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `slide_crm_connection_settings`
--

DROP TABLE IF EXISTS `slide_crm_connection_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slide_crm_connection_settings` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `connection_name` varchar(100) NOT NULL DEFAULT 'default',
  `base_url` varchar(500) NOT NULL,
  `polling_interval_seconds` int(11) NOT NULL DEFAULT 30,
  `timeout_seconds` int(11) NOT NULL DEFAULT 60,
  `mock_fallback` tinyint(1) NOT NULL DEFAULT 0,
  `auto_sync_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `updated_by` bigint(20) DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `slide_definitions`
--

DROP TABLE IF EXISTS `slide_definitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slide_definitions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `slide_key` varchar(100) NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `component_key` varchar(120) NOT NULL,
  `config_schema_version` int(11) NOT NULL DEFAULT 1,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slide_definitions_slide_key_key` (`slide_key`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `slide_display_preferences`
--

DROP TABLE IF EXISTS `slide_display_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slide_display_preferences` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `display_identifier` varchar(150) NOT NULL,
  `presentation_id` bigint(20) DEFAULT NULL,
  `tv_mode_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `display_scaling` varchar(30) NOT NULL DEFAULT 'normal',
  `heatmap_interval_minutes` int(11) NOT NULL DEFAULT 10,
  `slide_interval_seconds` int(11) NOT NULL DEFAULT 30,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slide_display_preferences_display_identifier_key` (`display_identifier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `slide_display_sessions`
--

DROP TABLE IF EXISTS `slide_display_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slide_display_sessions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `presentation_id` bigint(20) NOT NULL,
  `display_name` varchar(150) NOT NULL,
  `session_token_hash` varchar(255) NOT NULL,
  `started_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `last_seen_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `ended_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `slide_display_sessions_presentation_id_idx` (`presentation_id`),
  CONSTRAINT `slide_display_sessions_presentation_id_fkey` FOREIGN KEY (`presentation_id`) REFERENCES `slide_presentations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `slide_integration_logs`
--

DROP TABLE IF EXISTS `slide_integration_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slide_integration_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `service` varchar(80) NOT NULL,
  `endpoint_name` varchar(120) NOT NULL,
  `request_id` varchar(150) NOT NULL,
  `http_status` int(11) DEFAULT NULL,
  `duration_ms` int(11) DEFAULT NULL,
  `result_status` varchar(30) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `slide_integration_logs_service_endpoint_name_idx` (`service`,`endpoint_name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `slide_playlist_items`
--

DROP TABLE IF EXISTS `slide_playlist_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slide_playlist_items` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `presentation_id` bigint(20) NOT NULL,
  `slide_definition_id` bigint(20) NOT NULL,
  `display_order` int(11) NOT NULL,
  `duration_seconds` int(11) DEFAULT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `config_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`config_json`)),
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `slide_playlist_items_presentation_id_display_order_idx` (`presentation_id`,`display_order`),
  KEY `slide_playlist_items_slide_definition_id_fkey` (`slide_definition_id`),
  CONSTRAINT `slide_playlist_items_presentation_id_fkey` FOREIGN KEY (`presentation_id`) REFERENCES `slide_presentations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `slide_playlist_items_slide_definition_id_fkey` FOREIGN KEY (`slide_definition_id`) REFERENCES `slide_definitions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `slide_presentations`
--

DROP TABLE IF EXISTS `slide_presentations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slide_presentations` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `default_slide_seconds` int(11) NOT NULL DEFAULT 25,
  `refresh_interval_seconds` int(11) NOT NULL DEFAULT 30,
  `theme_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`theme_config`)),
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slide_presentations_slug_key` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `slide_roles`
--

DROP TABLE IF EXISTS `slide_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slide_roles` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `role_key` varchar(60) NOT NULL,
  `role_name` varchar(100) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slide_roles_role_key_key` (`role_key`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `slide_settings_change_events`
--

DROP TABLE IF EXISTS `slide_settings_change_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slide_settings_change_events` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `setting_scope` varchar(30) NOT NULL,
  `setting_key` varchar(120) NOT NULL,
  `entity_id` bigint(20) DEFAULT NULL,
  `changed_by` bigint(20) NOT NULL,
  `previous_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`previous_value`)),
  `new_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_value`)),
  `changed_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `slide_settings_change_events_setting_scope_setting_key_idx` (`setting_scope`,`setting_key`),
  KEY `slide_settings_change_events_changed_at_idx` (`changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `slide_system_settings`
--

DROP TABLE IF EXISTS `slide_system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slide_system_settings` (
  `setting_key` varchar(120) NOT NULL,
  `setting_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`setting_value`)),
  `updated_by` bigint(20) DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `slide_user_preferences`
--

DROP TABLE IF EXISTS `slide_user_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slide_user_preferences` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `theme` varchar(20) NOT NULL DEFAULT 'dark',
  `header_drawer_open` tinyint(1) NOT NULL DEFAULT 0,
  `tv_mode_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `display_scaling` varchar(30) NOT NULL DEFAULT 'normal',
  `heatmap_interval_minutes` int(11) NOT NULL DEFAULT 10,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slide_user_preferences_user_id_key` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `slide_user_roles`
--

DROP TABLE IF EXISTS `slide_user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slide_user_roles` (
  `user_id` bigint(20) NOT NULL,
  `role_id` bigint(20) NOT NULL,
  `assigned_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `slide_user_roles_role_id_fkey` (`role_id`),
  CONSTRAINT `slide_user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `slide_roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `slide_user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `slide_app_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-23 22:27:52
