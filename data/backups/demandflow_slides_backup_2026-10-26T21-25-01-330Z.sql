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
-- Table structure for table `agent_attendance_snapshots`
--

DROP TABLE IF EXISTS `agent_attendance_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `agent_attendance_snapshots` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `crm_agent_id` bigint(20) NOT NULL,
  `agent_name_snapshot` varchar(150) DEFAULT NULL,
  `work_date` date NOT NULL,
  `attendance_status` varchar(50) NOT NULL,
  `punch_in_at` datetime(6) DEFAULT NULL,
  `punch_out_at` datetime(6) DEFAULT NULL,
  `late_minutes` int(11) NOT NULL DEFAULT 0,
  `effective_work_minutes` int(11) NOT NULL DEFAULT 465,
  `synced_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `snapshot_version` int(11) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_agent_att_unique` (`crm_agent_id`,`work_date`,`snapshot_version`),
  KEY `idx_agent_att_date_status` (`work_date`,`attendance_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agent_attendance_snapshots`
--

LOCK TABLES `agent_attendance_snapshots` WRITE;
/*!40000 ALTER TABLE `agent_attendance_snapshots` DISABLE KEYS */;
/*!40000 ALTER TABLE `agent_attendance_snapshots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `agent_daily_snapshots`
--

DROP TABLE IF EXISTS `agent_daily_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `agent_daily_snapshots` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `crm_agent_id` bigint(20) NOT NULL,
  `agent_name_snapshot` varchar(150) NOT NULL,
  `work_date` date NOT NULL,
  `daily_target_points` decimal(12,3) NOT NULL DEFAULT 0.000,
  `achieved_points` decimal(12,3) NOT NULL DEFAULT 0.000,
  `qualified_leads` int(11) NOT NULL DEFAULT 0,
  `disqualified_leads` int(11) NOT NULL DEFAULT 0,
  `generated_leads` int(11) NOT NULL DEFAULT 0,
  `pending_qa_leads` int(11) NOT NULL DEFAULT 0,
  `remaining_target_points` decimal(12,3) NOT NULL DEFAULT 0.000,
  `target_completion_pct` decimal(8,3) NOT NULL DEFAULT 0.000,
  `attendance_status_snapshot` varchar(50) NOT NULL DEFAULT 'Present',
  `effective_work_minutes` int(11) NOT NULL DEFAULT 465,
  `elapsed_work_minutes` int(11) NOT NULL DEFAULT 0,
  `expected_points_at_snapshot` decimal(12,3) NOT NULL DEFAULT 0.000,
  `productivity_pace_pct` decimal(8,3) DEFAULT NULL,
  `pace_status` varchar(30) DEFAULT NULL,
  `source_updated_at` datetime(6) DEFAULT NULL,
  `synced_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `snapshot_version` int(11) NOT NULL DEFAULT 1,
  `is_final` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_agent_snap_unique` (`crm_agent_id`,`work_date`,`snapshot_version`),
  KEY `idx_agent_snap_date_comp` (`work_date`,`target_completion_pct`),
  KEY `idx_agent_snap_agent_date` (`crm_agent_id`,`work_date`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agent_daily_snapshots`
--

LOCK TABLES `agent_daily_snapshots` WRITE;
/*!40000 ALTER TABLE `agent_daily_snapshots` DISABLE KEYS */;
/*!40000 ALTER TABLE `agent_daily_snapshots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `agent_interval_metrics`
--

DROP TABLE IF EXISTS `agent_interval_metrics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `agent_interval_metrics` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `crm_agent_id` bigint(20) NOT NULL,
  `agent_name_snapshot` varchar(150) DEFAULT NULL,
  `work_date` date NOT NULL,
  `interval_start_at` datetime(6) NOT NULL,
  `interval_end_at` datetime(6) NOT NULL,
  `generated_leads` int(11) NOT NULL DEFAULT 0,
  `synced_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_agent_interval_unique` (`crm_agent_id`,`interval_start_at`),
  KEY `idx_agent_interval_date_start` (`work_date`,`interval_start_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agent_interval_metrics`
--

LOCK TABLES `agent_interval_metrics` WRITE;
/*!40000 ALTER TABLE `agent_interval_metrics` DISABLE KEYS */;
/*!40000 ALTER TABLE `agent_interval_metrics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `analytics_daily_finalizations`
--

DROP TABLE IF EXISTS `analytics_daily_finalizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `analytics_daily_finalizations` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `work_date` date NOT NULL,
  `finalization_status` varchar(40) NOT NULL DEFAULT 'provisional',
  `finalized_at` datetime(6) DEFAULT NULL,
  `finalized_by` bigint(20) DEFAULT NULL,
  `source_watermark` varchar(150) DEFAULT NULL,
  `revision_number` int(11) NOT NULL DEFAULT 1,
  `last_reconciled_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_finalizations_date_unique` (`work_date`),
  KEY `idx_finalizations_status_date` (`finalization_status`,`work_date`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `analytics_daily_finalizations`
--

LOCK TABLES `analytics_daily_finalizations` WRITE;
/*!40000 ALTER TABLE `analytics_daily_finalizations` DISABLE KEYS */;
/*!40000 ALTER TABLE `analytics_daily_finalizations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `analytics_metric_definitions`
--

DROP TABLE IF EXISTS `analytics_metric_definitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `analytics_metric_definitions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `metric_key` varchar(100) NOT NULL,
  `metric_version` int(11) NOT NULL DEFAULT 1,
  `display_name` varchar(150) NOT NULL,
  `source_system` varchar(80) NOT NULL DEFAULT 'crm',
  `source_field_mapping` varchar(255) DEFAULT NULL,
  `aggregation_description` text DEFAULT NULL,
  `eligibility_description` text DEFAULT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_metric_defs_key_unique` (`metric_key`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `analytics_metric_definitions`
--

LOCK TABLES `analytics_metric_definitions` WRITE;
/*!40000 ALTER TABLE `analytics_metric_definitions` DISABLE KEYS */;
INSERT INTO `analytics_metric_definitions` VALUES (1,'generated_leads',1,'Generated Leads','crm','leads.created_at, slide4.agent_heatmap.intervals','Total count of leads submitted by SDRs within the business work date shift window (17:30 to 02:30 IST next day).','Any lead generated during the operational shift, regardless of subsequent QA audit outcome.','2026-01-01',NULL,'2026-10-26 21:04:05.481000','2026-10-26 21:04:05.481000'),(2,'qualified_leads',1,'Qualified Leads (Eligible MQL/BANT)','crm','leads.qa_status = \'Qualified\', slide1.campaigns.qualified_leads','Count of leads that passed QA auditing and achieved Qualified status on or for the specified business work date.','Authoritative QA qualification according to CRM campaign validation rules. Basis for point achievement and incentive slabs.','2026-01-01',NULL,'2026-10-26 21:04:05.505000','2026-10-26 21:04:05.505000'),(3,'pending_qa',1,'Pending QA Leads','crm','leads.qa_status IN (\'Pending\', \'In Review\', \'Rework Submitted\')','Point-in-time snapshot count of leads generated for the work date currently awaiting QA review.','Leads not yet marked as Qualified or Disqualified. May change across time as QA analysts audit leads.','2026-01-01',NULL,'2026-10-26 21:04:05.514000','2026-10-26 21:04:05.514000'),(4,'daily_target_completion',1,'Daily Campaign Target Completion %','slides_and_crm','slide_campaign_target_plans.proposed_target, campaign_daily_snapshots.completion_percentage','Completion % = Qualified Leads / Daily Target Leads * 100. Returns N/A (0.000) when Daily Target is zero.','Tracks allocated target delivery per campaign. Supports overachievement (>100%).','2026-01-01',NULL,'2026-10-26 21:04:05.524000','2026-10-26 21:04:05.524000'),(5,'agent_achieved_points',1,'Agent Achieved Points','crm','agent_daily_snapshots.achieved_points, slide2.agents.achieved_points','SUM(Qualified Leads * CRM Point Factor). Point factors: MQL=1, HQL/Callback=2, BANT=3, Appointment=5, Email=1.','Only qualified leads audited and approved contribute to agent achieved points.','2026-01-01',NULL,'2026-10-26 21:04:05.533000','2026-10-26 21:04:05.533000'),(6,'qa_audited_leads',1,'QA Audited Leads','crm','slide3.qa_heatmap, qa_interval_metrics.audited_events','Total audit events logged by QA analysts, plus unique leads audited across 10-minute intervals during the shift.','Measures QA throughput. Prevents double-counting in unique lead metrics while tracking all audit events.','2026-01-01',NULL,'2026-10-26 21:04:05.542000','2026-10-26 21:04:05.542000'),(7,'productivity_pace',1,'Productivity Pace %','slides_engine','agent_daily_snapshots.productivity_pace_pct','Expected Points = Daily Target Points * Elapsed Effective Work Minutes / 465. Pace % = Achieved Points / Expected Points * 100.','Evaluated during shift hours. Color bands: 0-30% Red, >30-80% Yellow, >80% Green. Pre-shift data is null (not 0).','2026-01-01',NULL,'2026-10-26 21:04:05.550000','2026-10-26 21:04:05.550000'),(8,'floor_capacity',1,'Floor Capacity Points & Gap','slides_engine','floor_daily_snapshots.floor_capacity_points, floor_daily_snapshots.capacity_gap_points','Floor Capacity Points = SUM(Target Points of Eligible Present Agents). Capacity Gap = Floor Capacity - Campaign Target Points.','Absent/on-leave agents are excluded from floor capacity. Compares operational capacity to campaign demand.','2026-01-01',NULL,'2026-10-26 21:04:05.559000','2026-10-26 21:04:05.559000'),(9,'incentive_earned',1,'Daily Incentive Earned','crm','crm_incentive_preview, incentive_daily_snapshots.total_incentive','Base Incentive (if achieved >= 100% target and present) + Slab Incentive for points exceeding target.','Calculated per approved policy rules. Subject to QA audit escalation and attendance eligibility checks.','2026-01-01',NULL,'2026-10-26 21:04:05.567000','2026-10-26 21:04:05.567000'),(10,'incentive_paid',1,'Incentive Paid (Disbursed)','crm','incentive_daily_snapshots.payment_status = \'paid\', crm_payment_reference','Total monetary incentive successfully settled and disbursed via CRM UPI/Bank API transfers.','Authoritative financial disbursement executed solely by DemandFlow Bridge CRM payment ledger.','2026-01-01',NULL,'2026-10-26 21:04:05.575000','2026-10-26 21:04:05.575000');
/*!40000 ALTER TABLE `analytics_metric_definitions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `analytics_sync_runs`
--

DROP TABLE IF EXISTS `analytics_sync_runs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `analytics_sync_runs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `job_name` varchar(100) NOT NULL,
  `work_date` date NOT NULL,
  `started_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `finished_at` datetime(6) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'running',
  `source_record_count` int(11) NOT NULL DEFAULT 0,
  `processed_record_count` int(11) NOT NULL DEFAULT 0,
  `failed_record_count` int(11) NOT NULL DEFAULT 0,
  `error_summary` text DEFAULT NULL,
  `source_watermark` varchar(150) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `idx_sync_runs_job_date` (`job_name`,`work_date`),
  KEY `idx_sync_runs_started` (`started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `analytics_sync_runs`
--

LOCK TABLES `analytics_sync_runs` WRITE;
/*!40000 ALTER TABLE `analytics_sync_runs` DISABLE KEYS */;
/*!40000 ALTER TABLE `analytics_sync_runs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance_daily_snapshots`
--

DROP TABLE IF EXISTS `attendance_daily_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `attendance_daily_snapshots` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `work_date` date NOT NULL,
  `total_agents` int(11) NOT NULL DEFAULT 0,
  `present_count` int(11) NOT NULL DEFAULT 0,
  `absent_count` int(11) NOT NULL DEFAULT 0,
  `late_count` int(11) NOT NULL DEFAULT 0,
  `leave_count` int(11) NOT NULL DEFAULT 0,
  `other_status_counts_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`other_status_counts_json`)),
  `synced_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `snapshot_version` int(11) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_att_snap_unique` (`work_date`,`snapshot_version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance_daily_snapshots`
--

LOCK TABLES `attendance_daily_snapshots` WRITE;
/*!40000 ALTER TABLE `attendance_daily_snapshots` DISABLE KEYS */;
/*!40000 ALTER TABLE `attendance_daily_snapshots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `campaign_daily_snapshots`
--

DROP TABLE IF EXISTS `campaign_daily_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `campaign_daily_snapshots` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `crm_campaign_id` bigint(20) NOT NULL,
  `crm_campaign_code` varchar(50) DEFAULT NULL,
  `campaign_name_snapshot` varchar(150) NOT NULL,
  `client_code_snapshot` varchar(50) DEFAULT NULL,
  `campaign_type_snapshot` varchar(50) DEFAULT 'General',
  `work_date` date NOT NULL,
  `monthly_allocation_snapshot` int(11) DEFAULT 0,
  `daily_target_leads` int(11) NOT NULL DEFAULT 0,
  `campaign_point_factor` decimal(8,3) NOT NULL DEFAULT 1.000,
  `daily_target_points` decimal(12,3) NOT NULL DEFAULT 0.000,
  `generated_leads` int(11) NOT NULL DEFAULT 0,
  `qualified_leads` int(11) NOT NULL DEFAULT 0,
  `disqualified_leads` int(11) NOT NULL DEFAULT 0,
  `pending_qa_leads` int(11) NOT NULL DEFAULT 0,
  `remaining_target_leads` int(11) NOT NULL DEFAULT 0,
  `completion_percentage` decimal(8,3) NOT NULL DEFAULT 0.000,
  `target_achieved` tinyint(1) NOT NULL DEFAULT 0,
  `source_updated_at` datetime(6) DEFAULT NULL,
  `synced_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `snapshot_version` int(11) NOT NULL DEFAULT 1,
  `is_final` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_camp_snap_unique` (`crm_campaign_id`,`work_date`,`snapshot_version`),
  KEY `idx_camp_snap_date_target` (`work_date`,`target_achieved`),
  KEY `idx_camp_snap_client_date` (`client_code_snapshot`,`work_date`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campaign_daily_snapshots`
--

LOCK TABLES `campaign_daily_snapshots` WRITE;
/*!40000 ALTER TABLE `campaign_daily_snapshots` DISABLE KEYS */;
/*!40000 ALTER TABLE `campaign_daily_snapshots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `floor_daily_snapshots`
--

DROP TABLE IF EXISTS `floor_daily_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `floor_daily_snapshots` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `work_date` date NOT NULL,
  `total_agents` int(11) NOT NULL DEFAULT 0,
  `present_agents` int(11) NOT NULL DEFAULT 0,
  `absent_agents` int(11) NOT NULL DEFAULT 0,
  `late_agents` int(11) NOT NULL DEFAULT 0,
  `campaign_target_points` decimal(14,3) NOT NULL DEFAULT 0.000,
  `floor_capacity_points` decimal(14,3) NOT NULL DEFAULT 0.000,
  `capacity_gap_points` decimal(14,3) NOT NULL DEFAULT 0.000,
  `total_achieved_points` decimal(14,3) NOT NULL DEFAULT 0.000,
  `synced_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `snapshot_version` int(11) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_floor_snap_unique` (`work_date`,`snapshot_version`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `floor_daily_snapshots`
--

LOCK TABLES `floor_daily_snapshots` WRITE;
/*!40000 ALTER TABLE `floor_daily_snapshots` DISABLE KEYS */;
/*!40000 ALTER TABLE `floor_daily_snapshots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `incentive_daily_snapshots`
--

DROP TABLE IF EXISTS `incentive_daily_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `incentive_daily_snapshots` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `crm_payout_id` bigint(20) DEFAULT NULL,
  `crm_agent_id` bigint(20) NOT NULL,
  `agent_name_snapshot` varchar(150) DEFAULT NULL,
  `work_date` date NOT NULL,
  `target_points` decimal(12,3) NOT NULL DEFAULT 0.000,
  `achieved_points` decimal(12,3) NOT NULL DEFAULT 0.000,
  `qualified_leads` int(11) NOT NULL DEFAULT 0,
  `base_incentive` decimal(12,2) NOT NULL DEFAULT 0.00,
  `slab_incentive` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_incentive` decimal(12,2) NOT NULL DEFAULT 0.00,
  `eligibility_status` varchar(30) NOT NULL DEFAULT 'ineligible',
  `approval_status` varchar(30) NOT NULL DEFAULT 'pending_approval',
  `payment_status` varchar(30) NOT NULL DEFAULT 'unpaid',
  `policy_version_reference` int(11) DEFAULT NULL,
  `crm_payment_reference` varchar(150) DEFAULT NULL,
  `source_updated_at` datetime(6) DEFAULT NULL,
  `synced_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `snapshot_version` int(11) NOT NULL DEFAULT 1,
  `is_final` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_inc_snap_unique` (`crm_agent_id`,`work_date`,`snapshot_version`),
  KEY `idx_inc_snap_date_status` (`work_date`,`payment_status`),
  KEY `idx_inc_snap_crm_payout` (`crm_payout_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `incentive_daily_snapshots`
--

LOCK TABLES `incentive_daily_snapshots` WRITE;
/*!40000 ALTER TABLE `incentive_daily_snapshots` DISABLE KEYS */;
/*!40000 ALTER TABLE `incentive_daily_snapshots` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `incentive_payout_action_log`
--

LOCK TABLES `incentive_payout_action_log` WRITE;
/*!40000 ALTER TABLE `incentive_payout_action_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `incentive_payout_action_log` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `incentive_policies`
--

LOCK TABLES `incentive_policies` WRITE;
/*!40000 ALTER TABLE `incentive_policies` DISABLE KEYS */;
INSERT INTO `incentive_policies` VALUES (1,'POL-DEFAULT-DAILY','Standard Production Daily Incentive Policy',1,'draft','INR','2026-01-01',NULL,1,'2026-10-23 13:35:41.747000','2026-10-23 13:35:41.747000'),(2,'POL-TEST-BONUS','Test Bonus Production Policy',1,'awaiting_crm_integration','INR','2026-10-23',NULL,1,'2026-10-23 14:18:28.639000','2026-10-23 14:18:55.172000'),(3,'POL-TEST-BONUS','Test Bonus Production Policy (Updated Terms)',2,'draft','INR','2026-10-23',NULL,1,'2026-10-23 14:18:59.224000','2026-10-23 14:18:59.224000');
/*!40000 ALTER TABLE `incentive_policies` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `incentive_policy_approvals`
--

LOCK TABLES `incentive_policy_approvals` WRITE;
/*!40000 ALTER TABLE `incentive_policy_approvals` DISABLE KEYS */;
INSERT INTO `incentive_policy_approvals` VALUES (1,2,'APPROVED',1,'Unit test approval by Ops','2026-10-23 14:18:46.369000');
/*!40000 ALTER TABLE `incentive_policy_approvals` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `incentive_policy_assignments`
--

LOCK TABLES `incentive_policy_assignments` WRITE;
/*!40000 ALTER TABLE `incentive_policy_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `incentive_policy_assignments` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `incentive_policy_rules`
--

LOCK TABLES `incentive_policy_rules` WRITE;
/*!40000 ALTER TABLE `incentive_policy_rules` DISABLE KEYS */;
INSERT INTO `incentive_policy_rules` VALUES (1,1,100.000,500.00,1,'disqualify',0.00,5000.00,'floor','2026-10-23 13:35:41.754000'),(2,2,100.000,600.00,1,'disqualify',0.00,4000.00,'floor','2026-10-23 14:18:28.683000'),(3,3,100.000,700.00,1,'disqualify',0.00,4000.00,'floor','2026-10-23 14:18:59.240000');
/*!40000 ALTER TABLE `incentive_policy_rules` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `incentive_policy_slabs`
--

LOCK TABLES `incentive_policy_slabs` WRITE;
/*!40000 ALTER TABLE `incentive_policy_slabs` DISABLE KEYS */;
INSERT INTO `incentive_policy_slabs` VALUES (1,1,1,100.000,120.000,50.00,'2026-10-23 13:35:41.764000'),(2,1,2,120.001,150.000,75.00,'2026-10-23 13:35:41.764000'),(3,1,3,150.001,NULL,100.00,'2026-10-23 13:35:41.764000'),(4,2,1,100.000,125.000,60.00,'2026-10-23 14:18:28.708000'),(5,2,2,125.001,NULL,80.00,'2026-10-23 14:18:28.708000'),(6,3,1,100.000,125.000,60.00,'2026-10-23 14:18:59.252000'),(7,3,2,125.001,NULL,80.00,'2026-10-23 14:18:59.252000');
/*!40000 ALTER TABLE `incentive_policy_slabs` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `incentive_reconciliation_checks`
--

LOCK TABLES `incentive_reconciliation_checks` WRITE;
/*!40000 ALTER TABLE `incentive_reconciliation_checks` DISABLE KEYS */;
/*!40000 ALTER TABLE `incentive_reconciliation_checks` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `incentive_settlement_runs`
--

LOCK TABLES `incentive_settlement_runs` WRITE;
/*!40000 ALTER TABLE `incentive_settlement_runs` DISABLE KEYS */;
/*!40000 ALTER TABLE `incentive_settlement_runs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `qa_daily_snapshots`
--

DROP TABLE IF EXISTS `qa_daily_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `qa_daily_snapshots` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `crm_qa_agent_id` bigint(20) NOT NULL,
  `qa_agent_name_snapshot` varchar(150) DEFAULT NULL,
  `work_date` date NOT NULL,
  `total_audits` int(11) NOT NULL DEFAULT 0,
  `unique_leads_audited` int(11) NOT NULL DEFAULT 0,
  `qualified_leads` int(11) NOT NULL DEFAULT 0,
  `disqualified_leads` int(11) NOT NULL DEFAULT 0,
  `rework_leads` int(11) NOT NULL DEFAULT 0,
  `other_qa_status_counts_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`other_qa_status_counts_json`)),
  `synced_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `snapshot_version` int(11) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_qa_snap_unique` (`crm_qa_agent_id`,`work_date`,`snapshot_version`),
  KEY `idx_qa_snap_date` (`work_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `qa_daily_snapshots`
--

LOCK TABLES `qa_daily_snapshots` WRITE;
/*!40000 ALTER TABLE `qa_daily_snapshots` DISABLE KEYS */;
/*!40000 ALTER TABLE `qa_daily_snapshots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `qa_interval_metrics`
--

DROP TABLE IF EXISTS `qa_interval_metrics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `qa_interval_metrics` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `crm_qa_agent_id` bigint(20) NOT NULL,
  `qa_agent_name_snapshot` varchar(150) DEFAULT NULL,
  `work_date` date NOT NULL,
  `interval_start_at` datetime(6) NOT NULL,
  `interval_end_at` datetime(6) NOT NULL,
  `audited_events` int(11) NOT NULL DEFAULT 0,
  `qualified_events` int(11) NOT NULL DEFAULT 0,
  `disqualified_events` int(11) NOT NULL DEFAULT 0,
  `unique_leads_qualified` int(11) NOT NULL DEFAULT 0,
  `synced_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_qa_interval_unique` (`crm_qa_agent_id`,`interval_start_at`),
  KEY `idx_qa_interval_date_start` (`work_date`,`interval_start_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `qa_interval_metrics`
--

LOCK TABLES `qa_interval_metrics` WRITE;
/*!40000 ALTER TABLE `qa_interval_metrics` DISABLE KEYS */;
/*!40000 ALTER TABLE `qa_interval_metrics` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `slide_app_users`
--

LOCK TABLES `slide_app_users` WRITE;
/*!40000 ALTER TABLE `slide_app_users` DISABLE KEYS */;
/*!40000 ALTER TABLE `slide_app_users` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `slide_audit_logs`
--

LOCK TABLES `slide_audit_logs` WRITE;
/*!40000 ALTER TABLE `slide_audit_logs` DISABLE KEYS */;
INSERT INTO `slide_audit_logs` VALUES (1,1,'POLICY_CREATED','incentive_policy','2','{\"policyCode\":\"POL-TEST-BONUS\",\"version\":1,\"status\":\"draft\"}','2026-10-23 14:18:28.719000'),(2,1,'POLICY_SUBMITTED_FOR_APPROVAL','incentive_policy','2','{\"policyCode\":\"POL-TEST-BONUS\",\"version\":1,\"submittedAt\":\"2026-10-23T14:18:39.599Z\"}','2026-10-23 14:18:39.605000'),(3,1,'POLICY_APPROVED','incentive_policy','2','{\"policyCode\":\"POL-TEST-BONUS\",\"version\":1,\"remarks\":\"Unit test approval by Ops\",\"nextStatus\":\"approved\"}','2026-10-23 14:18:46.398000'),(4,1,'POLICY_AWAITING_CRM_INTEGRATION','incentive_policy','2','{\"policyCode\":\"POL-TEST-BONUS\",\"version\":1,\"reason\":\"CRM configuration publishing API endpoint is not yet deployed upstream\",\"requiredEndpoint\":\"POST /api/v1/incentives/publish_policy.php\"}','2026-10-23 14:18:55.221000'),(5,1,'POLICY_VERSION_FORKED','incentive_policy','3','{\"policyCode\":\"POL-TEST-BONUS\",\"fromVersion\":1,\"toVersion\":2,\"reason\":\"Active/Approved policy updated - new version draft created\"}','2026-10-23 14:18:59.261000'),(6,1,'PRESENTATION_PROFILE_UPDATED','slide_presentation','1','{\"defaultSlideSeconds\":28}','2026-10-23 18:34:22.695000'),(7,1,'PLAYLIST_REORDERED','slide_playlist','reorder','{\"count\":5}','2026-10-23 18:34:22.934000'),(8,1,'PLAYLIST_REORDERED','slide_playlist','reorder','{\"count\":5}','2026-10-23 18:34:23.084000');
/*!40000 ALTER TABLE `slide_audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `slide_business_calendars`
--

LOCK TABLES `slide_business_calendars` WRITE;
/*!40000 ALTER TABLE `slide_business_calendars` DISABLE KEYS */;
INSERT INTO `slide_business_calendars` VALUES (1,'US Business Shift','America/New_York','Asia/Kolkata','17:30:00','02:30:00','Asia/Kolkata',60,30,'cross_midnight',1,'2026-10-23 13:35:41.699000','2026-10-23 18:35:21.323000',0,'US_SHIFT',3,'[1,2,3,4,5]');
/*!40000 ALTER TABLE `slide_business_calendars` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `slide_campaign_target_audit`
--

LOCK TABLES `slide_campaign_target_audit` WRITE;
/*!40000 ALTER TABLE `slide_campaign_target_audit` DISABLE KEYS */;
/*!40000 ALTER TABLE `slide_campaign_target_audit` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `slide_campaign_target_plans`
--

LOCK TABLES `slide_campaign_target_plans` WRITE;
/*!40000 ALTER TABLE `slide_campaign_target_plans` DISABLE KEYS */;
/*!40000 ALTER TABLE `slide_campaign_target_plans` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `slide_crm_connection_settings`
--

LOCK TABLES `slide_crm_connection_settings` WRITE;
/*!40000 ALTER TABLE `slide_crm_connection_settings` DISABLE KEYS */;
INSERT INTO `slide_crm_connection_settings` VALUES (1,'DemandFlow Bridge High-Availability Cluster','https://app.tarajglobal.com/demandflowbridge/api/v1',12,10,0,1,1,1,'2026-10-23 18:35:08.538000');
/*!40000 ALTER TABLE `slide_crm_connection_settings` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `slide_definitions`
--

LOCK TABLES `slide_definitions` WRITE;
/*!40000 ALTER TABLE `slide_definitions` DISABLE KEYS */;
INSERT INTO `slide_definitions` VALUES (1,'operations_overview','Operations Overview','Executive live metrics, total lead generation, qualification ratios, and campaign KPIs.','operations-overview',1,1,'2026-10-23 13:35:41.393000','2026-10-23 13:35:41.393000'),(2,'agent_productivity','Agent Productivity','Live agent dials, qualified leads, productivity scorecards, and ranking.','agent-productivity',1,1,'2026-10-23 13:35:41.586000','2026-10-23 13:35:41.586000'),(3,'qa_heatmap','QA Audit Heatmap','Hourly QA audit distribution, fatal error tracking, and compliance rates.','qa-heatmap',1,1,'2026-10-23 13:35:41.596000','2026-10-23 13:35:41.596000'),(4,'agent_heatmap','Agent Activity Heatmap','Hourly lead production breakdown across shifts and active campaign queues.','agent-heatmap',1,1,'2026-10-23 13:35:41.612000','2026-10-23 13:35:41.612000'),(5,'comparative_analytics','Comparative Analytics','Multi-campaign pacing, target achievement percentages, and comparative trends.','comparative-analytics',1,1,'2026-10-23 13:35:41.631000','2026-10-23 13:35:41.631000');
/*!40000 ALTER TABLE `slide_definitions` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `slide_display_preferences`
--

LOCK TABLES `slide_display_preferences` WRITE;
/*!40000 ALTER TABLE `slide_display_preferences` DISABLE KEYS */;
INSERT INTO `slide_display_preferences` VALUES (1,'default',NULL,1,'tv-1080p',15,30,'2026-10-23 18:33:33.346000');
/*!40000 ALTER TABLE `slide_display_preferences` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `slide_display_sessions`
--

LOCK TABLES `slide_display_sessions` WRITE;
/*!40000 ALTER TABLE `slide_display_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `slide_display_sessions` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `slide_integration_logs`
--

LOCK TABLES `slide_integration_logs` WRITE;
/*!40000 ALTER TABLE `slide_integration_logs` DISABLE KEYS */;
INSERT INTO `slide_integration_logs` VALUES (1,'CRM_INCENTIVES_ENGINE','publish_policy.php','pub-POL-TEST-BONUS-v1-1792765135079',404,444,'NOT_IMPLEMENTED','2026-10-23 14:18:55.088000');
/*!40000 ALTER TABLE `slide_integration_logs` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `slide_playlist_items`
--

LOCK TABLES `slide_playlist_items` WRITE;
/*!40000 ALTER TABLE `slide_playlist_items` DISABLE KEYS */;
INSERT INTO `slide_playlist_items` VALUES (1,1,1,1,25,1,'{}','2026-10-23 13:35:41.659000','2026-10-23 18:34:23.065000'),(2,1,2,2,25,1,'{}','2026-10-23 13:35:41.667000','2026-10-23 18:34:23.069000'),(3,1,3,3,25,1,'{}','2026-10-23 13:35:41.673000','2026-10-23 18:34:23.073000'),(4,1,4,4,25,1,'{}','2026-10-23 13:35:41.680000','2026-10-23 18:34:23.077000'),(5,1,5,5,25,1,'{}','2026-10-23 13:35:41.689000','2026-10-23 18:34:23.080000');
/*!40000 ALTER TABLE `slide_playlist_items` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `slide_presentations`
--

LOCK TABLES `slide_presentations` WRITE;
/*!40000 ALTER TABLE `slide_presentations` DISABLE KEYS */;
INSERT INTO `slide_presentations` VALUES (1,'DemandFlow Executive Live Presentation','executive-presentation',1,28,30,'{\"theme\":\"dark\",\"primaryColor\":\"#3b82f6\",\"background\":\"#090d16\",\"showTicker\":true}','2026-10-23 13:35:41.638000','2026-10-23 18:34:22.670000');
/*!40000 ALTER TABLE `slide_presentations` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `slide_roles`
--

LOCK TABLES `slide_roles` WRITE;
/*!40000 ALTER TABLE `slide_roles` DISABLE KEYS */;
INSERT INTO `slide_roles` VALUES (1,'admin','System Administrator','2026-10-23 13:35:41.707000'),(2,'manager','Operations Manager','2026-10-23 13:35:41.715000'),(3,'finance','Finance & Settlements Manager','2026-10-23 13:35:41.719000'),(4,'viewer','Live Slide Viewer','2026-10-23 13:35:41.725000');
/*!40000 ALTER TABLE `slide_roles` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `slide_settings_change_events`
--

LOCK TABLES `slide_settings_change_events` WRITE;
/*!40000 ALTER TABLE `slide_settings_change_events` DISABLE KEYS */;
INSERT INTO `slide_settings_change_events` VALUES (1,'USER_PREFERENCE','user-1',NULL,1,'{\"theme\":\"dark\",\"headerDrawerOpen\":false,\"tvModeEnabled\":false,\"displayScaling\":\"normal\",\"heatmapIntervalMinutes\":10}','{\"theme\":\"dark\",\"headerDrawerOpen\":false,\"tvModeEnabled\":true,\"displayScaling\":\"tv-1080p\",\"heatmapIntervalMinutes\":15}','2026-10-23 18:33:33.320000'),(2,'DISPLAY_PREFERENCE','default',NULL,1,'{\"displayIdentifier\":\"default\",\"presentationId\":null,\"tvModeEnabled\":true,\"displayScaling\":\"normal\",\"heatmapIntervalMinutes\":10,\"slideIntervalSeconds\":30}','{\"displayIdentifier\":\"default\",\"presentationId\":null,\"tvModeEnabled\":true,\"displayScaling\":\"tv-1080p\",\"heatmapIntervalMinutes\":15}','2026-10-23 18:33:33.355000'),(3,'CRM_CONNECTION','connection_settings',NULL,1,'{\"id\":\"1\",\"connectionName\":\"Production Bridge CRM\",\"baseUrl\":\"https://app.tarajglobal.com/demandflowbridge/api/v1\",\"pollingIntervalSeconds\":30,\"timeoutSeconds\":60,\"mockFallback\":false,\"autoSyncEnabled\":true,\"isActive\":true,\"updatedBy\":null,\"updatedAt\":\"2026-10-23T18:02:20.839Z\"}','{\"id\":\"1\",\"connectionName\":\"DemandFlow Bridge High-Availability Cluster\",\"baseUrl\":\"https://app.tarajglobal.com/demandflowbridge/api/v1\",\"pollingIntervalSeconds\":12,\"timeoutSeconds\":10,\"mockFallback\":false,\"autoSyncEnabled\":true,\"isActive\":true,\"updatedBy\":\"1\",\"updatedAt\":\"2026-10-23T18:35:08.538Z\"}','2026-10-23 18:35:08.581000'),(4,'BUSINESS_CALENDAR','shift_config',NULL,1,'{\"shiftName\":\"US Business Shift\",\"shiftCode\":\"US_SHIFT\",\"timezone\":\"Asia/Kolkata\",\"startTime\":\"17:30:00\",\"endTime\":\"02:30:00\",\"crossesMidnight\":true,\"durationMinutes\":540,\"reportingTimezone\":\"America/New_York\",\"businessDateRule\":\"SHIFT_START_DATE\",\"gracePeriodMinutes\":0,\"workingDays\":[1,2,3,4,5],\"isActive\":true,\"version\":2,\"lastUpdated\":\"2026-10-23T18:02:20.950Z\",\"updatedBy\":\"MySQL Business Calendar\"}','{\"shiftName\":\"US Business Shift\",\"shiftCode\":\"US_SHIFT\",\"timezone\":\"Asia/Kolkata\",\"startTime\":\"17:30:00\",\"endTime\":\"02:30:00\",\"crossesMidnight\":true,\"durationMinutes\":540,\"reportingTimezone\":\"America/New_York\",\"businessDateRule\":\"SHIFT_START_DATE\",\"gracePeriodMinutes\":0,\"workingDays\":[1,2,3,4,5],\"isActive\":true,\"version\":3,\"lastUpdated\":\"2026-10-23T18:35:21.313Z\",\"updatedBy\":\"System Admin\",\"settlement_cutoff_time\":\"02:45:00\"}','2026-10-23 18:35:21.342000'),(5,'USER_PREFERENCE','user-1',NULL,1,'{\"theme\":\"dark\",\"headerDrawerOpen\":false,\"tvModeEnabled\":true,\"displayScaling\":\"tv-1080p\",\"heatmapIntervalMinutes\":15}','{\"headerDrawerOpen\":true}','2026-10-23 19:22:26.305000');
/*!40000 ALTER TABLE `slide_settings_change_events` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `slide_system_settings`
--

LOCK TABLES `slide_system_settings` WRITE;
/*!40000 ALTER TABLE `slide_system_settings` DISABLE KEYS */;
INSERT INTO `slide_system_settings` VALUES ('app_branding','{\"appName\":\"DemandFlow Live Analytics\",\"headerSubtitle\":\"Executive Operations & Real-Time Production Radar\",\"logoUrl\":\"/icons/demandflow-logo.svg\"}',NULL,'2026-10-23 13:35:41.730000'),('crm_connection_config','{\"crmApiBaseUrl\":\"https://app.tarajglobal.com/demandflowbridge/api/v1\",\"crmApiToken\":\"df_admin_secret_token_2026\",\"crmApiTimeoutMs\":60000,\"crmMockFallback\":false,\"autoSyncEnabled\":true,\"analyticsSyncInterval\":30,\"recognitionSyncInterval\":20,\"campaignTargetsSyncInterval\":30,\"slideRotationInterval\":25,\"heatmapGranularity\":10,\"recognitionDisplayScope\":\"daily\",\"endpoints\":{\"slide1\":\"slides/slide1.php\",\"slide2\":\"slides/slide2.php\",\"slide3\":\"slides/slide3.php\",\"slide4\":\"slides/slide4.php\",\"slide5\":\"slides/slide5.php\",\"campaign_targets\":\"campaign_daily_targets.php\",\"recognition\":\"slides/recognition.php\",\"slides_analytics_master\":\"slides_analytics.php?type=slide1\"},\"customEndpoints\":[{\"id\":\"slide1\",\"name\":\"Slide 1: Operations Overview\",\"path\":\"slides/slide1.php\",\"fallbackPath\":\"slides_analytics.php?type=slide1\",\"method\":\"GET\",\"category\":\"presentation\",\"description\":\"Daily KPIs, hourly lead generation velocity, and campaign allocation tables\",\"isBuiltIn\":true,\"enabled\":true},{\"id\":\"slide2\",\"name\":\"Slide 2: Agent Productivity\",\"path\":\"slides/slide2.php\",\"fallbackPath\":\"slides_analytics.php?type=slide2\",\"method\":\"GET\",\"category\":\"presentation\",\"description\":\"SDR leaderboard, points distribution, and agent performance targets\",\"isBuiltIn\":true,\"enabled\":true},{\"id\":\"slide3\",\"name\":\"Slide 3: QA 10m Heatmap\",\"path\":\"slides/slide3.php\",\"fallbackPath\":\"slides_analytics.php?type=slide3\",\"method\":\"GET\",\"category\":\"presentation\",\"description\":\"10-minute quality assurance acceptance and inspection distribution heatmap\",\"isBuiltIn\":true,\"enabled\":true},{\"id\":\"slide4\",\"name\":\"Slide 4: Agent 10m Heatmap\",\"path\":\"slides/slide4.php\",\"fallbackPath\":\"slides_analytics.php?type=slide4\",\"method\":\"GET\",\"category\":\"presentation\",\"description\":\"10-minute agent shift activity, call volume, and lead production heatmap\",\"isBuiltIn\":true,\"enabled\":true},{\"id\":\"slide5\",\"name\":\"Slide 5: Comparative Analysis\",\"path\":\"slides/slide5.php\",\"fallbackPath\":\"slides_analytics.php?type=slide5\",\"method\":\"GET\",\"category\":\"presentation\",\"description\":\"Day-over-day operations comparison, client fulfillment, and conversion delta\",\"isBuiltIn\":true,\"enabled\":true},{\"id\":\"campaign_targets\",\"name\":\"Campaign Daily Targets\",\"path\":\"campaign_daily_targets.php\",\"fallbackPath\":\"campaign_daily_targets.php\",\"method\":\"GET\",\"category\":\"targets\",\"description\":\"Database table allocation for campaign targets, qualified counts, and daily remaining\",\"isBuiltIn\":true,\"enabled\":true},{\"id\":\"recognition\",\"name\":\"Live Recognition & Celebrations\",\"path\":\"slides/recognition.php\",\"fallbackPath\":\"slides_analytics.php?type=recognition\",\"method\":\"GET\",\"category\":\"presentation\",\"description\":\"Top lead scorers, employee birthdays, and company work anniversaries\",\"isBuiltIn\":true,\"enabled\":true},{\"id\":\"slides_analytics_master\",\"name\":\"Master Consolidated Analytics\",\"path\":\"slides_analytics.php?type=slide1\",\"fallbackPath\":\"slides_analytics.php\",\"method\":\"GET\",\"category\":\"operations\",\"description\":\"Consolidated upstream PHP script serving unified slide data and celebration streams\",\"isBuiltIn\":true,\"enabled\":true}],\"lastUpdated\":\"2026-10-23T16:57:15.689Z\",\"updatedBy\":\"Admin Console\"}',NULL,'2026-10-23 18:02:20.915000'),('incentive_engine_metadata','{\"authoritativeSource\":\"DemandFlow Bridge CRM PHP Engine\",\"crmPublishSupported\":false,\"lastReconciliationCheck\":\"2026-10-23T13:35:41.728Z\"}',NULL,'2026-10-23 13:35:41.736000'),('legacy_incentive_rules_config','{\"baseDailyIncentive\":500,\"targetThresholdPct\":100,\"currency\":\"INR\",\"currencySymbol\":\"₹\",\"tieredSlabs\":[{\"id\":\"slab-1\",\"name\":\"Tier 1 (100% – 150%)\",\"minPct\":100,\"maxPct\":150,\"ratePerPoint\":50,\"description\":\"Standard accelerator: ₹50 for each point earned above 100% up to 150%\"},{\"id\":\"slab-2\",\"name\":\"Tier 2 (150% – 200%)\",\"minPct\":150,\"maxPct\":200,\"ratePerPoint\":75,\"description\":\"High performance accelerator: ₹75 for each point between 150% and 200%\"},{\"id\":\"slab-3\",\"name\":\"Tier 3 (> 200% Super-Achiever)\",\"minPct\":200,\"maxPct\":null,\"ratePerPoint\":100,\"description\":\"Super-achiever uncapped accelerator: ₹100 for each point exceeding 200%\"}],\"qaPolicy\":{\"zeroOutIncentive\":true,\"fixedDeductionPerEscalation\":0},\"allowedAttendanceStatuses\":[\"Present\",\"Full Day\",\"Half Day\",\"In Progress\"],\"disqualifyAbsent\":true,\"overrides\":[{\"id\":\"override-sr-sdr\",\"targetType\":\"role\",\"targetIdentifier\":\"Senior SDR\",\"baseIncentiveOverride\":600,\"multiplier\":1.1,\"isActive\":true,\"notes\":\"Senior SDR Tier Base Rate (₹600 + 10% accelerator bonus)\"}],\"effectiveDate\":\"2026-10-01\",\"version\":2,\"lastUpdated\":\"2026-10-22T16:39:43.812Z\",\"updatedBy\":\"System Initialization\"}',NULL,'2026-10-23 18:02:20.970000'),('slide_ticker_config','{\"enabled\":true,\"scrollSpeed\":45,\"displayMode\":\"earned_amount\"}',NULL,'2026-10-23 13:35:41.739000');
/*!40000 ALTER TABLE `slide_system_settings` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `slide_user_preferences`
--

LOCK TABLES `slide_user_preferences` WRITE;
/*!40000 ALTER TABLE `slide_user_preferences` DISABLE KEYS */;
INSERT INTO `slide_user_preferences` VALUES (1,1,'dark',1,1,'tv-1080p',15,'2026-10-23 19:22:24.360000');
/*!40000 ALTER TABLE `slide_user_preferences` ENABLE KEYS */;
UNLOCK TABLES;

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

--
-- Dumping data for table `slide_user_roles`
--

LOCK TABLES `slide_user_roles` WRITE;
/*!40000 ALTER TABLE `slide_user_roles` DISABLE KEYS */;
/*!40000 ALTER TABLE `slide_user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'demandflow_slides'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-27  2:55:02
